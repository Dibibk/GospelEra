import { useState } from 'react';
import { validateFaithContent } from '../../../shared/moderation';
import { createPrayerRequest } from '@/lib/prayer';

interface PrayerNewMobileProps {
  onBack: () => void;
  onSuccess: () => void;
  isBanned: boolean;
}

export function PrayerNewMobile({ onBack, onSuccess, isBanned }: PrayerNewMobileProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [tags, setTags] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !details.trim()) {
      setError('Please fill in both title and details');
      return;
    }

    if (isBanned) {
      alert('Your account is limited. You cannot create prayer requests.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const titleText = title.trim();
    const detailsText = details.trim();

    // Faith-centered validation
    const titleValidation = validateFaithContent(titleText);
    const detailsValidation = validateFaithContent(detailsText);

    if (!titleValidation.isValid && !detailsValidation.isValid) {
      setError(
        titleValidation.reason ||
          'Please keep your prayer request centered on Jesus or Scripture.'
      );
      setIsSubmitting(false);
      return;
    }

    // Process tags
    const tagsArray = tags.trim()
      ? tags.split(',').map((tag) => tag.trim())
      : [];

    try {
      const result = await createPrayerRequest({
        title: titleText,
        details: detailsText,
        tags: tagsArray,
        is_anonymous: isAnonymous,
      });

      if (result.data) {
        // Clear form
        setTitle('');
        setDetails('');
        setTags('');
        setIsAnonymous(false);
        setError('');
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating prayer request:', error);
      setError('Failed to create prayer request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid #dbdbdb',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          data-testid="button-back"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0',
            color: '#262626',
          }}
        >
          ←
        </button>
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>
          New Prayer Request
        </div>
        <div style={{ width: '24px' }} />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '16px' }}>
        {/* Title Input */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="prayer-title"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#262626',
              marginBottom: '8px',
            }}
          >
            Prayer Title
          </label>
          <input
            id="prayer-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isBanned || isSubmitting}
            placeholder="What can we pray for?"
            data-testid="input-prayer-title"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Details Textarea */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="prayer-details"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#262626',
              marginBottom: '8px',
            }}
          >
            Prayer Details
          </label>
          <textarea
            id="prayer-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            disabled={isBanned || isSubmitting}
            placeholder="Share the details of your prayer request..."
            data-testid="input-prayer-details"
            rows={6}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tags Input */}
        <div style={{ marginBottom: '16px' }}>
          <label
            htmlFor="prayer-tags"
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#262626',
              marginBottom: '8px',
            }}
          >
            Tags (comma-separated)
          </label>
          <input
            id="prayer-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={isBanned || isSubmitting}
            placeholder="healing, family, guidance"
            data-testid="input-prayer-tags"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Anonymous Checkbox */}
        <div style={{ marginBottom: '24px', padding: '12px', background: '#f7f7f7', borderRadius: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              gap: '12px',
            }}
          >
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={isBanned || isSubmitting}
              data-testid="checkbox-anonymous"
              style={{
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                accentColor: '#0095f6',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#262626', marginBottom: '2px' }}>
                Post anonymously
              </div>
              <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                Your identity will remain private
              </div>
            </div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '12px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              fontSize: '14px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isBanned || isSubmitting || !title.trim() || !details.trim()}
          data-testid="button-submit-prayer"
          style={{
            width: '100%',
            padding: '14px',
            background: isBanned || isSubmitting || !title.trim() || !details.trim()
              ? '#dbdbdb'
              : '#4285f4',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: isBanned || isSubmitting || !title.trim() || !details.trim()
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Prayer Request'}
        </button>

        {isBanned && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              color: '#856404',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            Your account is limited. You cannot create prayer requests.
          </div>
        )}
      </form>
    </div>
  );
}
