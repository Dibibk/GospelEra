import { useState, useRef } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";

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

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();

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
    else if (isSignUp) {
      setSuccess(
        "If this email doesn't already have an account, you'll receive a confirmation email.",
      );
    }

    setLoading(false);
  };

  const canSubmit =
    email.trim() && password.trim() && (!isSignUp || faithAffirmed) && !loading;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
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

        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-primary-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
                {success}
              </div>
            )}

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
                  onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                    placeholder="Enter your password"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    spellCheck={false}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setShowPassword((s) => !s);
                      // Keep UX nice: return focus to password without forcing caret jumps while typing
                      requestAnimationFrame(() =>
                        passwordRef.current?.focus({ preventScroll: true }),
                      );
                    }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-primary-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-primary-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-sm text-primary-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Remember me</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-semibold text-primary-700 hover:text-primary-900"
                >
                  Forgot password?
                </Link>
              </div>

              {isSignUp && (
                <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl">
                  <label className="flex items-start space-x-3 text-sm text-primary-800 font-medium">
                    <input
                      type="checkbox"
                      checked={faithAffirmed}
                      onChange={(e) => setFaithAffirmed(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>
                      I affirm my faith and agree to use Gospel Era
                      respectfully.
                    </span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200"
              >
                {loading
                  ? "Please wait..."
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-primary-700 font-medium">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-bold text-primary-800 hover:text-primary-900 underline"
              onClick={() => {
                setIsSignUp((s) => !s);
                setError("");
                setSuccess("");
              }}
            >
              {isSignUp ? "Sign in" : "Create an account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
