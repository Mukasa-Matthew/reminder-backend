# Finance Tracker Backend - Deployment Instructions

## Quick Deployment (Recommended)

Since you're on Windows, use Git Bash or WSL to run the deployment scripts:

### Option 1: One-Command Deployment
```bash
# Open Git Bash or WSL terminal
cd /c/Users/Matthew/Desktop/Safe/backend
chmod +x quick-deploy.sh
./quick-deploy.sh
```

### Option 2: Manual Deployment
```bash
# Step 1: Upload and run deployment script
chmod +x deploy.sh
scp deploy.sh matthew@100.96.7.68:/tmp/
ssh matthew@100.96.7.68 "chmod +x /tmp/deploy.sh && sudo /tmp/deploy.sh"

# Step 2: Upload application files
chmod +x upload-to-server.sh
./upload-to-server.sh
```

## What the Deployment Does

### 1. Server Setup
- Updates Ubuntu packages
- Installs Node.js 18, PostgreSQL, Nginx, PM2
- Creates service user `finance`
- Configures firewall (ports 22, 80, 443, 5000)

### 2. Database Setup
- Creates `finance_tracker` database
- Creates `finance_user` with password `1100211Matt.`
- Grants necessary permissions

### 3. Application Setup
- Creates `/opt/finance-tracker` directory
- Sets up environment variables for production
- Configures PM2 for process management
- Creates systemd service for auto-start

### 4. Nginx Configuration
- Sets up reverse proxy for API
- Configures security headers
- Enables gzip compression
- Prepares for frontend hosting

### 5. Service Management
- Creates update script for easy deployments
- Creates backup script for data protection
- Sets up log rotation

## After Deployment

### Access URLs
- **API Documentation**: http://100.96.7.68/api
- **Health Check**: http://100.96.7.68/health
- **API Endpoints**: http://100.96.7.68/api/*

### Test the Deployment
```bash
# Health check
curl http://100.96.7.68/health

# API documentation
curl http://100.96.7.68/api

# Test registration (replace with your email)
curl -X POST http://100.96.7.68/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"your@email.com","password":"Test123!","firstName":"Test","lastName":"User"}'
```

### Server Management Commands
```bash
# View logs
ssh matthew@100.96.7.68 "sudo journalctl -u finance-tracker -f"

# Restart service
ssh matthew@100.96.7.68 "sudo systemctl restart finance-tracker"

# Check status
ssh matthew@100.96.7.68 "sudo systemctl status finance-tracker"

# Update application
ssh matthew@100.96.7.68 "cd /opt/finance-tracker && ./update.sh"

# Backup data
ssh matthew@100.96.7.68 "cd /opt/finance-tracker && ./backup.sh"
```

## Environment Configuration

The deployment creates a production `.env` file with:
- Database connection to local PostgreSQL
- JWT secret for authentication
- Email configuration for Gmail SMTP
- CORS settings for your Tailscale IP
- Production optimizations

## Security Features

- Firewall configured (only necessary ports open)
- Nginx security headers
- PM2 process isolation
- Service user with limited permissions
- Environment variables protected

## Monitoring

- PM2 process monitoring
- Systemd service management
- Nginx access logs
- Application logs in `/opt/finance-tracker/logs/`

## Troubleshooting

### If deployment fails:
1. Check Tailscale connection: `ping 100.96.7.68`
2. Verify SSH access: `ssh matthew@100.96.7.68`
3. Check server logs: `ssh matthew@100.96.7.68 "sudo journalctl -u finance-tracker"`

### If API is not accessible:
1. Check service status: `ssh matthew@100.96.7.68 "sudo systemctl status finance-tracker"`
2. Check Nginx: `ssh matthew@100.96.7.68 "sudo systemctl status nginx"`
3. Check firewall: `ssh matthew@100.96.7.68 "sudo ufw status"`

### If database connection fails:
1. Check PostgreSQL: `ssh matthew@100.96.7.68 "sudo systemctl status postgresql"`
2. Test connection: `ssh matthew@100.96.7.68 "sudo -u postgres psql -c '\l'"`

## Next Steps

1. **Test the API** using Postman with the endpoints from `POSTMAN_TESTING.md`
2. **Deploy the frontend** to connect to this backend
3. **Set up SSL certificate** for HTTPS (optional)
4. **Configure domain name** (optional)

## Support

If you encounter any issues:
1. Check the logs first
2. Verify all services are running
3. Test network connectivity
4. Review the deployment scripts for any customizations needed
