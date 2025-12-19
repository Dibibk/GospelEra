/**
 * Migration Script: Replit/Neon PostgreSQL → Supabase
 * 
 * This script migrates all data from the Replit/Neon database to Supabase.
 * It is idempotent - safe to run multiple times.
 * 
 * Prerequisites:
 * 1. Run docs/db_migration_new_tables.sql in Supabase SQL Editor first
 * 2. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
 * 3. Ensure DATABASE_URL is set (Replit/Neon connection)
 * 
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL must be set (Replit/Neon connection)');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const pool = new Pool({ connectionString: DATABASE_URL });

interface MigrationResult {
  table: string;
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
}

const results: MigrationResult[] = [];

async function logResult(table: string, total: number, migrated: number, skipped: number, errors: number) {
  const result = { table, total, migrated, skipped, errors };
  results.push(result);
  console.log(`  ✓ ${table}: ${migrated} migrated, ${skipped} skipped, ${errors} errors (${total} total)`);
}

async function migrateProfiles() {
  console.log('\n📋 Migrating profiles...');
  
  const { rows } = await pool.query('SELECT * FROM profiles');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: row.id,
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          display_name: row.display_name,
          bio: row.bio,
          avatar_url: row.avatar_url,
          role: row.role,
          accepted_guidelines: row.accepted_guidelines,
          affirmed_faith: row.affirmed_faith,
          show_name_on_prayers: row.show_name_on_prayers,
          private_profile: row.private_profile,
          media_enabled: row.media_enabled,
          settings: row.settings || {},
          created_at: row.created_at,
          updated_at: row.updated_at
        }, { onConflict: 'id' });
      
      if (error) {
        console.error(`    Error migrating profile ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating profile ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('profiles', rows.length, migrated, skipped, errors);
}

async function migratePosts() {
  console.log('\n📝 Migrating posts...');
  
  const { rows } = await pool.query('SELECT * FROM posts ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if post already exists
      const { data: existing } = await supabase
        .from('posts')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('posts')
        .insert({
          id: row.id,
          title: row.title,
          content: row.content,
          author_id: row.author_id,
          tags: row.tags || [],
          media_urls: row.media_urls || [],
          embed_url: row.embed_url,
          moderation_status: row.moderation_status,
          moderation_reason: row.moderation_reason,
          hidden: row.hidden,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      
      if (error) {
        console.error(`    Error migrating post ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating post ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('posts', rows.length, migrated, skipped, errors);
}

async function migrateComments() {
  console.log('\n💬 Migrating comments...');
  
  const { rows } = await pool.query('SELECT * FROM comments ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if comment already exists
      const { data: existing } = await supabase
        .from('comments')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('comments')
        .insert({
          id: row.id,
          content: row.content,
          author_id: row.author_id,
          post_id: row.post_id,
          deleted: row.deleted,
          hidden: row.hidden,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      
      if (error) {
        console.error(`    Error migrating comment ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating comment ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('comments', rows.length, migrated, skipped, errors);
}

async function migrateBookmarks() {
  console.log('\n🔖 Migrating bookmarks...');
  
  const { rows } = await pool.query('SELECT * FROM bookmarks');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .upsert({
          user_id: row.user_id,
          post_id: row.post_id,
          created_at: row.created_at
        }, { onConflict: 'user_id,post_id' });
      
      if (error) {
        if (error.code === '23505') { // Duplicate key
          skipped++;
        } else {
          console.error(`    Error migrating bookmark: ${error.message}`);
          errors++;
        }
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating bookmark: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('bookmarks', rows.length, migrated, skipped, errors);
}

async function migrateReactions() {
  console.log('\n❤️ Migrating reactions...');
  
  const { rows } = await pool.query('SELECT * FROM reactions');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      const { error } = await supabase
        .from('reactions')
        .upsert({
          user_id: row.user_id,
          post_id: row.post_id,
          kind: row.kind || 'amen',
          created_at: row.created_at
        }, { onConflict: 'user_id,post_id,kind' });
      
      if (error) {
        if (error.code === '23505') { // Duplicate key
          skipped++;
        } else {
          console.error(`    Error migrating reaction: ${error.message}`);
          errors++;
        }
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating reaction: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('reactions', rows.length, migrated, skipped, errors);
}

async function migrateReports() {
  console.log('\n🚨 Migrating reports...');
  
  const { rows } = await pool.query('SELECT * FROM reports');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      const { error } = await supabase
        .from('reports')
        .upsert({
          id: row.id,
          target_type: row.target_type,
          target_id: row.target_id,
          reason: row.reason,
          reporter_id: row.reporter_id,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at
        }, { onConflict: 'id' });
      
      if (error) {
        console.error(`    Error migrating report ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating report ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('reports', rows.length, migrated, skipped, errors);
}

async function migratePrayerRequests() {
  console.log('\n🙏 Migrating prayer_requests...');
  
  const { rows } = await pool.query('SELECT * FROM prayer_requests ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('prayer_requests')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('prayer_requests')
        .insert({
          id: row.id,
          requester: row.requester,
          title: row.title,
          details: row.details,
          tags: row.tags || [],
          embed_url: row.embed_url,
          moderation_status: row.moderation_status,
          moderation_reason: row.moderation_reason,
          is_anonymous: row.is_anonymous,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      
      if (error) {
        console.error(`    Error migrating prayer_request ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating prayer_request ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('prayer_requests', rows.length, migrated, skipped, errors);
}

async function migratePrayerCommitments() {
  console.log('\n🤝 Migrating prayer_commitments...');
  
  const { rows } = await pool.query('SELECT * FROM prayer_commitments');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      const { error } = await supabase
        .from('prayer_commitments')
        .upsert({
          request_id: row.request_id,
          warrior: row.warrior,
          committed_at: row.committed_at,
          status: row.status,
          prayed_at: row.prayed_at,
          note: row.note
        }, { onConflict: 'request_id,warrior' });
      
      if (error) {
        console.error(`    Error migrating prayer_commitment: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating prayer_commitment: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('prayer_commitments', rows.length, migrated, skipped, errors);
}

async function migratePrayerActivity() {
  console.log('\n📊 Migrating prayer_activity...');
  
  const { rows } = await pool.query('SELECT * FROM prayer_activity ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('prayer_activity')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('prayer_activity')
        .insert({
          id: row.id,
          request_id: row.request_id,
          actor: row.actor,
          kind: row.kind,
          message: row.message,
          created_at: row.created_at
        });
      
      if (error) {
        console.error(`    Error migrating prayer_activity ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating prayer_activity ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('prayer_activity', rows.length, migrated, skipped, errors);
}

async function migrateDonations() {
  console.log('\n💰 Migrating donations...');
  
  const { rows } = await pool.query('SELECT * FROM donations ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('donations')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('donations')
        .insert({
          id: row.id,
          user_id: row.user_id,
          amount_cents: row.amount_cents,
          currency: row.currency,
          message: row.message,
          provider: row.provider,
          provider_ref: row.provider_ref,
          stripe_session_id: row.stripe_session_id,
          status: row.status,
          created_at: row.created_at
        });
      
      if (error) {
        console.error(`    Error migrating donation ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating donation ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('donations', rows.length, migrated, skipped, errors);
}

async function migrateMediaRequests() {
  console.log('\n🖼️ Migrating media_requests...');
  
  const { rows } = await pool.query('SELECT * FROM media_requests ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('media_requests')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('media_requests')
        .insert({
          id: row.id,
          user_id: row.user_id,
          status: row.status,
          reason: row.reason,
          admin_id: row.admin_id,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      
      if (error) {
        console.error(`    Error migrating media_request ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating media_request ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('media_requests', rows.length, migrated, skipped, errors);
}

async function migrateNotifications() {
  console.log('\n🔔 Migrating notifications...');
  
  const { rows } = await pool.query('SELECT * FROM notifications ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          id: row.id,
          recipient_id: row.recipient_id,
          actor_id: row.actor_id,
          event_type: row.event_type,
          post_id: row.post_id,
          comment_id: row.comment_id,
          prayer_request_id: row.prayer_request_id,
          commitment_id: row.commitment_id,
          message: row.message,
          is_read: row.is_read,
          read_at: row.read_at,
          created_at: row.created_at
        });
      
      if (error) {
        console.error(`    Error migrating notification ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating notification ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('notifications', rows.length, migrated, skipped, errors);
}

async function migratePushTokens() {
  console.log('\n📱 Migrating push_tokens...');
  
  const { rows } = await pool.query('SELECT * FROM push_tokens ORDER BY id');
  let migrated = 0, skipped = 0, errors = 0;
  
  for (const row of rows) {
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('id', row.id)
        .single();
      
      if (existing) {
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          id: row.id,
          user_id: row.user_id,
          token: row.token,
          platform: row.platform,
          daily_verse_enabled: row.daily_verse_enabled,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      
      if (error) {
        console.error(`    Error migrating push_token ${row.id}: ${error.message}`);
        errors++;
      } else {
        migrated++;
      }
    } catch (err: any) {
      console.error(`    Exception migrating push_token ${row.id}: ${err.message}`);
      errors++;
    }
  }
  
  await logResult('push_tokens', rows.length, migrated, skipped, errors);
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  let totalRecords = 0;
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  for (const r of results) {
    totalRecords += r.total;
    totalMigrated += r.migrated;
    totalSkipped += r.skipped;
    totalErrors += r.errors;
  }
  
  console.log(`Total records: ${totalRecords}`);
  console.log(`Migrated: ${totalMigrated}`);
  console.log(`Skipped (already exist): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('='.repeat(60));
  
  if (totalErrors > 0) {
    console.log('\n⚠️  Migration completed with errors. Review the log above.');
  } else {
    console.log('\n✅ Migration completed successfully!');
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('REPLIT/NEON → SUPABASE DATA MIGRATION');
  console.log('='.repeat(60));
  console.log(`\nSource: ${DATABASE_URL?.substring(0, 30)}...`);
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`\nStarting migration at ${new Date().toISOString()}`);
  
  try {
    // Test connections
    console.log('\n🔌 Testing connections...');
    await pool.query('SELECT 1');
    console.log('  ✓ Replit/Neon connection OK');
    
    const { error: supabaseError } = await supabase.from('profiles').select('id').limit(1);
    if (supabaseError && supabaseError.code !== 'PGRST116') {
      console.error('  ✗ Supabase connection failed:', supabaseError.message);
      process.exit(1);
    }
    console.log('  ✓ Supabase connection OK');
    
    // Run migrations in order (respecting foreign keys)
    await migrateProfiles();
    await migratePosts();
    await migrateComments();
    await migrateBookmarks();
    await migrateReactions();
    await migrateReports();
    await migratePrayerRequests();
    await migratePrayerCommitments();
    await migratePrayerActivity();
    await migrateDonations();
    await migrateMediaRequests();
    await migrateNotifications();
    await migratePushTokens();
    
    await printSummary();
    
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
