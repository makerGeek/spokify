import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function SmartRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check localStorage for language preferences
    const targetLanguage = localStorage.getItem('targetLanguage');
    const nativeLanguage = localStorage.getItem('nativeLanguage');
    
    // Check if user has completed language selection
    const hasLanguagePreferences = targetLanguage && nativeLanguage;
    
    if (hasLanguagePreferences) {
      // User has language preferences, redirect to home
      setLocation('/home');
    } else {
      // No language preferences, redirect to language selection
      setLocation('/language-selection');
    }
  }, [setLocation]);

  // Show loading while redirecting
  return (
    <div className="spotify-bg min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-spotify-green rounded-full animate-pulse mb-4 mx-auto"></div>
        <p className="spotify-text-secondary">Loading Spokify...</p>
      </div>
    </div>
  );
}