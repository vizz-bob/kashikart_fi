# KashiKart Complete Deployment Guide

## Project Overview
- **Backend**: FastAPI (Python 3.11) with PostgreSQL/MySQL database
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Deployment Target**: AWS EC2 + S3 + Windows .exe
- **Project Type**: Tender Intelligence System

## Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Windows .exe  │    │   AWS EC2       │    │   AWS S3        │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│   React App     │    │   FastAPI       │    │   File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Phase 1: AWS EC2 Setup

### 1.1 Launch EC2 Instance
```bash
# AWS Console → EC2 → Launch Instance
# Instance Configuration:
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.medium (recommended for production)
- Storage: 30 GB gp3 SSD
- Key Pair: Create and download .pem file
# Security Group Rules:
Port 22   (SSH)     - Your IP
Port 80   (HTTP)    - 0.0.0.0/0
Port 443  (HTTPS)   - 0.0.0.0/0
Port 8000 (FastAPI) - 0.0.0.0/0
```

### 1.2 Connect to EC2
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

### 1.3 System Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx docker.io docker-compose

# Start Docker services
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Reboot to apply group changes
sudo reboot
```

## Phase 2: Database Setup (S3 + RDS)

### 2.1 AWS S3 Configuration
```bash
# Create S3 Bucket via AWS Console
# Bucket Name: kashikart-tender-data
# Region: Same as EC2
# Block Public Access: Enabled
# Versioning: Enabled
```

### 2.2 AWS RDS PostgreSQL Setup
```bash
# AWS Console → RDS → Create Database
# Engine: PostgreSQL
# Version: 15.x
# Instance Class: db.t3.micro (free tier) or db.t3.small
# Storage: 20 GB
# VPC: Default VPC
# Security Group: Create new, allow port 5432 from EC2 security group
```

### 2.3 Environment Variables
Create `.env` file in project root:
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/kashikart
DATABASE_PASSWORD=your_secure_password

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=kashikart-tender-data

# Application Configuration
SECRET_KEY=your_super_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key
ENVIRONMENT=production
FRONTEND_URL=http://your-domain.com
BACKEND_URL=http://your-domain.com:8000

# SMTP Configuration
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
```

## Phase 3: Backend Deployment

### 3.1 Clone and Setup Backend
```bash
# Clone repository
cd /home/ubuntu
git clone <YOUR_REPO_URL>
cd KashiKart-Fi/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install additional production dependencies
pip install gunicorn psycopg2-binary boto3
```

### 3.2 Database Migration
```bash
# Run database migrations
cd app
alembic upgrade head
```

### 3.3 Create Systemd Service
```bash
sudo nano /etc/systemd/system/kashikart-backend.service
```

Paste this configuration:
```ini
[Unit]
Description=KashiKart Backend API
After=network.target

[Service]
Type=exec
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/KashiKart-Fi/backend
Environment=PATH=/home/ubuntu/KashiKart-Fi/backend/venv/bin
ExecStart=/home/ubuntu/KashiKart-Fi/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3.4 Start Backend Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable kashikart-backend
sudo systemctl start kashikart-backend
sudo systemctl status kashikart-backend
```

## Phase 4: Frontend Build and Deployment

### 4.1 Build Frontend for Production
```bash
# Navigate to frontend
cd /home/ubuntu/KashiKart-Fi/frontend

# Install Node.js (using NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts
nvm use --lts

# Install dependencies
npm install

# Create production .env
echo "VITE_API_BASE_URL=http://your-domain.com:8000" > .env

# Build for production
npm run build
```

