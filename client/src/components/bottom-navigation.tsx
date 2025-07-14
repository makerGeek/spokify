import { useLocation } from "wouter";
import { Home, Search, BookOpen, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  currentPage: string;
}

export default function BottomNavigation({ currentPage }: BottomNavigationProps) {
  const [, setLocation] = useLocation();

  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/home" },
    { id: "search", label: "Search", icon: Search, path: "/search" },
    { id: "library", label: "Library", icon: BookOpen, path: "/library" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-spotify-card border-t border-spotify-muted z-30">
      <div className="flex justify-around items-center py-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center space-y-1 p-2 hover:bg-transparent focus:bg-transparent active:bg-transparent ${
                isActive ? "text-white hover:text-white focus:text-white active:text-white" : "text-spotify-muted hover:text-spotify-text focus:text-spotify-text active:text-spotify-text"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <Icon size={20} />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
