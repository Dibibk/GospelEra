import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f7",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#ffffff",
          borderBottom: "1px solid #e5e5e5",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <button
          onClick={() => setLocation("/")}
          style={{
            background: "none",
            border: "none",
            fontSize: "16px",
            color: "#007AFF",
            cursor: "pointer",
            padding: "8px",
          }}
          data-testid="button-back-privacy"
        >
          ← Back
        </button>
        <h1
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: 600,
            color: "#1a1a1a",
          }}
        >
          Privacy Policy
        </h1>
      </div>

      <div
        style={{
          padding: "24px 16px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "24px",
            lineHeight: 1.6,
            color: "#333",
          }}
        >
          <p style={{ marginTop: 0 }}>
            <strong>Effective Date:</strong> December 20, 2025
          </p>

          <p>
            Gospel Era ("we," "our," or "us") is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, and
            safeguard your information when you use our mobile application.
          </p>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
            1. Information We Collect
          </h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li>
              <strong>Account Information:</strong> Name, email address, and
              profile details you provide during registration.
            </li>
            <li>
              <strong>User Content:</strong> Posts, comments, prayer requests,
              and other content you share on the platform.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you interact
              with the app, including features used and time spent.
            </li>
            <li>
              <strong>Device Information:</strong> Device type, operating
              system, and unique device identifiers.
            </li>
          </ul>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
            2. How We Use Your Information
          </h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide and maintain the Gospel Era service</li>
            <li>Personalize your experience</li>
            <li>Send notifications about activity on your posts</li>
            <li>Improve our app and develop new features</li>
            <li>Ensure community safety and enforce our guidelines</li>
          </ul>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
            3. Information Sharing
          </h2>
          <p>
            We do not sell your personal information. We may share information
            only:
          </p>
          <ul>
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect the rights and safety of our users</li>
            <li>With service providers who assist in operating our app</li>
          </ul>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
            4. Data Security
          </h2>
          <p>
            We implement appropriate security measures to protect your
            information. However, no method of transmission over the internet is
            100% secure.
          </p>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
            5. Your Rights
          </h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of promotional communications</li>
          </ul>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
            6. Children's Privacy
          </h2>
          <p>
            Gospel Era is not intended for children under 13. We do not
            knowingly collect information from children under 13.
          </p>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
            7. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new policy on this page.
          </p>

          <h2 style={{ fontSize: "18px", marginTop: "24px" }}>8. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us
            at:
          </p>
          <p>
            <strong>Email:</strong> ridible.support@ridible.com
          </p>
        </div>
      </div>
    </div>
  );
}
