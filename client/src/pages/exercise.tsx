import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, BookOpen, Puzzle, Type, Shuffle, FileText, Brain, SpellCheck, Play } from "lucide-react";

export default function ExerciseSelection() {
  const exerciseColors = [
    "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", // Purple to Pink
    "linear-gradient(135deg, #ef4444 0%, #f97316 100%)", // Red to Orange
    "linear-gradient(135deg, #eab308 0%, #ef4444 100%)", // Yellow to Red
    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)", // Blue to Purple
    "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)", // Green to Blue
  ];

  const exerciseTypes = [
    {
      id: "review",
      name: "Review",
      description: "Practice vocabulary with spaced repetition.",
      icon: Brain,
      path: "/exercise/review",
    },
    {
      id: "match",
      name: "Match",
      description: "Match words with their translations.",
      icon: Puzzle,
      path: "/exercise/match",
    },
    {
      id: "word-builder",
      name: "Phrase Builder",
      description: "Build phrases or sentences from scrambled words.",
      icon: SpellCheck,
      path: "/exercise/word-builder",
    },
    {
      id: "fill-blanks",
      name: "Fill Blanks",
      description: "Complete sentences by filling in missing words.",
      icon: FileText,
      path: "/exercise/fill-blanks",
    },
    {
      id: "mix",
      name: "Mixed Practice",
      description: "Combine different exercise types for a varied session.",
      icon: Shuffle,
      path: "/exercise/mix",
    },
  ];

  return (
    <div className="container mx-auto p-4 pt-10 pb-10">
      <h1 className="spotify-heading-lg text-center mb-8">Choose Your Exercise</h1>
      <div className="grid grid-cols-1 gap-4">
        {exerciseTypes.map((exercise, index) => (
          <Link key={exercise.id} href={exercise.path}>
            <Card className="spotify-card bg-spotify-card border-spotify-card cursor-pointer" >
              <CardContent className="p-4 flex items-center space-x-4">
                <div 
                  className="flex-shrink-0 rounded-lg p-3"
                  style={{ background: exerciseColors[index % exerciseColors.length] }}
                >
                  <exercise.icon className="h-10 w-10 text-spotify-black" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-spotify-text">
                      {exercise.name}
                    </h3>
                    {exercise.id === 'mix' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white bg-spotify-black free-badge">
                        ALL IN ONE
                      </span>
                    )}
                  </div>
                  <p className="text-spotify-muted text-sm">{exercise.description}</p>
                </div>
                
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    className="w-10 h-10 bg-spotify-green rounded-full hover:bg-spotify-accent transition-colors p-0"
                  >
                    <Play size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
