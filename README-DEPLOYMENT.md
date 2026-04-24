# KashiKart Deployment Documentation

## 🚀 Quick Start

This repository contains everything needed to deploy KashiKart Tender Intelligence System on AWS EC2 with Windows .exe distribution capability.

## 📋 What You'll Get

- ✅ **Complete AWS EC2 deployment** with FastAPI backend
- ✅ **S3 + RDS database setup** for scalable storage
- ✅ **Windows .exe application** for desktop distribution
- ✅ **Automated deployment scripts** for zero-downtime updates
- ✅ **SSL certificates** and security hardening
- ✅ **Monitoring and backup** automation
- ✅ **Production-ready configuration**

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Windows .exe  │    │   AWS EC2       │    │   AWS Services  │
│   (Desktop App) │◄──►│   (Backend)     │◄──►│   - RDS         │
│   React +       │    │   FastAPI       │    │   - S3          │
│   Electron      │    │   Nginx         │    │   - Route53     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
KashiKart-Fi/
├── backend/                    # FastAPI Python backend
│   ├── app/                   # Application code
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile            # Container configuration
│   └── config.py             # Application settings
├── frontend/                  # React frontend
│   ├── src/                  # React components
│   ├── public/               # Static assets + Electron
│   ├── package.json          # Node.js dependencies
│   └── vite.config.js        # Vite configuration
├── scripts/                   # Deployment automation
│   ├── deploy.sh             # Main deployment script
│   ├── backup.sh             # Backup automation
│   ├── health-check.sh       # Health monitoring
│   └── setup-ssl.sh          # SSL certificate setup
├── config/                    # Configuration files
│   ├── kashikart-backend.service  # Systemd service
│   └── nginx-kashikart       # Nginx configuration
├── deployment-guide.md        # Complete deployment guide
└── README-DEPLOYMENT.md       # This file
```

## 🛠️ Prerequisites

### AWS Account Setup
- AWS account with billing enabled
- IAM user with EC2, RDS, S3, Route53 permissions
- Domain name (optional but recommended)

### Local Development
- Git
- Node.js 18+ (for .exe building)
- Python 3.11+ (for local testing)
- AWS CLI configured

## 🚀 Deployment Steps

### 1. Clone and Configure
```bash
git clone <YOUR_REPO_URL>
cd KashiKart-Fi

# Configure your environment
cp .env.example .env
# Edit .env with your credentials
```

### 2. AWS Infrastructure Setup
```bash
# Follow the detailed guide in deployment-guide.md
# Sections: Phase 1-2 (AWS EC2 + Database Setup)
```

### 3. Deploy Backend
```bash
# Connect to your EC2 instance
ssh -i your-key.pem ubuntu@<EC2_IP>

# Deploy backend
cd /home/ubuntu/KashiKart-Fi/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup systemd service
sudo cp ../config/kashikart-backend.service /etc/systemd/system/
sudo systemctl enable kashikart-backend
sudo systemctl start kashikart-backend
```

### 4. Deploy Frontend
```bash
# Build frontend
cd /home/ubuntu/KashiKart-Fi/frontend
npm install
npm run build

# Setup Nginx
sudo cp ../config/nginx-kashikart /etc/nginx/sites-available/kashikart
sudo ln -s /etc/nginx/sites-available/kashikart /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Setup SSL
```bash
# Install SSL certificate
sudo ../scripts/setup-ssl.sh your-domain.com
```

### 6. Build Windows .exe
```bash
# On Windows machine or with cross-compilation
cd frontend
npm install --save-dev electron electron-builder
npm run electron-pack
```

## 📱 Windows .exe Distribution

The Windows executable is created using Electron and includes:
- ✅ Standalone React application
- ✅ Auto-updater capability
- ✅ Desktop notifications
- ✅ File system access
- ✅ Offline functionality

### Building .exe
```bash
# Update package.json with electron configuration
npm install --save-dev electron electron-builder

# Build executable
npm run electron-pack

# Output: dist-electron/KashiKart-Setup-x.x.x.exe
```

## 🔧 Automation Scripts

