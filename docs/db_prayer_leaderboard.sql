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

-- Prayer streaks calculation (consecutive days) - Simplified version
CREATE OR REPLACE VIEW vw_prayer_streaks AS
WITH daily_prayers AS (
    -- Get distinct days each warrior prayed
    SELECT DISTINCT 
        warrior,
        prayed_at::date as prayer_date
    FROM prayer_commitments 
    WHERE status = 'prayed'
),
warrior_latest AS (
    -- Get most recent prayer date for each warrior
    SELECT 
        warrior,
        MAX(prayer_date) as last_prayer_date
    FROM daily_prayers
    GROUP BY warrior
),
streak_calc AS (
    -- Calculate current streak for each warrior
    SELECT 
        dp.warrior,
        dp.prayer_date,
        wl.last_prayer_date,
        -- Create a running count of consecutive days from the end
        ROW_NUMBER() OVER (
            PARTITION BY dp.warrior 
            ORDER BY dp.prayer_date DESC
        ) as days_from_end,
        -- Check if this date is consecutive with the previous one
        CASE 
            WHEN dp.prayer_date = wl.last_prayer_date - (ROW_NUMBER() OVER (
                PARTITION BY dp.warrior 
                ORDER BY dp.prayer_date DESC
            ) - 1) * INTERVAL '1 day'
            THEN 1 
            ELSE 0 
        END as is_consecutive
    FROM daily_prayers dp
    JOIN warrior_latest wl ON dp.warrior = wl.warrior
),
current_streaks AS (
    -- Count consecutive days from most recent prayer
    SELECT 
        warrior,
        last_prayer_date,
        COUNT(*) as current_streak,
        MIN(prayer_date) as streak_start_date
    FROM streak_calc
    WHERE is_consecutive = 1
    GROUP BY warrior, last_prayer_date
)
SELECT 
    COALESCE(dp.warrior, cs.warrior) as warrior,
    COALESCE(cs.current_streak, 0) as current_streak,
    cs.streak_start_date,
    cs.last_prayer_date as streak_end_date,
    CASE 
        WHEN cs.last_prayer_date >= CURRENT_DATE - INTERVAL '1 day' THEN true
        ELSE false
    END as is_active_streak
FROM (SELECT DISTINCT warrior FROM daily_prayers) dp
LEFT JOIN current_streaks cs ON dp.warrior = cs.warrior
ORDER BY current_streak DESC, streak_end_date DESC;

-- Note: Views inherit RLS from their underlying tables (prayer_commitments)
-- No need to enable RLS on views directly - they will respect the base table policies

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prayer_commitments_prayed_status 
    ON prayer_commitments (status, prayed_at) 
    WHERE status = 'prayed';

CREATE INDEX IF NOT EXISTS idx_prayer_commitments_warrior_prayed 
    ON prayer_commitments (warrior, prayed_at) 
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