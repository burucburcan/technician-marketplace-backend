# 🗺️ Google Maps API Key - Adım Adım Kurulum
## Teknisyen Bulma Platformu

**Süre**: ~8 dakika  
**Maliyet**: İlk $200/ay ücretsiz kredi

---

## 🎯 Ne Alacağız?

1. **Google Maps API Key** - Harita, konum, adres servisleri için
2. **4 API Aktif Edeceğiz**:
   - Maps JavaScript API (harita gösterimi)
   - Places API (adres arama)
   - Geocoding API (adres ↔ koordinat)
   - Distance Matrix API (mesafe hesaplama)

---

## 📝 Adım 1: Google Cloud Console'a Giriş (1 dakika)

### 1.1 Console'a Git

1. **Google Cloud Console**: https://console.cloud.google.com
2. **Google Hesabınızla Giriş Yapın**
3. İlk kez giriyorsanız "Terms of Service" kabul edin

---

## 🏗️ Adım 2: Yeni Proje Oluştur (1 dakika)

### 2.1 Proje Oluştur

1. **Üst menüden** proje seçici'ye tıklayın (Google Cloud Platform yanında)
2. **"NEW PROJECT"** butonuna tıklayın
3. **Project name**: `technician-platform` yazın
4. **Location**: "No organization" bırakın
5. **"CREATE"** tıklayın
6. **Bekleyin**: Proje oluşturulacak (~30 saniye)
7. **Proje seçici'den** yeni projenizi seçin

---

## 💳 Adım 3: Billing Aktif Et (2 dakika)

⚠️ **Zorunlu**: Google Maps API'leri kullanmak için billing gerekli (ama ilk $200 ücretsiz)

### 3.1 Billing Hesabı Oluştur

1. **Sol menüden** "Billing" tıklayın
2. **"LINK A BILLING ACCOUNT"** tıklayın
3. **"CREATE BILLING ACCOUNT"** seçin
4. **Ülke**: Mexico seçin
5. **"Continue"** tıklayın

### 3.2 Ödeme Bilgileri

1. **Kredi kartı bilgilerinizi girin**:
   - Kart numarası
   - Son kullanma tarihi
   - CVV
   - Fatura adresi
2. **"START MY FREE TRIAL"** tıklayın


✅ **Güvence**: 
- İlk 90 gün $300 ücretsiz kredi
- Aylık $200 ücretsiz kullanım (sürekli)
- Kredi bitmeden uyarı alırsınız
- Otomatik ücretlendirme YOK (onay vermedikçe)

---

## 🔌 Adım 4: API'leri Aktif Et (2 dakika)

### 4.1 API Library'ye Git

1. **Sol menüden** "APIs & Services" → "Library" tıklayın
2. Şimdi 4 API'yi tek tek aktif edeceğiz

### 4.2 Maps JavaScript API

1. **Arama kutusuna** "Maps JavaScript API" yazın
2. **İlk sonuca** tıklayın
3. **"ENABLE"** butonuna tıklayın
4. **Bekleyin**: API aktif olacak (~10 saniye)

### 4.3 Places API

1. **Geri** tuşuna basın (API Library'ye dönün)
2. **Arama kutusuna** "Places API" yazın
3. **İlk sonuca** tıklayın
4. **"ENABLE"** tıklayın

### 4.4 Geocoding API

1. **Geri** tuşuna basın
2. **Arama kutusuna** "Geocoding API" yazın
3. **İlk sonuca** tıklayın
4. **"ENABLE"** tıklayın

### 4.5 Distance Matrix API

1. **Geri** tuşuna basın
2. **Arama kutusuna** "Distance Matrix API" yazın
3. **İlk sonuca** tıklayın
4. **"ENABLE"** tıklayın

✅ **4 API Aktif**: Maps JavaScript, Places, Geocoding, Distance Matrix

---

## 🔑 Adım 5: API Key Oluştur (1 dakika)

### 5.1 Credentials Sayfasına Git

1. **Sol menüden** "APIs & Services" → "Credentials" tıklayın
2. **"+ CREATE CREDENTIALS"** tıklayın (üstte)
3. **"API key"** seçin

### 5.2 Key Oluşturuldu!

- Popup'ta API key göreceksiniz: `AIzaSyAbc...xyz`
- **"COPY"** tıklayarak kopyalayın
- **Kaydedin**: Bir yere not edin

```bash
GOOGLE_MAPS_API_KEY=AIzaSyAbc...xyz
```

⚠️ **Henüz kapatmayın!** Key'i güvenli hale getireceğiz.

---

## 🔒 Adım 6: API Key'i Güvenli Hale Getir (1 dakika)

### 6.1 Key'i Düzenle

1. Popup'ta **"EDIT API KEY"** tıklayın (veya Credentials listesinden key'e tıklayın)
2. **API key name**: `Technician Platform Key` yazın

