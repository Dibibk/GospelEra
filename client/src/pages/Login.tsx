import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

const pageVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -30,
    transition: { duration: 0.4 }
  }
}

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
}

const formVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: 0.6,
      ease: "easeOut",
      delay: 0.2 
    }
  }
}

export default function Login() {
  const { user, signIn, signUp, authTransition } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [faithAffirmed, setFaithAffirmed] = useState(false)

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Check faith affirmation for signup
    if (isSignUp && !faithAffirmed) {
      setError('Please affirm your faith to create an account.')
      setLoading(false)
      return
    }

    const { error } = isSignUp 
      ? await signUp(email, password)
      : await signIn(email, password)
    
    if (error) {
      setError(error.message)
    } else if (isSignUp) {
      setSuccess('If this email doesn\'t already have an account, you\'ll receive a confirmation email.')
    }
    
    setLoading(false)
  }

  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-white flex items-center justify-center py-12 px-4"
    >
      <div className="container-pro">
        <motion.div variants={itemVariants} className="text-center mb-10">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.5 2h-3v7.5H3v3h7.5V22h3v-9.5H22v-3h-8.5V2z" />
            </svg>
          </div>
          <h1 className="text-h1 mb-4">
            {isSignUp ? 'Join Our Community' : 'Welcome Back'}
          </h1>
          <p className="text-muted">
            {isSignUp ? 'Create your account to share faith and fellowship' : 'Sign in to continue your spiritual journey'}
          </p>
        </motion.div>

        <motion.form 
          variants={formVariants}
          className="form-pro max-w-md mx-auto" 
          onSubmit={handleSubmit}
        >
          <div className="card-pro">
            <div className="form-pro-group">
              <label htmlFor="email" className="form-pro-label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-pro"
                placeholder="Enter your email address"
                data-testid="input-email"
              />
            </div>
            
            <div className="form-pro-group">
              <label htmlFor="password" className="form-pro-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-pro pr-12"
                  placeholder="Enter your password"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Faith Affirmation for Signup */}
            {isSignUp && (
              <div className="divider-pro">
                <div className="flex items-start space-x-3">
                  <input
                    id="faith-affirmation"
                    name="faith-affirmation"
                    type="checkbox"
                    checked={faithAffirmed}
                    onChange={(e) => setFaithAffirmed(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <label htmlFor="faith-affirmation" className="text-secondary">
                    <span className="text-red-600">*</span> I affirm that I am a follower of Jesus Christ and I believe in His saving blood. I agree that prayers in this app are directed to Jesus.
                  </label>
                </div>
                {isSignUp && !faithAffirmed && (
                  <p className="form-pro-error ml-7">
                    This affirmation is required to join our Christian prayer community.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              {!isSignUp && (
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 text-secondary">
                    Remember me
                  </label>
                </div>
              )}

              {!isSignUp && (
                <Link to="/forgot-password" className="link-pro-accent text-secondary">
                  Forgot password?
                </Link>
              )}
            </div>
          </div>

          {error && (
            <div className="card-pro-compact" style={{backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-caption" style={{color: '#b91c1c'}}>{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="card-pro-compact" style={{backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0'}}>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-caption" style={{color: '#166534'}}>{success}</p>
              </div>
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading || authTransition !== 'idle' || (isSignUp && !faithAffirmed)}
            whileHover={!loading && authTransition === 'idle' ? { scale: 1.02 } : {}}
            whileTap={!loading && authTransition === 'idle' ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="btn-pro-primary w-full flex justify-center items-center"
            data-testid="button-login"
          >
            <AnimatePresence mode="wait">
              {loading || authTransition !== 'idle' ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  {authTransition === 'signing-in' ? 'Signing you in...' :
                   authTransition === 'signing-up' ? 'Creating account...' :
                   authTransition === 'signing-out' ? 'Signing out...' :
                   isSignUp ? 'Creating Account...' : 'Signing In...'}
                </motion.div>
              ) : (
                <motion.div
                  key="normal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSignUp ? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" : "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"} />
                  </svg>
                  {isSignUp ? 'Join Community' : 'Enter Dashboard'}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          <div className="text-center">
            <p className="text-secondary">
              {isSignUp ? 'Already part of our community?' : "New to our community?"}{' '}
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setSuccess('')
                  setEmail('')
                  setPassword('')
                }}
                className="link-pro-accent font-medium"
              >
                {isSignUp ? 'Sign in here' : 'Join us here'}
              </button>
            </p>
          </div>
        </motion.form>
      </div>
    </motion.div>
  )
}