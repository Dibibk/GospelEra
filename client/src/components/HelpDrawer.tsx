import { useState, useEffect, useRef } from "react";
import { X, Copy, Mail, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { startedInsideFormField } from "../utils/dongaurds";

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  helpTriggerRef?: React.RefObject<HTMLElement>;
}

export function HelpDrawer({
  isOpen,
  onClose,
  helpTriggerRef,
}: HelpDrawerProps) {
  const { toast } = useToast();
  const [isClosing, setIsClosing] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const SUPPORT_EMAIL = "ridibi.service@gmail.com";

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = "hidden";

      // Focus the close button when drawer opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      // Restore body scroll
      document.body.style.overflow = "";

      // Return focus to Help menu item
      if (helpTriggerRef?.current) {
        helpTriggerRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, helpTriggerRef]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = drawerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  const handleClose = (
    evt?:
      | React.MouseEvent
      | MouseEvent
      | CustomEvent
      | { detail?: { originalEvent?: Event } },
  ) => {
    // Get the real/original event regardless of source (React, DOM, Radix)
    const original: Event | undefined =
      (evt as any)?.detail?.originalEvent || // Radix on*Outside
      (evt as any)?.nativeEvent || // React synthetic
      (evt as any as Event); // DOM MouseEvent

    // If the interaction began in a form field, do NOT close
    if (original && startedInsideFormField(original)) {
      // If caller supports preventDefault (Radix), cancel its default close
      (evt as any)?.preventDefault?.();
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast({
        title: "Email copied",
        description: "Contact email copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy email:", error);
      toast({
        title: "Copy failed",
        description: "Please copy the email manually",
        variant: "destructive",
      });
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen && !isClosing ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen || isClosing} // <-- CHANGE: was aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 transition-transform duration-300 ease-out ${
          isOpen && !isClosing ? "translate-x-0" : "translate-x-full"
        } w-full max-w-md border-l border-gray-200 dark:border-gray-700`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <h2
              id="help-drawer-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Help & Support
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close help drawer"
            data-testid="help-drawer-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col justify-center">
          <div className="max-w-sm mx-auto text-center space-y-6">
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              For any questions or issues, reach us at:
            </p>

            {/* Email Display */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                Contact us at
              </p>
              <div className="font-mono text-lg font-semibold text-primary-600 dark:text-primary-400 break-all select-all">
                {SUPPORT_EMAIL}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                ref={copyButtonRef}
                onClick={handleCopyEmail}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                data-testid="copy-email-button"
              >
                <Copy className="h-4 w-4" />
                <span>Copy email</span>
              </button>

              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Support%20Request`}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                data-testid="open-mail-button"
              >
                <Mail className="h-4 w-4" />
                <span>Open mail app</span>
              </a>
            </div>

            {/* Note */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
              We typically reply within 1–2 business days.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
