import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const isMobile =
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 768px)").matches;

export default function MobileFormPortal({
  children,
  enable = true,
}: {
  children: React.ReactNode;
  enable?: boolean;
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isMobile || !enable) return;
    const el = document.createElement("div");
    el.setAttribute("id", "mobile-form-portal");
    el.style.position = "relative";
    el.style.zIndex = "0";
    el.style.transform = "none";
    el.style.willChange = "auto";
    document.body.appendChild(el);
    setHost(el);
    return () => {
      el.remove();
      setHost(null);
    };
  }, [enable]);

  if (!isMobile || !enable) return <>{children}</>;
  if (!host) return null;
  return createPortal(children, host);
}