import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

interface GuidelinesAcceptanceModalProps {
  onAccept: () => Promise<void>;
}

export function GuidelinesAcceptanceModal({ onAccept }: GuidelinesAcceptanceModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }, [hasScrolledToBottom]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#ffffff",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
      data-testid="modal-guidelines-acceptance"
    >
      <div
        style={{
          padding: "20px 16px",
          borderBottom: "1px solid #dbdbdb",
          background: "#ffffff",
          paddingTop: "calc(20px + env(safe-area-inset-top, 0px))",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#262626",
            margin: 0,
            textAlign: "center",
          }}
        >
          Welcome to Gospel Era
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#8e8e8e",
            margin: "8px 0 0",
            textAlign: "center",
          }}
        >
          Please read and accept our community guidelines
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 16px",
          WebkitOverflowScrolling: "touch",
        }}
        data-testid="scroll-guidelines-content"
      >
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <section style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#262626", marginBottom: "12px" }}>
              Our Mission
            </h2>
            <p style={{ fontSize: "14px", color: "#262626", lineHeight: 1.6 }}>
              Gospel Era is a Christ-centered community dedicated to sharing faith, hope, and love 
              through prayer and Gospel messages. We strive to create a safe, uplifting space where 
              believers can connect, encourage one another, and grow in their faith journey together.
            </p>
          </section>

          <section style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#262626", marginBottom: "12px" }}>
              Content Guidelines
            </h2>
            <ul style={{ fontSize: "14px", color: "#262626", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
              <li>Share content that glorifies Jesus Christ and reflects His love</li>
              <li>Focus on faith, hope, love, and encouragement in all your posts</li>
              <li>Be respectful and kind to all community members</li>
              <li>Post authentic prayer requests and offer genuine support to others</li>
              <li>Use appropriate language befitting a Christian community</li>
              <li>Give credit when sharing others' content or quotes</li>
            </ul>
          </section>

          <section style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#262626", marginBottom: "12px" }}>
              What's Not Allowed
            </h2>
            <ul style={{ fontSize: "14px", color: "#262626", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
              <li>Hate speech, discrimination, or harassment of any kind</li>
              <li>Inappropriate, offensive, or sexually explicit content</li>
              <li>Spam, promotional content, or commercial advertising</li>
              <li>Content promoting other religions or anti-Christian messages</li>
              <li>False teachings or doctrines that contradict Scripture</li>
              <li>Personal attacks or bullying of other members</li>
              <li>Sharing of private information without consent</li>
              <li>Any content that violates local laws or regulations</li>
            </ul>
          </section>

          <section style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#262626", marginBottom: "12px" }}>
              Prayer Request Guidelines
            </h2>
            <ul style={{ fontSize: "14px", color: "#262626", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
              <li>Submit genuine prayer requests with sincere intentions</li>
              <li>Respect the privacy of those you're praying for</li>
              <li>When committing to pray, follow through with your commitment</li>
              <li>Offer encouragement and support to those in need</li>
              <li>Report any suspicious or inappropriate prayer requests</li>
            </ul>
          </section>

          <section style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#262626", marginBottom: "12px" }}>
              Community Conduct
            </h2>
            <ul style={{ fontSize: "14px", color: "#262626", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
              <li>Treat every member with the love of Christ</li>
              <li>Engage in constructive and edifying discussions</li>
              <li>Report content that violates these guidelines</li>
              <li>Respect differing opinions within orthodox Christian beliefs</li>
              <li>Help maintain a positive and welcoming environment</li>
            </ul>
          </section>

          <section style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#262626", marginBottom: "12px" }}>
              Enforcement
            </h2>
            <p style={{ fontSize: "14px", color: "#262626", lineHeight: 1.6 }}>
              Violation of these guidelines may result in content removal, temporary restrictions, 
              or permanent account suspension. Our moderation team reviews all reported content 
              to ensure a safe community for all members.
            </p>
          </section>

          <div
            style={{
              background: "#f8f9fa",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid #e1e5e9",
              marginBottom: "16px",
            }}
          >
            <p style={{ fontSize: "14px", fontStyle: "italic", color: "#262626", margin: 0, lineHeight: 1.6 }}>
              "Let your conversation be always full of grace, seasoned with salt, so that you may 
              know how to answer everyone."
            </p>
            <p style={{ fontSize: "12px", color: "#8e8e8e", margin: "8px 0 0", fontWeight: 600 }}>
              — Colossians 4:6
            </p>
          </div>

          {!hasScrolledToBottom && (
            <p style={{ fontSize: "12px", color: "#8e8e8e", textAlign: "center", marginTop: "16px" }}>
              ↓ Scroll down to continue reading ↓
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          borderTop: "1px solid #dbdbdb",
          background: "#ffffff",
        }}
      >
        <button
          onClick={handleAccept}
          disabled={!hasScrolledToBottom || isAccepting}
          data-testid="button-accept-guidelines"
          style={{
            width: "100%",
            padding: "14px 20px",
            fontSize: "16px",
            fontWeight: 600,
            color: "#ffffff",
            background: hasScrolledToBottom ? "#0095f6" : "#b2dffc",
            border: "none",
            borderRadius: "8px",
            cursor: hasScrolledToBottom && !isAccepting ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s",
          }}
        >
          {isAccepting ? (
            <>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
              Accepting...
            </>
          ) : hasScrolledToBottom ? (
            "I Accept These Guidelines"
          ) : (
            "Please Read All Guidelines"
          )}
        </button>
        {!hasScrolledToBottom && (
          <p style={{ fontSize: "12px", color: "#8e8e8e", textAlign: "center", marginTop: "8px" }}>
            Scroll to the bottom to enable the accept button
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