### Deployment Script
```bash
# Deploy latest changes
./scripts/deploy.sh production

# Features:
# - Zero-downtime deployment
# - Automatic backup
# - Health checks
# - Rollback capability
```

### Backup Script
```bash
# Create backup
./scripts/backup.sh s3

# Features:
# - Database backup
# - File backup
# - S3 upload
# - Retention policy
```

### Health Monitoring
```bash
# Check system health
./scripts/health-check.sh --verbose --notify

# Features:
# - Service health checks
# - Resource monitoring
# - SSL certificate validation
# - Alert notifications
```

## 🔒 Security Features

- ✅ **SSL/TLS encryption** with auto-renewal
- ✅ **Rate limiting** on API endpoints
- ✅ **Security headers** (CSP, HSTS, XSS protection)
- ✅ **Firewall configuration** with UFW
- ✅ **Non-root user** for application processes
- ✅ **Database encryption** at rest and in transit
- ✅ **S3 bucket policies** with least privilege access

## 📊 Monitoring & Maintenance

### System Monitoring
- CPU, Memory, Disk usage alerts
- Service health checks
- Error log monitoring
- SSL certificate expiry alerts

### Backup Strategy
- Daily automated backups
- 7-day retention policy
- S3 cross-region replication
- Point-in-time recovery

### Performance Optimization
- Nginx caching
- Database connection pooling
- CDN integration ready
- Auto-scaling capable

## 💰 Cost Estimation

### Monthly AWS Costs (Production)
- **EC2 t3.medium**: ~$25/month
- **RDS db.t3.micro**: ~$15/month (Free tier eligible)
- **S3 Storage**: ~$5/month (100GB)
- **Data Transfer**: ~$10/month
- **Domain + SSL**: ~$15/month

**Total Estimated Cost**: ~$70/month

## 🔄 Git Workflow

### Branch Strategy
- `main` - Production environment
- `staging` - Staging environment
- `develop` - Development environment

### Deployment Commands
```bash
# Deploy to production
git push origin main
# Auto-deployment triggers via webhook

# Manual deployment
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging
```

## 🐛 Troubleshooting

### Common Issues

#### Backend Not Starting
```bash
# Check logs
sudo journalctl -u kashikart-backend -f

# Check configuration
sudo nginx -t
sudo systemctl status nginx
```

#### Database Connection Issues
```bash
# Test database connection
psql -h $RDS_HOST -U $RDS_USER -d $RDS_DATABASE

# Check security groups
# Ensure EC2 can access RDS on port 5432
```

#### SSL Certificate Issues
```bash
# Renew certificate manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Support Commands
```bash
# System resources
htop
df -h
free -h

# Network connectivity
curl -I http://localhost:8000/api/health
curl -I https://your-domain.com

# Service status
sudo systemctl status kashikart-backend
sudo systemctl status nginx
```

## 📞 Support & Documentation

### Documentation Files
- `deployment-guide.md` - Complete step-by-step guide
- `README.md` - Project overview
- API docs - Available at `https://your-domain.com/docs`

### Getting Help
1. Check the troubleshooting section above
2. Review logs in `/var/log/` and application logs
3. Consult the detailed deployment guide
4. Check AWS service health dashboard

## 🎯 Next Steps

1. **Customize branding** - Update logos and colors
2. **Configure email** - Set up SMTP for notifications
3. **Domain setup** - Configure custom domain
4. **Monitoring** - Set up alerting
5. **Scaling** - Configure auto-scaling groups

## 📝 Deployment Checklist

### Pre-deployment
- [ ] AWS account and IAM configured
- [ ] Domain name purchased
- [ ] SSL certificate ready
- [ ] Database credentials secured
- [ ] Backup strategy defined

### Post-deployment
- [ ] Application accessible via HTTPS
- [ ] Database connectivity verified
- [ ] S3 file uploads working
- [ ] Email notifications functional
- [ ] Monitoring alerts configured
- [ ] Backup automation tested
- [ ] Windows .exe created and tested
- [ ] Documentation updated

---

**🎉 Your KashiKart Tender Intelligence System is now ready for production deployment!**

For detailed step-by-step instructions, please refer to `deployment-guide.md`.
