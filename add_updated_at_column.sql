-- Add updated_at column to prayer_requests table
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Set existing rows to current time if null
UPDATE prayer_requests SET updated_at = COALESCE(updated_at, created_at);

-- Make column NOT NULL
ALTER TABLE prayer_requests ALTER COLUMN updated_at SET NOT NULL;
