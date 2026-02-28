# 🔒 API Key Güvenliği - Basit Açıklama

## Neden API Key'i Güvenli Hale Getirmeliyiz?

API key'iniz bir **şifre** gibidir. Eğer başkaları bu key'i ele geçirirse:
- ❌ Sizin adınıza Google Maps kullanabilirler
- ❌ Sizin kredi kartınızdan para çekerler
- ❌ Aylık limitinizi tüketirler

**Çözüm**: Key'i sadece SİZİN web sitenizden kullanılabilir hale getirin!

---

## 🎯 İki Güvenlik Katmanı

### 1. HTTP Referrers (Hangi Sitelerden Kullanılabilir?)

**Basit Açıklama**: 
"Bu key'i sadece şu web sitelerinden kullanabilirsin" demek.

**Örnek**:
- ✅ `http://localhost:5173/*` → Bilgisayarınızda test ederken
- ✅ `https://your-app.vercel.app/*` → Canlı sitenizde
- ❌ `https://hacker-site.com` → Başka siteler KULLANAMAZLAR

**Sonuç**: Birisi key'inizi kopyalasa bile, kendi sitesinde ÇALIŞMAZ!

---

### 2. API Restrictions (Hangi Servisleri Kullanabilir?)

**Basit Açıklama**:
"Bu key sadece harita servisleri için kullanılabilir, başka hiçbir şey için değil" demek.

**Örnek**:
- ✅ Maps JavaScript API → Harita göster
- ✅ Places API → Adres ara
- ✅ Geocoding API → Adres → Koordinat
- ✅ Distance Matrix API → Mesafe hesapla
- ❌ YouTube API → KULLANAMAZLAR
- ❌ Gmail API → KULLANAMAZLAR
- ❌ Cloud Storage → KULLANAMAZLAR

**Sonuç**: Birisi key'inizi ele geçirse bile, sadece harita için kullanabilir, başka hiçbir Google servisi için değil!

---

## 📝 Adım Adım Nasıl Yapılır?

### Şu Anda Neredesiniz?

API key oluşturdunuz ve bir popup açıldı. Popup'ta key'iniz görünüyor:
```
AIzaSyAbc...xyz
```

### Adım 1: Key'i Düzenleme Sayfasına Git

**Seçenek A**: Popup'tayken
- Popup'ta **"EDIT API KEY"** veya **"RESTRICT KEY"** butonu var
- Ona tıklayın

**Seçenek B**: Popup'u kapattıysanız
1. Sol menüden **"APIs & Services"** → **"Credentials"** tıklayın
2. "API keys" bölümünde key'inizi göreceksiniz
3. Key'in üzerine tıklayın

### Adım 2: Application Restrictions (Hangi Siteler?)

Sayfada **"Application restrictions"** başlığını bulun.

**3 seçenek göreceksiniz**:
```
○ None (Güvensiz - SEÇMEYİN!)
○ HTTP referrers (web sites) ← BU SEÇENEĞİ SEÇİN
○ IP addresses
○ Android apps
○ iOS apps
```

**"HTTP referrers (web sites)"** seçeneğini işaretleyin.

### Adım 3: Website Restrictions Ekle

"HTTP referrers" seçtikten sonra, altında bir kutu açılır:

```
┌─────────────────────────────────────────┐
│ Website restrictions                    │
├─────────────────────────────────────────┤
│ [+ ADD AN ITEM]                         │
└─────────────────────────────────────────┘
```

**"ADD AN ITEM"** butonuna tıklayın ve şunları TEK TEK ekleyin:

1. İlk item: `http://localhost:5173/*`
   - "ADD AN ITEM" tıkla
   - Kutuya `http://localhost:5173/*` yaz
   - Enter veya "DONE" tıkla

2. İkinci item: `http://localhost:3000/*`
   - "ADD AN ITEM" tıkla
   - Kutuya `http://localhost:3000/*` yaz
   - Enter veya "DONE" tıkla

