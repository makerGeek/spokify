import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../db.js';
import { users, userDailyActivity } from '@shared/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

const router = Router();

// GET /api/activity/streak - Get user's current and best streak
router.get('/streak', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const user = await db
      .select({
        streak: users.streak,
        bestStreak: users.bestStreak,
        lastActiveDate: users.lastActiveDate,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user[0]
    });
  } catch (error) {
    console.error('Error fetching streak data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch streak data'
    });
  }
});

// GET /api/activity/daily - Get user's daily activity data
router.get('/daily', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get activity data for the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoString = oneYearAgo.toISOString().split('T')[0];
    
    const activities = await db
      .select()
      .from(userDailyActivity)
      .where(
        and(
          eq(userDailyActivity.userId, userId),
          gte(userDailyActivity.date, oneYearAgoString)
        )
      )
      .orderBy(desc(userDailyActivity.date));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching daily activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity data'
    });
  }
});

// POST /api/activity/track - Track user activity (internal endpoint)
const TrackActivitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  songsLearned: z.number().min(0).optional().default(0),
  vocabularyReviewed: z.number().min(0).optional().default(0),
});

router.post('/track', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { date, songsLearned, vocabularyReviewed } = TrackActivitySchema.parse(req.body);

    // Check if record exists for today
    const existing = await db
      .select()
      .from(userDailyActivity)
      .where(
        and(
          eq(userDailyActivity.userId, userId),
          eq(userDailyActivity.date, date)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(userDailyActivity)
        .set({
          songsLearned: existing[0].songsLearned + songsLearned,
          vocabularyReviewed: existing[0].vocabularyReviewed + vocabularyReviewed,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userDailyActivity.userId, userId),
            eq(userDailyActivity.date, date)
          )
        );
    } else {
      // Insert new record
      await db
        .insert(userDailyActivity)
        .values({
          userId,
          date,
          songsLearned,
          vocabularyReviewed,
        });
    }

    // Update user's last active date and potentially streak
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      await updateUserStreak(userId);
    }

    res.json({
      success: true,
      message: 'Activity tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking activity:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to track activity'
    });
  }
});

// Helper function to update user streak
async function updateUserStreak(userId: number) {
  try {
    const user = await db
      .select({
        streak: users.streak,
        bestStreak: users.bestStreak,
        lastActiveDate: users.lastActiveDate,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) return;

    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const yesterdayString = new Date(today.setDate(today.getDate() - 1)).toISOString().split('T')[0];
    
    const lastActiveDate = user[0].lastActiveDate?.toISOString().split('T')[0];
    let newStreak = user[0].streak;
    let newBestStreak = user[0].bestStreak;

    // Calculate new streak
    if (lastActiveDate === yesterdayString) {
      // Continue streak
      newStreak += 1;
    } else if (lastActiveDate === todayString) {
      // Already updated today, no change
      return;
    } else {
      // Start new streak
      newStreak = 1;
    }

    // Update best streak if necessary
    if (newStreak > newBestStreak) {
      newBestStreak = newStreak;
    }

    // Update user record
    await db
      .update(users)
      .set({
        streak: newStreak,
        bestStreak: newBestStreak,
        lastActiveDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

  } catch (error) {
    console.error('Error updating user streak:', error);
  }
}

export default router;