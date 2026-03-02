# Railway.app Deployment Guide

Render.com'da IPv6 sorunu nedeniyle Railway.app'e geçiyoruz.

## Adım 1: Railway.app Hesabı Oluştur

1. https://railway.app/ adresine git
2. "Start a New Project" tıkla
3. GitHub ile giriş yap

## Adım 2: Backend Deploy Et

1. Railway dashboard'da "New Project" tıkla
2. "Deploy from GitHub repo" seç
3. `burucburcan/technician-marketplace-backend` repository'sini seç
4. Root Directory: `packages/backend` olarak ayarla

## Adım 3: Environment Variables Ekle

Railway dashboard'da "Variables" sekmesine git ve şunları ekle:

```
# Database
DB_HOST=db.znndqznguxmejtnatmpx.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=-E_baNB$hc95jxt
DB_NAME=postgres

# Redis
REDIS_URL=redis://default:AfG8AAIncDE2M2RkMDk0MDY1NjY0NTg4YTc1ZDJmY2NhNjU1NDA2Y3AxNjE4ODQ@central-oarfish-61884.upstash.io:6379

# MongoDB
MONGODB_URI=mongodb+srv://burucburcan_db_user:6751Olesia@cluster0.6kxmcqa.mongodb.net/technician_platform?retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# CORS
CORS_ORIGIN=https://your-frontend-url.vercel.app

# API
API_PREFIX=api/v1

# Node
NODE_ENV=production
```

## Adım 4: Build & Start Commands

Railway otomatik olarak package.json'dan komutları algılar:
- Build Command: `npm run build`
- Start Command: `npm run start:prod`

## Adım 5: Deploy

Railway otomatik olarak deploy edecek. Logları izleyin.

## Adım 6: Domain Al

Deploy tamamlandıktan sonra:
1. "Settings" sekmesine git
2. "Generate Domain" tıkla
3. Domain'i kopyala (örn: `your-app.up.railway.app`)

## Adım 7: Frontend'i Güncelle

Vercel'de frontend environment variable'ını güncelle:
```
VITE_API_URL=https://your-app.up.railway.app
```

## Railway Avantajları

- IPv4/IPv6 sorunları yok
- Otomatik HTTPS
- Ücretsiz $5 credit/ay
- Daha hızlı deploy
- Daha iyi log görüntüleme
