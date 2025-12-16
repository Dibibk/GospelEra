import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const loadingVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.05 },
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, authTransition } = useAuth();
  const location = useLocation();

  // Treat any active auth transition as loading to avoid UI churn
  const isBusy = loading || authTransition !== "idle";

  if (isBusy) {
    return (
      <motion.div
        // No AnimatePresence or changing keys → avoids remount loops
        variants={loadingVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50"
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 flex items-center space-x-6 shadow-xl border border-primary-200/50">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent absolute top-0"></div>
          </div>
          <div className="text-center">
            <span className="text-primary-900 font-semibold text-lg block">
              {authTransition === "signing-in"
                ? "Signing you in..."
                : authTransition === "signing-out"
                  ? "Signing out..."
                  : authTransition === "signing-up"
                    ? "Creating account..."
                    : "Loading..."}
            </span>
            <span className="text-primary-600 text-sm">
              {authTransition === "signing-in"
                ? "Welcome back!"
                : authTransition === "signing-out"
                  ? "See you soon!"
                  : authTransition === "signing-up"
                    ? "Almost there..."
                    : "Please wait"}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!user) {
    // Pass "from" so login can redirect back after success
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Important: return children directly (no motion wrapper, no keys)
  // to avoid remounts that can steal focus inside forms.
  return <>{children}</>;
}
