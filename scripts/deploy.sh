#!/bin/bash

# KashiKart Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environment: development, staging, production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
REPO_URL="<YOUR_REPO_URL>"
DOMAIN="your-domain.com"
EC2_USER="ubuntu"
EC2_IP="<YOUR_EC2_IP>"
KEY_FILE="kashiKart.pem"

echo -e "${BLUE}🚀 Starting KashiKart Deployment to $ENVIRONMENT...${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment. Use: development, staging, or production${NC}"
    exit 1
fi

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}❌ Key file $KEY_FILE not found${NC}"
    exit 1
fi

# Function to execute remote commands
execute_remote() {
    ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" "$1"
}

# Step 1: Backup current deployment
echo -e "${YELLOW}📦 Creating backup of current deployment...${NC}"
execute_remote "cd /home/ubuntu && ./backup.sh" || echo -e "${YELLOW}⚠️ Backup failed, continuing...${NC}"

# Step 2: Update repository
echo -e "${BLUE}📥 Pulling latest changes...${NC}"
execute_remote "cd /home/ubuntu/KashiKart-Fi && git fetch origin && git pull origin main"

# Step 3: Deploy Backend
echo -e "${GREEN}🔧 Deploying Backend...${NC}"
execute_remote "
cd /home/ubuntu/KashiKart-Fi/backend && \
source venv/bin/activate && \
pip install -r requirements.txt && \
cd app && \
alembic upgrade head && \
sudo systemctl restart kashikart-backend && \
sudo systemctl status kashikart-backend --no-pager
"

# Step 4: Deploy Frontend
echo -e "${GREEN}🎨 Deploying Frontend...${NC}"
execute_remote "
cd /home/ubuntu/KashiKart-Fi/frontend && \
npm ci && \
npm run build && \
sudo cp -r dist/* /var/www/html/ && \
sudo systemctl restart nginx && \
sudo systemctl status nginx --no-pager
"

# Step 5: Health Check
echo -e "${BLUE}🏥 Running health checks...${NC}"
HEALTH_STATUS=$(execute_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/health")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP $HEALTH_STATUS)${NC}"
    exit 1
fi

FRONTEND_STATUS=$(execute_remote "curl -s -o /dev/null -w '%{http_code}' http://localhost")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${RED}❌ Frontend health check failed (HTTP $FRONTEND_STATUS)${NC}"
    exit 1
fi

# Step 6: Cleanup
echo -e "${YELLOW}🧹 Cleaning up old deployments...${NC}"
execute_remote "find /home/ubuntu/backups -name 'kashikart_backup_*.tar.gz' -mtime +7 -delete 2>/dev/null || true"

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}🌐 Your application is available at: https://$DOMAIN${NC}"
echo -e "${BLUE}📊 API documentation: https://$DOMAIN/docs${NC}"

# Send notification (optional)
if command -v curl &> /dev/null; then
    curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
         -d chat_id="<YOUR_CHAT_ID>" \
         -d text="✅ KashiKart deployment to $ENVIRONMENT completed successfully" \
         2>/dev/null || echo -e "${YELLOW}⚠️ Notification failed${NC}"
fi
