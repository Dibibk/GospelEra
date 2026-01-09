import { useState, useEffect, createContext, useContext } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { queryClient } from "../lib/queryClient";
import { cleanupAllSubscriptions } from "../lib/realtime";

// Utility to ensure user has a profile
async function ensureUserProfile(user: User) {
  if (!user) return;

  try {
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking profile:", fetchError);
      return;
    }

    // Create profile if it doesn't exist
    if (!existingProfile) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        display_name: user.email || "User",
      });

      if (insertError) {
        console.error("Error creating profile:", insertError);
      } else {
        console.log("Profile created for user:", user.email);
      }
    }
  } catch (error) {
    console.error("Error in ensureUserProfile:", error);
  }
}

interface SignUpProfileData {
  firstName: string;
  lastName: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authTransition: "idle" | "signing-in" | "signing-out" | "signing-up";
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    profileData?: SignUpProfileData,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPasswordForEmail: (
    email: string,
  ) => Promise<{ error: AuthError | null }>;
  resetPassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authTransition, setAuthTransition] = useState<
    "idle" | "signing-in" | "signing-out" | "signing-up"
  >("idle");

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: any, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthTransition("signing-in");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Add a slight delay for smooth animation
    if (!error) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setAuthTransition("idle");
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    profileData?: SignUpProfileData,
  ) => {
    setAuthTransition("signing-up");
    // Always use web URL for email confirmation - never use custom app schemes
    // This ensures browser stays on web page showing "signup successful" message
    const emailRedirectUrl = "https://gospel-era.com/email-confirmed";

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: emailRedirectUrl,
        data: profileData
          ? {
              first_name: profileData.firstName,
              last_name: profileData.lastName,
              display_name: profileData.displayName,
            }
          : undefined,
      },
    });

    // If signup successful and we have a user, create their profile immediately
    if (!error && data?.user && profileData) {
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: email,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          display_name: profileData.displayName,
        });
      } catch (profileError) {
        console.error("Error creating profile during signup:", profileError);
      }
    }

    // Add a slight delay for smooth animation
    if (!error) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setAuthTransition("idle");
    return { error };
  };

  const signOut = async () => {
    setAuthTransition("signing-out");
    const { error } = await supabase.auth.signOut();

    // Clear all user-specific caches on successful logout
    if (!error) {
      // Clear React Query cache (all user-specific data)
      queryClient.clear();

      // Unsubscribe from all realtime channels
      cleanupAllSubscriptions();

      // Add a slight delay for smooth animation
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setAuthTransition("idle");
    return { error };
  };

  const resetPasswordForEmail = async (email: string) => {
    // Get the correct base URL - use environment variable if available, otherwise current origin
    const baseUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/reset-password`,
    });
    return { error };
  };

  const resetPassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    authTransition,
    signIn,
    signUp,
    signOut,
    resetPasswordForEmail,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
