import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMobileContext } from '@/contexts/MobileContext';
import { searchPosts, getTopTags } from '@/lib/posts';

interface MobileSearchPageProps {
  onOpenProfile: (userId: string) => void;
}

export const MobileSearchPage: React.FC<MobileSearchPageProps> = ({ 
  onOpenProfile 
}) => {
  const { user } = useAuth();
  const { profiles, setProfiles, engagementData } = useMobileContext();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [topTags, setTopTags] = useState<any[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  
  // Results state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger search when debounced query or tags change
  useEffect(() => {
    if (debouncedQuery.trim() || selectedTags.length > 0) {
      setIsSearchMode(true);
      performSearch();
    } else {
      setIsSearchMode(false);
      setSearchResults([]);
    }
  }, [debouncedQuery, selectedTags]);

  // Load top tags on mount
  useEffect(() => {
    loadTopTags();
  }, []);

  const loadTopTags = async () => {
    try {
      setTagsLoading(true);
      const result = await getTopTags();
      if (result.data && Array.isArray(result.data)) {
        setTopTags(result.data);
      }
    } catch (error) {
      console.error('Failed to load top tags:', error);
    } finally {
      setTagsLoading(false);
    }
  };

  const performSearch = async (cursor?: number | null) => {
    if (!debouncedQuery.trim() && selectedTags.length === 0) return;

    try {
      const isLoadMore = !!cursor;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setSearching(true);
        setSearchError('');
      }

      const result = await searchPosts({
        query: debouncedQuery.trim(),
        tags: selectedTags,
        limit: 20,
        cursor: cursor || undefined
      });

      if (result.error) {
        setSearchError(result.error);
        return;
      }

      const newResults = Array.isArray(result.data) ? result.data : [];
      
      if (isLoadMore) {
        setSearchResults(prev => [...prev, ...newResults]);
      } else {
        setSearchResults(newResults);
      }
      
      setNextCursor(result.nextCursor || null);

      // Load profiles for search results
      if (newResults.length > 0) {
        const authorIds = Array.from(
          new Set(newResults.map((p: any) => p.author_id || p.author).filter(Boolean))
        );
        
        if (authorIds.length > 0) {
          const { getProfilesByIds } = await import('@/lib/profiles');
          const profilesResult = await getProfilesByIds(authorIds);
          if (profilesResult?.data && Array.isArray(profilesResult.data)) {
            setProfiles(prev => {
              const next = new Map(prev);
              profilesResult.data.forEach((profile: any) => {
                next.set(profile.id, profile);
              });
              return next;
            });
          }
        }
      }

    } catch (error: any) {
      setSearchError(error?.message || 'Search failed');
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setIsSearchMode(false);
    setSearchResults([]);
    setSearchError('');
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      performSearch(nextCursor);
    }
  };

  if (!user) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Search Gospel Era
        </div>
        <div style={{ color: '#8e8e8e' }}>
          Sign in to search posts and discover content
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Search Input */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        background: '#ffffff',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ 
            position: 'relative', 
            flex: 1 
          }}>
            <input
              type="text"
              placeholder="Search Gospel Era..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #dbdbdb',
                borderRadius: '20px',
                fontSize: '16px',
                background: '#f8f8f8'
              }}
              data-testid="input-search"
            />
            {searching && (
              <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                color: '#8e8e8e'
              }}>
                Searching...
              </div>
            )}
          </div>
          
          {(searchQuery || selectedTags.length > 0) && (
            <button
              onClick={handleClearSearch}
              style={{
                background: '#f0f0f0',
                border: 'none',
                borderRadius: '16px',
                padding: '8px 16px',
                fontSize: '14px',
                color: '#262626',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '12px'
          }}>
            {selectedTags.map(tag => (
              <span
                key={tag}
                onClick={() => handleTagToggle(tag)}
                style={{
                  background: '#5A31F4',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                #{tag}
                <span style={{ marginLeft: '4px' }}>×</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Popular Topics */}
      {!isSearchMode && (
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#262626'
          }}>
            Popular Topics
          </div>
          
          {tagsLoading ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {Array(8).fill(0).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: '#f0f0f0',
                    height: '32px',
                    width: '80px',
                    borderRadius: '16px',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {topTags.map((tag) => (
                <button
                  key={tag.tag}
                  onClick={() => handleTagToggle(tag.tag)}
                  style={{
                    background: selectedTags.includes(tag.tag) ? '#5A31F4' : '#f8f8f8',
                    color: selectedTags.includes(tag.tag) ? 'white' : '#262626',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  data-testid={`button-tag-${tag.tag}`}
                >
                  #{tag.tag}
                  <span style={{
                    background: selectedTags.includes(tag.tag) ? 'rgba(255,255,255,0.3)' : '#e0e0e0',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '11px'
                  }}>
                    {tag.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      {isSearchMode && (
        <div style={{ padding: '0 16px' }}>
          {searchError && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '8px',
              margin: '16px 0',
              fontSize: '14px'
            }}>
              {searchError}
            </div>
          )}

          {searchResults.length === 0 && !searching ? (
            <div style={{ 
              padding: '40px 0', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                No results found
              </div>
              <div style={{ color: '#8e8e8e' }}>
                Try different keywords or tags
              </div>
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div style={{
                padding: '16px 0 8px',
                fontSize: '14px',
                color: '#8e8e8e'
              }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>

              {/* Results List */}
              {searchResults.map((post) => {
                const author = profiles.get(post.author_id || post.author);
                const engagement = engagementData.get(post.id) || {};
                
                return (
                  <div 
                    key={post.id} 
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      padding: '16px 0'
                    }}
                  >
                    {/* Post Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div
                        onClick={() => author && onOpenProfile(author.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: author?.avatar_url ? 'none' : '#dbdbdb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                      >
                        {author?.avatar_url ? (
                          <img
                            src={author.avatar_url.startsWith('/') ? author.avatar_url : `/public-objects/${author.avatar_url}`}
                            alt="Profile"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '14px', color: '#8e8e8e' }}>
                            {author?.username?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          onClick={() => author && onOpenProfile(author.id)}
                          style={{
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          {author?.username || 'Unknown User'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div style={{ marginBottom: '8px' }}>
                      {post.title && (
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          margin: '0 0 6px 0',
                          color: '#262626'
                        }}>
                          {post.title}
                        </h4>
                      )}
                      {post.content && (
                        <div style={{
                          fontSize: '14px',
                          lineHeight: '1.4',
                          color: '#262626',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {post.content.length > 200 
                            ? `${post.content.substring(0, 200)}...` 
                            : post.content
                          }
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginBottom: '8px'
                      }}>
                        {post.tags.map((tag: string) => (
                          <span
                            key={tag}
                            style={{
                              background: '#f0f0f0',
                              color: '#666',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Engagement */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '12px',
                      color: '#8e8e8e'
                    }}>
                      <span>❤️ {engagement.amenCount || 0}</span>
                      {engagement.isBookmarked && <span>🔖</span>}
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {nextCursor && (
                <div style={{ 
                  padding: '20px 0',
                  textAlign: 'center' 
                }}>
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      background: loadingMore ? '#ccc' : '#5A31F4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontSize: '14px',
                      cursor: loadingMore ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Getting Started Message */}
      {!isSearchMode && topTags.length === 0 && !tagsLoading && (
        <div style={{ 
          padding: '40px 20px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Discover Gospel Era
          </div>
          <div style={{ color: '#8e8e8e' }}>
            Search for posts, testimonies, prayers, and more
          </div>
        </div>
      )}
    </div>
  );
};