### 4.2 Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/kashikart
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend static files
    location / {
        root /home/ubuntu/KashiKart-Fi/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4.3 Enable Nginx Site
```bash
sudo ln -s /etc/nginx/sites-available/kashikart /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Phase 5: SSL Certificate Setup

### 5.1 Install SSL with Certbot
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 5.2 Auto-renew SSL
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Phase 6: Windows .exe Creation

### 6.1 Setup Electron Wrapper
```bash
# In frontend directory
npm install --save-dev electron electron-builder
npm install concurrently wait-on
```

### 6.2 Create Electron Main Process
Create `public/electron.js`:
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, 'icon.png')
  });

  const startUrl = isDev 
    ? 'http://localhost:5173' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### 6.3 Update package.json
Add to `package.json`:
```json
{
  "main": "public/electron.js",
  "homepage": "./",
  "scripts": {
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron-pack": "electron-builder",
    "preelectron-pack": "npm run build"
  },
  "build": {
    "appId": "com.kashikart.tender",
    "productName": "KashiKart Tender Intelligence",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "public/electron.js"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### 6.4 Build Windows .exe
```bash
# On Windows machine or cross-compile
npm run electron-pack
```

The .exe will be created in `dist-electron/` folder.

## Phase 7: Deployment Scripts

### 7.1 Create Deployment Script
Create `deploy.sh`:
```bash
#!/bin/bash

# KashiKart Deployment Script
set -e

echo "🚀 Starting KashiKart Deployment..."

# Variables
REPO_URL="<YOUR_REPO_URL>"
DOMAIN="your-domain.com"
EC2_USER="ubuntu"
EC2_IP="<YOUR_EC2_IP>"

# Step 1: Deploy Backend
echo "📦 Deploying Backend..."
ssh -i your-key.pem $EC2_USER@$EC2_IP << 'EOF'
cd /home/ubuntu/KashiKart-Fi
git pull origin main
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd app
alembic upgrade head
sudo systemctl restart kashikart-backend
EOF

# Step 2: Deploy Frontend
echo "🎨 Deploying Frontend..."
ssh -i your-key.pem $EC2_USER@$EC2_IP << 'EOF'
cd /home/ubuntu/KashiKart-Fi/frontend
npm run build
sudo systemctl restart nginx
EOF

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is available at: https://$DOMAIN"
```

### 7.2 Create Backup Script
Create `backup.sh`:
```bash
#!/bin/bash

# KashiKart Backup Script
set -e

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h $RDS_HOST -U $RDS_USER -d $RDS_DATABASE > $BACKUP_DIR/db_backup_$DATE.sql

# Backup S3 data
aws s3 sync s3://kashikart-tender-data $BACKUP_DIR/s3_backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/kashikart_backup_$DATE.tar.gz $BACKUP_DIR/db_backup_$DATE.sql $BACKUP_DIR/s3_backup_$DATE

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "kashikart_backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_DIR/kashikart_backup_$DATE.tar.gz"
```

## Phase 8: Monitoring and Maintenance

### 8.1 Setup Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Setup log rotation
sudo nano /etc/logrotate.d/kashikart
```

Log rotation config:
```
/home/ubuntu/KashiKart-Fi/backend/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
}
```

### 8.2 Health Check Script
Create `health-check.sh`:
```bash
#!/bin/bash

# Health Check Script
BACKEND_URL="http://localhost:8000/api/health"
FRONTEND_URL="http://localhost"

# Check backend
if curl -f -s $BACKEND_URL > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is down"
    sudo systemctl restart kashikart-backend
fi

# Check frontend
if curl -f -s $FRONTEND_URL > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is down"
    sudo systemctl restart nginx
fi
```

## Phase 9: Security Hardening

### 9.1 Firewall Setup
```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 8000
```

### 9.2 Security Updates
```bash
# Auto security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Phase 10: GitHub Actions Deployment Workflow

### 10.1 GitHub Repository Setup
1. **Create GitHub Repository**
   ```bash
   # Your repository is already created
   git remote add origin https://github.com/vizz-bob/kashikart_fi.git
   git push -u origin main
   ```

2. **Configure GitHub Secrets**
   Go to Repository Settings → Secrets and variables → Actions and add:
   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   EC2_INSTANCE_ID=i-xxxxxxxxxxxx
   EC2_SSH_KEY=your_pem_file_content
   DOMAIN_NAME=your-domain.com
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=your_rds_endpoint
   DB_NAME=kashikart
   SECRET_KEY=your_secret_key
   ENCRYPTION_KEY=your_encryption_key
   S3_BUCKET_NAME=kashikart-tender-data
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   TELEGRAM_BOT_TOKEN=your_bot_token
   TELEGRAM_CHAT_ID=your_chat_id
   ```

### 10.2 Automated Deployment with GitHub Actions
The project includes two main workflows:

#### Deploy to EC2 Workflow (`.github/workflows/deploy-ec2.yml`)
- **Triggers**: Push to main branch, manual dispatch
- **Features**:
  - Automated testing
  - Docker container deployment
  - SSL certificate setup
  - Health checks
  - Rollback capability
  - Telegram notifications

#### Build Windows .exe Workflow (`.github/workflows/build-exe.yml`)
- **Triggers**: Git tags, manual dispatch
- **Features**:
  - Windows executable building
  - Automatic releases
  - S3 upload
  - GitHub release creation

### 10.3 Deployment Commands
```bash
# Deploy to production (push to main)
git push origin main

# Manual deployment
gh workflow run deploy-ec2.yml --field environment=production

# Build Windows .exe
git tag v1.0.0
git push origin v1.0.0

# Manual .exe build
gh workflow run build-exe.yml --field version=1.0.0
```

### 10.4 Monitoring Deployment
- Check GitHub Actions tab for deployment status
- Monitor logs in real-time
- Receive Telegram notifications on completion
- Access deployment summary in GitHub Actions

### 10.5 Rollback Procedure
```bash
# Rollback to previous commit
git checkout <previous-commit-hash>
git push origin main --force

# Or use GitHub CLI
gh workflow run deploy-ec2.yml --field environment=production --field rollback=true
```

## Required Files Checklist

### Backend Files:
- ✅ `requirements.txt` - Python dependencies
- ✅ `Dockerfile` - Container configuration
- ✅ `config.py` - Application settings
- ✅ `app/main.py` - FastAPI application
- ✅ `.env` - Environment variables
- ✅ `alembic.ini` - Database migration config

### Frontend Files:
- ✅ `package.json` - Node.js dependencies
- ✅ `vite.config.js` - Vite configuration
- ✅ `tailwind.config.js` - TailwindCSS config
- ✅ `.env` - Frontend environment variables
- ⚠️ `public/electron.js` - Need to create for .exe
- ⚠️ `public/icon.ico` - Need to create for .exe

### Deployment Files:
- ⚠️ `deploy.sh` - Deployment script
- ⚠️ `backup.sh` - Backup script
- ⚠️ `health-check.sh` - Health monitoring
- ⚠️ `kashikart-backend.service` - Systemd service
- ⚠️ `nginx-kashikart` - Nginx configuration

### Missing Files to Create:
1. `public/electron.js` - Electron main process
2. `public/icon.ico` - Application icon
3. `deploy.sh` - Deployment automation
4. `backup.sh` - Backup automation
5. `health-check.sh` - Health monitoring
6. SSL certificate setup script
7. AWS IAM policy configuration

## Cost Estimation (Monthly)

### AWS Services:
- **EC2 t3.medium**: ~$25/month
- **RDS db.t3.micro**: ~$15/month (Free tier eligible)
- **S3 Storage**: ~$5/month (100GB)
- **Data Transfer**: ~$10/month
- **Domain + SSL**: ~$15/month

**Total Estimated Cost**: ~$70/month

## Final Checklist

### Pre-deployment:
- [ ] AWS account setup with billing
- [ ] Domain name purchased
- [ ] SSL certificate ready
- [ ] Database credentials secured
- [ ] Backup strategy defined

### Post-deployment:
- [ ] Application accessible via HTTPS
- [ ] Database connectivity verified
- [ ] S3 file uploads working
- [ ] Email notifications functional
- [ ] Monitoring alerts configured
- [ ] Backup automation tested
- [ ] Windows .exe created and tested

## Troubleshooting

### Common Issues:
1. **Port 8000 not accessible**: Check EC2 security group
2. **Database connection failed**: Verify RDS security group allows EC2 access
3. **S3 upload errors**: Check IAM permissions and bucket policy
4. **SSL certificate errors**: Run certbot in debug mode
5. **Frontend not loading**: Check Nginx configuration and file paths

### Support Commands:
```bash
# Check backend logs
sudo journalctl -u kashikart-backend -f

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
free -h

# Test API endpoints
curl -X GET http://localhost:8000/api/health
```

This comprehensive guide covers everything needed for production deployment of KashiKart on AWS with Windows .exe distribution capability.
