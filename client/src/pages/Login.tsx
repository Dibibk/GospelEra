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

  // Redirect if already authenticated with animation
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
      setSuccess('Success! Please check your email to confirm your account.')
    }
    
    setLoading(false)
  }

  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-md w-full space-y-8">
        <motion.div variants={itemVariants} className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center mb-6 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.5 2h-3v7.5H3v3h7.5V22h3v-9.5H22v-3h-8.5V2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent mb-2">
            {isSignUp ? 'Join Our Community' : 'Welcome Back'}
          </h2>
          <p className="text-primary-600 font-medium">
            {isSignUp ? 'Create your account to share faith and fellowship' : 'Sign in to continue your spiritual journey'}
          </p>
        </motion.div>

        <motion.form 
          variants={formVariants}
          className="mt-8 space-y-6" 
          onSubmit={handleSubmit}
        >
          <div className="bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 rounded-2xl p-8 shadow-xl border border-primary-200/50 backdrop-blur-sm">
            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                  placeholder="Enter your email address"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
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
                    className="w-full px-4 py-3 pr-12 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    <svg className="h-5 w-5 text-primary-400 hover:text-primary-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      )}
                      {!showPassword && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                    </svg>
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
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-primary-300 rounded mt-1"
                  />
                  <label htmlFor="faith-affirmation" className="block text-sm text-primary-700 font-medium">
                    <span className="text-red-600">*</span> I affirm that I am a follower of Jesus Christ and I believe in His saving blood. I agree that prayers in this app are directed to Jesus.
                  </label>
                </div>
                {isSignUp && !faithAffirmed && (
                  <p className="text-xs text-red-600 mt-2 ml-7">
                    This affirmation is required to join our Christian prayer community.
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
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-primary-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-primary-700 font-medium">
                    Remember me
                  </label>
                </div>
              )}

              {!isSignUp && (
                <div className="text-sm">
                  <Link to="/forgot-password" className="font-bold text-primary-600 hover:text-purple-600 transition-colors duration-200">
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-700">{success}</p>
              </div>
            </div>
          )}

          <div>
            <motion.button
              type="submit"
              disabled={loading || authTransition !== 'idle' || (isSignUp && !faithAffirmed)}
              whileHover={!loading && authTransition === 'idle' ? { scale: 1.02 } : {}}
              whileTap={!loading && authTransition === 'idle' ? { scale: 0.98 } : {}}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 hover:from-primary-700 hover:via-purple-700 hover:to-primary-700 focus:outline-none focus:ring-4 focus:ring-gold-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isSignUp ? "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" : "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"} />
                    </svg>
                    {isSignUp ? 'Join Community' : 'Enter Dashboard'}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div className="text-center">
            <p className="text-sm text-primary-700 font-medium">
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
                className="font-bold text-primary-600 hover:text-purple-600 transition-colors duration-200 underline decoration-2 underline-offset-2"
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