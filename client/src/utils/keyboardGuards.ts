// Keyboard guard utilities to prevent resize loops during input focus

export function isTextInputFocused(): boolean {
  const ae = document.activeElement as HTMLElement | null;
  return !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
}

export function guardedResize(handler: () => void) {
  let last = window.innerHeight;
  return () => {
    if (isTextInputFocused()) {
      const now = window.innerHeight;
      if (Math.abs(now - last) < 120) return; // ignore jitter while typing
      last = now;
    }
    handler();
  };
}