# Ubuntu VM Deployment Guide

## Prerequisites

1. **Ubuntu 20.04+ VM** with sudo access
2. **Domain name** pointing to your VM's IP
3. **Built application** (`npm run build:server`)

## Quick Deployment

### 1. Upload deployment script
```bash
# On your local machine
scp deploy.sh user@your-server:~/
```

### 2. Run deployment script
```bash
# On your Ubuntu VM
chmod +x deploy.sh
./deploy.sh api.yourdomain.com your-email@example.com
```

### 3. Upload your application
```bash
# Build locally
npm run build:server

# Upload to server
scp dist/backend.js user@your-server:/opt/spokify-backend/dist/
scp package.json user@your-server:/opt/spokify-backend/
```

### 4. Configure environment
```bash
# On server
sudo cp /opt/spokify-backend/.env.example /opt/spokify-backend/.env
sudo nano /opt/spokify-backend/.env
```

### 5. Start the service
```bash
sudo systemctl start spokify-backend
sudo systemctl status spokify-backend
```

## What the script does:

✅ **System Setup**
- Updates Ubuntu packages
- Installs Node.js 20 LTS, Nginx, Certbot
- Creates dedicated user `spokify`
- Sets up application directory `/opt/spokify-backend`

✅ **Security Configuration**
- Configures UFW firewall
- Sets up SSL with Let's Encrypt
- Adds security headers in Nginx
- Rate limiting for API endpoints

✅ **Service Management**
- Creates systemd service for auto-restart
- Configures process monitoring
- Sets resource limits
- Auto-starts on boot

✅ **Reverse Proxy**
- Nginx configuration with proper headers
- Gzip compression
- Health check endpoint
- SSL termination

## Manual Commands

### Service Management
```bash
sudo systemctl start spokify-backend     # Start service
sudo systemctl stop spokify-backend      # Stop service  
sudo systemctl restart spokify-backend   # Restart service
sudo systemctl status spokify-backend    # Check status
```

### Logs
```bash
sudo journalctl -u spokify-backend -f    # Follow logs
sudo journalctl -u spokify-backend -n 50 # Last 50 lines
```

### Updates
```bash
# Use the auto-generated update script
/opt/spokify-backend/update.sh

# Or manually:
sudo systemctl stop spokify-backend
# Upload new files
sudo systemctl start spokify-backend
```

### Nginx
```bash
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx      # Reload configuration
sudo systemctl restart nginx     # Restart nginx
```

### SSL Certificate Renewal
```bash
sudo certbot renew              # Renew certificates
sudo certbot certificates       # List certificates
```

## Environment Variables

Required in `/opt/spokify-backend/.env`:

```bash
DATABASE_URL=your_neon_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
GEMINI_API_KEY=your_gemini_api_key
FRONTEND_URL=https://your-frontend-cdn.com
CDN_URL=https://your-frontend-cdn.com
SESSION_SECRET=auto-generated-secure-key
PORT=3000
NODE_ENV=production
```

## Troubleshooting

### Service won't start
```bash
sudo journalctl -u spokify-backend -f
# Check .env file exists and has correct values
# Check dist/backend.js exists
```

### SSL issues
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### Nginx issues
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Permission issues
```bash
sudo chown -R spokify:spokify /opt/spokify-backend
```

## Monitoring

### Health Check
```bash
curl https://api.yourdomain.com/health
```

### System Resources
```bash
htop                              # System overview
sudo systemctl status spokify-backend # Service status
df -h                            # Disk usage
free -h                          # Memory usage
```

## Security Best Practices

✅ **Already configured:**
- Dedicated user account
- Firewall rules
- SSL/TLS encryption
- Security headers
- Rate limiting
- Resource limits

🔄 **Additional recommendations:**
- Regular security updates: `sudo apt update && sudo apt upgrade`
- Monitor logs for suspicious activity
- Regular backups of your database
- Consider fail2ban for additional protection