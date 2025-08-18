-- Run this in Supabase SQL Editor.

-- Create donations table
CREATE TABLE donations (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    amount_cents int NOT NULL,
    currency text DEFAULT 'USD',
    message text,
    provider text DEFAULT 'pending' CHECK (provider IN ('stripe', 'paypal', 'manual', 'pending')),
    provider_ref text, -- session id / txn id (nullable)
    status text DEFAULT 'initiated' CHECK (status IN ('initiated', 'paid', 'failed', 'refunded')),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on donations table
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can insert and select their own rows
CREATE POLICY "Users can manage own donations" ON donations
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policy: Admins can select all donations
CREATE POLICY "Admins can view all donations" ON donations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add helpful indexes
CREATE INDEX donations_user_id_idx ON donations(user_id);
CREATE INDEX donations_status_idx ON donations(status);
CREATE INDEX donations_created_at_idx ON donations(created_at);