### 6.2 Application Restrictions (HTTP Referrer)

1. **"Application restrictions"** bölümünde:
2. **"HTTP referrers (web sites)"** seçin
3. **"ADD AN ITEM"** tıklayın
4. **Website restrictions** ekleyin:

```
http://localhost:5173/*
http://localhost:3000/*
https://your-app.vercel.app/*
```

(Vercel URL'inizi deployment sonrası ekleyeceksiniz)

5. **"DONE"** tıklayın

### 6.3 API Restrictions

1. **"API restrictions"** bölümünde:
2. **"Restrict key"** seçin
3. **"Select APIs"** dropdown'ından şunları seçin:
   - ✅ Maps JavaScript API
   - ✅ Places API
   - ✅ Geocoding API
   - ✅ Distance Matrix API

4. **"SAVE"** tıklayın

✅ **API Key Güvenli**: Sadece sizin domain'inizden ve sadece seçili API'lerle kullanılabilir

---

## ✅ Tamamlandı! Aldığınız Key

```bash
# Frontend için (.env veya Vercel)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAbc...xyz

# Backend için (.env veya Railway)
GOOGLE_MAPS_API_KEY=AIzaSyAbc...xyz
```

Bu key'i `GOOGLE_MAPS_KEY.txt` dosyasına kaydedin.

---

## 🧪 API Key'i Test Et

Terminal'de test edin:

```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Mexico+City&key=YOUR_API_KEY"
```

Başarılı response:
```json
{
  "results": [
    {
      "formatted_address": "Mexico City, CDMX, Mexico",
      "geometry": {
        "location": {
          "lat": 19.4326077,
          "lng": -99.133208
        }
      }
    }
  ],
  "status": "OK"
}
```

Hata alırsanız:
- API key doğru kopyalandı mı?
- API'ler enable mi?
- Billing aktif mi?

---

## 🔄 Deployment Sonrası Yapılacaklar

Vercel'e frontend deploy ettikten sonra:

1. **Google Cloud Console** → APIs & Services → Credentials
2. **API key'e** tıklayın
3. **HTTP referrers** bölümüne Vercel URL'inizi ekleyin:
   ```
   https://your-actual-app.vercel.app/*
   ```
4. **"SAVE"** tıklayın

---

## 💰 Maliyet Bilgisi

### Ücretsiz Kullanım

- **Aylık $200 kredi** (sürekli)
- **İlk 90 gün +$300** ekstra kredi

### Fiyatlandırma (kredi bittikten sonra)

| API | Fiyat | Ücretsiz Limit |
|-----|-------|----------------|
| Maps JavaScript API | $7/1000 yükleme | ~28,000/ay |
| Places API | $17/1000 istek | ~11,000/ay |
| Geocoding API | $5/1000 istek | ~40,000/ay |
| Distance Matrix API | $5/1000 istek | ~40,000/ay |

### Tahmini Maliyet

- **Düşük trafik** (100 kullanıcı/gün): $0/ay (ücretsiz limit içinde)
- **Orta trafik** (1000 kullanıcı/gün): $20-50/ay
- **Yüksek trafik** (10,000 kullanıcı/gün): $100-200/ay

---

## 🎯 Tüm API Keys Hazır!

Şimdi elinizde tüm zorunlu key'ler var:

✅ **JWT Secrets** (oluşturdunuz)
✅ **Stripe Keys** (pk_test_..., sk_test_..., whsec_...)
✅ **Google Maps Key** (AIzaSy...)

## Sıradaki Adım: DEPLOYMENT! 🚀

Artık deployment'a hazırsınız. İki seçenek:

**a) Hemen Deploy Et** (~20 dakika)
- `QUICK_DEPLOYMENT_GUIDE.md` dosyasını takip edin
- Database setup → Backend (Railway) → Frontend (Vercel)

**b) Opsiyonel API Key'leri de Al** (~10 dakika)
- SendGrid (email)
- Twilio (SMS)
- AWS S3 (dosya depolama)
- Bunlar olmadan da platform çalışır

Hangisini yapmak istersiniz?

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024
