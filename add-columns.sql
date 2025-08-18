-- Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accepted_guidelines boolean DEFAULT false NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS affirmed_faith boolean DEFAULT false NOT NULL;

-- Set existing users to have accepted guidelines to avoid disruption
UPDATE profiles SET accepted_guidelines = true WHERE accepted_guidelines IS NULL OR accepted_guidelines = false;