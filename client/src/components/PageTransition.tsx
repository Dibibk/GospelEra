import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02
  }
}

// Mobile-friendly variants with no movement/scale to prevent input issues
const mobilePageVariants = {
  initial: {
    opacity: 1
  },
  in: {
    opacity: 1
  },
  out: {
    opacity: 1
  }
}

const pageTransition = {
  type: 'tween',
  ease: [0.22, 1, 0.36, 1], // Custom easing for smooth feel
  duration: 0.6
}

const mobilePageTransition = {
  duration: 0 // No animation duration on mobile
}

export function PageTransition({ children }: PageTransitionProps) {
  // Check if we're on mobile (768px or less)
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={isMobile ? mobilePageVariants : pageVariants}
      transition={isMobile ? mobilePageTransition : pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  )
}