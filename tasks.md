# Spokify Course System Implementation Tasks

## Phase 1: Database & Schema Design

### Task 1.1: Design Course System Database Schema
- [ ] Complete Task 1.1
**Priority: High | Estimated Time: 2-3 hours**

Create new database tables in `shared/schema.ts`:

- **courses** table:
  - `id`, `title`, `description`, `language`, `difficulty_level`, `is_premium`, `created_at`
  - `thumbnail_url`, `estimated_duration`, `total_lessons`

- **course_units** table:
  - `id`, `course_id`, `title`, `description`, `order_index`, `theme`
  - `unlock_criteria`, `is_bonus_unit`

- **lessons** table:
  - `id`, `unit_id`, `title`, `type` (vocabulary, song, exercise, test)
  - `order_index`, `content_data` (JSON), `required_accuracy`

- **lesson_vocabulary** table:
  - `id`, `lesson_id`, `word`, `translation`, `pronunciation`, `example_sentence`
  - `difficulty_level`, `part_of_speech`

- **user_course_progress** table:
  - `id`, `user_id`, `course_id`, `current_unit_id`, `current_lesson_id`
  - `total_xp`, `completion_percentage`, `started_at`, `last_activity`

- **user_lesson_attempts** table:
  - `id`, `user_id`, `lesson_id`, `score`, `completed_at`, `time_spent`
  - `attempt_number`, `exercise_results` (JSON)

- **user_vocabulary_mastery** table:
  - `id`, `user_id`, `vocabulary_id`, `mastery_level`, `last_reviewed`
  - `correct_attempts`, `total_attempts`, `spaced_repetition_due`

### Task 1.2: Create Database Migration
- [ ] Complete Task 1.2
**Priority: High | Estimated Time: 1 hour**

- Run `npm run db:push` to deploy schema changes
- Create seed data for initial course themes
- Test schema with sample data insertion

## Phase 2: Backend API Development

### Task 2.1: Course Management API Endpoints
- [ ] Complete Task 2.1
**Priority: High | Estimated Time: 3-4 hours**

Create `server/routes/courses.ts`:

- `GET /api/courses` - List available courses with progress
- `GET /api/courses/:id` - Get course details with units/lessons
- `GET /api/courses/:id/progress` - Get user progress for course
- `POST /api/courses/:id/enroll` - Enroll user in course
- `GET /api/units/:id/lessons` - Get lessons for a unit
- `POST /api/lessons/:id/complete` - Mark lesson as completed with score

### Task 2.2: Lesson Content API
- [ ] Complete Task 2.2
**Priority: High | Estimated Time: 2-3 hours**

Create `server/routes/lessons.ts`:

- `GET /api/lessons/:id` - Get lesson content and vocabulary
- `POST /api/lessons/:id/attempt` - Submit lesson attempt and score
- `GET /api/lessons/:id/vocabulary` - Get vocabulary for lesson
- `POST /api/vocabulary/:id/mastery` - Update vocabulary mastery level

### Task 2.3: Progress Tracking System
- [ ] Complete Task 2.3
**Priority: Medium | Estimated Time: 2 hours**

Create `server/services/progressTracker.ts`:

- Calculate XP points based on lesson performance
- Determine lesson unlock status based on prerequisites
- Update user course progress and statistics
- Handle achievement triggers

## Phase 3: Frontend Course Discovery

### Task 3.1: Course Discovery Page
- [ ] Complete Task 3.1
**Priority: High | Estimated Time: 4-5 hours**

Create `client/src/pages/CoursesPage.tsx`:

- Grid layout of available courses with thumbnails
- Progress indicators for enrolled courses
- Filter by language, difficulty, and premium status
- Course enrollment CTA with subscription check

### Task 3.2: Course Detail Page
- [ ] Complete Task 3.2
**Priority: High | Estimated Time: 3-4 hours**

Create `client/src/pages/CourseDetailPage.tsx`:

- Course overview with description and stats
- Visual progress map showing units and lessons
- Duolingo-style lesson nodes with completion states
- Unit descriptions and unlock requirements
- Start/Continue lesson CTAs

