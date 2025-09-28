#!/bin/bash

# Finance Tracker Backend Deployment Script
# For Ubuntu Server with Tailscale IP: 100.96.7.68

set -e

echo "🚀 Starting Finance Tracker Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="finance-tracker-backend"
APP_DIR="/opt/finance-tracker"
SERVICE_USER="finance"
NODE_VERSION="18"
PORT="5000"
TAILSCALE_IP="100.96.7.68"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "  App Name: $APP_NAME"
echo "  App Directory: $APP_DIR"
echo "  Service User: $SERVICE_USER"
echo "  Node Version: $NODE_VERSION"
echo "  Port: $PORT"
echo "  Tailscale IP: $TAILSCALE_IP"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system packages
echo -e "${BLUE}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${BLUE}📦 Installing required packages...${NC}"
apt install -y curl wget git nginx postgresql postgresql-contrib ufw

# Install Node.js 18
echo -e "${BLUE}📦 Installing Node.js $NODE_VERSION...${NC}"
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# Install PM2 globally
echo -e "${BLUE}📦 Installing PM2...${NC}"
npm install -g pm2

# Create service user
echo -e "${BLUE}👤 Creating service user...${NC}"
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d $APP_DIR $SERVICE_USER
    print_status "Created user: $SERVICE_USER"
else
    print_warning "User $SERVICE_USER already exists"
fi

# Create application directory
echo -e "${BLUE}📁 Creating application directory...${NC}"
mkdir -p $APP_DIR
chown $SERVICE_USER:$SERVICE_USER $APP_DIR

# Setup PostgreSQL
echo -e "${BLUE}🐘 Setting up PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE finance_tracker;" || print_warning "Database may already exist"
sudo -u postgres psql -c "CREATE USER finance_user WITH PASSWORD '1100211Matt.';" || print_warning "User may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE finance_tracker TO finance_user;"
sudo -u postgres psql -c "ALTER USER finance_user CREATEDB;"

# Configure firewall
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 5000
print_status "Firewall configured"

# Create environment file
echo -e "${BLUE}⚙️  Creating environment configuration...${NC}"
cat > $APP_DIR/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finance_tracker
DB_USER=finance_user
DB_PASSWORD=1100211Matt.

# JWT Configuration
JWT_SECRET=7d3c1f8b6e5a4f2c9a1b0c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=http://100.96.7.68:3000

# Email Configuration (for production - SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=matthewmukasa0@gmail.com
SMTP_PASS=mzkb hdfc qydc plth
EMAIL_FROM=matthewmukasa0@gmail.com

# App Configuration
APP_URL=http://100.96.7.68:3000
EOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/.env
chmod 600 $APP_DIR/.env
print_status "Environment file created"

# Create PM2 ecosystem file
echo -e "${BLUE}⚙️  Creating PM2 configuration...${NC}"
cat > $APP_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'finance-tracker-backend',
    script: 'server.js',
    cwd: '/opt/finance-tracker',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/opt/finance-tracker/logs/err.log',
    out_file: '/opt/finance-tracker/logs/out.log',
    log_file: '/opt/finance-tracker/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/ecosystem.config.js
print_status "PM2 configuration created"

# Create logs directory
mkdir -p $APP_DIR/logs
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/logs

# Create Nginx configuration
echo -e "${BLUE}🌐 Creating Nginx configuration...${NC}"
cat > /etc/nginx/sites-available/finance-tracker << EOF
server {
    listen 80;
    server_name 100.96.7.68;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend (will be added later)
    location / {
        root /var/www/finance-tracker;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/finance-tracker /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
print_status "Nginx configuration created and tested"

# Create systemd service for PM2
echo -e "${BLUE}⚙️  Creating systemd service...${NC}"
cat > /etc/systemd/system/finance-tracker.service << EOF
[Unit]
Description=Finance Tracker Backend
After=network.target

[Service]
Type=forking
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/pm2 start $APP_DIR/ecosystem.config.js
ExecReload=/usr/bin/pm2 reload $APP_DIR/ecosystem.config.js
ExecStop=/usr/bin/pm2 stop $APP_DIR/ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable finance-tracker
print_status "Systemd service created and enabled"

# Create deployment script for updates
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Updating Finance Tracker Backend..."

# Stop the service
sudo systemctl stop finance-tracker

# Pull latest code (if using git)
# git pull origin main

# Install/update dependencies
npm install --production

# Restart the service
sudo systemctl start finance-tracker

echo "✅ Update completed!"
EOF

chmod +x $APP_DIR/update.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/update.sh

# Create backup script
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/opt/backups/finance-tracker"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U finance_user finance_tracker > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /opt finance-tracker --exclude=node_modules --exclude=logs

echo "✅ Backup completed: $BACKUP_DIR"
EOF

chmod +x $APP_DIR/backup.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/backup.sh

print_status "Deployment scripts created"

echo ""
echo -e "${GREEN}🎉 Deployment preparation completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Copy your application files to: $APP_DIR"
echo "2. Run: cd $APP_DIR && npm install"
echo "3. Start the service: sudo systemctl start finance-tracker"
echo "4. Start Nginx: sudo systemctl start nginx"
echo "5. Check status: sudo systemctl status finance-tracker"
echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo "  API: http://100.96.7.68/api"
echo "  Health: http://100.96.7.68/health"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo "  View logs: sudo journalctl -u finance-tracker -f"
echo "  Restart: sudo systemctl restart finance-tracker"
echo "  Update: $APP_DIR/update.sh"
echo "  Backup: $APP_DIR/backup.sh"
