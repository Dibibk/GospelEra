import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Settings from "./pages/Settings";
import SavedPosts from "./pages/SavedPosts";
import AdminReports from "./pages/AdminReports";
import PrayerRequests from "./pages/PrayerRequests";
import PrayerNew from "./pages/PrayerNew";
import PrayerBrowse from "./pages/PrayerBrowse";
import PrayerDetail from "./pages/PrayerDetail";
import PrayerMy from "./pages/PrayerMy";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile/:id" 
                element={
                  <ProtectedRoute>
                    <PublicProfile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/saved" 
                element={
                  <ProtectedRoute>
                    <SavedPosts />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/reports" 
                element={
                  <ProtectedRoute>
                    <AdminReports />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/prayer-requests" 
                element={
                  <ProtectedRoute>
                    <PrayerRequests />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/prayer/new" 
                element={
                  <ProtectedRoute>
                    <PrayerNew />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/prayer/browse" 
                element={
                  <ProtectedRoute>
                    <PrayerBrowse />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/prayer/:id" 
                element={
                  <ProtectedRoute>
                    <PrayerDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/prayer/my" 
                element={
                  <ProtectedRoute>
                    <PrayerMy />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Router>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
