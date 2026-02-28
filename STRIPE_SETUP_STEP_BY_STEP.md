# 💳 Stripe API Keys - Adım Adım Kurulum
## Teknisyen Bulma Platformu

**Süre**: ~5 dakika  
**Maliyet**: Ücretsiz (test mode)

---

## 🎯 Ne Alacağız?

1. **Publishable Key** (pk_test_...) - Frontend için
2. **Secret Key** (sk_test_...) - Backend için
3. **Webhook Secret** (whsec_...) - Ödeme bildirimleri için

---

## 📝 Adım 1: Stripe Hesabı Oluştur (2 dakika)

### 1.1 Kayıt Ol

1. **Stripe'a Git**: https://dashboard.stripe.com/register
2. **Bilgileri Gir**:
   - Email adresiniz
   - İsminiz
   - Ülke: Mexico seçin
   - Şifre oluşturun
3. **"Create account"** tıklayın
4. **Email Doğrulama**: 
   - Email'inize gelen linke tıklayın
   - Hesabınız aktif olacak

### 1.2 Dashboard'a Giriş

- Otomatik olarak Stripe Dashboard'a yönlendirileceksiniz
- Sağ üstte **"Test mode"** toggle'ının AÇIK olduğundan emin olun
- Test mode'da gerçek para hareket etmez ✅

---

## 🔑 Adım 2: API Keys Al (1 dakika)

### 2.1 API Keys Sayfasına Git

1. Sol menüden **"Developers"** tıklayın
2. **"API keys"** sekmesine tıklayın
3. İki key göreceksiniz:


### 2.2 Publishable Key (Frontend için)

- **Görünür**: `pk_test_51Abc...xyz` (zaten görünür)
- **Kopyala**: Yanındaki copy ikonuna tıklayın
- **Kaydet**: Bir yere not edin

```bash
# Frontend için
VITE_STRIPE_PUBLIC_KEY=pk_test_51Abc...xyz
```

### 2.3 Secret Key (Backend için)

- **Gizli**: `sk_test_••••••••••••••••` (gizli görünür)
- **Göster**: "Reveal test key" butonuna tıklayın
- **Kopyala**: Key'i kopyalayın
- **Kaydet**: Bir yere not edin

```bash
# Backend için
STRIPE_SECRET_KEY=sk_test_51Abc...xyz
```

⚠️ **ÖNEMLİ**: Secret key'i asla frontend'de kullanmayın veya Git'e commit etmeyin!

---

## 🔔 Adım 3: Webhook Secret Al (2 dakika)

Webhook'lar ödeme durumu değişikliklerini backend'inize bildirir.

### 3.1 Webhooks Sayfasına Git

1. Sol menüden **"Developers"** tıklayın
2. **"Webhooks"** sekmesine tıklayın
3. **"Add endpoint"** butonuna tıklayın

### 3.2 Endpoint Ekle

**Şimdilik placeholder URL kullanacağız** (deployment sonrası güncelleyeceğiz):

1. **Endpoint URL**: 
   ```
   https://example.com/api/v1/payments/webhook
   ```
   (Railway deployment sonrası gerçek URL'i güncelleyeceğiz)

2. **Description**: `Technician Platform Payments`

3. **Events to send**: "Select events" tıklayın ve şunları seçin:
   - ✅ `payment_intent.succeeded` (Ödeme başarılı)
   - ✅ `payment_intent.payment_failed` (Ödeme başarısız)
   - ✅ `charge.refunded` (İade yapıldı)

4. **"Add endpoint"** tıklayın

### 3.3 Webhook Secret'i Kopyala

1. Oluşturulan endpoint'e tıklayın
2. **"Signing secret"** bölümünü bulun
3. **"Reveal"** tıklayın
4. Secret'i kopyalayın: `whsec_...`
5. Kaydedin:

```bash
# Backend için
STRIPE_WEBHOOK_SECRET=whsec_1Abc...xyz
```

---

## ✅ Tamamlandı! Aldığınız Key'ler

Şimdi elinizde 3 key olmalı:

```bash
# Frontend için (.env veya Vercel)
VITE_STRIPE_PUBLIC_KEY=pk_test_51Abc...xyz

# Backend için (.env veya Railway)
STRIPE_SECRET_KEY=sk_test_51Abc...xyz
STRIPE_WEBHOOK_SECRET=whsec_1Abc...xyz
```

Bu key'leri `STRIPE_KEYS.txt` dosyasına kaydedin (güvenli bir yerde saklayın).

---

## 🧪 Test Kartları

Stripe test mode'da bu kartları kullanabilirsiniz:

### Başarılı Ödeme
```
Kart Numarası: 4242 4242 4242 4242
CVV: 123 (herhangi 3 rakam)
Tarih: 12/25 (gelecekte herhangi bir tarih)
```

### Başarısız Ödeme
```
Kart Numarası: 4000 0000 0000 0002
CVV: 123
Tarih: 12/25
```

### 3D Secure Gerekli
```
Kart Numarası: 4000 0027 6000 3184
CVV: 123
Tarih: 12/25
```

---

## 🔄 Deployment Sonrası Yapılacaklar

Railway'e backend deploy ettikten sonra:

1. **Webhook URL'i Güncelle**:
   - Stripe Dashboard → Developers → Webhooks
   - Endpoint'e tıkla
   - "..." menü → "Update details"
   - URL'i güncelle: `https://your-app.up.railway.app/api/v1/payments/webhook`
   - "Update endpoint" tıkla

2. **Test Et**:
   - Stripe Dashboard → Developers → Webhooks
   - Endpoint'e tıkla
   - "Send test webhook" tıkla
   - `payment_intent.succeeded` seç
   - Backend loglarında webhook'u görmeli

---

## 🎯 Sıradaki Adım

Stripe key'leri aldınız! ✅

Şimdi:

**a) Google Maps API Key Al** (~8 dakika)
- Konum servisleri için gerekli
- `API_KEYS_SETUP_GUIDE.md` dosyasındaki "2️⃣ Google Maps API Key" bölümünü takip edin

**b) Deployment'a Geç**
- Stripe ✅ ve JWT ✅ hazır
- Google Maps'i daha sonra ekleyebilirsiniz (mock mode çalışır)

Hangisini yapmak istersiniz?

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024
