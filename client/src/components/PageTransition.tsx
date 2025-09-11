import * as React from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  in: { opacity: 1, y: 0, scale: 1 },
  out: { opacity: 0, y: -20, scale: 1.02 },
};

// Mobile-friendly: no movement/scale to avoid iOS focus quirks
const mobilePageVariants = {
  initial: { opacity: 1 },
  in: { opacity: 1 },
  out: { opacity: 1 },
};

const pageTransition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.6,
};
const mobilePageTransition = { duration: 0 };

export function PageTransition({ children }: PageTransitionProps) {
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const { pathname } = useLocation();

  // Fence these routes so inputs keep focus
  const shouldFence =
    pathname === "/login" ||
    pathname === "/mobile" ||
    pathname.startsWith("/mobile/");

  const rootRef = React.useRef<HTMLDivElement>(null);
  const lastInputRef = React.useRef<
    HTMLInputElement | HTMLTextAreaElement | null
  >(null);

  React.useEffect(() => {
    if (!shouldFence) return;
    const root = rootRef.current;
    if (!root) return;

    const startedInside = (evt: Event) => {
      const path = (evt as any).composedPath?.() as EventTarget[] | undefined;
      if (Array.isArray(path)) return path.includes(root);
      const t = evt.target as Node | null;
      return !!(t && root.contains(t));
    };

    // Selective guard - only block events when protecting input field focus
    const guard = (evt: Event) => {
      if (!startedInside(evt)) return;
      
      // Only interfere if we have an active input field that needs protection
      const hasActiveInput = lastInputRef.current && document.activeElement === lastInputRef.current;
      
      // For focus events, always protect to maintain input focus
      if (evt.type === 'focusin' || evt.type === 'focusout') {
        evt.stopPropagation();
        return;
      }
      
      // For other events, only block if we're protecting an active input
      if (hasActiveInput && (evt.type === 'keydown' || evt.type === 'keyup')) {
        evt.stopPropagation();
        return;
      }
      
      // NEVER block click/touch events for buttons and interactive elements
      // This allows normal button/icon interactions to work
    };

    // Track last focused input/textarea inside the page
    const rememberLastInput = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !root.contains(el)) return;
      if (el.matches?.("input, textarea")) {
        lastInputRef.current = el as HTMLInputElement | HTMLTextAreaElement;
      }
    };

    // If focus jumps outside while typing, snap it back
    const snapBackFocus = (e: FocusEvent) => {
      const toEl = e.target as HTMLElement | null;
      if (!toEl || root.contains(toEl)) return;
      const back = lastInputRef.current;
      if (!back) return;
      e.stopPropagation();
      requestAnimationFrame(() => {
        back.focus({ preventScroll: true });
        try {
          const len = (back as HTMLInputElement).value?.length ?? 0;
          (back as HTMLInputElement).setSelectionRange?.(len, len);
        } catch {}
      });
    };

    const types: (keyof DocumentEventMap)[] = [
      "pointerdown",
      "pointerup",
      "mousedown",
      "mouseup",
      "click",
      "keydown",
      "keyup",
      "touchstart",
      "touchend",
    ];

    // Attach on both window and document (capture phase) to guarantee priority
    window.addEventListener("focusin", snapBackFocus as any, true);
    document.addEventListener("focusin", snapBackFocus as any, true);
    document.addEventListener("focusout", rememberLastInput as any, true);
    types.forEach((t) => {
      window.addEventListener(t as any, guard, true);
      document.addEventListener(t as any, guard, true);
    });

    return () => {
      window.removeEventListener("focusin", snapBackFocus as any, true);
      document.removeEventListener("focusin", snapBackFocus as any, true);
      document.removeEventListener("focusout", rememberLastInput as any, true);
      types.forEach((t) => {
        window.removeEventListener(t as any, guard, true);
        document.removeEventListener(t as any, guard, true);
      });
    };
  }, [shouldFence, pathname]);

  return (
    <motion.div
      ref={rootRef}
      initial="initial"
      animate="in"
      exit="out"
      variants={isMobile ? mobilePageVariants : pageVariants}
      transition={isMobile ? mobilePageTransition : pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
