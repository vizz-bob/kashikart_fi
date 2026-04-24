📦 KashiKart — Full Production Deployment Guide
AWS EC2 + React Frontend + FastAPI Backend

📋 TABLE OF CONTENTS
	1	AWS EC2 Setup
	2	Backend (FastAPI) Deployment
	3	Frontend (React + Vite) Deployment
	4	Environment Configuration
	5	CORS Configuration
	6	Common Issues & Fixes
	7	Final Checklist

🔷 PART 1 — AWS EC2 Setup
1.1 — Launch EC2 Instance
	•	AMI: Ubuntu 22.04 LTS
	•	Instance Type: t2.micro (free tier) or t3.small (production)
	•	Storage: 20 GB gp2
	•	Key Pair: Create and download .pem file securely
1.2 — Security Group Rules (CRITICAL)
Type
Protocol
Port
Source
SSH
TCP
22
Your IP
HTTP
TCP
80
0.0.0.0/0
HTTPS
TCP
443
0.0.0.0/0
Custom TCP
TCP
8000
0.0.0.0/0
Custom TCP
TCP
5173
Your IP (dev only)

⚠️ Port 8000 must be open for FastAPI to be externally accessible.
1.3 — Connect to EC2
bash

chmod 400 your-key.pemssh -i your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>

🔷 PART 2 — Backend (FastAPI) Deployment on EC2
2.1 — Update System & Install Python
bash

sudo apt update && sudo apt upgrade -ysudo apt install python3 python3-pip python3-venv git -y
2.2 — Clone Your Project
bash

cd ~git clone <YOUR_REPO_URL>cd KashiKartCiCd/backend
2.3 — Create Python Virtual Environment
bash

python3 -m venv venvsource venv/bin/activate
2.4 — Install Dependencies
bash

pip install -r requirements.txt
2.5 — Configure Environment Variables
bash

nano .env
Add your backend variables:

DATABASE_URL=your_database_urlSECRET_KEY=your_secret_keyDEBUG=False
2.6 — Test FastAPI Runs
bash

uvicorn main:app --host 0.0.0.0 --port 8000
Visit: http://<YOUR_EC2_PUBLIC_IP>:8000/docs — you should see Swagger UI.
2.7 — Run FastAPI as Background Service (Systemd)
bash

sudo nano /etc/systemd/system/kashikart.service
Paste this:
ini

[Unit]Description=KashiKart FastAPI BackendAfter=network.target[Service]User=ubuntuWorkingDirectory=/home/ubuntu/KashiKartCiCd/backendEnvironment="PATH=/home/ubuntu/KashiKartCiCd/backend/venv/bin"ExecStart=/home/ubuntu/KashiKartCiCd/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000Restart=always[Install]WantedBy=multi-user.target
Enable and start:
bash

sudo systemctl daemon-reloadsudo systemctl enable kashikartsudo systemctl start kashikartsudo systemctl status kashikart

🔷 PART 3 — Frontend (React + Vite) on Local/Dev Machine
3.1 — Install NVM (Node Version Manager)
bash

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
Load NVM immediately (without restarting terminal):
bash

