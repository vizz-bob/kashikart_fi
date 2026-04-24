#!/bin/bash

# SSL Certificate Setup Script for KashiKart
# Usage: ./setup-ssl.sh your-domain.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide a domain name${NC}"
    echo "Usage: $0 your-domain.com"
    exit 1
fi

DOMAIN=$1
EMAIL="${2:-admin@$DOMAIN}"

echo -e "${BLUE}🔒 Setting up SSL certificate for $DOMAIN${NC}"

# Step 1: Install Certbot if not already installed
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
else
    echo -e "${GREEN}✅ Certbot already installed${NC}"
fi

# Step 2: Update Nginx configuration with domain
echo -e "${YELLOW}🔧 Updating Nginx configuration...${NC}"
sudo sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/kashikart

# Step 3: Test Nginx configuration
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    sudo systemctl reload nginx
else
    echo -e "${RED}❌ Nginx configuration is invalid${NC}"
    exit 1
fi

# Step 4: Obtain SSL certificate
echo -e "${YELLOW}🔑 Obtaining SSL certificate...${NC}"
if sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"; then
    echo -e "${GREEN}✅ SSL certificate obtained successfully${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo -e "${YELLOW}⚠️ Make sure your domain points to this server and port 80 is accessible${NC}"
    exit 1
fi

# Step 5: Setup auto-renewal
echo -e "${YELLOW}🔄 Setting up auto-renewal...${NC}"
if ! crontab -l | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo -e "${GREEN}✅ Auto-renewal setup completed${NC}"
else
    echo -e "${GREEN}✅ Auto-renewal already configured${NC}"
fi

# Step 6: Test SSL certificate
echo -e "${YELLOW}🧪 Testing SSL certificate...${NC}"
if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | grep "Verify return code: 0" &> /dev/null; then
    echo -e "${GREEN}✅ SSL certificate is valid${NC}"
else
    echo -e "${RED}❌ SSL certificate validation failed${NC}"
    exit 1
fi

# Step 7: Display certificate information
echo -e "${BLUE}📋 Certificate Information:${NC}"
sudo certbot certificates | grep -A 10 "$DOMAIN"

# Step 8: Test HTTPS redirect
echo -e "${YELLOW}🌐 Testing HTTPS redirect...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "http://$DOMAIN")
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ HTTP to HTTPS redirect working${NC}"
else
    echo -e "${RED}❌ HTTP to HTTPS redirect failed (Status: $HTTP_STATUS)${NC}"
fi

HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN")
if [ "$HTTPS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ HTTPS access working${NC}"
else
    echo -e "${RED}❌ HTTPS access failed (Status: $HTTPS_STATUS)${NC}"
fi

echo -e "${GREEN}🎉 SSL setup completed successfully!${NC}"
echo -e "${BLUE}🌐 Your application is now available at: https://$DOMAIN${NC}"
echo -e "${BLUE}📊 API documentation: https://$DOMAIN/docs${NC}"

# Show renewal information
echo -e "\n${BLUE}📅 Certificate Renewal Information:${NC}"
echo -e "• Auto-renewal is scheduled to run daily at 12:00 PM"
echo -e "• You can manually renew with: sudo certbot renew"
echo -e "• Certificate expires in 90 days"
echo -e "• You'll receive email reminders at $EMAIL"

# Security recommendations
echo -e "\n${YELLOW}🔒 Security Recommendations:${NC}"
echo -e "• Keep your system updated: sudo apt update && sudo apt upgrade"
echo -e "• Monitor certificate logs: sudo journalctl -u certbot"
echo -e "• Test SSL configuration: https://www.ssllabs.com/ssltest/"
