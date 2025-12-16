interface LeaderboardWarrior {
  warrior: string;
  display_name: string;
  count_prayed: number;
  current_streak: number | null;
}

interface FullLeaderboardViewProps {
  leaderboardData: LeaderboardWarrior[];
  onBack: () => void;
}

export function FullLeaderboardView({
  leaderboardData,
  onBack,
}: FullLeaderboardViewProps) {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #dbdbdb",
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            marginRight: "12px",
            color: "#262626",
          }}
        >
          ←
        </button>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#262626" }}>
          🏆 Prayer Warriors Leaderboard
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ padding: "16px" }}>
        {leaderboardData.map((warrior, index) => (
          <div
            key={warrior.warrior}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px",
              background: "#ffffff",
              borderRadius: "12px",
              marginBottom: "8px",
              border: "1px solid #dbdbdb",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginRight: "16px",
                minWidth: "40px",
                textAlign: "center",
              }}
            >
              {index === 0
                ? "🥇"
                : index === 1
                  ? "🥈"
                  : index === 2
                    ? "🥉"
                    : `${index + 1}`}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "#262626",
                  marginBottom: "4px",
                }}
              >
                {warrior.display_name}
              </div>
              <div style={{ fontSize: "14px", color: "#8e8e8e" }}>
                {warrior.count_prayed} prayers completed •{" "}
                {warrior.current_streak || 0} day streak
              </div>
            </div>
            {(warrior.current_streak || 0) >= 7 && (
              <div
                style={{
                  background: "#4a4a4a",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              >
                🔥 Hot Streak
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
