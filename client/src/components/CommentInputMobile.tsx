import { useState } from 'react';
import { validateFaithContent } from '../../../shared/moderation';

interface CommentInputMobileProps {
  postId: number;
  isBanned: boolean;
  onSubmit: (postId: number, content: string) => Promise<void>;
}

export function CommentInputMobile({ postId, isBanned, onSubmit }: CommentInputMobileProps) {
  // Local state - isolated to prevent focus loss
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const content = commentText.trim();
    
    if (!content) {
      return;
    }

    // Validate faith alignment
    const moderation = validateFaithContent(content);
    if (!moderation.isValid) {
      setError(moderation.reason || 'Content does not align with our Christ-centered community standards');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit(postId, content);
      // Clear local state after successful submission
      setCommentText('');
    } catch (err: any) {
      setError(err?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderTop: '1px solid #dbdbdb',
          background: '#fafafa',
        }}
      >
        <input
          type="text"
          placeholder={
            isBanned
              ? 'Account limited - cannot comment'
              : 'Add a comment...'
          }
          value={commentText}
          onChange={(e) => {
            setCommentText(e.target.value);
            setError('');
          }}
          onKeyPress={handleKeyPress}
          disabled={isBanned || isSubmitting}
          inputMode="text"
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck={true}
          data-testid={`input-comment-${postId}`}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #dbdbdb',
            borderRadius: '20px',
            fontSize: '14px',
            background: '#ffffff',
            color: '#262626',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!commentText.trim() || isSubmitting || isBanned}
          data-testid={`button-submit-comment-${postId}`}
          style={{
            marginLeft: '8px',
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            background: commentText.trim() && !isBanned ? '#4285f4' : '#dbdbdb',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: commentText.trim() && !isBanned ? 'pointer' : 'not-allowed',
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
      
      {error && (
        <div
          style={{
            padding: '8px 16px',
            background: '#fee',
            color: '#c00',
            fontSize: '12px',
            borderTop: '1px solid #fcc',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
