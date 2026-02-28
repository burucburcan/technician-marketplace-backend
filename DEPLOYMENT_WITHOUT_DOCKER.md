# 🚀 Production Deployment (Docker Olmadan)
## Teknisyen Bulma Platformu

**Tarih**: 2024  
**Platform Versiyonu**: 1.0.0  
**Deployment Tipi**: Cloud-Native (Vercel + Railway/Render)

---

## 📋 Genel Bakış

Docker olmadan production deployment için modern cloud platformları kullanacağız:

- **Backend**: Railway veya Render (Node.js hosting)
- **Web Frontend**: Vercel veya Netlify (React hosting)
- **Mobile**: Expo EAS Build (React Native)
- **Database**: Managed services (AWS RDS, MongoDB Atlas, Redis Cloud)

---

## 🎯 Deployment Stratejisi

### Avantajlar
✅ Docker gerektirmez  
✅ Otomatik scaling  
✅ Kolay setup  
✅ CI/CD built-in  
✅ Free tier mevcut  
✅ Hızlı deployment  

### Dezavantajlar
⚠️ Vendor lock-in  
⚠️ Maliyet (scale olunca)  
⚠️ Daha az kontrol  

---

## 📦 Seçenek 1: Vercel + Railway (ÖNERİLEN)

### Backend Deployment (Railway)

