import { useState, useRef, type RefObject } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface LoginMobileProps {
  onSuccess: () => void;
}

export function LoginMobile({ onSuccess }: LoginMobileProps) {
  const { signIn, signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [faithAffirmed, setFaithAffirmed] = useState(false);
  
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;

    if (isSignUp && !faithAffirmed) {
      setLoginError('Please affirm your faith to create an account.');
      return;
    }

    setLoginError('');
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setLoginError(error.message);
    } else {
      setEmail('');
      setPassword('');
      setFaithAffirmed(false);
      onSuccess();
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#262626',
            marginBottom: '8px',
          }}
        >
          Gospel Era
        </div>
        <div style={{ fontSize: '14px', color: '#8e8e8e' }}>
          Connect with believers worldwide
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
        <input
          ref={passwordRef}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            keepFocus(passwordRef);
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
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
      </div>

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
        onClick={handleLogin}
        disabled={
          !email.trim() || !password.trim() || (isSignUp && !faithAffirmed)
        }
        style={{
          width: '100%',
          background:
            email.trim() && password.trim() && (!isSignUp || faithAffirmed)
              ? '#262626'
              : '#dbdbdb',
          color: '#ffffff',
          border: 'none',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '16px',
          cursor:
            email.trim() && password.trim() && (!isSignUp || faithAffirmed)
              ? 'pointer'
              : 'not-allowed',
        }}
      >
        {isSignUp ? 'Sign Up' : 'Log In'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            background: 'none',
            border: 'none',
            color: '#262626',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {isSignUp
            ? 'Already have an account? Log in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
