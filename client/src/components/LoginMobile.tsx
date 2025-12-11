import { useState, useRef, type RefObject } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

interface LoginMobileProps {
  onSuccess: () => void;
}

export function LoginMobile({ onSuccess }: LoginMobileProps) {
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [success, setSuccess] = useState("");
  const [faithAffirmed, setFaithAffirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);

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

    if (isSignUp) {
      if (!firstName.trim()) {
        setLoginError("Please enter your first name.");
        return;
      }
      if (!lastName.trim()) {
        setLoginError("Please enter your last name.");
        return;
      }
      if (!displayName.trim()) {
        setLoginError("Please enter a display name.");
        return;
      }
      if (!faithAffirmed) {
        setLoginError("Please affirm your faith to create an account.");
        return;
      }
    }

    setLoading(true);
    setLoginError("");
    setSuccess("");

    const { error } = isSignUp
      ? await signUp(email, password, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName.trim(),
        })
      : await signIn(email, password);

    if (error) {
      setLoginError(error.message);
    } else {
      if (isSignUp) {
        setSuccess(
          "If this email doesn't already have an account, you'll receive a confirmation email.",
        );
      }
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setDisplayName("");
      setFaithAffirmed(false);
      if (!isSignUp) {
        onSuccess();
      }
    }
    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setLoading(true);
    setLoginError("");

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/mobile?reset=true`,
    });

    if (error) {
      setLoginError(error.message);
      setLoading(false);
    } else {
      setResetSent(true);
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowPasswordReset(false);
    setResetEmail("");
    setResetSent(false);
    setLoginError("");
  };

  // If showing password reset form
  if (showPasswordReset) {
    return (
      <div
        style={{ padding: "24px", background: "#ffffff", minHeight: "100vh" }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{ fontSize: "28px", color: "#0095f6", marginBottom: "16px" }}
          >
            ✝️
          </div>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#262626",
              marginBottom: "8px",
            }}
          >
            Reset Password
          </h2>
          <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
            {resetSent ? "Check your email" : "Enter your email address"}
          </div>
        </div>

        {resetSent ? (
          <div>
            <div
              style={{
                background: "#d4edda",
                border: "1px solid #c3e6cb",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                color: "#155724",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              ✉️ We've sent a password reset link to{" "}
              <strong>{resetEmail}</strong>.
              <br />
              <br />
              Please check your email and click the link to reset your password.
            </div>

            <button
              onClick={handleBackToLogin}
              style={{
                width: "100%",
                background: "#0095f6",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              data-testid="button-back-to-login"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordReset}>
            {loginError && (
              <div
                style={{
                  background: "#f8d7da",
                  border: "1px solid #f5c2c7",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "16px",
                  color: "#842029",
                  fontSize: "14px",
                }}
              >
                {loginError}
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: "8px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                data-testid="input-reset-email"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid #dbdbdb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  background: "#fafafa",
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !resetEmail.trim()}
              style={{
                width: "100%",
                background:
                  resetEmail.trim() && !loading ? "#0095f6" : "#b3dffc",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "16px",
                cursor:
                  resetEmail.trim() && !loading ? "pointer" : "not-allowed",
              }}
              data-testid="button-send-reset"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              style={{
                width: "100%",
                background: "transparent",
                color: "#0095f6",
                border: "1px solid #0095f6",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              data-testid="button-cancel-reset"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} style={{ padding: "16px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div
          style={{
            marginBottom: "16px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <svg
            width="48"
            height="64"
            viewBox="0 0 48 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M26 4h-4v12H10v4h12v40h4V20h12v-4H26V4z" fill="#0095f6" />
          </svg>
        </div>
        <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
          {isSignUp
            ? "Create your account to share faith and fellowship"
            : "Connect with Believers Worldwide"}
        </div>
      </div>

      {loginError && (
        <div
          style={{
            background: "#fee",
            border: "1px solid #fcc",
            color: "#c00",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          {loginError}
        </div>
      )}

      {success && (
        <div
          style={{
            background: "#e7f5e7",
            border: "1px solid #9fd99f",
            color: "#2e7d2e",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          {success}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        {/* Name fields - only for signup */}
        {isSignUp && (
          <>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <input
                ref={firstNameRef}
                type="text"
                placeholder="First Name *"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  keepFocus(firstNameRef);
                }}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  border: "1px solid #dbdbdb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                }}
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                data-testid="input-first-name"
              />
              <input
                ref={lastNameRef}
                type="text"
                placeholder="Last Name *"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  keepFocus(lastNameRef);
                }}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  border: "1px solid #dbdbdb",
                  borderRadius: "8px",
                  fontSize: "16px",
                  outline: "none",
                }}
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                data-testid="input-last-name"
              />
            </div>
            <input
              ref={displayNameRef}
              type="text"
              placeholder="Display Name * (shown publicly)"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                keepFocus(displayNameRef);
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #dbdbdb",
                borderRadius: "8px",
                fontSize: "16px",
                marginBottom: "12px",
                outline: "none",
              }}
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              data-testid="input-display-name"
            />
          </>
        )}

        <input
          ref={emailRef}
          type="email"
          placeholder="Email *"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            keepFocus(emailRef);
          }}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #dbdbdb",
            borderRadius: "8px",
            fontSize: "16px",
            marginBottom: "12px",
            outline: "none",
          }}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          data-testid="input-email"
        />

        {/* Password field with visibility toggle */}
        <div style={{ position: "relative" }}>
          <input
            ref={passwordRef}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              keepFocus(passwordRef);
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              paddingRight: "48px",
              border: "1px solid #dbdbdb",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
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
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              fontSize: "14px",
              color: "#8e8e8e",
              cursor: "pointer",
              padding: "4px 8px",
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "👁️" : "👁️‍🗨️"}
          </button>
        </div>
      </div>

      {/* Remember me and Forgot password - only for login */}
      {!isSignUp && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          <div
            onClick={() => setRememberMe(!rememberMe)}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#262626",
              cursor: "pointer",
            }}
          >
            <div
              data-testid="checkbox-remember-me"
              style={{
                width: "20px",
                height: "20px",
                minWidth: "20px",
                minHeight: "20px",
                border: "2px solid #0095f6",
                borderRadius: "4px",
                background: rememberMe ? "#0095f6" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: "8px",
                transition: "all 0.2s",
              }}
            >
              {rememberMe && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 4L6 11L3 8"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span>Remember me</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowPasswordReset(true);
              setResetEmail(email);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#0095f6",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
            }}
            data-testid="button-forgot-password"
          >
            Forgot password?
          </button>
        </div>
      )}

      {/* Faith Affirmation for Signup */}
      {isSignUp && (
        <div
          style={{
            marginBottom: "16px",
            padding: "16px",
            border: "1px solid #dbdbdb",
            borderRadius: "8px",
            background: "#f9f9f9",
          }}
        >
          <div
            onClick={() => setFaithAffirmed(!faithAffirmed)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              marginBottom: "8px",
              cursor: "pointer",
            }}
          >
            <div
              data-testid="checkbox-faith-affirmation"
              style={{
                marginRight: "12px",
                marginTop: "2px",
                width: "24px",
                height: "24px",
                minWidth: "24px",
                minHeight: "24px",
                flexShrink: 0,
                border: "2px solid #0095f6",
                borderRadius: "4px",
                background: faithAffirmed ? "#0095f6" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              {faithAffirmed && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 4L6 11L3 8"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#262626",
                lineHeight: "1.4",
                flex: 1,
              }}
            >
              <span style={{ color: "#dc2626" }}>*</span> I affirm that I am a
              follower of Jesus Christ and I believe in His saving blood. I
              agree that prayers in this app are directed to Jesus.
            </div>
          </div>
          {isSignUp && !faithAffirmed && (
            <div
              style={{
                fontSize: "12px",
                color: "#dc2626",
                marginLeft: "20px",
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
          (isSignUp &&
            (!faithAffirmed ||
              !firstName.trim() ||
              !lastName.trim() ||
              !displayName.trim()))
        }
        style={{
          width: "100%",
          background:
            email.trim() &&
            password.trim() &&
            (!isSignUp ||
              (faithAffirmed &&
                firstName.trim() &&
                lastName.trim() &&
                displayName.trim())) &&
            !loading
              ? "#0095f6"
              : "#b3dffc",
          color: "#ffffff",
          border: "none",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: 600,
          marginBottom: "16px",
          cursor:
            email.trim() &&
            password.trim() &&
            (!isSignUp ||
              (faithAffirmed &&
                firstName.trim() &&
                lastName.trim() &&
                displayName.trim())) &&
            !loading
              ? "pointer"
              : "not-allowed",
        }}
        data-testid="button-submit"
      >
        {loading
          ? isSignUp
            ? "Creating Account..."
            : "Signing In..."
          : isSignUp
            ? "Sign Up"
            : "Log In"}
      </button>

      <div style={{ textAlign: "center" }}>
        <span style={{ fontSize: "14px", color: "#8e8e8e" }}>
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
        </span>
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setLoginError("");
            setSuccess("");
          }}
          style={{
            background: "none",
            border: "none",
            color: "#0095f6",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          {isSignUp ? "Log in" : "Sign up"}
        </button>
      </div>
    </form>
  );
}
