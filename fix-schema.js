// Quick fix to add missing media_urls column to posts table
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixSchema() {
  try {
    console.log('Adding media_urls column to posts table...')
    
    // Add media_urls column if it doesn't exist
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'posts' AND column_name = 'media_urls'
          ) THEN
            ALTER TABLE posts ADD COLUMN media_urls text[] DEFAULT '{}';
          END IF;
        END $$;
      `
    })
    
    if (error) {
      console.error('Error adding column:', error)
      
      // Fallback: try a simple ALTER TABLE
      console.log('Trying direct ALTER TABLE...')
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT \'{}\';'
      })
      
      if (error2) {
        console.error('Fallback also failed:', error2)
        process.exit(1)
      }
    }
    
    console.log('Schema fix completed successfully!')
    
    // Verify the column was added
    const { data: verification, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'posts' 
        ORDER BY ordinal_position;
      `
    })
    
    if (!verifyError) {
      console.log('Current posts table columns:', verification)
    }
    
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

fixSchema()