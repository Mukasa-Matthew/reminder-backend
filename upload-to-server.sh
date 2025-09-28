#!/bin/bash

# Upload Finance Tracker Backend to Ubuntu Server
# Tailscale IP: 100.96.7.68

set -e

# Configuration
SERVER_IP="100.96.7.68"
SERVER_USER="matthew"
APP_DIR="/opt/finance-tracker"
LOCAL_DIR="."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Uploading Finance Tracker Backend to Server...${NC}"
echo "Server: $SERVER_USER@$SERVER_IP"
echo "Target: $APP_DIR"
echo ""

# Check if server is reachable
echo -e "${BLUE}🔍 Checking server connectivity...${NC}"
if ! ping -c 1 $SERVER_IP > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Cannot ping server. Make sure Tailscale is connected.${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create temporary directory for upload
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}📁 Creating temporary directory: $TEMP_DIR${NC}"

# Copy application files (excluding node_modules, logs, etc.)
echo -e "${BLUE}📦 Preparing application files...${NC}"
rsync -av --exclude='node_modules' \
         --exclude='logs' \
         --exclude='.env' \
         --exclude='.git' \
         --exclude='*.log' \
         --exclude='test-*.js' \
         --exclude='simple-test.js' \
         --exclude='POSTMAN_TESTING.md' \
         $LOCAL_DIR/ $TEMP_DIR/

# Create production package.json
echo -e "${BLUE}📝 Creating production package.json...${NC}"
cat > $TEMP_DIR/package.json << 'EOF'
{
  "name": "finance-tracker-backend",
  "version": "1.0.0",
  "description": "Personal Finance Tracker Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"No tests specified\" && exit 0"
  },
  "keywords": ["finance", "tracker", "api", "nodejs"],
  "author": "Matthew",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "csv-writer": "^1.6.0",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.2",
    "node-cron": "^3.0.3",
    "nodemailer": "^6.9.13",
    "pdfkit": "^0.15.0",
    "pg": "^8.11.5",
    "sequelize": "^6.37.3",
    "xlsx": "^0.18.5"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
EOF

# Upload files to server
echo -e "${BLUE}📤 Uploading files to server...${NC}"
scp -r $TEMP_DIR/* $SERVER_USER@$SERVER_IP:$APP_DIR/

# Clean up temporary directory
rm -rf $TEMP_DIR

# Run deployment commands on server
echo -e "${BLUE}🔧 Running deployment commands on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'EOF'
set -e

APP_DIR="/opt/finance-tracker"
SERVICE_USER="finance"

echo "📦 Installing dependencies..."
cd $APP_DIR
sudo -u $SERVICE_USER npm install --production

echo "🔧 Setting permissions..."
sudo chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

echo "🚀 Starting services..."
sudo systemctl start finance-tracker
sudo systemctl start nginx

echo "✅ Deployment completed!"
echo ""
echo "📊 Service Status:"
sudo systemctl status finance-tracker --no-pager -l
echo ""
echo "🔗 Access URLs:"
echo "  API: http://100.96.7.68/api"
echo "  Health: http://100.96.7.68/health"
echo ""
echo "📝 Useful commands:"
echo "  View logs: sudo journalctl -u finance-tracker -f"
echo "  Restart: sudo systemctl restart finance-tracker"
echo "  Update: $APP_DIR/update.sh"
EOF

echo -e "${GREEN}🎉 Upload and deployment completed!${NC}"
echo ""
echo -e "${BLUE}🔗 Test your deployment:${NC}"
echo "  curl http://100.96.7.68/health"
echo "  curl http://100.96.7.68/api"
echo ""
echo -e "${BLUE}📱 Next steps:${NC}"
echo "1. Test the API endpoints"
echo "2. Deploy the frontend"
echo "3. Set up SSL certificate (optional)"
