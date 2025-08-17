-- Prayer Requests System for Supabase
-- This file contains SQL to set up three tables with RLS for a prayer request system

-- Table 1: prayer_requests
CREATE TABLE prayer_requests (
    id bigserial PRIMARY KEY,
    requester uuid REFERENCES profiles(id) ON DELETE SET NULL,
    title text NOT NULL,
    details text NOT NULL,
    tags text[] DEFAULT '{}',
    is_anonymous boolean DEFAULT false,
    status text DEFAULT 'open' CHECK (status IN ('open','closed','answered')),
    created_at timestamptz DEFAULT now()
);

-- Table 2: prayer_commitments  
-- One commitment per warrior per request
CREATE TABLE prayer_commitments (
    request_id bigint REFERENCES prayer_requests(id) ON DELETE CASCADE,
    warrior uuid REFERENCES profiles(id) ON DELETE CASCADE,
    committed_at timestamptz DEFAULT now(),
    status text DEFAULT 'committed' CHECK (status IN ('committed','prayed')),
    prayed_at timestamptz,
    note text,
    PRIMARY KEY (request_id, warrior)
);

-- Table 3: prayer_activity (optional log for transparency)
CREATE TABLE prayer_activity (
    id bigserial PRIMARY KEY,
    request_id bigint REFERENCES prayer_requests(id) ON DELETE CASCADE,
    actor uuid REFERENCES profiles(id) ON DELETE SET NULL,
    kind text CHECK (kind IN ('create','commit','uncommit','confirm','close','answer')),
    message text,
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_prayer_requests_tags ON prayer_requests USING GIN (tags);
CREATE INDEX idx_prayer_requests_status_created ON prayer_requests (status, created_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prayer_requests
-- Select: authenticated users can read rows where status is open, answered, or closed
CREATE POLICY "prayer_requests_select" ON prayer_requests
    FOR SELECT TO authenticated
    USING (status IN ('open','answered','closed'));

-- Insert: only requester can insert their own requests
CREATE POLICY "prayer_requests_insert" ON prayer_requests
    FOR INSERT TO authenticated
    WITH CHECK (requester = auth.uid());

-- Update: only requester can update their own requests while not answered, admins can update any
CREATE POLICY "prayer_requests_update" ON prayer_requests
    FOR UPDATE TO authenticated
    USING (
        (requester = auth.uid() AND status != 'answered') OR
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

-- RLS Policies for prayer_commitments
-- Select: authenticated users can read all commitments
CREATE POLICY "prayer_commitments_select" ON prayer_commitments
    FOR SELECT TO authenticated
    USING (true);

-- Insert: only the warrior can insert their own commitment
CREATE POLICY "prayer_commitments_insert" ON prayer_commitments
    FOR INSERT TO authenticated
    WITH CHECK (warrior = auth.uid());

-- Update: only the warrior can update their own commitment or admin can update any
CREATE POLICY "prayer_commitments_update" ON prayer_commitments
    FOR UPDATE TO authenticated
    USING (
        warrior = auth.uid() OR
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

-- Delete: only the warrior can delete their own commitment or admin can delete any
CREATE POLICY "prayer_commitments_delete" ON prayer_commitments
    FOR DELETE TO authenticated
    USING (
        warrior = auth.uid() OR
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

-- RLS Policies for prayer_activity
-- Select: authenticated users can read all activity
CREATE POLICY "prayer_activity_select" ON prayer_activity
    FOR SELECT TO authenticated
    USING (true);

-- Insert: authenticated users can insert activity logs
CREATE POLICY "prayer_activity_insert" ON prayer_activity
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- View for prayer request statistics
-- Shows: request_id, commit_count, prayed_count, open_commit_count
CREATE VIEW prayer_request_stats AS
SELECT 
    pr.id as request_id,
    COALESCE(stats.commit_count, 0) as commit_count,
    COALESCE(stats.prayed_count, 0) as prayed_count,
    COALESCE(stats.open_commit_count, 0) as open_commit_count
FROM prayer_requests pr
LEFT JOIN (
    SELECT 
        request_id,
        COUNT(*) as commit_count,
        COUNT(*) FILTER (WHERE status = 'prayed') as prayed_count,
        COUNT(*) FILTER (WHERE status = 'committed') as open_commit_count
    FROM prayer_commitments
    GROUP BY request_id
) stats ON pr.id = stats.request_id;

-- Grant permissions on the view
GRANT SELECT ON prayer_request_stats TO authenticated;

-- Note: "Prayed count" is computed as the count of commitments where status = 'prayed' per request
-- This can be retrieved using the prayer_request_stats view or by querying prayer_commitments directly:
-- SELECT COUNT(*) FROM prayer_commitments WHERE request_id = ? AND status = 'prayed';