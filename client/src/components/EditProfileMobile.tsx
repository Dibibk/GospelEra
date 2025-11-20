import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { upsertMyProfile } from '@/lib/profiles';

interface EditProfileMobileProps {
  profile: any;
  onBack: () => void;
  onSuccess: () => void;
}

export function EditProfileMobile({ profile, onBack, onSuccess }: EditProfileMobileProps) {
  const { user } = useAuth();
  // Local edit buffers - isolated state prevents focus loss
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Initialize edit buffers from profile prop
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || user?.email || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile, user?.email]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const { data, error: saveError } = await upsertMyProfile({
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl,
    });

    if (saveError) {
      setError((saveError as any).message || 'Failed to save profile');
      setSaving(false);
    } else {
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onBack();
  };

  const handleAvatarUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files[0]) {
        try {
          const { supabase } = await import('../lib/supabaseClient');
          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          
          const response = await fetch('/api/objects/upload', {
            method: 'POST',
            headers,
          });

          if (!response.ok) {
            throw new Error('Failed to get upload URL');
          }

          const { uploadURL } = await response.json();

          const uploadResponse = await fetch(uploadURL, {
            method: 'PUT',
            body: files[0],
            headers: {
              'Content-Type': files[0].type,
            },
          });

          if (uploadResponse.ok) {
            const headersForAvatar: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            
            if (session?.access_token) {
              headersForAvatar['Authorization'] = `Bearer ${session.access_token}`;
            }
            
            const avatarResponse = await fetch('/api/avatar', {
              method: 'PUT',
              headers: headersForAvatar,
              body: JSON.stringify({ avatarURL: uploadURL }),
            });

            if (avatarResponse.ok) {
              const { objectPath } = await avatarResponse.json();
              setAvatarUrl(objectPath);
              setSuccess('Avatar updated successfully!');
              setTimeout(() => setSuccess(''), 3000);
            } else {
              setError('Failed to process uploaded image');
            }
          }
        } catch (error) {
          console.error('Upload error:', error);
          setError('Failed to upload avatar');
        }
      }
    };
    input.click();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: '#ffffff',
        color: '#000000',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e5e5',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleCancel}
              data-testid="button-cancel"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                padding: '0',
                marginRight: '12px',
                cursor: 'pointer',
                color: '#000000',
              }}
            >
              ←
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: avatarUrl ? 'none' : '#e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '16px', color: '#8e8e8e' }}>👤</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#000000' }}>
                  Edit Profile
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                  {profile?.display_name || user?.email} • Member since{' '}
                  {new Date(profile?.created_at || user?.created_at || new Date()).toLocaleDateString(
                    'en-US',
                    { month: 'short', year: 'numeric' }
                  )}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="button-save"
            style={{
              background: '#4285f4',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Avatar Section */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: '#f0f0f0',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#e5e5e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  color: '#8e8e8e',
                  margin: '0 auto',
                }}
              >
                👤
              </div>
            )}
          </div>
          <div
            onClick={handleAvatarUpload}
            data-testid="button-change-photo"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#4285f4',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <span>📷</span>
            <span>Change Photo</span>
          </div>
        </div>

        {/* Profile Information */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#000000',
              marginBottom: '16px',
            }}
          >
            Profile Information
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#000000',
                marginBottom: '6px',
              }}
            >
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              inputMode="text"
              autoCapitalize="words"
              autoCorrect="on"
              spellCheck={true}
              data-testid="input-display-name"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #dbdbdb',
                borderRadius: '8px',
                fontSize: '16px',
                background: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#000000',
                marginBottom: '6px',
              }}
            >
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
              data-testid="input-bio"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #dbdbdb',
                borderRadius: '8px',
                fontSize: '16px',
                background: '#ffffff',
                color: '#000000',
                resize: 'vertical',
                minHeight: '80px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '20px',
            right: '20px',
            background: '#dc3545',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center',
            zIndex: 1000,
          }}
        >
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '20px',
            right: '20px',
            background: '#000000',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            textAlign: 'center',
            zIndex: 1000,
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
}
