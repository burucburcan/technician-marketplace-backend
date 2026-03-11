# Google Maps API Anahtarı - Hızlı Kurulum Rehberi

## 🎯 Hedef
e-MANO platformu için Google Maps API anahtarı oluşturup Vercel'e eklemek.

## 📋 Adım 1: Google Cloud Console'a Giriş

1. **Tarayıcıda aç**: https://console.cloud.google.com/
2. **Google hesabınla giriş yap** (burucburcan@gmail.com)
3. Sol üst köşede **proje seçici**'ye tıkla

## 📋 Adım 2: Yeni Proje Oluştur (veya Mevcut Projeyi Seç)

### Yeni Proje İçin:
1. **"NEW PROJECT"** butonuna tıkla
2. **Proje adı**: `e-MANO Platform`
3. **"CREATE"** butonuna tıkla
4. Proje oluşturulana kadar bekle (30 saniye)

### Mevcut Proje Varsa:
1. Proje listesinden seçin
2. Proje adını not edin

## 📋 Adım 3: Google Maps API'lerini Aktifleştir

1. Sol menüden **"APIs & Services"** → **"Library"** seçin
2. Arama kutusuna **"Maps JavaScript API"** yazın
3. **"Maps JavaScript API"** kartına tıklayın
4. **"ENABLE"** butonuna tıklayın
5. Geri dönün ve aynı işlemi şunlar için tekrarlayın:
   - **"Places API"** → ENABLE
   - **"Geocoding API"** → ENABLE
   - **"Distance Matrix API"** → ENABLE

## 📋 Adım 4: API Anahtarı Oluştur

1. Sol menüden **"APIs & Services"** → **"Credentials"** seçin
2. Üst kısımda **"+ CREATE CREDENTIALS"** butonuna tıklayın
3. **"API key"** seçeneğini seçin
4. API anahtarı oluşturuldu! **Anahtarı kopyalayın** (örnek: `AIzaSyC...`)

## 📋 Adım 5: API Anahtarını Kısıtla (GÜVENLİK ÖNEMLİ!)

1. Oluşturulan anahtarın yanındaki **"RESTRICT KEY"** butonuna tıklayın
2. **"Name"** alanına: `e-MANO Production Key` yazın
3. **"Application restrictions"** bölümünde:
   - **"HTTP referrers (web sites)"** seçeneğini işaretleyin
4. **"Website restrictions"** bölümünde **"ADD AN ITEM"** butonuna tıklayın
5. Şu URL'leri ekleyin (her biri için ADD AN ITEM):
   ```
   https://e-mano-frontend-nhn0i9b4m-burcans-projects.vercel.app/*
   https://technician-marketplace-frontend.vercel.app/*
   https://*.vercel.app/*
   http://localhost:3000/*
   http://localhost:3001/*
   ```
6. **"API restrictions"** bölümünde:
   - **"Restrict key"** seçeneğini işaretleyin
   - Şu API'leri seçin:
     - ✅ Maps JavaScript API
     - ✅ Places API
     - ✅ Geocoding API
     - ✅ Distance Matrix API
7. **"SAVE"** butonuna tıklayın

## 📋 Adım 6: API Anahtarını Vercel'e Ekle

### Yöntem 1: Vercel Dashboard (Tarayıcı)
1. **Vercel Dashboard'a git**: https://vercel.com/
2. **Projenizi seçin**: `e-mano-frontend`
3. **"Settings"** sekmesine tıklayın
4. Sol menüden **"Environment Variables"** seçin
5. **"Add New"** butonuna tıklayın
6. **Key**: `VITE_GOOGLE_MAPS_API_KEY`
7. **Value**: Kopyaladığınız API anahtarını yapıştırın (örnek: `AIzaSyC...`)
8. **Environments**: Tüm ortamları seçin (Production, Preview, Development)
9. **"Save"** butonuna tıklayın

### Yöntem 2: Vercel CLI (Terminal)
```bash
# Vercel CLI ile environment variable ekle
vercel env add VITE_GOOGLE_MAPS_API_KEY

# Prompt'ta:
# - Value: API anahtarınızı yapıştırın
# - Environments: Production, Preview, Development (hepsini seçin)
```

## 📋 Adım 7: Frontend'i Yeniden Deploy Et

### Yöntem 1: Otomatik (Git Push)
```bash
# Boş commit ile yeniden deploy tetikle
git commit --allow-empty -m "chore: Trigger redeploy for Google Maps API key"
git push origin main
```

### Yöntem 2: Manuel (Vercel Dashboard)
1. Vercel Dashboard'da projenizi açın
2. **"Deployments"** sekmesine gidin
3. En son deployment'ın yanındaki **üç nokta (...)** menüsüne tıklayın
4. **"Redeploy"** seçeneğini seçin
5. **"Redeploy"** butonuna tıklayın

### Yöntem 3: Vercel CLI
```bash
# Mevcut dizinde yeniden deploy
npx vercel --prod
```

## ✅ Doğrulama

Deploy tamamlandıktan sonra:

1. **Frontend URL'ini aç**: https://e-mano-frontend-nhn0i9b4m-burcans-projects.vercel.app
2. **Profesyonel arama sayfasına git**
3. **Harita görünümünü kontrol et** - Harita yüklenmeli
4. **Tarayıcı console'u aç** (F12) - Google Maps hatası olmamalı

## 🔧 Sorun Giderme

### Hata: "InvalidKeyMapError"
- API anahtarı yanlış kopyalanmış olabilir
- Vercel'de environment variable'ı kontrol edin
- Boşluk veya özel karakter olmadığından emin olun

### Hata: "RefererNotAllowedMapError"
- API anahtarı kısıtlamaları yanlış yapılandırılmış
- Google Cloud Console'da HTTP referrers'ı kontrol edin
- Vercel URL'lerinin doğru eklendiğinden emin olun

### Hata: "ApiNotActivatedMapError"
- Gerekli API'ler aktif değil
- Google Cloud Console'da şu API'leri aktifleştirin:
  - Maps JavaScript API
  - Places API
  - Geocoding API
  - Distance Matrix API

## 💰 Maliyet Bilgisi

Google Maps API **ücretsiz kotası**:
- **$200/ay ücretsiz kredi** (her ay yenilenir)
- Maps JavaScript API: ~28,000 yükleme/ay ücretsiz
- Geocoding API: ~40,000 istek/ay ücretsiz
- Places API: ~17,000 istek/ay ücretsiz

**Not**: Küçük ve orta ölçekli projeler için genellikle ücretsiz kota yeterlidir.

## 📞 Destek

Sorun yaşarsanız:
1. Google Cloud Console'da **"APIs & Services"** → **"Dashboard"** → API kullanım istatistiklerini kontrol edin
2. Vercel Dashboard'da **"Deployments"** → **"Functions"** → Log'ları kontrol edin
3. Tarayıcı console'unda (F12) hata mesajlarını kontrol edin

---

**Hazırlayan**: Kiro AI Assistant
**Tarih**: Mart 2026
**Proje**: e-MANO Platform