### Task 3.3: Progress Map Component
- [ ] Complete Task 3.3
**Priority: Medium | Estimated Time: 4-6 hours**

Create `client/src/components/course/ProgressMap.tsx`:

- SVG-based lesson path with connecting lines
- Circular lesson nodes with different states:
  - Completed (gold/green)
  - Available (blue outline)
  - Locked (gray)
  - Current (highlighted)
- Smooth animations for state transitions
- Mobile-responsive design

## Phase 4: Lesson Flow System

### Task 4.1: Lesson Router Component
- [ ] Complete Task 4.1
**Priority: High | Estimated Time: 3 hours**

Create `client/src/components/lesson/LessonRouter.tsx`:

- Route to different lesson types based on lesson.type
- Progress bar showing position in lesson sequence
- Navigation between lesson steps
- Exit lesson confirmation dialog

### Task 4.2: Vocabulary Introduction Component
- [ ] Complete Task 4.2
**Priority: High | Estimated Time: 4-5 hours**

Create `client/src/components/lesson/VocabularyIntro.tsx`:

- Card-based vocabulary presentation
- Audio pronunciation with play/pause controls
- Visual imagery for vocabulary words
- Swipe/click navigation through vocabulary list
- "I know this" / "Learning" progress tracking

### Task 4.3: Song-Lesson Integration
- [ ] Complete Task 4.3
**Priority: Medium | Estimated Time: 3-4 hours**

Modify existing song components:

- Add lesson context to song player
- Highlight vocabulary words in lyrics during playback
- Create lesson-specific song playlists
- Add vocabulary tooltips on hover/tap

## Phase 5: Interactive Exercise Components

### Task 5.1: Interactive Translation Practice
- [ ] Complete Task 5.1
**Priority: High | Estimated Time: 4-5 hours**

Create `client/src/components/lesson/TranslationPractice.tsx`:

- Line-by-line translation of lesson song
- Click to reveal translation hints
- Input fields for user translation attempts
- Real-time feedback and correction
- Progress tracking through song verses

### Task 5.2: Listening Comprehension Exercises
- [ ] Complete Task 5.2
**Priority: High | Estimated Time: 5-6 hours**

Create `client/src/components/lesson/ListeningComprehension.tsx`:

- Fill-in-the-blank exercises during song playback
- Multiple choice vocabulary questions
- Audio snippet replay functionality
- Visual feedback for correct/incorrect answers
- Adaptive difficulty based on user performance

### Task 5.3: Enhanced Phrase Builder Integration
- [ ] Complete Task 5.3
**Priority: Medium | Estimated Time: 2-3 hours**

Modify `client/src/components/word-builder/WordBuilder.tsx`:

- Add lesson context and vocabulary focus
- Score tracking for lesson completion
- Hint system for struggling learners
- Time-based challenges for advanced users

### Task 5.4: Unit Test System
- [ ] Complete Task 5.4
**Priority: Medium | Estimated Time: 4-5 hours**

Create `client/src/components/lesson/UnitTest.tsx`:

- Mixed exercise types in single assessment
- Randomized question order
- Timer functionality for time pressure
- Detailed results breakdown
- Retry mechanism for failed attempts

## Phase 6: Gamification & Progress

### Task 6.1: XP Points System
- [ ] Complete Task 6.1
**Priority: Medium | Estimated Time: 2-3 hours**

Create `client/src/services/gamification.ts`:

- XP calculation logic based on:
  - Lesson completion (base points)
  - Accuracy bonus
  - Speed bonus
  - Streak multipliers
- Level progression system
- XP display animations and celebrations

### Task 6.2: Achievement System
- [ ] Complete Task 6.2
**Priority: Low | Estimated Time: 3-4 hours**

Create `client/src/components/achievements/`:

- Achievement definitions and triggers
- Badge collection interface
- Achievement notifications
- Social sharing capabilities
- Progress towards locked achievements

