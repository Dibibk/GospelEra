-- Prayer Leaderboard and Streaks SQL Views
-- Run this in Supabase SQL Editor to create analytics views for prayer system

-- Base view for confirmed prayers (status='prayed')
CREATE OR REPLACE VIEW vw_prayer_confirmed AS
SELECT 
    warrior,
    prayed_at::date as day,
    created_at,
    request_id,
    prayed_at
FROM prayer_commitments 
WHERE status = 'prayed';

-- Weekly leaderboard (current ISO week - Monday to Sunday)
CREATE OR REPLACE VIEW vw_prayer_leaderboard_week AS
SELECT 
    warrior,
    COUNT(*) as count_prayed,
    MIN(prayed_at) as first_prayed_at,
    MAX(prayed_at) as last_prayed_at
FROM prayer_commitments 
WHERE status = 'prayed'
    AND DATE_TRUNC('week', prayed_at::date) = DATE_TRUNC('week', CURRENT_DATE)
GROUP BY warrior
ORDER BY count_prayed DESC, first_prayed_at ASC;

-- Monthly leaderboard (current calendar month)
CREATE OR REPLACE VIEW vw_prayer_leaderboard_month AS
SELECT 
    warrior,
    COUNT(*) as count_prayed,
    MIN(prayed_at) as first_prayed_at,
    MAX(prayed_at) as last_prayed_at
FROM prayer_commitments 
WHERE status = 'prayed'
    AND DATE_TRUNC('month', prayed_at::date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY warrior
ORDER BY count_prayed DESC, first_prayed_at ASC;

-- All-time leaderboard
CREATE OR REPLACE VIEW vw_prayer_leaderboard_alltime AS
SELECT 
    warrior,
    COUNT(*) as count_prayed,
    MIN(prayed_at) as first_prayed_at,
    MAX(prayed_at) as last_prayed_at
FROM prayer_commitments 
WHERE status = 'prayed'
GROUP BY warrior
ORDER BY count_prayed DESC, first_prayed_at ASC;

-- Prayer streaks calculation (consecutive days)
CREATE OR REPLACE VIEW vw_prayer_streaks AS
WITH daily_prayers AS (
    -- Get distinct days each warrior prayed
    SELECT DISTINCT 
        warrior,
        prayed_at::date as prayer_date
    FROM prayer_commitments 
    WHERE status = 'prayed'
),
date_gaps AS (
    -- Calculate gaps between consecutive prayer days
    SELECT 
        warrior,
        prayer_date,
        prayer_date - LAG(prayer_date, 1) OVER (
            PARTITION BY warrior 
            ORDER BY prayer_date
        ) as gap_days,
        ROW_NUMBER() OVER (
            PARTITION BY warrior 
            ORDER BY prayer_date DESC
        ) as reverse_order
    FROM daily_prayers
),
streak_groups AS (
    -- Group consecutive days (gap = 1 day or NULL for first record)
    SELECT 
        warrior,
        prayer_date,
        reverse_order,
        SUM(CASE WHEN gap_days IS NULL OR gap_days = 1 THEN 0 ELSE 1 END) 
        OVER (
            PARTITION BY warrior 
            ORDER BY prayer_date DESC 
            ROWS UNBOUNDED PRECEDING
        ) as streak_group
    FROM date_gaps
),
current_streaks AS (
    -- Get current streak (from most recent prayer date)
    SELECT 
        warrior,
        COUNT(*) as current_streak,
        MIN(prayer_date) as streak_start_date,
        MAX(prayer_date) as streak_end_date
    FROM streak_groups
    WHERE streak_group = 0
        AND prayer_date <= CURRENT_DATE
        AND (
            -- Must include today or yesterday to be considered "current"
            MAX(prayer_date) OVER (PARTITION BY warrior) >= CURRENT_DATE - INTERVAL '1 day'
        )
    GROUP BY warrior
)
SELECT 
    warrior,
    COALESCE(current_streak, 0) as current_streak,
    streak_start_date,
    streak_end_date,
    CASE 
        WHEN streak_end_date = CURRENT_DATE THEN true
        WHEN streak_end_date = CURRENT_DATE - INTERVAL '1 day' THEN true
        ELSE false
    END as is_active_streak
FROM (
    SELECT DISTINCT warrior FROM daily_prayers
) all_warriors
LEFT JOIN current_streaks USING (warrior)
ORDER BY current_streak DESC, streak_end_date DESC;

-- Enable Row Level Security (RLS) for authenticated users on all views
ALTER VIEW vw_prayer_confirmed ENABLE ROW LEVEL SECURITY;
ALTER VIEW vw_prayer_leaderboard_week ENABLE ROW LEVEL SECURITY;
ALTER VIEW vw_prayer_leaderboard_month ENABLE ROW LEVEL SECURITY;
ALTER VIEW vw_prayer_leaderboard_alltime ENABLE ROW LEVEL SECURITY;
ALTER VIEW vw_prayer_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow authenticated users to select from views
CREATE POLICY "Authenticated users can view prayer confirmed" ON vw_prayer_confirmed
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view weekly leaderboard" ON vw_prayer_leaderboard_week
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view monthly leaderboard" ON vw_prayer_leaderboard_month
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view alltime leaderboard" ON vw_prayer_leaderboard_alltime
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view prayer streaks" ON vw_prayer_streaks
    FOR SELECT TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_commitments_prayed_status_date 
    ON prayer_commitments (status, prayed_at::date) 
    WHERE status = 'prayed';

CREATE INDEX IF NOT EXISTS idx_prayer_commitments_warrior_prayed 
    ON prayer_commitments (warrior, prayed_at::date) 
    WHERE status = 'prayed';

-- Comments and usage examples:
/*
USAGE EXAMPLES:

1. Get current week's top prayer warriors:
   SELECT * FROM vw_prayer_leaderboard_week LIMIT 10;

2. Get current month's leaderboard:
   SELECT * FROM vw_prayer_leaderboard_month LIMIT 10;

3. Get all-time prayer champions:
   SELECT * FROM vw_prayer_leaderboard_alltime LIMIT 10;

4. Get current prayer streaks:
   SELECT * FROM vw_prayer_streaks WHERE current_streak > 0 ORDER BY current_streak DESC;

5. Get active streaks (prayed today or yesterday):
   SELECT * FROM vw_prayer_streaks WHERE is_active_streak = true ORDER BY current_streak DESC;

6. Get all confirmed prayers for analysis:
   SELECT * FROM vw_prayer_confirmed ORDER BY day DESC;

NOTES:
- ISO week runs Monday to Sunday
- Current streak requires prayer within last 2 days to be considered "active"
- All views are optimized with appropriate indexes
- RLS ensures only authenticated users can access the data
- Views automatically update as new prayer commitments are marked as 'prayed'
*/