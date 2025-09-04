import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Login() {
  const { user, signIn, signUp, authTransition } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [faithAffirmed, setFaithAffirmed] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();

  const keepFocus = (ref: React.RefObject<HTMLInputElement>) => {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el && document.activeElement !== el) {
        el.focus({ preventScroll: true });
        const len = el.value.length;
        try {
          el.setSelectionRange?.(len, len);
        } catch {}
      }
    });
  };

  const stopDown = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    // @ts-ignore
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  useEffect(() => {
    if (!rootRef.current) return;

    // If focus moves outside the login root while an input is active, snap it back.
    const onFocusIn = (e: FocusEvent) => {
      const root = rootRef.current!;
      const target = e.target as Node | null;
      const active = document.activeElement as HTMLElement | null;
      const inputActive =
        active === emailRef.current || active === passwordRef.current;

      if (inputActive && target && !root.contains(target)) {
        e.stopPropagation();
        // Snap back to whichever input had focus
        if (active === emailRef.current) keepFocus(emailRef);
        else if (active === passwordRef.current) keepFocus(passwordRef);
      }
    };
    //Also stop outside click handlers from seeing events that start in the login root
    const onPointer = (e: Event) => {
      const root = rootRef.current!;
      const path = (e as any).composedPath?.() as EventTarget[] | undefined;
      const startedInside = Array.isArray(path)
        ? path.includes(root)
        : e.target instanceof Node && root.contains(e.target);
      if (startedInside) {
        // Swallow in capture so global listeners never see it
        // @ts-ignore
        e.stopImmediatePropagation?.();
        e.stopPropagation();
      }
    };
    document.addEventListener("focusin", onFocusIn, true);
    [
      "pointerdown",
      "mousedown",
      "mouseup",
      "click",
      "keydown",
      "keyup",
    ].forEach((t) => document.addEventListener(t as any, onPointer, true));

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      [
        "pointerdown",
        "mousedown",
        "mouseup",
        "click",
        "keydown",
        "keyup",
      ].forEach((t) => document.removeEventListener(t as any, onPointer, true));
    };
  }, []);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    if (isSignUp && !faithAffirmed) {
      setError("Please affirm your faith to create an account.");
      setLoading(false);
      return;
    }
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    if (error) setError(error.message);
    else if (isSignUp)
      setSuccess(
        "If this email doesn't already have an account, you'll receive a confirmation email.",
      );
    setLoading(false);
  };

  const canSubmit =
    email.trim() && password.trim() && (!isSignUp || faithAffirmed) && !loading;

  return (
    <div
      ref={rootRef}
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M13.5 2h-3v7.5H3v3h7.5V22h3v-9.5H22v-3h-8.5V2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent mb-2">
            {isSignUp ? "Join Our Community" : "Welcome Back"}
          </h2>
          <p className="text-primary-600 font-medium">
            {isSignUp
              ? "Create your account to share faith and fellowship"
              : "Sign in to continue your spiritual journey"}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 rounded-2xl p-8 shadow-xl border border-primary-200/50 backdrop-blur-sm">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-primary-800 mb-2 flex items-center"
                >
                  <svg
                    className="h-4 w-4 text-gold-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                  Email Address
                </label>
                <input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    keepFocus(emailRef);
                  }}
                  onBlur={() => keepFocus(emailRef)}
                  onPointerDown={stopDown}
                  onMouseDown={stopDown}
                  className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                  placeholder="Enter your email address"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  spellCheck={false}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-primary-800 mb-2 flex items-center"
                >
                  <svg
                    className="h-4 w-4 text-gold-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      keepFocus(passwordRef);
                    }}
                    onBlur={() => keepFocus(passwordRef)}
                    onPointerDown={stopDown}
                    onMouseDown={stopDown}
                    className="w-full px-4 py-3 pr-12 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                    placeholder="Enter your password"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="current-password"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((s) => !s);
                      keepFocus(passwordRef);
                    }}
                    onPointerDown={stopDown}
                    onMouseDown={stopDown}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-primary-400 hover:text-primary-600 transition-colors duration-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-primary-400 hover:text-primary-600 transition-colors duration-200" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Faith Affirmation for Signup */}
            {isSignUp && (
              <div className="border-t border-primary-200 pt-4">
                <div className="flex items-start space-x-3">
                  <input
                    id="faith-affirmation"
                    name="faith-affirmation"
                    type="checkbox"
                    checked={faithAffirmed}
                    onChange={(e) => setFaithAffirmed(e.target.checked)}
                    onPointerDown={stopDown}
                    onMouseDown={stopDown}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-primary-300 rounded mt-1"
                  />
                  <label
                    htmlFor="faith-affirmation"
                    className="block text-sm text-primary-700 font-medium"
                  >
                    <span className="text-red-600">*</span> I affirm that I am a
                    follower of Jesus Christ and I believe in His saving blood.
                    I agree that prayers in this app are directed to Jesus.
                  </label>
                </div>
                {isSignUp && !faithAffirmed && (
                  <p className="text-xs text-red-600 mt-2 ml-7">
                    This affirmation is required to join our Christian prayer
                    community.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {!isSignUp && (
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    onPointerDown={stopDown}
                    onMouseDown={stopDown}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-primary-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-primary-700 font-medium"
                  >
                    Remember me
                  </label>
                </div>
              )}
              {!isSignUp && (
                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-bold text-primary-600 hover:text-purple-600 transition-colors duration-200"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-red-500 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-green-500 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-green-700">{success}</p>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={
                loading ||
                authTransition !== "idle" ||
                (isSignUp && !faithAffirmed)
              }
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 hover:from-primary-700 hover:via-purple-700 hover:to-primary-700 focus:outline-none focus:ring-4 focus:ring-gold-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl"
            >
              {loading || authTransition !== "idle"
                ? authTransition === "signing-in"
                  ? "Signing you in…"
                  : authTransition === "signing-up"
                    ? "Creating account…"
                    : authTransition === "signing-out"
                      ? "Signing out…"
                      : isSignUp
                        ? "Creating Account…"
                        : "Signing In…"
                : isSignUp
                  ? "Join Community"
                  : "Enter Dashboard"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-primary-700 font-medium">
              {isSignUp
                ? "Already part of our community?"
                : "New to our community?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                  setSuccess("");
                  setEmail("");
                  setPassword("");
                }}
                onPointerDown={stopDown}
                onMouseDown={stopDown}
                className="font-bold text-primary-600 hover:text-purple-600 transition-colors duration-200 underline decoration-2 underline-offset-2"
              >
                {isSignUp ? "Sign in here" : "Join us here"}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
