#!/bin/bash

# Quick Deployment Script for Finance Tracker Backend
# This script will do everything automatically

set -e

# Configuration
SERVER_IP="100.96.7.68"
SERVER_USER="matthew"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Quick Deployment for Finance Tracker Backend${NC}"
echo "Server: $SERVER_USER@$SERVER_IP"
echo ""

# Step 1: Upload deployment script
echo -e "${BLUE}📤 Step 1: Uploading deployment script...${NC}"
scp deploy.sh $SERVER_USER@$SERVER_IP:/tmp/

# Step 2: Run deployment script on server
echo -e "${BLUE}🔧 Step 2: Running deployment script on server...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'EOF'
chmod +x /tmp/deploy.sh
sudo /tmp/deploy.sh
EOF

# Step 3: Upload application files
echo -e "${BLUE}📦 Step 3: Uploading application files...${NC}"
chmod +x upload-to-server.sh
./upload-to-server.sh

# Step 4: Test deployment
echo -e "${BLUE}🧪 Step 4: Testing deployment...${NC}"
echo "Testing health endpoint..."
if curl -s http://100.96.7.68/health | grep -q "success"; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    exit 1
fi

echo "Testing API documentation..."
if curl -s http://100.96.7.68/api | grep -q "Finance Tracker API"; then
    echo -e "${GREEN}✅ API documentation accessible!${NC}"
else
    echo -e "${RED}❌ API documentation failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}🔗 Your Finance Tracker Backend is now live at:${NC}"
echo "  API: http://100.96.7.68/api"
echo "  Health: http://100.96.7.68/health"
echo ""
echo -e "${BLUE}📱 Next steps:${NC}"
echo "1. Test the API with Postman using the endpoints from POSTMAN_TESTING.md"
echo "2. Deploy the frontend to connect to this backend"
echo "3. Set up SSL certificate for HTTPS (optional)"
echo ""
echo -e "${BLUE}📝 Server management commands:${NC}"
echo "  View logs: ssh $SERVER_USER@$SERVER_IP 'sudo journalctl -u finance-tracker -f'"
echo "  Restart: ssh $SERVER_USER@$SERVER_IP 'sudo systemctl restart finance-tracker'"
echo "  Update: ssh $SERVER_USER@$SERVER_IP 'cd /opt/finance-tracker && ./update.sh'"
