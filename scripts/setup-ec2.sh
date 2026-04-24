#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  KashiKart — EC2 First-Time Setup Script
#  Run ONCE on a fresh Ubuntu 22.04 EC2 instance
#
#  Usage (from your local machine):
#    chmod +x scripts/setup-ec2.sh
#    ssh -i kashikart-fi.pem ubuntu@13.232.38.191
#    # then on EC2:
#    bash /tmp/setup-ec2.sh
#
#  Or copy & run remotely:
#    scp -i kashikart-fi.pem scripts/setup-ec2.sh ubuntu@13.232.38.191:/tmp/
#    ssh -i kashikart-fi.pem ubuntu@13.232.38.191 "bash /tmp/setup-ec2.sh"
# ═══════════════════════════════════════════════════════════════

set -e

EC2_USER="ubuntu"
DEPLOY_PATH="/home/ubuntu/kashikart"
VENV_PATH="/home/ubuntu/venv"

echo "======================================================"
echo "  KashiKart EC2 Setup — Ubuntu 22.04"
echo "  EC2 IP: 13.232.38.191"
echo "======================================================"

# ── 1. System packages ────────────────────────────────────────
echo ""
echo "[1/8] Installing system packages..."
sudo apt-get update -q
sudo apt-get install -y \
  python3.11 python3.11-venv python3.11-dev \
  python3-pip \
  git curl wget \
  libpq-dev build-essential \
  nginx \
  libmagic1 \
  chromium-browser chromium-chromedriver \
  --no-install-recommends

echo "  System packages installed."

# ── 2. Python virtual environment ─────────────────────────────
echo ""
echo "[2/8] Creating Python virtual environment at $VENV_PATH..."
python3.11 -m venv "$VENV_PATH"
source "$VENV_PATH/bin/activate"
pip install --upgrade pip -q
echo "  Venv ready."

# ── 3. Create app directories ─────────────────────────────────
echo ""
echo "[3/8] Creating app directories..."
mkdir -p "$DEPLOY_PATH"
mkdir -p "$DEPLOY_PATH/uploads"
mkdir -p "$DEPLOY_PATH/branding"
mkdir -p "$DEPLOY_PATH/logs"
echo "  Directories created."

# ── 4. Clone repository ───────────────────────────────────────
echo ""
echo "[4/8] Cloning repository..."
if [ -d "$DEPLOY_PATH/.git" ]; then
  echo "  Repo already exists, pulling latest..."
  cd "$DEPLOY_PATH"
  git pull origin main
else
  git clone https://github.com/vizz-bob/kashikart_fi.git "$DEPLOY_PATH"
  echo "  Repo cloned."
fi

# ── 5. Install Python dependencies ────────────────────────────
echo ""
echo "[5/8] Installing Python dependencies..."
source "$VENV_PATH/bin/activate"
pip install -r "$DEPLOY_PATH/backend/requirements.txt" -q
echo "  Dependencies installed."

# ── 6. Create .env file (placeholder) ─────────────────────────
echo ""
echo "[6/8] Creating .env template at $DEPLOY_PATH/.env ..."
if [ ! -f "$DEPLOY_PATH/.env" ]; then
  cp "$DEPLOY_PATH/.env.example" "$DEPLOY_PATH/.env" 2>/dev/null || \
  cat > "$DEPLOY_PATH/.env" << 'EOF'
# Fill in these values — see .env.example for descriptions
APP_NAME=KashiKart
APP_VERSION=1.0.0
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://kashikart_user:PASSWORD@RDS_ENDPOINT:5432/kashikart_db
DATABASE_PASSWORD=PASSWORD
SECRET_KEY=CHANGE_ME
ENCRYPTION_KEY=CHANGE_ME
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
AWS_REGION=ap-south-1
S3_BUCKET_NAME=kashikart-tender-data
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_TLS=true
SMTP_USER=CHANGE_ME
SMTP_PASSWORD=CHANGE_ME
SMTP_FROM_EMAIL=CHANGE_ME
FRONTEND_URL=http://13.232.38.191
BACKEND_URL=http://13.232.38.191:8000
UPLOAD_DIR=/home/ubuntu/kashikart/uploads
BRANDING_UPLOAD_DIR=/home/ubuntu/kashikart/branding
EOF
  echo "  .env template created — EDIT IT BEFORE STARTING THE SERVICE!"
else
  echo "  .env already exists, skipping."
fi

# ── 7. Create systemd service ─────────────────────────────────
echo ""
echo "[7/8] Creating systemd service: kashikart-backend..."
sudo tee /etc/systemd/system/kashikart-backend.service > /dev/null << EOF
[Unit]
Description=KashiKart Tender Intelligence — FastAPI Backend
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$EC2_USER
WorkingDirectory=$DEPLOY_PATH/backend
EnvironmentFile=$DEPLOY_PATH/.env
ExecStart=$VENV_PATH/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=on-failure
RestartSec=5
StandardOutput=append:$DEPLOY_PATH/logs/backend.log
StandardError=append:$DEPLOY_PATH/logs/backend-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable kashikart-backend
echo "  systemd service created and enabled."

# ── 8. Configure nginx (reverse proxy) ────────────────────────
echo ""
echo "[8/8] Configuring nginx..."
sudo tee /etc/nginx/sites-available/kashikart > /dev/null << 'EOF'
server {
    listen 80;
    server_name 13.232.38.191;

    # Allow large file uploads (for tender documents)
    client_max_body_size 50M;

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 300s;
    }

    # FastAPI docs
    location /docs {
        proxy_pass http://127.0.0.1:8000/docs;
        proxy_set_header Host $host;
    }
    location /redoc {
        proxy_pass http://127.0.0.1:8000/redoc;
        proxy_set_header Host $host;
    }
    location /openapi.json {
        proxy_pass http://127.0.0.1:8000/openapi.json;
    }

    # Static file uploads served by FastAPI
    location /uploads/ {
        proxy_pass http://127.0.0.1:8000/uploads/;
    }
    location /branding/ {
        proxy_pass http://127.0.0.1:8000/branding/;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8000/api/health;
    }

    # All other requests to FastAPI root
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/kashikart /etc/nginx/sites-enabled/kashikart
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
echo "  Nginx configured."

# ── Done ──────────────────────────────────────────────────────
echo ""
echo "======================================================"
echo "  SETUP COMPLETE"
echo "======================================================"
echo ""
echo "NEXT STEPS:"
echo "  1. Edit /home/ubuntu/kashikart/.env with your real values"
echo "     (RDS endpoint, DB password, secrets, SMTP creds)"
echo ""
echo "  2. Start the backend:"
echo "     sudo systemctl start kashikart-backend"
echo ""
echo "  3. Check logs:"
echo "     sudo journalctl -u kashikart-backend -f"
echo "     tail -f /home/ubuntu/kashikart/logs/backend.log"
echo ""
echo "  4. Test the API:"
echo "     curl http://13.232.38.191:8000/api/health"
echo "     curl http://13.232.38.191/api/health   (via nginx)"
echo ""
echo "  5. API Docs available at:"
echo "     http://13.232.38.191:8000/docs"
echo ""
echo "  EC2 Security Group must allow: port 22, 80, 8000"
echo "======================================================"
