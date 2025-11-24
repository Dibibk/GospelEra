import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function useIsNativeApp() {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function detectPlatform() {
      try {
        const platform = Capacitor.getPlatform();
        console.log("🔍 Capacitor.getPlatform():", platform);
        
        const isNativePlatform = platform === "ios" || platform === "android";
        console.log("🔍 isNativePlatform:", isNativePlatform);
        
        setIsNative(isNativePlatform);
      } catch (error) {
        console.error("🔍 Error detecting platform:", error);
        setIsNative(false);
      } finally {
        setIsLoading(false);
      }
    }

    detectPlatform();
  }, []);

  console.log("🔍 useIsNativeApp returning:", { isNative, isLoading });
  return { isNative, isLoading };
}
