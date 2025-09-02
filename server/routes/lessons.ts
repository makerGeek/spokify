import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, optionalAuth, validateInput, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { insertLessonSchema, insertLearnedLessonSchema } from '@shared/schema';

const router = Router();

// Get all lessons for a language/difficulty
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { language, difficulty } = req.query;
    
    if (!language || !difficulty) {
      return res.status(400).json({ 
        error: 'Language and difficulty parameters are required' 
      });
    }

    const lessons = await storage.getLessons(language as string, difficulty as string);
    
    // If user is authenticated, include their progress
    if (req.user) {
      const user = await storage.getUserByUsername(req.user.email);
      if (user) {
        const completedLessons = await storage.getUserCompletedLessons(user.id);
        const completedLessonIds = new Set(completedLessons.map(cl => cl.lessonId));
        
        // Add completion status and unlock status to each lesson
        const lessonsWithProgress = lessons.map((lesson, index) => {
          const isCompleted = completedLessonIds.has(lesson.id);
          const isUnlocked = index === 0 || completedLessonIds.has(lessons[index - 1]?.id);
          
          return {
            ...lesson,
            isCompleted,
            isUnlocked,
            canAccess: lesson.isFree || (req.user?.subscriptionStatus === 'active')
          };
        });
        
        return res.json(lessonsWithProgress);
      }
    }
    
    // For unauthenticated users, just return lessons with basic access info
    const lessonsWithAccess = lessons.map((lesson, index) => ({
      ...lesson,
      isCompleted: false,
      isUnlocked: index === 0, // Only first lesson unlocked for anonymous users
      canAccess: lesson.isFree
    }));
    
    res.json(lessonsWithAccess);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get specific lesson details
router.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const lessonId = parseInt(req.params.id);
    const lesson = await storage.getLesson(lessonId);
    
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    // Check if user can access this lesson
    const canAccessPremium = req.user?.subscriptionStatus === 'active';
    const canAccess = lesson.isFree || canAccessPremium;
    
    if (!canAccess) {
      return res.status(403).json({
        error: 'Premium subscription required to access this lesson',
        requiresPremium: true
      });
    }
    
    // If user is authenticated, check unlock status
    if (req.user) {
      const user = await storage.getUserByUsername(req.user.email);
      if (user) {
        const isUnlocked = await storage.isLessonUnlocked(user.id, lessonId);
        if (!isUnlocked) {
          return res.status(403).json({
            error: 'Previous lesson must be completed to unlock this lesson',
            locked: true
          });
        }
      }
    }
    
    res.json({
      ...lesson,
      canAccess: true
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// Complete a lesson
router.post('/:id/complete', 
  authenticateToken,
  validateInput(z.object({
    score: z.number().min(0).max(100)
  })),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      const { score } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const user = await storage.getUserByUsername(req.user.email);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      
      // Check if user can access this lesson
      const canAccessPremium = user.subscriptionStatus === 'active';
      const canAccess = lesson.isFree || canAccessPremium;
      
      if (!canAccess) {
        return res.status(403).json({
          error: 'Premium subscription required to complete this lesson',
          requiresPremium: true
        });
      }
      
      // Check if lesson is unlocked
      const isUnlocked = await storage.isLessonUnlocked(user.id, lessonId);
      if (!isUnlocked) {
        return res.status(403).json({
          error: 'Previous lesson must be completed to unlock this lesson',
          locked: true
        });
      }
      
      // Record lesson completion
      const completion = await storage.completeLesson({
        userId: user.id,
        lessonId: lessonId,
        score: score
      });
      
      // Update user's words learned count based on lesson vocabulary
      const vocabularyCount = Array.isArray(lesson.vocabulary) ? lesson.vocabulary.length : 0;
      if (vocabularyCount > 0) {
        await storage.updateUserWordsLearned(user.id, vocabularyCount);
      }
      
      res.json({
        ...completion,
        message: 'Lesson completed successfully!',
        wordsLearned: vocabularyCount
      });
    } catch (error) {
      console.error('Complete lesson error:', error);
      res.status(500).json({ error: 'Failed to complete lesson' });
    }
  }
);

// Get user's lesson progress
router.get('/progress/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const user = await storage.getUserByUsername(req.user.email);
    if (!user || user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const completedLessons = await storage.getUserCompletedLessons(userId);
    const progressStats = await storage.getUserLessonStats(userId);
    
    res.json({
      completedLessons,
      stats: progressStats
    });
  } catch (error) {
    console.error('Get lesson progress error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson progress' });
  }
});

// Admin routes for lesson management
router.post('/', 
  authenticateToken,
  requireAdmin,
  validateInput(insertLessonSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lessonData = req.body;
      const lesson = await storage.createLesson(lessonData);
      res.json(lesson);
    } catch (error) {
      console.error('Create lesson error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to create lesson' 
      });
    }
  }
);

router.put('/:id',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      const updates = req.body;
      
      const lesson = await storage.updateLesson(lessonId, updates);
      res.json(lesson);
    } catch (error) {
      console.error('Update lesson error:', error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Failed to update lesson' 
      });
    }
  }
);

router.delete('/:id',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      
      await storage.deleteLesson(lessonId);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete lesson error:', error);
      res.status(500).json({ error: 'Failed to delete lesson' });
    }
  }
);

export default router;