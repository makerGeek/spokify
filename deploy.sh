#!/bin/bash

# Spokify Backend Deployment Script for Ubuntu VM
# Usage: ./deploy.sh [domain] [email]
# Example: ./deploy.sh api.spokify.com admin@spokify.com

set -e  # Exit on any error

# Configuration
DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@example.com"}
APP_NAME="spokify-backend"
APP_USER="spokify"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="$APP_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root. Run as a regular user with sudo privileges."
fi

log "🚀 Starting Spokify Backend Deployment"
log "Domain: $DOMAIN"
log "Email: $EMAIL"

# Update system
log "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
log "📱 Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install required packages
log "🛠️ Installing required packages..."
sudo apt install -y nginx certbot python3-certbot-nginx git curl build-essential

# Create application user
log "👤 Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    sudo useradd --system --shell /bin/bash --home-dir $APP_DIR --create-home $APP_USER
fi

# Create application directory
log "📁 Setting up application directory..."
sudo mkdir -p $APP_DIR
sudo chown $APP_USER:$APP_USER $APP_DIR

# Clone or update repository (assuming you'll push your code)
log "📥 Setting up application code..."
if [ ! -d "$APP_DIR/.git" ]; then
    warn "Repository not found. Please upload your built application to $APP_DIR"
    warn "Make sure to include: dist/backend.js, package.json, and .env file"
    sudo mkdir -p $APP_DIR/dist
    sudo chown -R $APP_USER:$APP_USER $APP_DIR
else
    log "Repository found, pulling latest changes..."
    cd $APP_DIR
    sudo -u $APP_USER git pull
fi

# Install production dependencies
log "📦 Installing production dependencies..."
cd $APP_DIR
if [ -f "package.json" ]; then
    sudo -u $APP_USER npm ci --production
else
    warn "package.json not found. Make sure to upload your application files."
fi

# Create environment file template
log "⚙️ Creating environment configuration..."
sudo tee $APP_DIR/.env.example > /dev/null <<EOF
# Backend Environment Variables
DATABASE_URL=your_neon_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
GEMINI_API_KEY=your_gemini_api_key
VITE_GA_MEASUREMENT_ID=your_ga_id
FRONTEND_URL=https://your-frontend-cdn.com
CDN_URL=https://your-frontend-cdn.com
SESSION_SECRET=$(openssl rand -base64 32)
PORT=3000
NODE_ENV=production
EOF

sudo chown $APP_USER:$APP_USER $APP_DIR/.env.example

if [ ! -f "$APP_DIR/.env" ]; then
    warn "⚠️  Please copy .env.example to .env and fill in your actual values:"
    warn "   sudo cp $APP_DIR/.env.example $APP_DIR/.env"
    warn "   sudo nano $APP_DIR/.env"
fi

# Create systemd service
log "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=Spokify Backend API Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node dist/backend.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME
Environment=NODE_ENV=production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

# Resource limits
LimitNOFILE=65536
MemoryMax=512M

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx
log "🌐 Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Health check endpoint (bypass rate limiting)
    location /health {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # API endpoints
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
log "🧪 Testing Nginx configuration..."
sudo nginx -t

# Configure firewall
log "🔥 Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 80
sudo ufw allow 443

# Reload systemd and start services
log "🔄 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart nginx

# SSL Certificate with Let's Encrypt
log "🔒 Setting up SSL certificate..."
if [[ "$DOMAIN" != "your-domain.com" ]]; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
else
    warn "⚠️  Skipping SSL setup. Please run: sudo certbot --nginx -d YOUR_DOMAIN --email YOUR_EMAIL"
fi

# Create deployment script for updates
log "🔄 Creating update script..."
sudo tee $APP_DIR/update.sh > /dev/null <<'EOF'
#!/bin/bash
set -e

APP_DIR="/opt/spokify-backend"
SERVICE_NAME="spokify-backend"

echo "🔄 Updating Spokify Backend..."

# Stop service
sudo systemctl stop $SERVICE_NAME

# Backup current version
sudo cp -r $APP_DIR/dist $APP_DIR/dist.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Update code (you'll upload new dist/backend.js here)
echo "📁 Please upload your new dist/backend.js file to $APP_DIR/dist/"
echo "📦 Update dependencies if needed: cd $APP_DIR && npm ci --production"

# Start service
sudo systemctl start $SERVICE_NAME
sudo systemctl status $SERVICE_NAME

echo "✅ Update complete!"
EOF

sudo chmod +x $APP_DIR/update.sh
sudo chown $APP_USER:$APP_USER $APP_DIR/update.sh

# Final setup check
log "🏁 Final setup..."

# Try to start the service (will fail if .env is not configured)
if [ -f "$APP_DIR/.env" ] && [ -f "$APP_DIR/dist/backend.js" ]; then
    sudo systemctl start $SERVICE_NAME
    sleep 3
    
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        log "✅ Service started successfully!"
    else
        warn "⚠️  Service failed to start. Check logs: sudo journalctl -u $SERVICE_NAME -f"
    fi
else
    warn "⚠️  Service not started. Missing .env file or built application."
fi

# Show status
log "📊 Service Status:"
sudo systemctl status $SERVICE_NAME --no-pager -l || true

log "🎉 Deployment Complete!"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Configure your environment: sudo nano $APP_DIR/.env"
echo "2. Upload your built application: scp dist/backend.js user@server:$APP_DIR/dist/"
echo "3. Start the service: sudo systemctl start $SERVICE_NAME"
echo "4. Check logs: sudo journalctl -u $SERVICE_NAME -f"
echo "5. Test API: curl https://$DOMAIN/health"
echo ""
echo -e "${BLUE}📁 Important Paths:${NC}"
echo "App Directory: $APP_DIR"
echo "Logs: sudo journalctl -u $SERVICE_NAME -f"
echo "Nginx Config: /etc/nginx/sites-available/$DOMAIN"
echo "Service Config: /etc/systemd/system/$SERVICE_NAME.service"
echo ""
echo -e "${BLUE}🔄 For Updates:${NC}"
echo "Run: $APP_DIR/update.sh"
EOF