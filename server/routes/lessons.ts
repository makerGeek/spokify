import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, optionalAuth, validateInput, requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import { storage } from '../storage';
import { insertLessonSchema, insertLearnedLessonSchema } from '@shared/schema';
import { getExampleSentencesForWords } from '../services/example-sentences.js';

const router = Router();

// Get all lessons for a language/difficulty (hierarchical structure)
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { language, difficulty, hierarchical } = req.query;
    
    if (!language) {
      return res.status(400).json({ 
        error: 'Language parameter is required' 
      });
    }

    // If hierarchical=true, return sections -> modules -> lessons structure
    if (hierarchical === 'true') {
      try {
        const sectionsWithContent = await storage.getSectionsWithModulesAndLessons(
          language as string, 
          difficulty as string | undefined
        );
      
        // Return sections with access info only (no user-specific progress)
        const sectionsWithAccess = sectionsWithContent.map(section => ({
          ...section,
          canAccess: section.isFree || (req.user?.subscriptionStatus === 'active'),
          modules: section.modules.map((module: any) => ({
            ...module,
            canAccess: module.isFree || (req.user?.subscriptionStatus === 'active'),
            lessons: module.lessons.map((lesson: any) => ({
              ...lesson,
              canAccess: lesson.isFree || (req.user?.subscriptionStatus === 'active')
            }))
          }))
        }));
        
        return res.json(sectionsWithAccess);
        
      } catch (error: any) {
        console.log('Hierarchical lessons not available yet, falling back to flat structure');
        console.log('Run: npm run db:push && npx tsx scripts/seed-hierarchical-lessons.ts');
        
        // Fall through to legacy flat structure instead of erroring
      }
    }

    // Legacy flat structure for backward compatibility
    const lessons = await storage.getLessons(language as string, difficulty as string | undefined);
    
    // Return lessons with access info only (no user-specific progress)
    const lessonsWithAccess = lessons.map((lesson) => ({
      ...lesson,
      canAccess: lesson.isFree || (req.user?.subscriptionStatus === 'active')
    }));
    
    res.json(lessonsWithAccess);
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// Get user's completed lesson IDs only (lightweight)
router.get('/completed', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const user = await storage.getUserByUsername(req.user.email);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const completedLessons = await storage.getUserCompletedLessons(user.id);
    const completedLessonIds = completedLessons.map(cl => cl.lessonId);
    
    res.json({ completedLessonIds });
  } catch (error) {
    console.error('Get completed lessons error:', error);
    res.status(500).json({ error: 'Failed to fetch completed lessons' });
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
    
    // Enhance vocabulary with example sentences
    let enhancedLesson = { ...lesson };
    
    if (Array.isArray(lesson.vocabulary) && lesson.vocabulary.length > 0) {
      try {
        // Check if any vocabulary items need example sentences
        const needsExamples = lesson.vocabulary.some(vocab => !vocab.exampleSentence);
        
        if (needsExamples) {
          const vocabularyWithExamples = await getExampleSentencesForWords(
            lesson.vocabulary,
            lesson.language
          );
          enhancedLesson.vocabulary = vocabularyWithExamples;
          
          // Save the enhanced vocabulary back to the database
          await storage.updateLesson(lesson.id, {
            vocabulary: vocabularyWithExamples
          });
          
          console.log(`✅ Generated and saved example sentences for lesson ${lesson.id}`);
        }
      } catch (error) {
        console.error('Error enhancing vocabulary with examples:', error);
        // Continue with original vocabulary if enhancement fails
      }
    }
    
    res.json({
      ...enhancedLesson,
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
      console.log('🔐 Completing lesson for user:', { email: req.user.email, userId: user?.id, lessonId });
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
      console.log('💾 Recording lesson completion:', { userId: user.id, lessonId, score });
      const completion = await storage.completeLesson({
        userId: user.id,
        lessonId: lessonId,
        score: score
      });
      console.log('✅ Completion recorded:', completion);
      
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

// Admin endpoint to regenerate all example sentences
router.post('/regenerate-examples',
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      console.log('🔄 Starting regeneration of all lesson example sentences...');
      
      // Get all lessons
      const allLessons = await storage.getAllLessons();
      
      console.log(`📚 Found ${allLessons.length} lessons to process`);
      
      let processedCount = 0;
      let updatedCount = 0;
      
      for (const lesson of allLessons) {
        console.log(`\n🎯 Processing lesson ${lesson.id}: "${lesson.title}" (${lesson.language})`);
        
        if (!Array.isArray(lesson.vocabulary)) {
          console.log(`⚠️  Skipping lesson ${lesson.id} - no vocabulary array`);
          continue;
        }
        
        processedCount++;
        
        // Strip existing example sentences to force regeneration
        const vocabularyWithoutExamples = lesson.vocabulary.map((vocab: any) => ({
          word: vocab.word,
          translation: vocab.translation
        }));
        
        console.log(`📝 Regenerating example sentences for ${vocabularyWithoutExamples.length} vocabulary items...`);
        
        // Generate new example sentences
        const vocabularyWithExamples = await getExampleSentencesForWords(
          vocabularyWithoutExamples,
          lesson.language
        );
        
        // Update lesson in database
        await storage.updateLesson(lesson.id, {
          vocabulary: vocabularyWithExamples
        });
        
        updatedCount++;
        console.log(`✅ Updated lesson ${lesson.id} with new example sentences`);
        
        // Show sample results
        const sampleSentences = vocabularyWithExamples.slice(0, 2).map(vocab => 
          `  • "${vocab.word}" → "${vocab.exampleSentence.substring(0, 50)}..."`
        ).join('\n');
        console.log(`📖 Sample sentences:\n${sampleSentences}`);
      }
      
      console.log('\n🎉 Successfully regenerated all example sentences!');
      
      res.json({
        success: true,
        message: 'Successfully regenerated all example sentences',
        stats: {
          totalLessons: allLessons.length,
          processedLessons: processedCount,
          updatedLessons: updatedCount
        },
        improvements: [
          'Real song lyrics from translations table (when available)',
          'AI-generated natural sentences (for complex words)',
          'Improved fallback sentences (for simple words)'
        ]
      });
      
    } catch (error) {
      console.error('❌ Error regenerating example sentences:', error);
      res.status(500).json({ 
        error: 'Failed to regenerate example sentences',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;