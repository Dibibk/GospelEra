import { useState } from 'react';

interface PrayerRequest {
  id: string;
  name: string;
  request: string;
  prayed_count: number;
  created_at: string;
}

interface PrayerRequestFormData {
  name: string;
  request: string;
}

export function PrayerRequestCard() {
  const [formData, setFormData] = useState<PrayerRequestFormData>({ name: '', request: '' });
  const [animatingCounts, setAnimatingCounts] = useState<Set<string>>(new Set());

  // Mock data for demonstration - in a real app this would come from API
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([
    {
      id: '1',
      name: 'Sarah M.',
      request: 'Please pray for my family during this difficult time. We are facing financial hardship and need strength and guidance.',
      prayed_count: 12,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: '2', 
      name: 'John D.',
      request: 'Prayers needed for my mother who is in the hospital. May God grant her healing and peace.',
      prayed_count: 8,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    },
    {
      id: '3',
      name: 'Maria L.',
      request: 'Seeking prayers for wisdom as I make important life decisions. May His will be done.',
      prayed_count: 15,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && formData.request.trim()) {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        const newRequest: PrayerRequest = {
          id: Date.now().toString(),
          name: formData.name,
          request: formData.request,
          prayed_count: 0,
          created_at: new Date().toISOString()
        };
        
        setPrayerRequests(prev => [newRequest, ...prev]);
        setFormData({ name: '', request: '' });
        setIsLoading(false);
      }, 1000);
    }
  };

  const handlePray = (requestId: string) => {
    // Animate count increase
    setAnimatingCounts(prev => new Set(prev).add(requestId));
    setTimeout(() => {
      setAnimatingCounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }, 600);
    
    // Update prayer count
    setPrayerRequests(prev => 
      prev.map(request => 
        request.id === requestId 
          ? { ...request, prayed_count: request.prayed_count + 1 }
          : request
      )
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <div className="faith-card-gradient shadow-lg rounded-xl border border-purple-200/30 overflow-hidden animate-fadeInUp">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 px-8 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/5"></div>
        <div className="relative flex items-center space-x-3">
          <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
            <span className="text-2xl">🙏</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-white">Prayer Requests</h2>
        </div>
        
        {/* Subtle cross watermark */}
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 opacity-10">
          <svg className="h-16 w-16 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L13.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
          </svg>
        </div>
      </div>

      <div className="p-8">
        {/* Submit Prayer Request Form */}
        <div className="mb-8">
          <h3 className="text-lg font-serif font-semibold text-purple-800 mb-4 flex items-center">
            <span className="text-yellow-500 mr-2">✨</span>
            Share Your Prayer Request
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Your Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-medium bg-white/80 backdrop-blur-sm text-purple-900 placeholder-purple-400 transition-all duration-200"
                required
              />
            </div>
            
            <div>
              <textarea
                placeholder="Write your prayer request here... Share what's on your heart."
                value={formData.request}
                onChange={(e) => setFormData(prev => ({ ...prev, request: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-medium bg-white/80 backdrop-blur-sm text-purple-900 placeholder-purple-400 transition-all duration-200 resize-none"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.request.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">🙏</span>
                  <span>Submit Prayer Request</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="border-t border-purple-200/50 my-8"></div>

        {/* Prayer Requests List */}
        <div>
          <h3 className="text-lg font-serif font-semibold text-purple-800 mb-6 flex items-center">
            <span className="text-yellow-500 mr-2">💝</span>
            Community Prayer Requests
          </h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-300 border-t-purple-600"></div>
                <span className="text-purple-600">Loading prayer requests...</span>
              </div>
            </div>
          ) : prayerRequests.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🕊️</span>
              </div>
              <h4 className="text-lg font-serif font-semibold text-purple-800 mb-2">No Prayer Requests Yet</h4>
              <p className="text-purple-600">Be the first to share your heart with our community</p>
            </div>
          ) : (
            <div className="space-y-4">
              {prayerRequests.map((request: PrayerRequest, index: number) => (
                <div 
                  key={request.id} 
                  className="faith-card-gradient rounded-xl p-6 border border-purple-100/50 shadow-sm relative overflow-hidden animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Light cross watermark */}
                  <div className="absolute right-4 top-4 opacity-5">
                    <svg className="h-12 w-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v12M6 12h12" />
                    </svg>
                  </div>
                  
                  <div className="relative">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-purple-800 text-sm">{request.name}</h4>
                        <p className="text-xs text-purple-500">{formatDate(request.created_at)}</p>
                      </div>
                      
                      {/* Prayed count badge */}
                      <div className={`flex items-center space-x-1 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-sm transition-all duration-300 ${
                        animatingCounts.has(request.id) ? 'scale-110 animate-pulse' : 'scale-100'
                      }`}>
                        <span className="text-xs">🙏</span>
                        <span>{request.prayed_count}</span>
                      </div>
                    </div>
                    
                    <p className="text-purple-800 font-medium italic leading-relaxed mb-4 text-sm">
                      "{request.request}"
                    </p>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => handlePray(request.id)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-800 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        <span className="text-base">🙏</span>
                        <span>I Prayed</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}