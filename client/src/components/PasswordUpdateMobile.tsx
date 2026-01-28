import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface PasswordUpdateMobileProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function PasswordUpdateMobile({ onSuccess, onCancel }: PasswordUpdateMobileProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setLoading(false);
      setSuccess(true);
      // Wait 2 seconds, sign out, then redirect to login
      setTimeout(async () => {
        await supabase.auth.signOut();
        onSuccess();
      }, 2000);
    }
  };

  // If success, show success screen
  if (success) {
    return (
      <div style={{ padding: '24px', background: '#ffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>
            ✅
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#262626', marginBottom: '12px' }}>
            Password Updated!
          </h2>
          <div style={{ fontSize: '14px', color: '#8e8e8e', lineHeight: '1.5' }}>
            Your password has been successfully updated. You can now log in with your new password.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <svg
            width="48"
            height="64"
            viewBox="0 0 48 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M26 4h-4v12H10v4h12v40h4V20h12v-4H26V4z"
              fill="#0095f6"
            />
          </svg>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#262626', marginBottom: '8px' }}>
          Create New Password
        </h2>
        <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
          Enter your new password below
        </div>
      </div>

      <form onSubmit={handleUpdatePassword}>
        {error && (
          <div
            style={{
              background: '#f8d7da',
              border: '1px solid #f5c2c7',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#842029',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#262626',
              marginBottom: '8px',
            }}
          >
            New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              data-testid="input-new-password"
              style={{
                width: '100%',
                padding: '12px',
                paddingRight: '40px',
                border: '1px solid #dbdbdb',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#fafafa',
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '14px',
                color: '#8e8e8e',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#262626',
              marginBottom: '8px',
            }}
          >
            Confirm Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            data-testid="input-confirm-password"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#fafafa',
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !newPassword || !confirmPassword}
          style={{
            width: '100%',
            background: newPassword && confirmPassword && !loading ? '#0095f6' : '#b3dffc',
            color: '#ffffff',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '16px',
            cursor: newPassword && confirmPassword && !loading ? 'pointer' : 'not-allowed',
          }}
          data-testid="button-update-password"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#0095f6',
            border: '1px solid #0095f6',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          data-testid="button-cancel-update"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
