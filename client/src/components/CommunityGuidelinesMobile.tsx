interface CommunityGuidelinesMobileProps {
  onBack: () => void;
}

export function CommunityGuidelinesMobile({ onBack }: CommunityGuidelinesMobileProps) {
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
          Community Guidelines
        </div>
      </div>

      {/* Content */}
      <div style={{ lineHeight: 1.6, color: "#262626" }}>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            marginBottom: "16px",
            color: "#262626",
          }}
        >
          Gospel Era Community Guidelines
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div
            style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
          >
            Our Mission
          </div>
          <div style={{ fontSize: "14px", marginBottom: "16px" }}>
            Gospel Era is a Christ-centered community dedicated to sharing
            faith, hope, and love through prayer and Gospel messages.
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div
            style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
          >
            Content Guidelines
          </div>
          <ul style={{ fontSize: "14px", marginLeft: "16px" }}>
            <li style={{ marginBottom: "4px" }}>
              Share content that glorifies Jesus Christ
            </li>
            <li style={{ marginBottom: "4px" }}>
              Focus on faith, hope, love, and encouragement
            </li>
            <li style={{ marginBottom: "4px" }}>
              Be respectful and kind to all members
            </li>
            <li style={{ marginBottom: "4px" }}>
              Avoid controversial or divisive topics
            </li>
          </ul>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <div
            style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
          >
            What's Not Allowed
          </div>
          <ul style={{ fontSize: "14px", marginLeft: "16px" }}>
            <li style={{ marginBottom: "4px" }}>
              Hate speech or discrimination
            </li>
            <li style={{ marginBottom: "4px" }}>
              Inappropriate or offensive content
            </li>
            <li style={{ marginBottom: "4px" }}>
              Spam or promotional content
            </li>
            <li style={{ marginBottom: "4px" }}>
              Content promoting other religions
            </li>
          </ul>
        </div>

        <div
          style={{
            background: "#f8f9fa",
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #e1e5e9",
            marginTop: "24px",
          }}
        >
          <div
            style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}
          >
            Remember
          </div>
          <div style={{ fontSize: "14px", fontStyle: "italic" }}>
            "Let your conversation be always full of grace, seasoned with
            salt, so that you may know how to answer everyone." - Colossians
            4:6
          </div>
        </div>
      </div>
    </div>
  );
}
