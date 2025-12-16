#!/bin/bash
# Export current database (will become production) for replication

echo "Exporting current database..."

# Export schema and data
pg_dump $DATABASE_URL \
  --no-owner \
  --no-privileges \
  --verbose \
  --file=gospel_era_full_backup.sql

echo "Export completed: gospel_era_full_backup.sql"
echo "File size:"
ls -lh gospel_era_full_backup.sql