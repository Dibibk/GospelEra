import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { createPost } from '@/lib/posts';
import { validateAndNormalizeYouTubeUrl } from '../../../../shared/youtube';
import { validateFaithContent } from '../../../../shared/moderation';
import { ObjectUploader } from '@/components/ObjectUploader';

interface MobileCreatePostProps {
  onPostCreated: () => void;
  onCancel: () => void;
}

export const MobileCreatePost: React.FC<MobileCreatePostProps> = ({ 
  onPostCreated, 
  onCancel 
}) => {
  const { user } = useAuth();
  const { role } = useRole();
  
  // Form state
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createTags, setCreateTags] = useState('');
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // UI state
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [moderationError, setModerationError] = useState('');
  
  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  const handleCreatePost = async () => {
    if (!user) return;
    
    if (role === 'banned') {
      setError('Your account is limited. You cannot create posts.');
      return;
    }

    if (!createTitle.trim() && !createContent.trim() && mediaFiles.length === 0) {
      setError('Please add a title, content, or media');
      return;
    }

    setCreating(true);
    setError('');
    setModerationError('');

    try {
      // Validate faith content
      const titleCheck = await validateFaithContent(createTitle);
      if (!titleCheck.allowed) {
        setModerationError(titleCheck.message || 'Title contains inappropriate content');
        setCreating(false);
        return;
      }

      const contentCheck = await validateFaithContent(createContent);
      if (!contentCheck.allowed) {
        setModerationError(contentCheck.message || 'Content contains inappropriate content');
        setCreating(false);
        return;
      }

      // Process YouTube URL
      let processedYouTubeUrl = '';
      if (youtubeUrl.trim()) {
        try {
          const validation = validateAndNormalizeYouTubeUrl(youtubeUrl.trim());
          if (!validation.isValid) {
            setYoutubeError(validation.error || 'Invalid YouTube URL');
            setCreating(false);
            return;
          }
          processedYouTubeUrl = validation.normalizedUrl || '';
        } catch (err) {
          setYoutubeError('Invalid YouTube URL format');
          setCreating(false);
          return;
        }
      }

      // Create post
      const result = await createPost({
        title: createTitle.trim(),
        content: createContent.trim(),
        tags: createTags.trim() ? createTags.split(',').map(t => t.trim()).filter(Boolean) : [],
        media_urls: mediaFiles,
        youtube_url: processedYouTubeUrl || null,
        author_id: user.id
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Reset form
      setCreateTitle('');
      setCreateContent('');
      setCreateTags('');
      setMediaFiles([]);
      setYoutubeUrl('');
      setYoutubeError('');
      
      // Notify parent
      onPostCreated();
      
    } catch (err: any) {
      setError(err?.message || 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const handleMediaUploaded = (urls: string[]) => {
    setMediaFiles(prev => [...prev, ...urls]);
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!user) {
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center' 
      }}>
        <div style={{ fontSize: '18px', marginBottom: '10px' }}>
          Sign in to create posts
        </div>
        <div style={{ color: '#8e8e8e' }}>
          Join the Gospel Era community to share your faith
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#ffffff', 
      minHeight: '100vh',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            color: '#8e8e8e',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <h2 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: 0
        }}>
          Create Post
        </h2>
        <button
          onClick={handleCreatePost}
          disabled={creating || role === 'banned'}
          style={{
            background: creating ? '#ccc' : '#5A31F4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: creating ? 'not-allowed' : 'pointer',
            opacity: role === 'banned' ? 0.5 : 1
          }}
          data-testid="button-submit-post"
        >
          {creating ? 'Creating...' : 'Share'}
        </button>
      </div>

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
      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
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
            Gospel Era is a Christ-centered community. Please share content that reflects our faith and values.
          </div>
        </div>
      )}

      {youtubeError && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {youtubeError}
        </div>
      )}

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title Input */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#262626'
          }}>
            📝 Title
          </label>
          <input
            ref={titleInputRef}
            type="text"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="What's your message about?"
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
            data-testid="input-post-title"
          />
        </div>

        {/* Content Input */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#262626'
          }}>
            ❤️ Share your heart
          </label>
          <textarea
            ref={contentInputRef}
            value={createContent}
            onChange={(e) => setCreateContent(e.target.value)}
            placeholder="Share your faith, testimony, prayer request, or encouragement..."
            disabled={role === 'banned'}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '16px',
              resize: 'vertical',
              fontFamily: 'inherit',
              background: role === 'banned' ? '#f8f8f8' : '#ffffff',
              opacity: role === 'banned' ? 0.6 : 1
            }}
            data-testid="input-post-content"
          />
        </div>

        {/* Tags Input */}
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
            value={createTags}
            onChange={(e) => setCreateTags(e.target.value)}
            placeholder="prayer, testimony, encouragement (comma separated)"
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
            data-testid="input-post-tags"
          />
        </div>

        {/* YouTube URL Input */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#262626'
          }}>
            🎥 YouTube Video (optional)
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
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
            data-testid="input-youtube-url"
          />
        </div>

        {/* Media Upload */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#262626'
          }}>
            📸 Photos & Videos (optional)
          </label>
          
          {role !== 'banned' && (
            <ObjectUploader
              onUpload={handleMediaUploaded}
              multiple={true}
              acceptedTypes={['image/*', 'video/*']}
              maxFiles={5}
            />
          )}

          {/* Display uploaded media */}
          {mediaFiles.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '8px',
              marginTop: '12px'
            }}>
              {mediaFiles.map((url, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                  <button
                    onClick={() => removeMedia(index)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Guidelines Note */}
        <div style={{
          background: '#f8f9fa',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6c757d',
          border: '1px solid #e9ecef'
        }}>
          💡 Share content that glorifies God and encourages fellow believers. 
          Posts are reviewed to maintain our Christ-centered community standards.
        </div>
      </div>
    </div>
  );
};