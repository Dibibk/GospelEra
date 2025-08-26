import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ProtectedRoute } from "./ProtectedRoute";
import { PageTransition } from "./PageTransition";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import PublicProfile from "../pages/PublicProfile";
import Settings from "../pages/Settings";
import SavedPosts from "../pages/SavedPosts";
import AdminReports from "../pages/AdminReports";
import AdminMediaRequests from "../pages/AdminMediaRequests";
import PrayerNew from "../pages/PrayerNew";
import PrayerBrowse from "../pages/PrayerBrowse";
import PrayerDetail from "../pages/PrayerDetail";
import PrayerMy from "../pages/PrayerMy";
import PrayerLeaderboard from "../pages/PrayerLeaderboard";
import Guidelines from "../pages/Guidelines";
import Donate from "../pages/Donate";
import DonateThanks from "../pages/DonateThanks";
import AdminDonations from "../pages/AdminDonations";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import MobileApp from "../pages/MobileApp";

export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/login" 
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          } 
        />
        <Route 
          path="/forgot-password" 
          element={
            <PageTransition>
              <ForgotPassword />
            </PageTransition>
          } 
        />
        <Route 
          path="/reset-password" 
          element={
            <PageTransition>
              <ResetPassword />
            </PageTransition>
          } 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <Dashboard />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <Dashboard />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <Profile />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/:id" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <PublicProfile />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <Settings />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/saved" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <SavedPosts />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <AdminReports />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/media-requests" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <AdminMediaRequests />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/guidelines" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <Guidelines />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/support" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <Donate />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/support/thanks" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <DonateThanks />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/support" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <AdminDonations />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prayer/new" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <PrayerNew />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prayer/browse" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <PrayerBrowse />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prayer/:id" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <PrayerDetail />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prayer/my" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <PrayerMy />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/prayer/leaderboard" 
          element={
            <ProtectedRoute>
              <PageTransition>
                <PrayerLeaderboard />
              </PageTransition>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mobile" 
          element={
            <PageTransition>
              <MobileApp />
            </PageTransition>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}