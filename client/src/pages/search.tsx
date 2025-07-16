import { Search as SearchIcon } from "lucide-react";
import BottomNavigation from "../components/bottom-navigation";

export function SearchPage() {
  return (
    <div className="min-h-screen spotify-bg">
      {/* Header */}
      <div className="sticky top-0 spotify-bg/95 backdrop-blur-sm border-b" style={{ borderColor: 'var(--spotify-border)' }} >
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="spotify-heading-lg mb-4">Search</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 spotify-text-secondary" size={20} />
            <input
              type="text"
              placeholder="What do you want to learn?"
              className="w-full rounded-full pl-10 pr-4 py-3 spotify-text-primary focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{ 
                backgroundColor: 'var(--spotify-light-gray)',
                border: '1px solid var(--spotify-border)',
                color: 'var(--spotify-text-primary)'
              }}
              disabled
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 pb-32">
        {/* Coming Soon Section */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="spotify-card p-8 max-w-md">
            <SearchIcon className="mx-auto mb-6" style={{ color: 'var(--spotify-green)' }} size={64} />
            
            <h2 className="spotify-heading-lg mb-4">Coming Soon</h2>
            
            <p className="spotify-text-secondary text-lg mb-6">
              Soon you'll be able to search for all of your favorite songs
            </p>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--spotify-green)' }}></div>
                <span className="spotify-text-secondary">Search by song title</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--spotify-green)' }}></div>
                <span className="spotify-text-secondary">Filter by artist</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--spotify-green)' }}></div>
                <span className="spotify-text-secondary">Browse by genre</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--spotify-green)' }}></div>
                <span className="spotify-text-secondary">Find by difficulty level</span>
              </div>
            </div>
          </div>
        </div>

        {/* Browse Categories Placeholder */}
        <div className="mt-12">
          <h3 className="spotify-heading-md mb-6">Browse all</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Category Cards */}
            {[
              { name: "Pop", color: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)" },
              { name: "Rock", color: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)" },
              { name: "Hip-Hop", color: "linear-gradient(135deg, #eab308 0%, #ef4444 100%)" },
              { name: "Electronic", color: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" },
              { name: "Jazz", color: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)" },
              { name: "Classical", color: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" },
              { name: "R&B", color: "linear-gradient(135deg, #ec4899 0%, #ef4444 100%)" },
              { name: "Country", color: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" },
            ].map((category) => (
              <div
                key={category.name}
                className="rounded-lg aspect-square flex items-end p-4 cursor-not-allowed opacity-60 relative overflow-hidden transition-opacity hover:opacity-70"
                style={{ background: category.color }}
              >
                <h4 className="spotify-heading-sm font-bold drop-shadow-lg" style={{ color: 'var(--spotify-white)' }}>
                  {category.name}
                </h4>
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Searches Placeholder */}
        <div className="mt-12">
          <h3 className="spotify-heading-md mb-6">Recent searches</h3>
          <div className="text-center py-8">
            <p className="spotify-text-muted">No recent searches</p>
          </div>
        </div>
      </div>

      <BottomNavigation currentPage="search" />
    </div>
  );
}