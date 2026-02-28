#!/bin/bash

# PostgreSQL Backup Script for Technician Marketplace Platform
# Performs full database backup with compression and uploads to S3

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
S3_BUCKET="${S3_BUCKET:-technician-marketplace-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATABASE_NAME="${DATABASE_NAME:-technician_marketplace}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="postgres_${DATABASE_NAME}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "========================================="
echo "PostgreSQL Backup Script"
echo "========================================="
echo "Database: $DATABASE_NAME"
echo "Timestamp: $TIMESTAMP"
echo "Backup file: $BACKUP_FILE"
echo "========================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
echo "Starting database backup..."
pg_dump -h "$POSTGRES_HOST" \
        -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" \
        -d "$DATABASE_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        --file="$BACKUP_PATH"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully!"
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"
else
    echo "Error: Backup failed!"
    exit 1
fi

# Upload to S3
echo "Uploading backup to S3..."
aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}" \
    --storage-class STANDARD_IA \
    --metadata "database=$DATABASE_NAME,timestamp=$TIMESTAMP"

if [ $? -eq 0 ]; then
    echo "Backup uploaded to S3 successfully!"
else
    echo "Error: Failed to upload backup to S3!"
    exit 1
fi

# Create backup metadata
cat > "${BACKUP_PATH}.meta" <<EOF
{
  "database": "$DATABASE_NAME",
  "timestamp": "$TIMESTAMP",
  "size": "$BACKUP_SIZE",
  "host": "$POSTGRES_HOST",
  "s3_path": "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}"
}
EOF

# Upload metadata
aws s3 cp "${BACKUP_PATH}.meta" "s3://${S3_BUCKET}/postgres/${BACKUP_FILE}.meta"

# Clean up old local backups
echo "Cleaning up old local backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "postgres_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "postgres_*.sql.gz.meta" -type f -mtime +$RETENTION_DAYS -delete

# Clean up old S3 backups
echo "Cleaning up old S3 backups (older than $RETENTION_DAYS days)..."
CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
aws s3 ls "s3://${S3_BUCKET}/postgres/" | while read -r line; do
    FILE_DATE=$(echo "$line" | awk '{print $4}' | grep -oP '\d{8}' | head -1)
    FILE_NAME=$(echo "$line" | awk '{print $4}')
    
    if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
        echo "Deleting old backup: $FILE_NAME"
        aws s3 rm "s3://${S3_BUCKET}/postgres/$FILE_NAME"
    fi
done

# Verify backup integrity
echo "Verifying backup integrity..."
pg_restore --list "$BACKUP_PATH" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Backup integrity verified!"
else
    echo "Warning: Backup integrity check failed!"
fi

# Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"✅ PostgreSQL backup completed successfully\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Database\", \"value\": \"$DATABASE_NAME\", \"short\": true},
                    {\"title\": \"Size\", \"value\": \"$BACKUP_SIZE\", \"short\": true},
                    {\"title\": \"Timestamp\", \"value\": \"$TIMESTAMP\", \"short\": true},
                    {\"title\": \"Location\", \"value\": \"s3://${S3_BUCKET}/postgres/${BACKUP_FILE}\", \"short\": false}
                ]
            }]
        }"
fi

echo "========================================="
echo "Backup process completed!"
echo "========================================="
