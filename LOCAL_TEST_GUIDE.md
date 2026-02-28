# 🧪 Local Test ve Build Rehberi
## Teknisyen Bulma Platformu

**Tarih**: 2024  
**Amaç**: Production'a geçmeden önce local'de test etme

---

## 📋 Test Adımları

### 1️⃣ Backend Build ve Test (10 dakika)
### 2️⃣ Frontend Build ve Test (10 dakika)
### 3️⃣ Entegrasyon Testi (5 dakika)
### 4️⃣ Production Build (5 dakika)

---

## 1️⃣ Backend Build ve Test

### Adım 1: Dependencies Kontrol

```bash
cd packages/backend
npm install
```

### Adım 2: TypeScript Build

```bash
# Build
npm run build

# Build başarılı mı kontrol et
ls dist/
```

**Beklenen Çıktı**:
```
dist/
  ├── main.js
  ├── app.module.js
  ├── modules/
  └── ...
```

### Adım 3: Testleri Çalıştır

```bash
# Tüm testleri çalıştır
npm test

# Sadece unit testler
npm test -- --testPathPattern="spec.ts$"

# Sadece property testler
npm test -- --testPathPattern="property.spec.ts$"
```

**Beklenen Sonuç**: Tüm testler geçmeli ✅

### Adım 4: Linting Kontrol

```bash
# ESLint
npm run lint

# TypeScript type check
npm run type-check
```

---

## 2️⃣ Frontend Build ve Test

### Adım 1: Dependencies Kontrol

```bash
cd packages/web-frontend
npm install
```

### Adım 2: Build

```bash
# Production build
npm run build

# Build başarılı mı kontrol et
ls dist/
```

**Beklenen Çıktı**:
```
dist/
  ├── index.html
  ├── assets/
  │   ├── index-[hash].js
  │   └── index-[hash].css
  └── ...
```

### Adım 3: Build Preview

```bash
# Build'i local'de test et
npm run preview
```

**Tarayıcıda aç**: http://localhost:4173

### Adım 4: Bundle Size Kontrol

```bash
# Build size analizi
npm run build -- --stats

# Veya
npx vite-bundle-visualizer
```

**Hedef**: 
- Initial bundle < 500 KB
- Total size < 2 MB

---

## 3️⃣ Entegrasyon Testi

### Mock Backend ile Frontend Test

```bash
# Terminal 1: Backend (development mode)
cd packages/backend
npm run start:dev

# Terminal 2: Frontend (development mode)
cd packages/web-frontend
npm run dev
```

**Test Senaryoları**:

1. **Ana Sayfa Yükleme**
   - http://localhost:5173 aç
   - Sayfa yüklenmeli
   - Console'da hata olmamalı

2. **API Bağlantısı**
   - Network tab'ı aç
   - API çağrıları başarılı mı kontrol et
   - Status code 200 olmalı

3. **Temel Navigasyon**
   - Sayfalar arası geçiş yap
   - Her sayfa yüklenmeli
   - Hata olmamalı

---

## 4️⃣ Production Build Test

### Backend Production Build

```bash
cd packages/backend

# Production build
npm run build

# Production mode'da çalıştır
npm run start:prod
```

**Kontrol Listesi**:
- [ ] Build başarılı
- [ ] Server başladı (port 3000)
- [ ] Health endpoint çalışıyor: http://localhost:3000/health
- [ ] Console'da error yok

### Frontend Production Build

```bash
cd packages/web-frontend

# Production build
npm run build

# Preview
npm run preview
```

**Kontrol Listesi**:
- [ ] Build başarılı
- [ ] Bundle size kabul edilebilir
- [ ] Preview çalışıyor
- [ ] Console'da error yok
- [ ] Network requests başarılı

---

## ✅ Test Checklist

### Backend
- [ ] `npm install` başarılı
- [ ] `npm run build` başarılı
- [ ] `npm test` tüm testler geçti
- [ ] `npm run lint` hata yok
- [ ] `npm run start:prod` çalışıyor
- [ ] Health endpoint OK

### Frontend
- [ ] `npm install` başarılı
- [ ] `npm run build` başarılı
- [ ] `npm run preview` çalışıyor
- [ ] Bundle size < 500 KB
- [ ] Console'da error yok
- [ ] API calls başarılı

### Entegrasyon
- [ ] Backend + Frontend birlikte çalışıyor
- [ ] API bağlantısı OK
- [ ] Navigasyon çalışıyor
- [ ] Temel özellikler çalışıyor

---

## 🐛 Yaygın Sorunlar ve Çözümler

### Backend Build Hatası

**Sorun**: TypeScript compilation error
```
Error: Cannot find module '@nestjs/common'
```

**Çözüm**:
```bash
# node_modules'u sil ve yeniden kur
rm -rf node_modules package-lock.json
npm install
```

### Frontend Build Hatası

**Sorun**: Vite build error
```
Error: Could not resolve './Component'
```

**Çözüm**:
```bash
# Cache'i temizle
rm -rf node_modules/.vite
npm run build
```

### Test Hatası

**Sorun**: Tests failing
```
FAIL src/modules/auth/auth.service.spec.ts
```

**Çözüm**:
```bash
# Tek bir test dosyasını çalıştır
npm test -- auth.service.spec.ts

# Debug mode
npm test -- --detectOpenHandles
```

### Port Kullanımda

**Sorun**: Port already in use
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Çözüm**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Port değiştir
PORT=3001 npm run start:dev
```

---

## 📊 Performance Metrikleri

### Backend

```bash
# Response time test
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health
```

**Hedefler**:
- Health endpoint: < 50ms
- API endpoints: < 200ms
- Database queries: < 100ms

### Frontend

**Lighthouse Audit**:
```bash
# Chrome DevTools > Lighthouse
# Veya
npm install -g lighthouse
lighthouse http://localhost:4173 --view
```

**Hedefler**:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

---

## 🎯 Sonraki Adım

Test başarılı olduktan sonra:

1. ✅ **Environment variables hazırla**
2. ✅ **Database services kur** (Supabase, Upstash)
3. ✅ **Backend deploy et** (Railway)
4. ✅ **Frontend deploy et** (Vercel)

---

## 📝 Test Sonuçları Şablonu

```markdown
# Test Sonuçları - [Tarih]

## Backend
- Build: ✅ / ❌
- Tests: ✅ / ❌ (X/Y passed)
- Lint: ✅ / ❌
- Production Start: ✅ / ❌

## Frontend
- Build: ✅ / ❌
- Bundle Size: XXX KB
- Preview: ✅ / ❌
- Lighthouse Score: XX/100

## Entegrasyon
- Backend + Frontend: ✅ / ❌
- API Calls: ✅ / ❌
- Navigation: ✅ / ❌

## Notlar
- [Herhangi bir sorun veya gözlem]
```

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024

