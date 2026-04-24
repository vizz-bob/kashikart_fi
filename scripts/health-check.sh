#!/bin/bash

# KashiKart Health Check Script
# Usage: ./health-check.sh [--verbose] [--notify]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERBOSE=${1:+true}
NOTIFY=${2:+true}
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost"
DOMAIN=${DOMAIN:-your-domain.com}
LOG_FILE="/var/log/kashikart-health.log"

# Health check results
OVERALL_STATUS="HEALTHY"
ISSUES=()

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    if [ "$VERBOSE" = "true" ]; then
        echo -e "$1"
    fi
}

# Function to check service status
check_service() {
    local service_name=$1
    local service_url=$2
    local expected_status=${3:-200}
    
    log_message "${BLUE}🏥 Checking $service_name...${NC}"
    
    if curl -f -s -o /dev/null -w "%{http_code}" "$service_url" | grep -q "$expected_status"; then
        log_message "${GREEN}✅ $service_name is healthy${NC}"
        return 0
    else
        log_message "${RED}❌ $service_name is unhealthy${NC}"
        ISSUES+=("$service_name is down")
        OVERALL_STATUS="UNHEALTHY"
        return 1
    fi
}

# Function to check system resource
check_resource() {
    local resource_name=$1
    local threshold=$2
    local current_value=$3
    
    if (( $(echo "$current_value > $threshold" | bc -l) )); then
        log_message "${RED}❌ $resource_name usage high: $current_value% (threshold: $threshold%)${NC}"
        ISSUES+=("$resource_name usage: $current_value%")
        OVERALL_STATUS="UNHEALTHY"
        return 1
    else
        log_message "${GREEN}✅ $resource_name usage normal: $current_value%${NC}"
        return 0
    fi
}

# Function to restart service
restart_service() {
    local service_name=$1
    log_message "${YELLOW}🔄 Restarting $service_name...${NC}"
    
    if sudo systemctl restart "$service_name"; then
        sleep 5
        log_message "${GREEN}✅ $service_name restarted successfully${NC}"
        return 0
    else
        log_message "${RED}❌ Failed to restart $service_name${NC}"
        return 1
    fi
}

echo -e "${BLUE}🏥 Starting KashiKart Health Check...${NC}"
log_message "=== Health Check Started ==="

# Check Backend API
if ! check_service "Backend API" "$BACKEND_URL/api/health"; then
    restart_service "kashikart-backend"
    sleep 10
    if ! check_service "Backend API" "$BACKEND_URL/api/health"; then
        ISSUES+=("Backend API failed to restart")
    fi
fi

# Check Frontend
if ! check_service "Frontend" "$FRONTEND_URL"; then
    restart_service "nginx"
    sleep 5
    if ! check_service "Frontend" "$FRONTEND_URL"; then
        ISSUES+=("Frontend failed to restart")
    fi
fi

# Check Database Connection
log_message "${BLUE}🗄️ Checking database connection...${NC}"
if PGPASSWORD="$DATABASE_PASSWORD" psql -h "$RDS_HOST" -U "$RDS_USER" -d "$RDS_DATABASE" -c "SELECT 1;" &> /dev/null; then
    log_message "${GREEN}✅ Database connection healthy${NC}"
else
    log_message "${RED}❌ Database connection failed${NC}"
    ISSUES+=("Database connection failed")
    OVERALL_STATUS="UNHEALTHY"
fi

# Check System Resources
log_message "${BLUE}💻 Checking system resources...${NC}"

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
check_resource "CPU" 80 "$CPU_USAGE"

# Memory Usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
check_resource "Memory" 85 "$MEMORY_USAGE"

# Disk Usage
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
check_resource "Disk" 90 "$DISK_USAGE"

# Check S3 Connectivity (if AWS CLI is available)
if command -v aws &> /dev/null; then
    log_message "${BLUE}☁️ Checking S3 connectivity...${NC}"
    if aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
        log_message "${GREEN}✅ S3 connectivity healthy${NC}"
    else
        log_message "${RED}❌ S3 connectivity failed${NC}"
        ISSUES+=("S3 connectivity failed")
        OVERALL_STATUS="UNHEALTHY"
    fi
fi

# Check SSL Certificate (if domain is set)
if [ "$DOMAIN" != "your-domain.com" ]; then
    log_message "${BLUE}🔒 Checking SSL certificate...${NC}"
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | grep "Verify return code: 0" &> /dev/null; then
        log_message "${GREEN}✅ SSL certificate valid${NC}"
    else
        log_message "${RED}❌ SSL certificate invalid or expiring soon${NC}"
        ISSUES+=("SSL certificate issue")
        OVERALL_STATUS="UNHEALTHY"
    fi
fi

# Check Log Files for Errors
log_message "${BLUE}📋 Checking log files for errors...${NC}"
ERROR_COUNT=$(grep -i "error\|exception\|failed" /home/ubuntu/KashiKart-Fi/backend/*.log 2>/dev/null | wc -l)
if [ "$ERROR_COUNT" -gt 10 ]; then
    log_message "${YELLOW}⚠️ High number of errors in logs: $ERROR_COUNT${NC}"
    ISSUES+=("High error count in logs: $ERROR_COUNT")
else
    log_message "${GREEN}✅ Log files look normal${NC}"
fi

# Summary
echo -e "\n${BLUE}📊 Health Check Summary${NC}"
echo -e "Overall Status: ${OVERALL_STATUS}"
echo -e "Issues Found: ${#ISSUES[@]}"

if [ ${#ISSUES[@]} -gt 0 ]; then
    echo -e "\n${RED}❌ Issues:${NC}"
    for issue in "${ISSUES[@]}"; do
        echo -e "  • $issue"
    done
else
    echo -e "\n${GREEN}✅ All systems operational${NC}"
fi

log_message "=== Health Check Completed - Status: $OVERALL_STATUS ==="

# Send notification if there are issues
if [ ${#ISSUES[@]} -gt 0 ] && [ "$NOTIFY" = "true" ] && command -v curl &> /dev/null && [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    MESSAGE="🚨 KashiKart Health Check Alert\n\nStatus: $OVERALL_STATUS\nIssues: ${#ISSUES[@]}\n\n"
    for issue in "${ISSUES[@]}"; do
        MESSAGE+="• $issue\n"
    done
    
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
         -d chat_id="$TELEGRAM_CHAT_ID" \
         -d text="$MESSAGE" \
         2>/dev/null || log_message "⚠️ Notification failed"
fi

# Exit with appropriate code
if [ "$OVERALL_STATUS" = "HEALTHY" ]; then
    exit 0
else
    exit 1
fi
