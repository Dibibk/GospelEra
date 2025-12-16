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
  // TEMPORARILY DISABLED - Portal functionality to test input focus
  return <>{children}</>;
}