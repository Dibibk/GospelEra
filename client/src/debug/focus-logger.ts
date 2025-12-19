// src/debug/focus-logger.ts
// Global listeners to reveal what steals focus/clicks from inputs.
// Remove the import in main.tsx when you're done debugging.

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    (el as HTMLElement).isContentEditable === true
  );
}

function installFocusClickLoggers() {
  const blurHandler = (e: Event) => {
    const el = e.target as HTMLElement | null;
    if (isTextField(el)) {
      console.log("[BLUR]", el, "activeElement->", document.activeElement);
    }
  };

  const mouseupHandler = (e: MouseEvent) => {
    console.log("[MOUSEUP]", e.target);
  };

  const clickHandler = (e: MouseEvent) => {
    console.log("[CLICK]", e.target);
  };

  document.addEventListener("blur", blurHandler, true);
  document.addEventListener("mouseup", mouseupHandler, true);
  document.addEventListener("click", clickHandler, true);

  // Clean up on Vite hot reload
  if (import.meta && import.meta.hot) {
    import.meta.hot.dispose(() => {
      document.removeEventListener("blur", blurHandler, true);
      document.removeEventListener("mouseup", mouseupHandler, true);
      document.removeEventListener("click", clickHandler, true);
    });
  }
}

installFocusClickLoggers();

// Optional helper to quickly disable likely overlays from the console:
declare global {
  interface Window {
    __disableOverlays?: () => void;
  }
}
window.__disableOverlays = () => {
  const selectors = [
    ".overlay",
    ".backdrop",
    ".modal",
    ".drawer",
    ".sheet",
    ".toast",
    "[data-overlay]",
    "[data-backdrop]",
  ];
  selectors.forEach((sel) => {
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.style.pointerEvents = "none";
      el.style.zIndex = "0";
      if (!el.style.opacity) el.style.opacity = "1";
    });
  });
  console.log("Overlays disabled for debugging.");
};