3. Üçüncü item: `https://*.vercel.app/*`
   - "ADD AN ITEM" tıkla
   - Kutuya `https://*.vercel.app/*` yaz
   - Enter veya "DONE" tıkla

**Sonuç**:
```
┌─────────────────────────────────────────┐
│ Website restrictions                    │
├─────────────────────────────────────────┤
│ http://localhost:5173/*          [X]    │
│ http://localhost:3000/*          [X]    │
│ https://*.vercel.app/*           [X]    │
│ [+ ADD AN ITEM]                         │
└─────────────────────────────────────────┘
```

### Adım 4: API Restrictions (Hangi Servisler?)

Sayfayı aşağı kaydırın, **"API restrictions"** başlığını bulun.

**2 seçenek göreceksiniz**:
```
○ Don't restrict key (Güvensiz - SEÇMEYİN!)
○ Restrict key ← BU SEÇENEĞİ SEÇİN
```

**"Restrict key"** seçeneğini işaretleyin.

### Adım 5: API'leri Seç

"Restrict key" seçtikten sonra, altında bir dropdown açılır:

```
┌─────────────────────────────────────────┐
│ Select APIs                        [▼]  │
└─────────────────────────────────────────┘
```

Dropdown'a tıklayın ve şu 4 API'yi SEÇİN (checkbox işaretleyin):

- ✅ **Maps JavaScript API**
- ✅ **Places API**
- ✅ **Geocoding API**
- ✅ **Distance Matrix API**

**Diğer tüm API'lerin checkbox'ları BOŞ KALMALI!**

### Adım 6: Kaydet

Sayfanın en altında **"SAVE"** butonu var.

**"SAVE"** butonuna tıklayın.

✅ **Tamamlandı!** Key'iniz artık güvenli.

---

## 🧪 Test Et

Key'iniz çalışıyor mu test edin:

```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Mexico+City&key=YOUR_API_KEY"
```

**Başarılı response** almalısınız (JSON formatında adres bilgileri).

---

## ❓ Sık Sorulan Sorular

### `/*` ne anlama geliyor?

`/*` = "Bu domain'deki TÜM sayfalar" demek.

**Örnekler**:
- `http://localhost:5173/*` → localhost:5173/home, localhost:5173/map, localhost:5173/about... HEPSİ
- `https://*.vercel.app/*` → your-app.vercel.app, test-app.vercel.app... TÜM Vercel uygulamaları

### `*` (yıldız) ne anlama geliyor?

`*` = "Herhangi bir şey" demek.

**Örnekler**:
- `https://*.vercel.app/*` → `your-app.vercel.app`, `my-app.vercel.app`, `test.vercel.app`... HEPSİ

### Neden localhost ekliyoruz?

Bilgisayarınızda test ederken (local development) key'in çalışması için.

### Neden Vercel ekliyoruz?

Canlı siteniz Vercel'de olacak, orada da key'in çalışması için.

### Deployment sonrası ne yapmalıyım?

Vercel'e deploy ettikten sonra gerçek URL'inizi alacaksınız (örn: `https://technician-platform.vercel.app`).

O zaman:
1. Google Cloud Console → Credentials → Key'e tıkla
2. Website restrictions'a gerçek URL'inizi ekleyin:
   ```
   https://technician-platform.vercel.app/*
   ```
3. "SAVE" tıklayın

---

## ✅ Özet

**HTTP Referrers**: Hangi web sitelerinden kullanılabilir?
- Localhost (test için)
- Vercel (canlı site için)

**API Restrictions**: Hangi Google servisleri kullanılabilir?
- Sadece 4 harita API'si
- Başka hiçbir Google servisi değil

**Sonuç**: Key'iniz güvenli! 🔒

---

**Hala kafanız karıştı mı?**

Şunu söyleyin:
- Hangi adımda takıldınız?
- Ekranda ne görüyorsunuz?

Yardımcı olayım!

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024
