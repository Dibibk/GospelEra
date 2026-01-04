interface HelpMobileProps {
  onBack: () => void;
  onViewGuidelines: () => void;
}

export function HelpMobile({ onBack, onViewGuidelines }: HelpMobileProps) {
  const SUPPORT_EMAIL = "ridible.support@ridible.com";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      alert("Email copied to clipboard!");
    } catch (err) {
      alert("Failed to copy email. Please copy manually: " + SUPPORT_EMAIL);
    }
  };

  const openEmail = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Gospel Era Support Request`;
  };

  return (
    <div
      style={{ padding: "16px", background: "#ffffff", minHeight: "100vh" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid #dbdbdb",
        }}
      >
        <button
          onClick={onBack}
          data-testid="button-back"
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            color: "#262626",
            cursor: "pointer",
            marginRight: "16px",
          }}
        >
          ←
        </button>
        <div style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}>
          Help & Support
        </div>
      </div>

      {/* Contact Section */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#262626",
            marginBottom: "16px",
          }}
        >
          📧 Contact Support
        </div>

        <div
          style={{
            background: "#f8f9fa",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #e1e5e9",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: "#8e8e8e",
              marginBottom: "8px",
            }}
          >
            Support Email
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#262626",
              marginBottom: "16px",
            }}
          >
            {SUPPORT_EMAIL}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={copyEmail}
              data-testid="button-copy-email"
              style={{
                flex: 1,
                background: "#4285f4",
                color: "#ffffff",
                border: "none",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📋 Copy Email
            </button>

            <button
              onClick={openEmail}
              data-testid="button-open-mail"
              style={{
                flex: 1,
                background: "#ffffff",
                color: "#262626",
                border: "1px solid #dbdbdb",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✉️ Open Mail App
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#262626",
            marginBottom: "16px",
          }}
        >
          ❓ Frequently Asked Questions
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div
            style={{
              background: "#f8f9fa",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid #e1e5e9",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "4px",
              }}
            >
              How do I create a prayer request?
            </div>
            <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
              Go to the Prayer tab and click the "New" button at the top.
            </div>
          </div>

          <div
            style={{
              background: "#f8f9fa",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid #e1e5e9",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "4px",
              }}
            >
              How do I report inappropriate content?
            </div>
            <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
              Tap the three dots (⋯) on any post or comment and select
              "Report".
            </div>
          </div>

          <div
            style={{
              background: "#f8f9fa",
              borderRadius: "8px",
              padding: "16px",
              border: "1px solid #e1e5e9",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#262626",
                marginBottom: "4px",
              }}
            >
              How do I change my profile picture?
            </div>
            <div style={{ fontSize: "13px", color: "#8e8e8e" }}>
              Click on the profile on top left corner, from dropdown tap "profile" click edit->Change Photo->Save.
            </div>
          </div>
        </div>
      </div>

      {/* Community Guidelines Link */}
      <div
        style={{
          background: "#f0f8ff",
          borderRadius: "12px",
          padding: "16px",
          border: "1px solid #b3d9ff",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#1e40af",
            marginBottom: "8px",
          }}
        >
          📖 Community Guidelines
        </div>
        <div
          style={{ fontSize: "13px", color: "#1e40af", marginBottom: "12px" }}
        >
          Learn about our Christ-centered community standards
        </div>
        <button
          onClick={onViewGuidelines}
          data-testid="button-view-guidelines"
          style={{
            background: "#1e40af",
            color: "#ffffff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View Guidelines
        </button>
      </div>
    </div>
  );
}
