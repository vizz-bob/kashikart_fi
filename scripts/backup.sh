#!/bin/bash

# KashiKart Backup Script
# Usage: ./backup.sh [local|s3]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_TYPE=${1:-local}
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Database configuration (should be in environment)
RDS_HOST="${RDS_HOST:-localhost}"
RDS_USER="${RDS_USER:-postgres}"
RDS_DATABASE="${RDS_DATABASE:-kashikart}"
S3_BUCKET="${S3_BUCKET:-kashikart-tender-data}"

echo -e "${BLUE}📦 Starting KashiKart Backup ($BACKUP_TYPE)...${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/temp"

# Function to cleanup on exit
cleanup() {
    rm -rf "$BACKUP_DIR/temp"
}
trap cleanup EXIT

# Step 1: Backup Database
echo -e "${YELLOW}🗄️ Backing up database...${NC}"
DB_BACKUP_FILE="$BACKUP_DIR/temp/db_backup_$DATE.sql"

if ! PGPASSWORD="$DATABASE_PASSWORD" pg_dump -h "$RDS_HOST" -U "$RDS_USER" -d "$RDS_DATABASE" > "$DB_BACKUP_FILE"; then
    echo -e "${RED}❌ Database backup failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database backup completed${NC}"

# Step 2: Backup Application Files
echo -e "${YELLOW}📁 Backing up application files...${NC}"
APP_BACKUP_FILE="$BACKUP_DIR/temp/app_backup_$DATE.tar.gz"

tar -czf "$APP_BACKUP_FILE" \
    /home/ubuntu/KashiKart-Fi/backend/app \
    /home/ubuntu/KashiKart-Fi/frontend/src \
    /home/ubuntu/KashiKart-Fi/backend/config.py \
    /home/ubuntu/KashiKart-Fi/backend/requirements.txt \
    /home/ubuntu/KashiKart-Fi/frontend/package.json \
    --exclude='*.log' \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__'

echo -e "${GREEN}✅ Application files backup completed${NC}"

# Step 3: Backup S3 Data (if configured)
if [ "$BACKUP_TYPE" = "s3" ] && command -v aws &> /dev/null; then
    echo -e "${YELLOW}☁️ Backing up S3 data...${NC}"
    S3_BACKUP_DIR="$BACKUP_DIR/temp/s3_backup_$DATE"
    mkdir -p "$S3_BACKUP_DIR"
    
    if aws s3 sync "s3://$S3_BUCKET" "$S3_BACKUP_DIR" --delete; then
        echo -e "${GREEN}✅ S3 backup completed${NC}"
    else
        echo -e "${RED}❌ S3 backup failed${NC}"
        exit 1
    fi
fi

# Step 4: Create combined backup
echo -e "${YELLOW}🗜️ Creating combined backup archive...${NC}"
FINAL_BACKUP_FILE="$BACKUP_DIR/kashikart_backup_$DATE.tar.gz"

if [ "$BACKUP_TYPE" = "s3" ]; then
    tar -czf "$FINAL_BACKUP_FILE" -C "$BACKUP_DIR/temp" \
        "db_backup_$DATE.sql" \
        "app_backup_$DATE.tar.gz" \
        "s3_backup_$DATE"
else
    tar -czf "$FINAL_BACKUP_FILE" -C "$BACKUP_DIR/temp" \
        "db_backup_$DATE.sql" \
        "app_backup_$DATE.tar.gz"
fi

# Step 5: Upload to S3 (if configured)
if [ "$BACKUP_TYPE" = "s3" ] && command -v aws &> /dev/null; then
    echo -e "${YELLOW}☁️ Uploading backup to S3...${NC}"
    if aws s3 cp "$FINAL_BACKUP_FILE" "s3://$S3_BUCKET/backups/"; then
        echo -e "${GREEN}✅ Backup uploaded to S3${NC}"
    else
        echo -e "${RED}❌ S3 upload failed${NC}"
        exit 1
    fi
fi

# Step 6: Cleanup old backups
echo -e "${YELLOW}🧹 Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
find "$BACKUP_DIR" -name "kashikart_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Step 7: Verify backup
echo -e "${BLUE}🔍 Verifying backup integrity...${NC}"
if tar -tzf "$FINAL_BACKUP_FILE" > /dev/null 2>&1; then
    BACKUP_SIZE=$(du -h "$FINAL_BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup verification successful${NC}"
    echo -e "${GREEN}📊 Backup size: $BACKUP_SIZE${NC}"
else
    echo -e "${RED}❌ Backup verification failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo -e "${BLUE}📍 Backup location: $FINAL_BACKUP_FILE${NC}"

# Log backup completion
echo "$(date): Backup completed - $FINAL_BACKUP_FILE" >> "$BACKUP_DIR/backup.log"

# Send notification (optional)
if command -v curl &> /dev/null && [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
         -d chat_id="$TELEGRAM_CHAT_ID" \
         -d text="✅ KashiKart backup completed successfully\n📊 Size: $BACKUP_SIZE\n📍 Location: $FINAL_BACKUP_FILE" \
         2>/dev/null || echo -e "${YELLOW}⚠️ Notification failed${NC}"
fi
