import { useState, useRef, type RefObject } from 'react';
import { useAuth } from '@/hooks/useAuth';
import logoImage from '@assets/FaithCore (1)_1763003127704.png';

interface LoginMobileProps {
  onSuccess: () => void;
}

export function LoginMobile({ onSuccess }: LoginMobileProps) {
  const { signIn, signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [success, setSuccess] = useState('');
  const [faithAffirmed, setFaithAffirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const keepFocus = (
    ref: RefObject<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const node = ref.current;
    if (!node) return;
    if (document.activeElement !== node) {
      node.focus({ preventScroll: true });
      try {
        node.setSelectionRange(node.value.length, node.value.length);
      } catch {}
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (isSignUp && !faithAffirmed) {
      setLoginError('Please affirm your faith to create an account.');
      return;
    }

    setLoading(true);
    setLoginError('');
    setSuccess('');
    
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setLoginError(error.message);
    } else {
      if (isSignUp) {
        setSuccess(
          "If this email doesn't already have an account, you'll receive a confirmation email."
        );
      }
      setEmail('');
      setPassword('');
      setFaithAffirmed(false);
      if (!isSignUp) {
        onSuccess();
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src={logoImage}
            alt="Gospel Era Cross"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
            }}
          />
        </div>
        <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
          {isSignUp
            ? 'Create your account to share faith and fellowship'
            : 'Connect with believers worldwide'}
        </div>
      </div>

      {loginError && (
        <div
          style={{
            background: '#fee',
            border: '1px solid #fcc',
            color: '#c00',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {loginError}
        </div>
      )}

      {success && (
        <div
          style={{
            background: '#e7f5e7',
            border: '1px solid #9fd99f',
            color: '#2e7d2e',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center',
          }}
        >
          {success}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <input
          ref={emailRef}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            keepFocus(emailRef);
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #dbdbdb',
            borderRadius: '8px',
            fontSize: '16px',
            marginBottom: '12px',
            outline: 'none',
          }}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        
        {/* Password field with visibility toggle */}
        <div style={{ position: 'relative' }}>
          <input
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              keepFocus(passwordRef);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingRight: '48px',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
            }}
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
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

      {/* Remember me and Forgot password - only for login */}
      {!isSignUp && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#262626',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ marginRight: '6px' }}
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => alert('Password reset feature coming soon!')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0095f6',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Forgot password?
          </button>
        </div>
      )}

      {/* Faith Affirmation for Signup */}
      {isSignUp && (
        <div
          style={{
            marginBottom: '16px',
            padding: '16px',
            border: '1px solid #dbdbdb',
            borderRadius: '8px',
            background: '#f9f9f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}
          >
            <input
              type="checkbox"
              checked={faithAffirmed}
              onChange={(e) => setFaithAffirmed(e.target.checked)}
              style={{ marginRight: '8px', marginTop: '2px' }}
            />
            <label
              style={{
                fontSize: '14px',
                color: '#262626',
                lineHeight: '1.4',
              }}
            >
              <span style={{ color: '#dc2626' }}>*</span> I affirm that I am a
              follower of Jesus Christ and I believe in His saving blood. I
              agree that prayers in this app are directed to Jesus.
            </label>
          </div>
          {isSignUp && !faithAffirmed && (
            <div
              style={{
                fontSize: '12px',
                color: '#dc2626',
                marginLeft: '20px',
              }}
            >
              This affirmation is required to join our Christian prayer
              community.
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={
          loading ||
          !email.trim() ||
          !password.trim() ||
          (isSignUp && !faithAffirmed)
        }
        style={{
          width: '100%',
          background:
            email.trim() && password.trim() && (!isSignUp || faithAffirmed) && !loading
              ? '#0095f6'
              : '#b3dffc',
          color: '#ffffff',
          border: 'none',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '16px',
          cursor:
            email.trim() && password.trim() && (!isSignUp || faithAffirmed) && !loading
              ? 'pointer'
              : 'not-allowed',
        }}
      >
        {loading
          ? isSignUp
            ? 'Creating Account...'
            : 'Signing In...'
          : isSignUp
            ? 'Sign Up'
            : 'Log In'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '14px', color: '#8e8e8e' }}>
          {isSignUp
            ? 'Already have an account? '
            : "Don't have an account? "}
        </span>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setLoginError('');
            setSuccess('');
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#0095f6',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          {isSignUp ? 'Log in' : 'Sign up'}
        </button>
      </div>
    </form>
  );
}