#### 1. Railway Hesabı Oluştur
- [Railway.app](https://railway.app) adresine git
- GitHub ile giriş yap
- Yeni proje oluştur

#### 2. Backend'i Deploy Et

```bash
# Railway CLI kur
npm install -g @railway/cli

# Login
railway login

# Proje oluştur
railway init

# Backend'i link et
cd packages/backend
railway link

# Environment variables ekle
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set DATABASE_URL=postgresql://...
railway variables set REDIS_URL=redis://...
railway variables set JWT_SECRET=your-secret-key

# Deploy
railway up
```

#### 3. Database Setup (Railway)

```bash
# PostgreSQL ekle
railway add postgresql

# Redis ekle
railway add redis

# MongoDB için MongoDB Atlas kullan
# https://www.mongodb.com/cloud/atlas
```

### Frontend Deployment (Vercel)

#### 1. Vercel Hesabı Oluştur
- [Vercel.com](https://vercel.com) adresine git
- GitHub ile giriş yap

#### 2. Web Frontend'i Deploy Et

```bash
# Vercel CLI kur
npm install -g vercel

# Login
vercel login

# Deploy
cd packages/web-frontend
vercel

# Production deploy
vercel --prod
```

#### 3. Environment Variables (Vercel Dashboard)

```
VITE_API_URL=https://your-backend.railway.app
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_GOOGLE_MAPS_API_KEY=...
```

---

## 📦 Seçenek 2: Render (Hepsi Bir Arada)

### 1. Render Hesabı Oluştur
- [Render.com](https://render.com) adresine git
- GitHub ile giriş yap

### 2. Backend Web Service Oluştur

**Dashboard'da**:
1. "New +" → "Web Service"
2. GitHub repo'nuzu seçin
3. Ayarlar:
   - **Name**: technician-platform-backend
   - **Root Directory**: packages/backend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Starter ($7/month) veya Free

4. Environment Variables ekle:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
```

### 3. Frontend Static Site Oluştur

**Dashboard'da**:
1. "New +" → "Static Site"
2. GitHub repo'nuzu seçin
3. Ayarlar:
   - **Name**: technician-platform-web
   - **Root Directory**: packages/web-frontend
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: dist
   - **Plan**: Free

4. Environment Variables ekle:
```
VITE_API_URL=https://technician-platform-backend.onrender.com
VITE_STRIPE_PUBLIC_KEY=...
```

### 4. Database Setup (Render)

**PostgreSQL**:
1. "New +" → "PostgreSQL"
2. Name: technician-platform-db
3. Plan: Starter ($7/month) veya Free
4. Connection string'i kopyala

**Redis**:
1. "New +" → "Redis"
2. Name: technician-platform-redis
3. Plan: Starter ($10/month)
4. Connection string'i kopyala

---

## 📦 Seçenek 3: Netlify + Heroku

### Backend (Heroku)

```bash
# Heroku CLI kur
npm install -g heroku

# Login
heroku login

# App oluştur
heroku create technician-platform-backend

# Buildpack ekle
heroku buildpacks:set heroku/nodejs

# Environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
cd packages/backend
git subtree push --prefix packages/backend heroku main

# Veya
git push heroku main
```

### Frontend (Netlify)

```bash
# Netlify CLI kur
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd packages/web-frontend
netlify deploy --prod
```

---

## 🗄️ Managed Database Services

### PostgreSQL - Supabase (ÖNERİLEN)

**Ücretsiz Plan**:
- 500 MB database
- Unlimited API requests
- 50,000 monthly active users

**Setup**:
1. [Supabase.com](https://supabase.com) → Sign up
2. New Project oluştur
3. Connection string'i al:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Redis - Upstash

**Ücretsiz Plan**:
- 10,000 commands/day
- 256 MB storage

**Setup**:
1. [Upstash.com](https://upstash.com) → Sign up
2. Redis database oluştur
3. Connection string'i al:
```
redis://default:[PASSWORD]@[ENDPOINT]:6379
```

### MongoDB - MongoDB Atlas

**Ücretsiz Plan**:
- 512 MB storage
- Shared cluster

**Setup**:
1. [MongoDB.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Sign up
2. Cluster oluştur (M0 Free tier)
3. Connection string'i al:
```
mongodb+srv://username:password@cluster.mongodb.net/dbname
```

### ElasticSearch - Elastic Cloud

**14 Günlük Trial**:
1. [Elastic.co/cloud](https://www.elastic.co/cloud) → Sign up
2. Deployment oluştur
3. Endpoint'i al

---

## 🔧 Local Build ve Test

### 1. Backend Build

```bash
cd packages/backend

# Dependencies kur
npm install

# Build
npm run build

# Test
npm test

# Local çalıştır
npm run start:prod
```

### 2. Frontend Build

```bash
cd packages/web-frontend

# Dependencies kur
npm install

# Build
npm run build

# Preview
npm run preview
```

### 3. Environment Variables Hazırla

**Backend (.env.production)**:
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MONGODB_URI=mongodb+srv://...
ELASTICSEARCH_NODE=https://...
JWT_SECRET=your-super-secret-key
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_MAPS_API_KEY=...
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
CORS_ORIGIN=https://your-domain.com
```

**Frontend (.env.production)**:
```bash
VITE_API_URL=https://api.your-domain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...
VITE_GOOGLE_MAPS_API_KEY=...
```

---

## 🚀 Adım Adım Deployment

### Faz 1: Database Setup (30 dakika)

1. **Supabase PostgreSQL**:
   - Hesap oluştur
   - Proje oluştur
   - Connection string al
   - Migration'ları çalıştır

2. **Upstash Redis**:
   - Hesap oluştur
   - Database oluştur
   - Connection string al

3. **MongoDB Atlas**:
   - Hesap oluştur
   - Cluster oluştur (M0 Free)
   - Connection string al

### Faz 2: Backend Deployment (20 dakika)

1. **Railway veya Render seç**
2. **GitHub repo'yu bağla**
3. **Environment variables ekle**
4. **Deploy et**
5. **Health check yap**:
```bash
curl https://your-backend.railway.app/health
```

### Faz 3: Frontend Deployment (15 dakika)

1. **Vercel veya Netlify seç**
2. **GitHub repo'yu bağla**
3. **Build settings ayarla**
4. **Environment variables ekle**
5. **Deploy et**
6. **Test et**: https://your-app.vercel.app

### Faz 4: Domain Setup (10 dakika)

1. **Custom domain ekle**:
   - Backend: api.your-domain.com
   - Frontend: your-domain.com

2. **SSL otomatik aktif olur**

### Faz 5: Monitoring (15 dakika)

1. **Sentry kurulumu**:
```bash
npm install @sentry/node @sentry/react
```

2. **Environment variables**:
```
SENTRY_DSN=https://...@sentry.io/...
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Tüm testler geçiyor
- [ ] Build başarılı
- [ ] Environment variables hazır
- [ ] Database connection strings alındı
- [ ] External API keys hazır

### Deployment
- [ ] Database services oluşturuldu
- [ ] Backend deploy edildi
- [ ] Frontend deploy edildi
- [ ] Environment variables set edildi
- [ ] Custom domain bağlandı

### Post-Deployment
- [ ] Health check başarılı
- [ ] API endpoints çalışıyor
- [ ] Frontend yükleniyor
- [ ] Database bağlantısı OK
- [ ] External services çalışıyor

---

## 🔍 Troubleshooting

### Backend Başlamıyor

```bash
# Logs kontrol et
railway logs  # Railway için
# veya Render dashboard'dan logs bak

# Common issues:
# 1. Environment variables eksik
# 2. Database connection string yanlış
# 3. Port binding hatası
```

### Frontend Build Hatası

```bash
# Local build test et
npm run build

# Common issues:
# 1. Environment variables eksik
# 2. API URL yanlış
# 3. TypeScript errors
```

### Database Connection Hatası

```bash
# Connection string test et
psql "postgresql://..."

# Common issues:
# 1. IP whitelist (0.0.0.0/0 ekle)
# 2. Password yanlış
# 3. SSL required
```

---

## 💰 Maliyet Tahmini

### Ücretsiz Tier (Başlangıç)
- **Backend**: Railway Free ($0) veya Render Free ($0)
- **Frontend**: Vercel Free ($0)
- **PostgreSQL**: Supabase Free ($0)
- **Redis**: Upstash Free ($0)
- **MongoDB**: Atlas M0 Free ($0)
- **Toplam**: $0/ay

### Starter Tier (Küçük Ölçek)
- **Backend**: Railway Starter ($5) veya Render Starter ($7)
- **Frontend**: Vercel Pro ($20)
- **PostgreSQL**: Supabase Pro ($25)
- **Redis**: Upstash Pay-as-you-go (~$5)
- **MongoDB**: Atlas M10 ($57)
- **Toplam**: ~$120/ay

### Production Tier (Orta Ölçek)
- **Backend**: Railway Pro ($20) veya Render Standard ($25)
- **Frontend**: Vercel Pro ($20)
- **PostgreSQL**: Supabase Pro ($25)
- **Redis**: Upstash Pro ($20)
- **MongoDB**: Atlas M30 ($200)
- **Toplam**: ~$310/ay

---

## 📚 Yararlı Linkler

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Upstash Documentation](https://docs.upstash.com/)
- [MongoDB Atlas Documentation](https://www.mongodb.com/docs/atlas/)

---

## 🎯 Sonraki Adımlar

1. **Şimdi**: Database services kur
2. **Sonra**: Backend deploy et
3. **En son**: Frontend deploy et
4. **Bonus**: Custom domain ekle
5. **Monitoring**: Sentry ekle

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024  
**Versiyon**: 1.0.0

