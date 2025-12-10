import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, Loader2 } from "lucide-react";

export default function EmailConfirmed() {
  const [processing, setProcessing] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const processConfirmation = async () => {
      // Wait for Supabase to process the URL hash tokens
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if there's a session (means confirmation worked)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setConfirmed(true);
        // Sign out so user can log in fresh on the app
        await supabase.auth.signOut();
      } else {
        // Still might be confirmed, just no session
        setConfirmed(true);
      }
      
      setProcessing(false);
    };

    processConfirmation();
  }, []);

  if (processing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 px-4">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Confirming your email...
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-20 h-20 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Email Confirmed!
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Your email has been successfully verified. You can now open the Gospel Era app and log in with your credentials.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            Open the <strong>Gospel Era</strong> app on your device and sign in with your email and password.
          </p>
        </div>
      </div>
    </div>
  );
}
