#!/bin/bash

# PostgreSQL Restore Script for Technician Marketplace Platform
# Restores database from backup file or S3

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
S3_BUCKET="${S3_BUCKET:-technician-marketplace-backups}"
DATABASE_NAME="${DATABASE_NAME:-technician_marketplace}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Parse arguments
BACKUP_SOURCE="$1"
RESTORE_MODE="${2:-full}"  # full or point-in-time

if [ -z "$BACKUP_SOURCE" ]; then
    echo "Usage: $0 <backup_file_or_s3_path> [full|point-in-time]"
    echo ""
    echo "Examples:"
    echo "  $0 /var/backups/postgres/postgres_technician_marketplace_20240101_120000.sql.gz"
    echo "  $0 s3://technician-marketplace-backups/postgres/postgres_technician_marketplace_20240101_120000.sql.gz"
    echo "  $0 latest"
    exit 1
fi

echo "========================================="
echo "PostgreSQL Restore Script"
echo "========================================="
echo "Database: $DATABASE_NAME"
echo "Restore mode: $RESTORE_MODE"
echo "========================================="

# Function to download from S3
download_from_s3() {
    local s3_path="$1"
    local local_path="$2"
    
    echo "Downloading backup from S3..."
    aws s3 cp "$s3_path" "$local_path"
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to download backup from S3"
        exit 1
    fi
}

# Determine backup file path
if [ "$BACKUP_SOURCE" == "latest" ]; then
    echo "Finding latest backup from S3..."
    LATEST_BACKUP=$(aws s3 ls "s3://${S3_BUCKET}/postgres/" | sort | tail -n 1 | awk '{print $4}')
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo "Error: No backups found in S3"
        exit 1
    fi
    
    echo "Latest backup: $LATEST_BACKUP"
    BACKUP_FILE="${BACKUP_DIR}/${LATEST_BACKUP}"
    download_from_s3 "s3://${S3_BUCKET}/postgres/${LATEST_BACKUP}" "$BACKUP_FILE"
    
elif [[ "$BACKUP_SOURCE" == s3://* ]]; then
    BACKUP_FILENAME=$(basename "$BACKUP_SOURCE")
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILENAME}"
    download_from_s3 "$BACKUP_SOURCE" "$BACKUP_FILE"
    
else
    BACKUP_FILE="$BACKUP_SOURCE"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "Error: Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

echo "Using backup file: $BACKUP_FILE"

# Verify backup file
echo "Verifying backup file..."
pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Error: Backup file is corrupted or invalid"
    exit 1
fi

echo "Backup file verified successfully!"

# Confirmation prompt
read -p "⚠️  WARNING: This will restore the database '$DATABASE_NAME'. All current data will be replaced. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Create backup of current database before restore
echo "Creating backup of current database..."
CURRENT_BACKUP="${BACKUP_DIR}/pre_restore_${DATABASE_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$DATABASE_NAME" \
        --format=custom \
        --compress=9 \
        --file="$CURRENT_BACKUP"

echo "Current database backed up to: $CURRENT_BACKUP"

# Terminate active connections
echo "Terminating active connections..."
psql -h "$POSTGRES_HOST" \
     -p "$POSTGRES_PORT" \
     -U "$POSTGRES_USER" \
     -d postgres \
     -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DATABASE_NAME' AND pid <> pg_backend_pid();"

# Drop and recreate database
echo "Dropping and recreating database..."
psql -h "$POSTGRES_HOST" \
     -p "$POSTGRES_PORT" \
     -U "$POSTGRES_USER" \
     -d postgres \
     -c "DROP DATABASE IF EXISTS $DATABASE_NAME;"

psql -h "$POSTGRES_HOST" \
     -p "$POSTGRES_PORT" \
     -U "$POSTGRES_USER" \
     -d postgres \
     -c "CREATE DATABASE $DATABASE_NAME;"

# Restore database
echo "Restoring database from backup..."
pg_restore -h "$POSTGRES_HOST" \
           -p "$POSTGRES_PORT" \
           -U "$POSTGRES_USER" \
           -d "$DATABASE_NAME" \
           --verbose \
           --no-owner \
           --no-acl \
           "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Database restored successfully!"
else
    echo "Error: Database restore failed!"
    echo "Attempting to restore from pre-restore backup..."
    
    pg_restore -h "$POSTGRES_HOST" \
               -p "$POSTGRES_PORT" \
               -U "$POSTGRES_USER" \
               -d "$DATABASE_NAME" \
               --clean \
               --if-exists \
               "$CURRENT_BACKUP"
    
    exit 1
fi

# Run post-restore checks
echo "Running post-restore checks..."

# Check table count
TABLE_COUNT=$(psql -h "$POSTGRES_HOST" \
                   -p "$POSTGRES_PORT" \
                   -U "$POSTGRES_USER" \
                   -d "$DATABASE_NAME" \
                   -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "Tables restored: $TABLE_COUNT"

# Check for any errors in logs
echo "Checking for errors..."
psql -h "$POSTGRES_HOST" \
     -p "$POSTGRES_PORT" \
     -U "$POSTGRES_USER" \
     -d "$DATABASE_NAME" \
     -c "SELECT COUNT(*) as error_count FROM pg_stat_database WHERE datname = '$DATABASE_NAME';"

# Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"✅ PostgreSQL restore completed successfully\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Database\", \"value\": \"$DATABASE_NAME\", \"short\": true},
                    {\"title\": \"Tables\", \"value\": \"$TABLE_COUNT\", \"short\": true},
                    {\"title\": \"Backup Source\", \"value\": \"$BACKUP_SOURCE\", \"short\": false}
                ]
            }]
        }"
fi

echo "========================================="
echo "Restore process completed!"
echo "========================================="
echo "Database: $DATABASE_NAME"
echo "Tables restored: $TABLE_COUNT"
echo "Pre-restore backup: $CURRENT_BACKUP"
echo "========================================="
