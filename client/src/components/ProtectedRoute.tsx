import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const loadingVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.1 }
}

const contentVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] // Custom easing for smooth feel
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: {
      duration: 0.3
    }
  }
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, authTransition } = useAuth()

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loading"
          variants={loadingVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 flex items-center space-x-6 shadow-xl border border-primary-200/50">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200"></div>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent absolute top-0"></div>
            </div>
            <div className="text-center">
              <span className="text-primary-900 font-semibold text-lg block">
                {authTransition === 'signing-in' ? 'Signing you in...' : 
                 authTransition === 'signing-out' ? 'Signing out...' :
                 authTransition === 'signing-up' ? 'Creating account...' : 'Loading...'}
              </span>
              <span className="text-primary-600 text-sm">
                {authTransition === 'signing-in' ? 'Welcome back!' :
                 authTransition === 'signing-out' ? 'See you soon!' :
                 authTransition === 'signing-up' ? 'Almost there...' : 'Please wait'}
              </span>
            </div>
          </div>
        </motion.div>
      ) : !user ? (
        <Navigate to="/login" replace />
      ) : (
        <motion.div
          key="content"
          variants={contentVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
