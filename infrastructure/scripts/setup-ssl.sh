#!/bin/bash

# SSL Certificate Setup Script for Technician Marketplace Platform
# This script sets up SSL/TLS certificates using Let's Encrypt

set -e

DOMAIN="${DOMAIN:-api.technician-marketplace.com}"
EMAIL="${SSL_EMAIL:-admin@technician-marketplace.com}"
STAGING="${STAGING:-false}"

echo "Setting up SSL certificate for domain: $DOMAIN"

# Check if running in staging mode
if [ "$STAGING" = "true" ]; then
    echo "Running in STAGING mode (test certificates)"
    STAGING_FLAG="--staging"
else
    echo "Running in PRODUCTION mode (real certificates)"
    STAGING_FLAG=""
fi

# Request certificate using certbot
certbot certonly \
    --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN" \
    $STAGING_FLAG

# Create symbolic links to certificates
ln -sf /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/nginx/ssl/fullchain.pem
ln -sf /etc/letsencrypt/live/$DOMAIN/privkey.pem /etc/nginx/ssl/privkey.pem

# Test nginx configuration
nginx -t

# Reload nginx
nginx -s reload

echo "SSL certificate setup completed successfully!"
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"

# Setup auto-renewal cron job
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet --post-hook 'nginx -s reload'") | crontab -

echo "Auto-renewal cron job configured (runs twice daily)"
