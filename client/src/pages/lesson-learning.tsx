import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Music, BookOpen, Play, Star, Lock, Volume2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import AppHeader from '@/components/app-header';
import { MatchExercise } from '@/components/exercises/match-exercise';
import { FillBlanksExercise } from '@/components/exercises/fill-blanks-exercise';

interface Lesson {
  id: number;
  language: string;
  difficulty: string;
  order: number;
  isFree: boolean;
  title: string;
  songId?: number;
  vocabulary: Array<{ word: string; translation: string }>;
  canAccess: boolean;
}

interface LessonStep {
  type: 'definition' | 'example' | 'quiz' | 'quiz-question' | 'tip' | 'song';
  content: any;
}

export default function LessonLearningPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, any>>({});
  const [lessonSteps, setLessonSteps] = useState<LessonStep[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) throw new Error('Lesson ID is required');
      return api.lessons.getById(parseInt(lessonId)) as Promise<Lesson>;
    },
    enabled: !!lessonId && !!user,
  });

  // Generate lesson steps from vocabulary
  useEffect(() => {
    if (!lesson) return;
    
    const steps: LessonStep[] = [];
    
    // Phase 1: Learning - Add interactive quiz questions for each vocabulary word
    lesson.vocabulary.forEach((vocab) => {
      // Generate wrong options by shuffling other vocabulary translations
      const otherTranslations = lesson.vocabulary
        .filter(v => v.word !== vocab.word)
        .map(v => v.translation)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      const options = [vocab.translation, ...otherTranslations].sort(() => Math.random() - 0.5);
      
      steps.push({
        type: 'quiz-question',
        content: { 
          word: vocab.word, 
          correctAnswer: vocab.translation,
          options: options,
          questionType: 'word-to-translation',
          exampleSentence: vocab.exampleSentence
        }
      });
    });
    
    // Add a tip step after learning phase
    steps.push({
      type: 'tip',
      content: {
        title: 'Great! Now let\'s practice',
        tip: 'You\'ve learned all the vocabulary. Time to test your knowledge with some exercises!'
      }
    });
    
    // Phase 2: Practice - Add quiz exercises (using existing exercise components)
    steps.push({
      type: 'quiz',
      content: {
        type: 'match',
        title: 'Match Exercise',
        description: 'Match the words with their translations'
      }
    });
    
    // Skip fill-blanks for now since lessons don't have song context
    // steps.push({
    //   type: 'quiz',
    //   content: {
    //     type: 'fill-blanks', 
    //     title: 'Fill in the Blanks',
    //     description: 'Complete the sentences with the correct words'
    //   }
    // });
    
    // Add song step if lesson has a song
    if (lesson.songId) {
      steps.push({
        type: 'song',
        content: {
          title: 'Practice with Music',
          description: 'Now listen to a song featuring these vocabulary words'
        }
      });
    }
    
    setLessonSteps(steps);
  }, [lesson]);

  // Reset quiz question state when step changes
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsAnswered(false);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < lessonSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Lesson completed - redirect with completion
      completeLessonMutation.mutate(85); // Mock 85% score
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleQuizAnswer = (stepIndex: number, answer: string) => {
    setUserAnswers({ ...userAnswers, [stepIndex]: answer });
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    setIsAnswered(true);
    
    const currentStepData = lessonSteps[currentStep];
    const isCorrect = answer === currentStepData.content.correctAnswer;
    setUserAnswers({ ...userAnswers, [currentStep]: isCorrect ? 100 : 0 });
    
    // Auto advance after 2 seconds
    setTimeout(() => {
      handleNext();
    }, 2000);
  };

  const completeLessonMutation = useMutation({
    mutationFn: async (finalScore: number) => {
      if (!lessonId) throw new Error('Lesson ID is required');
      return api.lessons.complete(parseInt(lessonId), finalScore);
    },
    onSuccess: (data) => {
      toast({
        title: "Lesson Completed! 🎉",
        description: `You scored 85% and learned ${lesson?.vocabulary.length} new words!`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      setLocation('/lessons');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <BookOpen className="w-16 h-16 text-spotify-muted mb-4" />
        <h2 className="text-2xl font-bold text-spotify-text mb-2">Login Required</h2>
        <p className="text-spotify-muted text-center mb-6">
          Please login to access lessons
        </p>
        <Button onClick={() => setLocation('/login')}>
          Go to Login
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-spotify-bg">
        <AppHeader />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-spotify-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-spotify-muted">Loading lesson...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Lock className="w-16 h-16 text-spotify-muted mb-4" />
        <h2 className="text-2xl font-bold text-spotify-text mb-2">Access Denied</h2>
        <p className="text-spotify-muted text-center mb-6">
          {error.message}
        </p>
        <Button onClick={() => setLocation('/lessons')}>
          Back to Lessons
        </Button>
      </div>
    );
  }

  if (!lesson || lessonSteps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <BookOpen className="w-16 h-16 text-spotify-muted mb-4" />
        <h2 className="text-2xl font-bold text-spotify-text mb-2">Lesson Not Found</h2>
        <Button onClick={() => setLocation('/lessons')}>
          Back to Lessons
        </Button>
      </div>
    );
  }

  const currentStepData = lessonSteps[currentStep];
  const progress = ((currentStep + 1) / lessonSteps.length) * 100;

  return (
    <div className="min-h-screen bg-spotify-bg">
      <AppHeader />

      {/* Progress Bar */}
      <div className="sticky top-16 z-20 bg-spotify-bg/95 backdrop-blur border-spotify-border">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/lesson/${lessonId}`)}
              className="text-spotify-text hover:bg-spotify-hover flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Progress value={progress} className="flex-1" />
            <span className="text-sm text-spotify-muted flex-shrink-0">
              {currentStep + 1}/{lessonSteps.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 pb-32">
        <div className="max-w-2xl mx-auto">
          {/* Lesson Step Content */}
          {currentStepData.type === 'quiz-question' ? (
            <div className="mb-4 py-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-spotify-text mb-3">
                  What does "{currentStepData.content.word}" mean?
                </h2>
                
                {/* Example sentence */}
                {currentStepData.content.exampleSentence && (
                  <div className="bg-spotify-hover rounded-lg p-3 mb-4 max-w-md mx-auto">
                    <p className="text-spotify-muted text-sm mb-2">Example:</p>
                    <p className="text-spotify-text italic">
                      "{currentStepData.content.exampleSentence}"
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                {currentStepData.content.options.map((option: string, index: number) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === currentStepData.content.correctAnswer;
                  const showCorrectAnswer = showResult && isCorrect;
                  const showWrongAnswer = showResult && isSelected && !isCorrect;

                  return (
                    <button
                      key={`${currentStep}-${index}`}
                      className={`w-full text-center p-4 h-auto rounded-lg transition-all duration-200 font-medium border-2 min-h-[50px] flex items-center justify-center ${
                        showCorrectAnswer
                          ? "bg-green-600/20 border-green-500 text-green-400 shadow-lg"
                          : showWrongAnswer
                          ? "bg-red-600/20 border-red-500 text-red-400 shadow-lg"
                          : isSelected
                          ? "bg-[var(--spotify-green)]/20 border-[var(--spotify-green)] text-[var(--spotify-green)] shadow-lg"
                          : isAnswered
                          ? "bg-[var(--spotify-gray)] border-[var(--spotify-border)] spotify-text-primary opacity-60 cursor-default"
                          : "bg-[var(--spotify-card)] border-[var(--spotify-border)] spotify-text-primary shadow-md"
                      }`}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={isAnswered}
                    >
                      <span className="text-base leading-tight font-semibold">{option}</span>
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <div className="mt-8 text-center">
                  {selectedAnswer === currentStepData.content.correctAnswer ? (
                    <div className="bg-green-600/10 rounded-lg p-4 max-w-md mx-auto">
                      <div className="text-green-400 text-4xl mb-2">🎉</div>
                      <p className="font-bold text-green-400 text-xl mb-1">Correct!</p>
                      <p className="text-spotify-muted text-sm">Great job!</p>
                    </div>
                  ) : (
                    <div className="bg-red-600/10 rounded-lg p-4 max-w-md mx-auto">
                      <div className="text-red-400 text-3xl mb-2">💭</div>
                      <p className="font-bold text-red-400 text-lg mb-1">Not quite right</p>
                      <p className="text-spotify-text text-base">
                        The correct answer is <strong className="text-spotify-green">"{currentStepData.content.correctAnswer}"</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : currentStepData.type === 'quiz' ? (
            <div className="mb-4">
              {currentStepData.content.type === 'match' && (
                <div>
                  <h2 className="text-xl font-bold text-spotify-text mb-2 text-center">
                    {currentStepData.content.title}
                  </h2>
                  <p className="text-spotify-muted text-center mb-3 text-sm">
                    {currentStepData.content.description}
                  </p>
                  <div className="min-h-[300px]">
                    <MatchExercise
                        className="fefefe"
                      vocabulary={lesson?.vocabulary.map(v => ({
                        id: Math.random(), // Generate temp ID
                        word: v.word,
                        translation: v.translation,
                        language: lesson.language,
                        difficulty: lesson.difficulty,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        userId: user?.id || 0,
                        songId: null,
                        seen: false
                      })) || []}
                      targetLanguage={lesson?.language || 'de'}
                      mixMode={true}
                      onMixComplete={() => {
                        setUserAnswers({ ...userAnswers, [currentStep]: 100 });
                      }}
                      hideHeader={true}
                      hideCard={true}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="bg-spotify-card border-spotify-border mb-4">
              <CardContent className="p-4">
                {currentStepData.type === 'definition' && (
                  <div className="text-center">
                    <div className="lesson-icon lesson-icon-accessible mx-auto mb-4">
                      <div className="lesson-icon-glow" />
                      <BookOpen className="w-8 h-8 text-white relative z-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-spotify-text mb-3">
                      {currentStepData.content.word}
                    </h2>
                    <p className="text-lg text-spotify-muted mb-6">
                      {currentStepData.content.translation}
                    </p>
                    <button className="mx-auto flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full hover:from-blue-400 hover:to-blue-500 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">
                      <Volume2 className="w-6 h-6 text-white" />
                    </button>
                  </div>
                )}

                {currentStepData.type === 'example' && (
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-spotify-text mb-3">
                      Example Sentence
                    </h2>
                    <div className="p-4 bg-spotify-hover rounded-lg mb-4">
                      <p className="text-base text-spotify-text">
                        {currentStepData.content.example}
                      </p>
                    </div>
                    <p className="text-spotify-muted text-sm">
                      <strong>{currentStepData.content.word}</strong> means <strong>{currentStepData.content.translation}</strong>
                    </p>
                  </div>
                )}

                {currentStepData.type === 'tip' && (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-spotify-text mb-3">
                      {currentStepData.content.title}
                    </h2>
                    <p className="text-base text-spotify-muted">
                      {currentStepData.content.tip}
                    </p>
                  </div>
                )}

                {currentStepData.type === 'song' && (
                  <div className="text-center">
                    <div className="lesson-icon lesson-icon-accessible mx-auto mb-4">
                      <div className="lesson-icon-glow" />
                      <Music className="w-8 h-8 text-white relative z-10" />
                    </div>
                    <h2 className="text-xl font-bold text-spotify-text mb-3">
                      {currentStepData.content.title}
                    </h2>
                    <p className="text-base text-spotify-muted mb-4">
                      {currentStepData.content.description}
                    </p>
                    <Button className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Start Song Practice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-spotify-card border-t border-spotify-border p-4"
        style={{ zIndex: 9999 }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="spotify-btn-secondary flex items-center gap-2 flex-1 max-w-32 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            onClick={handleNext}
            className="spotify-btn-primary flex items-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={(currentStepData.type === 'quiz' && userAnswers[currentStep] === undefined) || (currentStepData.type === 'quiz-question' && !isAnswered)}
          >
            {currentStep === lessonSteps.length - 1 ? 'Complete Lesson' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}