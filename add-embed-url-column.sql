-- Add embed_url column to posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='posts' AND column_name='embed_url') THEN
        ALTER TABLE posts ADD COLUMN embed_url TEXT;
    END IF;
END $$;