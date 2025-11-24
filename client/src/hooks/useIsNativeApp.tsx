import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function useIsNativeApp() {
  const [isNative, setIsNative] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function detectPlatform() {
      try {
        const platform = Capacitor.getPlatform();
        const isNativePlatform = platform === "ios" || platform === "android";
        setIsNative(isNativePlatform);
      } catch (error) {
        setIsNative(false);
      } finally {
        setIsLoading(false);
      }
    }

    detectPlatform();
  }, []);

  return { isNative, isLoading };
}