### Task 6.3: Lesson Unlock Logic
- [ ] Complete Task 6.3
**Priority: High | Estimated Time: 2 hours**

Create `client/src/services/progressGating.ts`:

- Check completion requirements (80% accuracy)
- Validate prerequisite lessons
- Handle premium content access
- Update UI state for locked/unlocked content

## Phase 7: Course Themes & Content

### Task 7.1: Theme-Based Course Structure
- [ ] Complete Task 7.1
**Priority: Medium | Estimated Time: 3-4 hours**

Create course content for themes:

- **Food & Cooking**: Restaurant vocabulary, cooking verbs, ingredients
- **Family & Relationships**: Family members, emotions, relationship status
- **Travel & Places**: Directions, transportation, accommodation
- **Emotions & Feelings**: Mood expressions, personality traits
- **Work & Career**: Job titles, office vocabulary, professional communication
- **Daily Routines**: Time expressions, daily activities, schedules

### Task 7.2: Song Curation by Theme
- [ ] Complete Task 7.2
**Priority: Medium | Estimated Time: 4-5 hours**

Modify `server/services/songCuration.ts`:

- Tag existing songs with vocabulary themes
- Create themed playlists for each course unit
- Implement song recommendation based on lesson vocabulary
- Add difficulty assessment for song-vocabulary matching

## Phase 8: Admin & Content Management

### Task 8.1: Course Creator Admin Panel
- [ ] Complete Task 8.1
**Priority: Low | Estimated Time: 6-8 hours**

Create `client/src/pages/admin/CourseManagement.tsx`:

- Course creation and editing interface
- Lesson content editor with rich text support
- Vocabulary management with pronunciation upload
- Course preview and testing functionality
- Bulk import/export for course content

### Task 8.2: Content Analytics Dashboard
- [ ] Complete Task 8.2
**Priority: Low | Estimated Time: 3-4 hours**

Create analytics for course creators:

- Lesson completion rates
- Common failure points
- User engagement metrics
- Vocabulary mastery statistics
- A/B testing framework for course optimization

## Phase 9: Premium Integration

### Task 9.1: Premium Course Features
- [ ] Complete Task 9.1
**Priority: Medium | Estimated Time: 2-3 hours**

- Add premium flags to course schema
- Implement subscription checks in lesson access
- Create premium course benefits (unlimited hearts, offline mode)
- Add premium course previews for free users

### Task 9.2: Subscription Upsell Integration
- [ ] Complete Task 9.2
**Priority: Medium | Estimated Time: 2 hours**

- Course enrollment paywall for premium courses
- Lesson limit reached notifications
- Premium feature teases throughout course experience
- Seamless upgrade flow from course interface

## Phase 10: Testing & Polish

### Task 10.1: User Experience Testing
- [ ] Complete Task 10.1
**Priority: High | Estimated Time: 4-6 hours**

- Test complete lesson flow from enrollment to completion
- Mobile responsiveness across all components
- Performance optimization for course data loading
- Accessibility compliance for learning components

### Task 10.2: Data Migration & Seeding
- [ ] Complete Task 10.2
**Priority: Medium | Estimated Time: 2-3 hours**

- Create seed data for initial course offerings
- Migrate existing vocabulary from current system
- Tag existing songs with appropriate course themes
- Set up demo courses for user onboarding

---

## Implementation Priority

### Phase 1 (MVP): Core Learning Flow
- Database schema (1.1, 1.2)
- Basic API endpoints (2.1, 2.2)
- Course discovery (3.1, 3.2)
- Basic lesson flow (4.1, 4.2)

### Phase 2 (Enhanced Experience):
- Interactive exercises (5.1, 5.2, 5.3)
- Progress tracking (2.3, 6.1, 6.3)
- Course themes (7.1, 7.2)

### Phase 3 (Full Feature Set):
- Advanced gamification (6.2, 10.1)
- Admin tools (8.1, 8.2)
- Premium integration (9.1, 9.2)

**Total Estimated Time: 80-110 hours**
**Recommended Team: 2-3 developers over 6-8 weeks**