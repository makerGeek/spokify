import { Search as SearchIcon } from "lucide-react";
import BottomNavigation from "../components/bottom-navigation";

export function SearchPage() {
  return (
    <div className="min-h-screen bg-spotify-dark text-spotify-text">
      {/* Header */}
      <div className="sticky top-0 bg-spotify-dark/95 backdrop-blur-sm border-b border-spotify-border z-10">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="spotify-heading-lg mb-4">Search</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-spotify-text-secondary" size={20} />
            <input
              type="text"
              placeholder="What do you want to learn?"
              className="w-full bg-spotify-surface border border-spotify-border rounded-full pl-10 pr-4 py-3 text-spotify-text placeholder-spotify-text-secondary focus:outline-none focus:ring-2 focus:ring-spotify-green focus:border-transparent"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 pb-32">
        {/* Coming Soon Section */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="bg-spotify-surface rounded-lg p-8 max-w-md">
            <SearchIcon className="mx-auto mb-6 text-spotify-green" size={64} />
            
            <h2 className="spotify-heading-lg mb-4">Coming Soon</h2>
            
            <p className="spotify-text-secondary text-lg mb-6">
              Soon you'll be able to search for all of your favorite songs
            </p>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-spotify-green rounded-full"></div>
                <span className="spotify-text-secondary">Search by song title</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-spotify-green rounded-full"></div>
                <span className="spotify-text-secondary">Filter by artist</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-spotify-green rounded-full"></div>
                <span className="spotify-text-secondary">Browse by genre</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-spotify-green rounded-full"></div>
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
              { name: "Pop", color: "bg-gradient-to-br from-purple-500 to-pink-500" },
              { name: "Rock", color: "bg-gradient-to-br from-red-500 to-orange-500" },
              { name: "Hip-Hop", color: "bg-gradient-to-br from-yellow-500 to-red-500" },
              { name: "Electronic", color: "bg-gradient-to-br from-blue-500 to-purple-500" },
              { name: "Jazz", color: "bg-gradient-to-br from-green-500 to-blue-500" },
              { name: "Classical", color: "bg-gradient-to-br from-indigo-500 to-purple-500" },
              { name: "R&B", color: "bg-gradient-to-br from-pink-500 to-red-500" },
              { name: "Country", color: "bg-gradient-to-br from-amber-500 to-orange-500" },
            ].map((category) => (
              <div
                key={category.name}
                className={`${category.color} rounded-lg aspect-square flex items-end p-4 cursor-not-allowed opacity-60 relative overflow-hidden`}
              >
                <h4 className="spotify-heading-sm text-white font-bold drop-shadow-lg">
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
            <p className="spotify-text-secondary">No recent searches</p>
          </div>
        </div>
      </div>

      <BottomNavigation currentPage="search" />
    </div>
  );
}