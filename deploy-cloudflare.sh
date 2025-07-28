#!/bin/bash

# Spokify Backend Deployment Script for Ubuntu VM (Cloudflare Compatible)
# Usage: ./deploy-cloudflare.sh [domain] [email]
# Example: ./deploy-cloudflare.sh api.spokify.com admin@spokify.com

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

log "🚀 Starting Spokify Backend Deployment (Cloudflare Compatible)"
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

# Install production dependencies setup
log "📦 Setting up application structure..."
cd $APP_DIR
sudo mkdir -p dist
sudo chown -R $APP_USER:$APP_USER $APP_DIR

# Create environment file template
log "⚙️ Creating environment configuration..."
sudo tee $APP_DIR/.env.example > /dev/null <<EOF
# Backend Environment Variables (Cloudflare Compatible)
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

# Cloudflare settings
TRUST_PROXY=true
EOF

sudo chown $APP_USER:$APP_USER $APP_DIR/.env.example

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

# Configure Nginx for Cloudflare
log "🌐 Configuring Nginx reverse proxy (Cloudflare compatible)..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
# Cloudflare IP ranges for real IP detection
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2c0f:f248::/32;
set_real_ip_from 2a06:98c0::/29;
real_ip_header CF-Connecting-IP;

server {
    listen 80;
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL configuration (still needed for Cloudflare -> server connection)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers (Cloudflare will also add some)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Rate limiting (lighter since Cloudflare also does this)
    limit_req_zone \$binary_remote_addr zone=api:10m rate=20r/s;
    limit_req zone=api burst=40 nodelay;
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
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
        proxy_set_header CF-Connecting-IP \$http_cf_connecting_ip;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Gzip compression (Cloudflare will also compress)
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

# Configure firewall (more restrictive since behind Cloudflare)
log "🔥 Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh

# Only allow HTTP/HTTPS from Cloudflare IPs (optional security enhancement)
log "🔒 Configuring Cloudflare-only access (optional)..."
read -p "Do you want to restrict HTTP/HTTPS access to only Cloudflare IPs? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Cloudflare IPv4 ranges
    sudo ufw allow from 103.21.244.0/22 to any port 80
    sudo ufw allow from 103.21.244.0/22 to any port 443
    sudo ufw allow from 103.22.200.0/22 to any port 80
    sudo ufw allow from 103.22.200.0/22 to any port 443
    sudo ufw allow from 103.31.4.0/22 to any port 80
    sudo ufw allow from 103.31.4.0/22 to any port 443
    sudo ufw allow from 104.16.0.0/13 to any port 80
    sudo ufw allow from 104.16.0.0/13 to any port 443
    sudo ufw allow from 104.24.0.0/14 to any port 80
    sudo ufw allow from 104.24.0.0/14 to any port 443
    sudo ufw allow from 108.162.192.0/18 to any port 80
    sudo ufw allow from 108.162.192.0/18 to any port 443
    sudo ufw allow from 131.0.72.0/22 to any port 80
    sudo ufw allow from 131.0.72.0/22 to any port 443
    sudo ufw allow from 141.101.64.0/18 to any port 80
    sudo ufw allow from 141.101.64.0/18 to any port 443
    sudo ufw allow from 162.158.0.0/15 to any port 80
    sudo ufw allow from 162.158.0.0/15 to any port 443
    sudo ufw allow from 172.64.0.0/13 to any port 80
    sudo ufw allow from 172.64.0.0/13 to any port 443
    sudo ufw allow from 173.245.48.0/20 to any port 80
    sudo ufw allow from 173.245.48.0/20 to any port 443
    sudo ufw allow from 188.114.96.0/20 to any port 80
    sudo ufw allow from 188.114.96.0/20 to any port 443
    sudo ufw allow from 190.93.240.0/20 to any port 80
    sudo ufw allow from 190.93.240.0/20 to any port 443
    sudo ufw allow from 197.234.240.0/22 to any port 80
    sudo ufw allow from 197.234.240.0/22 to any port 443
    sudo ufw allow from 198.41.128.0/17 to any port 80
    sudo ufw allow from 198.41.128.0/17 to any port 443
    log "✅ Restricted access to Cloudflare IPs only"
else
    sudo ufw allow 'Nginx Full'
    sudo ufw allow 80
    sudo ufw allow 443
    log "✅ Allowing all HTTP/HTTPS traffic"
fi

# Reload systemd and start services
log "🔄 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart nginx

# SSL Certificate (still needed for Cloudflare -> server connection)
log "🔒 Setting up SSL certificate for Cloudflare backend connection..."
if [[ "$DOMAIN" != "your-domain.com" ]]; then
    # Temporarily allow HTTP for certificate verification
    sudo ufw allow 80
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --no-redirect
    log "✅ SSL certificate installed for secure Cloudflare -> server connection"
else
    warn "⚠️  Skipping SSL setup. Please run: sudo certbot --nginx -d YOUR_DOMAIN --email YOUR_EMAIL"
fi

log "🎉 Cloudflare-compatible deployment complete!"
echo ""
echo -e "${BLUE}🌟 Cloudflare Configuration:${NC}"
echo "1. Set DNS record: $DOMAIN → $(curl -s ipinfo.io/ip) (🟠 Proxied)"
echo "2. SSL/TLS Mode: Full (strict) recommended"
echo "3. Consider enabling WAF, Bot Fight Mode, and rate limiting"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Configure your environment: sudo nano $APP_DIR/.env"
echo "2. Upload your built application: scp dist/backend.js user@server:$APP_DIR/dist/"
echo "3. Start the service: sudo systemctl start $SERVICE_NAME"
echo "4. Test API: curl https://$DOMAIN/health"
echo ""
echo -e "${YELLOW}⚡ Cloudflare Benefits Enabled:${NC}"
echo "- Real visitor IP detection"
echo "- DDoS protection"
echo "- Global CDN caching"
echo "- Additional rate limiting"
echo "- Web Application Firewall (configure in Cloudflare dashboard)"
EOF