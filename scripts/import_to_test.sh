#!/bin/bash
# Import database backup to new test database

if [ -z "$TEST_DATABASE_URL" ]; then
    echo "Error: Please set TEST_DATABASE_URL environment variable"
    echo "Example: export TEST_DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "Importing to test database..."
echo "Target: $TEST_DATABASE_URL"

# Import the backup
psql $TEST_DATABASE_URL -f gospel_era_full_backup.sql

echo "Import completed!"
echo "Test database is now an exact replica of production"