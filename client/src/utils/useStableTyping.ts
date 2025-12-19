import { useEffect } from "react";

const isTextField = (el: Element | null) =>
  !!el &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    (el as HTMLElement).isContentEditable);

export function useStableTyping() {
  useEffect(() => {
    let last = window.innerHeight;
    const onResize = () => {
      if (isTextField(document.activeElement)) {
        const now = window.innerHeight;
        if (Math.abs(now - last) < 120) return; // ignore tiny keyboard jitters
        last = now;
      }
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);
}