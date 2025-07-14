import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Globe, BookOpen, Trophy } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-spotify-bg text-spotify-text">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-spotify-green to-blue-400 bg-clip-text text-transparent mb-6">
            LyricLingo
          </h1>
          <p className="text-xl text-spotify-muted mb-8 max-w-2xl mx-auto">
            Learn languages through music with interactive lyrics, real-time translations, and personalized vocabulary building.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold text-lg px-8 py-3 rounded-full"
          >
            Sign in with Replit
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-spotify-card border-spotify-card">
            <CardHeader className="text-center">
              <Music className="w-12 h-12 text-spotify-green mx-auto mb-4" />
              <CardTitle className="text-spotify-text">Interactive Music</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-spotify-muted text-center">
                Learn with synchronized lyrics and real-time audio playback
              </p>
            </CardContent>
          </Card>

          <Card className="bg-spotify-card border-spotify-card">
            <CardHeader className="text-center">
              <Globe className="w-12 h-12 text-spotify-green mx-auto mb-4" />
              <CardTitle className="text-spotify-text">AI Translations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-spotify-muted text-center">
                Get instant translations with context and difficulty assessment
              </p>
            </CardContent>
          </Card>

          <Card className="bg-spotify-card border-spotify-card">
            <CardHeader className="text-center">
              <BookOpen className="w-12 h-12 text-spotify-green mx-auto mb-4" />
              <CardTitle className="text-spotify-text">Vocabulary Building</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-spotify-muted text-center">
                Build your personal vocabulary with contextual learning
              </p>
            </CardContent>
          </Card>

          <Card className="bg-spotify-card border-spotify-card">
            <CardHeader className="text-center">
              <Trophy className="w-12 h-12 text-spotify-green mx-auto mb-4" />
              <CardTitle className="text-spotify-text">Track Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-spotify-muted text-center">
                Monitor your learning journey with detailed analytics
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-spotify-text mb-4">
            Ready to start learning?
          </h2>
          <p className="text-spotify-muted mb-6">
            Join thousands of learners discovering new languages through music
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-spotify-green hover:bg-spotify-green/90 text-black font-semibold text-lg px-8 py-3 rounded-full"
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}