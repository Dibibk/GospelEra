import { useState, useEffect } from "react";
import { getTopPrayerWarriors } from "../lib/leaderboard.js";

interface PrayerLeaderboardMobileProps {
  leaderboardData: any[];
  onBack: () => void;
}

export function PrayerLeaderboardMobile({
  leaderboardData: initialData,
  onBack,
}: PrayerLeaderboardMobileProps) {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "alltime">(
    "alltime"
  );
  const [leaderboardData, setLeaderboardData] = useState<any[]>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const result = await getTopPrayerWarriors({ timeframe, limit: 50 });
        if (result.data) {
          setLeaderboardData(result.data);
        }
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe]);

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px",
          borderBottom: "1px solid #dbdbdb",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          data-testid="button-back-leaderboard"
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
        <div style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}>
          🏆 Prayer Warriors
        </div>
      </div>

      {/* Timeframe Tabs */}
      <div style={{ display: "flex", padding: "16px", gap: "8px" }}>
        {(["week", "month", "alltime"] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            data-testid={`button-timeframe-${tf}`}
            style={{
              flex: 1,
              padding: "10px",
              border: "none",
              background: timeframe === tf ? "#4285f4" : "#f5f5f5",
              color: timeframe === tf ? "#ffffff" : "#8e8e8e",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {tf === "week"
              ? "This Week"
              : tf === "month"
                ? "This Month"
                : "All Time"}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div style={{ padding: "16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
            <div style={{ color: "#8e8e8e" }}>Loading...</div>
          </div>
        ) : leaderboardData.length > 0 ? (
          leaderboardData.map((warrior, index) => (
            <div
              key={warrior.user_id}
              data-testid={`card-warrior-${warrior.user_id}`}
              style={{
                display: "flex",
                alignItems: "center",
                background: "#ffffff",
                border: "1px solid #dbdbdb",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "8px",
              }}
            >
              {/* Rank */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: index < 3 ? "#FFD700" : "#f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "16px",
                  fontSize: "18px",
                }}
              >
                {index === 0
                  ? "🥇"
                  : index === 1
                    ? "🥈"
                    : index === 2
                      ? "🥉"
                      : index + 1}
              </div>

              {/* Profile */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#262626",
                    marginBottom: "2px",
                  }}
                >
                  {warrior.display_name ||
                    `User ${warrior.user_id.slice(0, 8)}`}
                </div>
                <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                  Prayer Warrior
                </div>
              </div>

              {/* Stats */}
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#262626",
                  }}
                >
                  {warrior.prayer_count}
                </div>
                <div style={{ fontSize: "12px", color: "#8e8e8e" }}>
                  prayers
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏆</div>
            <div
              style={{
                fontWeight: 600,
                marginBottom: "8px",
                color: "#262626",
              }}
            >
              No Prayer Warriors Yet
            </div>
            <div style={{ color: "#8e8e8e", fontSize: "14px" }}>
              {timeframe === "week"
                ? "No prayers confirmed this week yet"
                : timeframe === "month"
                  ? "No prayers confirmed this month yet"
                  : "Start praying to appear on the leaderboard"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
