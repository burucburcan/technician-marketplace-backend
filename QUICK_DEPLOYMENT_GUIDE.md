# 🚀 Hızlı Deployment Rehberi
## Teknisyen Bulma Platformu - 20 Dakikada Canlıya Alın!

**Tarih**: 2024  
**Hedef Süre**: 20-30 dakika  
**Strateji**: Vercel (Frontend) + Railway (Backend) + Managed Databases

---

## 📋 Gerekli Hesaplar

Aşağıdaki platformlarda hesap açmanız gerekiyor (hepsi ücretsiz başlangıç):

1. ✅ **GitHub** - Zaten var (repo için)
2. 🆕 **Vercel** - Frontend hosting
3. 🆕 **Railway** - Backend hosting
4. 🆕 **Supabase** - PostgreSQL database
5. 🆕 **Upstash** - Redis cache
6. 🆕 **MongoDB Atlas** - MongoDB database

---

## ⏱️ Adım Adım Deployment (20 dakika)

### Faz 1: Database Setup (8 dakika)

#### 1.1 Supabase PostgreSQL (3 dakika)

1. **Hesap Aç**: https://supabase.com
   - "Start your project" tıkla
   - GitHub ile giriş yap

2. **Proje Oluştur**:
   - "New Project" tıkla
   - Name: `technician-platform`
   - Database Password: Güçlü bir şifre oluştur (kaydet!)
   - Region: `South America (São Paulo)` (Meksika'ya yakın)
   - "Create new project" tıkla

3. **Connection String Al**:
   - Sol menüden "Project Settings" → "Database"
   - "Connection string" → "URI" sekmesi
   - Connection string'i kopyala:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   - **Kaydet**: Bu string'i bir yere not et!

#### 1.2 Upstash Redis (2 dakika)

1. **Hesap Aç**: https://upstash.com
   - "Get Started" tıkla
   - GitHub ile giriş yap

2. **Database Oluştur**:
   - "Create Database" tıkla
   - Name: `technician-platform-redis`
   - Type: `Regional`
   - Region: `us-east-1` (veya yakın)
   - "Create" tıkla

3. **Connection String Al**:
   - Database'e tıkla
   - "REST API" sekmesi
   - `UPSTASH_REDIS_REST_URL` ve `UPSTASH_REDIS_REST_TOKEN` kopyala
   - **Kaydet**: Bu bilgileri not et!

#### 1.3 MongoDB Atlas (3 dakika)

1. **Hesap Aç**: https://www.mongodb.com/cloud/atlas/register
   - "Try Free" tıkla
   - Email ile kayıt ol

2. **Cluster Oluştur**:
   - "Build a Database" tıkla
   - "M0 FREE" seç
   - Provider: `AWS`
   - Region: `us-east-1` (veya yakın)
   - Cluster Name: `technician-platform`
   - "Create" tıkla

3. **Database User Oluştur**:
   - Username: `admin`
   - Password: Güçlü bir şifre (kaydet!)
   - "Create User" tıkla

4. **IP Whitelist**:
   - "Add IP Address" tıkla
   - "Allow Access from Anywhere" (0.0.0.0/0)
   - "Confirm" tıkla

5. **Connection String Al**:
   - "Connect" tıkla
   - "Connect your application" seç
   - Connection string kopyala:
   ```
   mongodb+srv://admin:[PASSWORD]@technician-platform.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - **Kaydet**: Bu string'i not et!

---

### Faz 2: Backend Deployment (Railway) (6 dakika)

#### 2.1 Railway Hesabı ve Proje (2 dakika)

1. **Hesap Aç**: https://railway.app
   - "Start a New Project" tıkla
   - GitHub ile giriş yap
   - Railway'e GitHub repo erişimi ver

2. **Proje Oluştur**:
   - "Deploy from GitHub repo" seç
   - `e-maestro` repo'nuzu seç
   - "Deploy Now" tıkla

#### 2.2 Environment Variables Ekle (4 dakika)

1. **Variables Sekmesi**:
   - Deployed service'e tıkla
   - "Variables" sekmesine git
   - "RAW Editor" tıkla

2. **Aşağıdaki değişkenleri yapıştır**:

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database - PostgreSQL (Supabase'den aldığınız)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Redis (Upstash'tan aldığınız)
REDIS_URL=redis://default:[YOUR-TOKEN]@[YOUR-ENDPOINT]:6379

# MongoDB (Atlas'tan aldığınız)
MONGODB_URI=mongodb+srv://admin:[PASSWORD]@technician-platform.xxxxx.mongodb.net/technician_platform?retryWrites=true&w=majority

# JWT (Güçlü random string'ler oluşturun)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-characters
JWT_REFRESH_EXPIRATION=7d

# CORS (Frontend URL'inizi ekleyeceksiniz, şimdilik *)
CORS_ORIGIN=*

# Stripe (Test keys - https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Google Maps (https://console.cloud.google.com/apis/credentials)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# SendGrid (https://app.sendgrid.com/settings/api_keys)
SENDGRID_API_KEY=SG.your_sendgrid_api_key

# Twilio (https://console.twilio.com/)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AWS S3 (Şimdilik boş bırakabilirsiniz)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=technician-platform-files

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

3. **Deploy Tetikle**:
   - "Deploy" butonuna tıkla
   - Deployment loglarını izle
   - "Success" mesajını bekle (~2-3 dakika)

4. **Backend URL'i Al**:
   - "Settings" → "Domains"
   - Railway tarafından verilen URL'i kopyala:
   ```
   https://your-app.up.railway.app
   ```
   - **Kaydet**: Bu URL'i not et!

---

### Faz 3: Frontend Deployment (Vercel) (6 dakika)

#### 3.1 Vercel Hesabı ve Proje (2 dakika)

1. **Hesap Aç**: https://vercel.com
   - "Start Deploying" tıkla
   - GitHub ile giriş yap

2. **Proje Import Et**:
   - "Add New..." → "Project" tıkla
   - `e-maestro` repo'nuzu seç
   - "Import" tıkla

#### 3.2 Build Settings (2 dakika)

1. **Framework Preset**: `Vite` seçili olmalı

2. **Root Directory**: 
   - "Edit" tıkla
   - `packages/web-frontend` yaz
   - "Continue" tıkla

3. **Build Command**: 
   ```
   npm install && npm run build
   ```

4. **Output Directory**: 
   ```
   dist
   ```

#### 3.3 Environment Variables (2 dakika)

1. **Environment Variables Ekle**:

```bash
VITE_API_URL=https://your-app.up.railway.app/api/v1
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

2. **Deploy**:
   - "Deploy" tıkla
   - Deployment'ı izle (~1-2 dakika)
   - "Visit" tıkla

3. **Frontend URL'i Al**:
   ```
   https://your-app.vercel.app
   ```
   - **Kaydet**: Bu URL'i not et!

---

### Faz 4: Final Configuration (2 dakika)

#### 4.1 CORS Güncelle

1. **Railway'e Dön**:
   - Backend service'e git
   - "Variables" sekmesi
   - `CORS_ORIGIN` değişkenini güncelle:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
   - "Save" ve otomatik redeploy bekle

#### 4.2 Database Migration

1. **Railway Console**:
   - Backend service'e git
   - "..." menü → "View Logs"
   - Migration loglarını kontrol et
   - Hata varsa, "Deployments" → "Redeploy" tıkla

---

## ✅ Deployment Tamamlandı!

### Test Edin

1. **Frontend**: https://your-app.vercel.app
   - Sayfa yüklenmeli
   - Console'da hata olmamalı

2. **Backend Health Check**: https://your-app.up.railway.app/health
   - Response: `{"status":"ok"}`

3. **API Test**: https://your-app.up.railway.app/api/v1/auth/register
   - POST request ile test edin

---

## 🐛 Sorun Giderme

### Backend Başlamıyor

**Railway Logs Kontrol**:
- Railway dashboard → Service → "View Logs"
- Hata mesajlarını oku

**Yaygın Sorunlar**:
1. **Database connection error**: Connection string'leri kontrol et
2. **Port binding error**: PORT=3000 olduğundan emin ol
3. **Missing env vars**: Tüm gerekli değişkenler eklenmiş mi?

### Frontend Yüklenmiyor

**Vercel Logs Kontrol**:
- Vercel dashboard → Project → "Deployments" → Son deployment
- Build logs'u kontrol et

**Yaygın Sorunlar**:
1. **Build failed**: `VITE_API_URL` doğru mu?
2. **404 errors**: Root directory `packages/web-frontend` mi?
3. **API errors**: Backend URL doğru mu?

### Database Bağlantı Hatası

**Connection String Kontrol**:
1. Şifrede özel karakterler var mı? URL encode et
2. IP whitelist 0.0.0.0/0 mi?
3. Database user oluşturuldu mu?

---

## 📊 Deployment Özeti

### Oluşturulan Kaynaklar

1. ✅ **Supabase PostgreSQL**: Database
2. ✅ **Upstash Redis**: Cache
3. ✅ **MongoDB Atlas**: Document store
4. ✅ **Railway**: Backend hosting
5. ✅ **Vercel**: Frontend hosting

### URL'ler

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-app.up.railway.app
- **API**: https://your-app.up.railway.app/api/v1

### Maliyet

- **Toplam**: $0/ay (tüm free tier'lar)
- **Limit**: 
  - Railway: 500 saat/ay
  - Vercel: 100 GB bandwidth
  - Supabase: 500 MB database
  - Upstash: 10,000 commands/day
  - MongoDB: 512 MB storage

---

## 🎯 Sonraki Adımlar

### Hemen Yapılacaklar

1. **Custom Domain Ekle** (Opsiyonel):
   - Vercel: Settings → Domains
   - Railway: Settings → Domains

2. **SSL Certificate**: Otomatik aktif ✅

3. **Monitoring Ekle**:
   - Sentry: https://sentry.io
   - LogRocket: https://logrocket.com

### İlk Hafta

1. **Production API Keys**:
   - Stripe live keys
   - Google Maps production key
   - SendGrid production key

2. **Database Backup**:
   - Supabase otomatik backup aktif
   - MongoDB Atlas backup ayarla

3. **Performance Monitoring**:
   - Vercel Analytics aktif et
   - Railway metrics izle

---

## 🎉 Tebrikler!

Platform başarıyla canlıya alındı! 🚀

**Deployment Süresi**: ~20 dakika  
**Durum**: Production-Ready ✅  
**Maliyet**: $0/ay (başlangıç)

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024

