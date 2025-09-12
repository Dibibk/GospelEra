import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { 
  listPrayerRequests, 
  createPrayerRequest, 
  commitToPray, 
  confirmPrayed 
} from '@/lib/prayer';
import { validateFaithContent } from '../../../../shared/moderation';

interface MobilePrayerPageProps {
  onOpenPrayerDetail: (prayerId: number) => void;
}

export const MobilePrayerPage: React.FC<MobilePrayerPageProps> = ({ 
  onOpenPrayerDetail 
}) => {
  const { user } = useAuth();
  const { role } = useRole();
  
  // Tab state
  const [prayerTab, setPrayerTab] = useState(0); // 0: Browse, 1: Create
  
  // Prayer requests state
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState('');
  
  // Create form state
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerDetails, setPrayerDetails] = useState('');
  const [prayerTags, setPrayerTags] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [moderationError, setModerationError] = useState('');
  
  // Interaction state
  const [committingToId, setCommittingToId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  // Load prayer requests on mount and tab change
  useEffect(() => {
    if (prayerTab === 0) {
      loadPrayerRequests();
    }
  }, [prayerTab]);

  const loadPrayerRequests = async (cursor?: number | null) => {
    try {
      const isLoadMore = !!cursor;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
      }

      const result = await listPrayerRequests({ 
        limit: 20,
        cursor: cursor || undefined
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      const newRequests = Array.isArray(result.data) ? result.data : [];
      
      if (isLoadMore) {
        setPrayerRequests(prev => [...prev, ...newRequests]);
      } else {
        setPrayerRequests(newRequests);
      }
      
      setNextCursor(result.nextCursor || null);

    } catch (err: any) {
      setError(err?.message || 'Failed to load prayer requests');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCreatePrayerRequest = async () => {
    if (!user) return;
    
    if (role === 'banned') {
      setCreateError('Your account is limited. You cannot create prayer requests.');
      return;
    }

    if (!prayerTitle.trim() && !prayerDetails.trim()) {
      setCreateError('Please provide a title or details for your prayer request');
      return;
    }

    setCreating(true);
    setCreateError('');
    setModerationError('');

    try {
      // Validate faith content
      const titleCheck = await validateFaithContent(prayerTitle);
      if (!titleCheck.allowed) {
        setModerationError(titleCheck.message || 'Title contains inappropriate content');
        setCreating(false);
        return;
      }

      const detailsCheck = await validateFaithContent(prayerDetails);
      if (!detailsCheck.allowed) {
        setModerationError(detailsCheck.message || 'Details contain inappropriate content');
        setCreating(false);
        return;
      }

      // Create prayer request
      const result = await createPrayerRequest({
        title: prayerTitle.trim(),
        details: prayerDetails.trim(),
        tags: prayerTags.trim() ? prayerTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        is_anonymous: isAnonymous
      });

      if (result.error) {
        setCreateError(result.error);
        return;
      }

      // Reset form
      setPrayerTitle('');
      setPrayerDetails('');
      setPrayerTags('');
      setIsAnonymous(false);
      
      // Switch to browse tab and refresh
      setPrayerTab(0);
      loadPrayerRequests();
      
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create prayer request');
    } finally {
      setCreating(false);
    }
  };

  const handleCommitToPray = async (prayerId: number) => {
    if (!user || committingToId) return;

    setCommittingToId(prayerId);
    try {
      const result = await commitToPray(prayerId);
      if (result.error) {
        console.error('Failed to commit to pray:', result.error);
        return;
      }

      // Update the prayer request in the list
      setPrayerRequests(prev => 
        prev.map(prayer => 
          prayer.id === prayerId 
            ? { ...prayer, commitment_count: (prayer.commitment_count || 0) + 1, user_committed: true }
            : prayer
        )
      );
      
    } catch (error) {
      console.error('Failed to commit to pray:', error);
    } finally {
      setCommittingToId(null);
    }
  };

  const handleConfirmPrayed = async (prayerId: number) => {
    if (!user || confirmingId) return;

    setConfirmingId(prayerId);
    try {
      const result = await confirmPrayed(prayerId);
      if (result.error) {
        console.error('Failed to confirm prayed:', result.error);
        return;
      }

      // Update the prayer request
      setPrayerRequests(prev => 
        prev.map(prayer => 
          prayer.id === prayerId 
            ? { ...prayer, prayer_count: (prayer.prayer_count || 0) + 1 }
            : prayer
        )
      );
      
    } catch (error) {
      console.error('Failed to confirm prayed:', error);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      loadPrayerRequests(nextCursor);
    }
  };

  if (!user) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Prayer Community
        </div>
        <div style={{ color: '#8e8e8e' }}>
          Sign in to share prayer requests and pray with the community
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #f0f0f0',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <button
          onClick={() => setPrayerTab(0)}
          style={{
            flex: 1,
            padding: '16px',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            fontWeight: prayerTab === 0 ? '600' : '400',
            color: prayerTab === 0 ? '#5A31F4' : '#8e8e8e',
            borderBottom: prayerTab === 0 ? '2px solid #5A31F4' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Browse Requests
        </button>
        <button
          onClick={() => setPrayerTab(1)}
          style={{
            flex: 1,
            padding: '16px',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            fontWeight: prayerTab === 1 ? '600' : '400',
            color: prayerTab === 1 ? '#5A31F4' : '#8e8e8e',
            borderBottom: prayerTab === 1 ? '2px solid #5A31F4' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Share Request
        </button>
      </div>

      {/* Browse Tab */}
      {prayerTab === 0 && (
        <div>
          {/* Error Message */}
          {error && (
            <div style={{
              margin: '16px',
              padding: '12px',
              background: '#fee',
              color: '#c33',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '200px' 
            }}>
              <div style={{ fontSize: '20px', color: '#8e8e8e' }}>Loading prayers...</div>
            </div>
          ) : prayerRequests.length === 0 ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                No prayer requests yet
              </div>
              <div style={{ color: '#8e8e8e', marginBottom: '20px' }}>
                Be the first to share a prayer request with the community
              </div>
              <button
                onClick={() => setPrayerTab(1)}
                style={{
                  background: '#5A31F4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Share Prayer Request
              </button>
            </div>
          ) : (
            <>
              {/* Prayer Requests List */}
              {prayerRequests.map((prayer) => (
                <div key={prayer.id} style={{
                  padding: '16px',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#8e8e8e'
                    }}>
                      {prayer.is_anonymous ? 'Anonymous' : prayer.author_username || 'Prayer Warrior'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#8e8e8e'
                    }}>
                      {new Date(prayer.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Content */}
                  <div 
                    onClick={() => onOpenPrayerDetail(prayer.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {prayer.title && (
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0 0 8px 0',
                        color: '#262626'
                      }}>
                        {prayer.title}
                      </h4>
                    )}
                    {prayer.details && (
                      <p style={{
                        fontSize: '14px',
                        lineHeight: '1.4',
                        color: '#262626',
                        margin: '0 0 12px 0'
                      }}>
                        {prayer.details.length > 150 
                          ? `${prayer.details.substring(0, 150)}...` 
                          : prayer.details
                        }
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {prayer.tags && prayer.tags.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '12px'
                    }}>
                      {prayer.tags.map((tag: string) => (
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

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    {!prayer.user_committed ? (
                      <button
                        onClick={() => handleCommitToPray(prayer.id)}
                        disabled={committingToId === prayer.id}
                        style={{
                          background: '#5A31F4',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: committingToId === prayer.id ? 'not-allowed' : 'pointer',
                          opacity: committingToId === prayer.id ? 0.6 : 1
                        }}
                        data-testid={`button-commit-${prayer.id}`}
                      >
                        {committingToId === prayer.id ? 'Committing...' : '🙏 Pray'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConfirmPrayed(prayer.id)}
                        disabled={confirmingId === prayer.id}
                        style={{
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: confirmingId === prayer.id ? 'not-allowed' : 'pointer',
                          opacity: confirmingId === prayer.id ? 0.6 : 1
                        }}
                        data-testid={`button-confirm-${prayer.id}`}
                      >
                        {confirmingId === prayer.id ? 'Confirming...' : '✅ Prayed'}
                      </button>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      color: '#8e8e8e'
                    }}>
                      <span>🙏 {prayer.commitment_count || 0} committed</span>
                      <span>✅ {prayer.prayer_count || 0} prayed</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {nextCursor && (
                <div style={{ 
                  padding: '20px',
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

      {/* Create Tab */}
      {prayerTab === 1 && (
        <div style={{ padding: '16px' }}>
          {/* Banned User Banner */}
          {role === 'banned' && (
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#856404'
            }}>
              ⚠️ Account limited. You can read but cannot post or comment.
            </div>
          )}

          {/* Error Messages */}
          {createError && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {createError}
            </div>
          )}

          {moderationError && (
            <div style={{
              background: '#fff3cd',
              color: '#856404',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                Content Guidelines
              </div>
              {moderationError}
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                Prayer requests should reflect our Christ-centered community values.
              </div>
            </div>
          )}

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Title */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#262626'
              }}>
                🙏 Prayer Request Title
              </label>
              <input
                type="text"
                value={prayerTitle}
                onChange={(e) => setPrayerTitle(e.target.value)}
                placeholder="What can we pray for?"
                disabled={role === 'banned'}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: role === 'banned' ? '#f8f8f8' : '#ffffff',
                  opacity: role === 'banned' ? 0.6 : 1
                }}
                data-testid="input-prayer-title"
              />
            </div>

            {/* Details */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#262626'
              }}>
                📝 Prayer Details
              </label>
              <textarea
                value={prayerDetails}
                onChange={(e) => setPrayerDetails(e.target.value)}
                placeholder="Share more details about your prayer request..."
                disabled={role === 'banned'}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  background: role === 'banned' ? '#f8f8f8' : '#ffffff',
                  opacity: role === 'banned' ? 0.6 : 1
                }}
                data-testid="input-prayer-details"
              />
            </div>

            {/* Tags */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#262626'
              }}>
                🏷️ Tags (optional)
              </label>
              <input
                type="text"
                value={prayerTags}
                onChange={(e) => setPrayerTags(e.target.value)}
                placeholder="healing, family, guidance (comma separated)"
                disabled={role === 'banned'}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dbdbdb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: role === 'banned' ? '#f8f8f8' : '#ffffff',
                  opacity: role === 'banned' ? 0.6 : 1
                }}
                data-testid="input-prayer-tags"
              />
            </div>

            {/* Anonymous Option */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                disabled={role === 'banned'}
                style={{
                  opacity: role === 'banned' ? 0.6 : 1
                }}
              />
              <label 
                htmlFor="anonymous"
                style={{
                  fontSize: '14px',
                  color: '#262626',
                  opacity: role === 'banned' ? 0.6 : 1
                }}
              >
                Post anonymously
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleCreatePrayerRequest}
              disabled={creating || role === 'banned'}
              style={{
                background: creating ? '#ccc' : '#5A31F4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: creating ? 'not-allowed' : 'pointer',
                opacity: role === 'banned' ? 0.5 : 1
              }}
              data-testid="button-submit-prayer"
            >
              {creating ? 'Sharing...' : 'Share Prayer Request'}
            </button>

            {/* Guidelines Note */}
            <div style={{
              background: '#f8f9fa',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#6c757d',
              border: '1px solid #e9ecef'
            }}>
              💡 Share prayer requests that bring glory to God and encourage fellow believers. 
              Our community will join you in prayer and support.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};