export NVM_DIR="$HOME/.nvm"[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
3.2 — Install Node.js LTS
bash

nvm install --ltsnvm use --ltsnode -v   # Should show v20.x.x or similarnpm -v
3.3 — Navigate to Frontend Directory
bash

cd ~/Claude-DevOps-Workspace/KashiKartCiCd/frontend
3.4 — Clean Install Dependencies
bash

rm -rf node_modules package-lock.jsonnpm install

🔷 PART 4 — Environment Configuration
4.1 — Create .env File in Frontend Root
bash

# Make sure you're in the frontend directorycd ~/Claude-DevOps-Workspace/KashiKartCiCd/frontend# Create .env with correct value (run this in terminal, NOT paste into file)echo "VITE_API_BASE_URL=http://<YOUR_EC2_PUBLIC_IP>:8000" > .env
4.2 — Verify .env Content
bash

cat .env
Expected output (exactly one clean line):

VITE_API_BASE_URL=http://13.205.245.107:8000

⚠️ Common mistake: Do NOT paste the echo command text inside the .env file. Run it in terminal.

🔷 PART 5 — Fix Missing vite.config.js
If vite.config.js is missing, create it:
bash

cat > vite.config.js << 'EOF'import { defineConfig } from 'vite'import react from '@vitejs/plugin-react'export default defineConfig({  plugins: [    react({      jsxRuntime: 'automatic'    })  ],  server: {    port: 5173,    host: true  }})EOF

🔷 PART 6 — Fix React Import Issues
6.1 — Fix All JSX Files Missing import React
bash

for f in $(grep -rL "import React" ./src --include="*.jsx"); do  sed -i '' '1s/^/import React from '"'"'react'"'"';\n/' "$f"  echo "Fixed: $f"done``*

💡 Note: With jsxRuntime: 'automatic' in vite.config.js, this step becomes optional for new files.

🔷 PART 7 — CORS Configuration on Backend
The FastAPI backend must allow requests from your frontend origin.
7.1 — View Current CORS Config
bash

# On EC2:grep -n "CORS\|allow_origins\|CORSMiddleware" ~/KashiKartCiCd/backend/main.py
7.2 — Update allow_origins in main.py
python

from fastapi.middleware.cors import CORSMiddlewareapp.add_middleware(    CORSMiddleware,    allow_origins=[        "http://localhost:5173",        "http://<YOUR_FRONTEND_DOMAIN>",        "https://<YOUR_FRONTEND_DOMAIN>"    ],    allow_credentials=True,    allow_methods=["*"],    allow_headers=["*"],)
7.3 — Restart Backend After CORS Change
bash

sudo systemctl restart kashikartsudo systemctl status kashikart

🔷 PART 8 — Start Frontend Dev Server
bash

cd ~/Claude-DevOps-Workspace/KashiKartCiCd/frontendnpm run dev
Visit: http://localhost:5173

🔷 PART 9 — Production Build (For Deploying Frontend)
9.1 — Build the Frontend
bash

npm run build
This generates a dist/ folder.
9.2 — Serve with Nginx on EC2 (Production)
Install Nginx on EC2:
bash

sudo apt install nginx -y
Copy build files:
bash

sudo cp -r dist/* /var/www/html/``*
Configure Nginx:
bash

sudo nano /etc/nginx/sites-available/kashikart
nginx

server {    listen 80;    server_name <YOUR_EC2_PUBLIC_IP>;    root /var/www/html;    index index.html;    location / {        try_files $uri $uri/ /index.html;    }    location /api/ {        proxy_pass http://127.0.0.1:8000/;        proxy_set_header Host $host;        proxy_set_header X-Real-IP $remote_addr;    }}
Enable and restart Nginx:
bash

sudo ln -s /etc/nginx/sites-available/kashikart /etc/nginx/sites-enabled/sudo nginx -tsudo systemctl restart nginx

🔷 PART 10 — Common Issues & Fixes Reference
❌ Error
✅ Fix
Port 8000 not accessible externally
Open port 8000 in EC2 Security Group
Error [ERR_MODULE_NOT_FOUND]: vite
Run rm -rf node_modules && npm install
nvm: command not found
Run export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh"
.env has echo text literally
Run echo "VITE_API_BASE_URL=..." > .env in terminal
ReferenceError: React is not defined
Add import React from 'react' to JSX files or set jsxRuntime: 'automatic'
vite.config.js not found
Create it manually with the template in Part 5
Layout.jsx not in src/components/
Actual path is src/layout/Layout.jsx
Dashboard shows "Something went wrong"
Fix .env file and restart dev server

✅ FINAL DEPLOYMENT CHECKLIST

☐ EC2 instance launched with correct security group (port 8000, 80, 443 open)☐ SSH access confirmed☐ Backend dependencies installed in virtualenv☐ Backend .env configured☐ FastAPI running and accessible at http://<EC2_IP>:8000/docs☐ FastAPI set up as systemd service (auto-restart on reboot)☐ CORS updated to include frontend origin☐ Node.js LTS installed via nvm☐ Frontend node_modules cleanly installed☐ Frontend .env contains VITE_API_BASE_URL=http://<EC2_IP>:8000☐ vite.config.js exists with jsxRuntime: 'automatic'☐ All JSX files have import React (or automatic runtime enabled)☐ npm run dev works locally☐ npm run build generates dist/ folder☐ Nginx configured to serve frontend and proxy /api to FastAPI☐ Full app accessible at http://<EC2_IP>
