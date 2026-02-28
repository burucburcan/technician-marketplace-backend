# 🔔 Stripe Webhook Secret Alma Rehberi

## Webhook Nedir?

Webhook, Stripe'ın ödeme durumu değiştiğinde (başarılı, başarısız, iade vb.) backend'inize bildirim göndermesi için kullanılır.

---

## 📝 Adım Adım Webhook Secret Alma

### Adım 1: Stripe Dashboard'a Git

1. **Stripe Dashboard**: https://dashboard.stripe.com
2. **Test mode** aktif olduğundan emin olun (sağ üstte toggle)

### Adım 2: Webhooks Sayfasına Git

1. Sol menüden **"Developers"** tıklayın
2. **"Webhooks"** sekmesine tıklayın

### Adım 3: Endpoint Ekle

1. **"Add endpoint"** veya **"+ Add an endpoint"** butonuna tıklayın

### Adım 4: Endpoint Bilgilerini Gir

Şimdi bir form göreceksiniz:

```
┌─────────────────────────────────────────┐
│ Add endpoint                            │
├─────────────────────────────────────────┤
│ Endpoint URL *                          │
│ [https://example.com/webhook      ]     │
│                                         │
│ Description (optional)                  │
│ [                                 ]     │
│                                         │
│ Events to send                          │
│ [Select events...                 ▼]    │
└─────────────────────────────────────────┘
```

#### 4.1 Endpoint URL

**ŞİMDİLİK** placeholder URL kullanın (Railway'e deploy ettikten sonra güncelleyeceğiz):

```
https://example.com/api/v1/payments/webhook
```

**Neden placeholder?** Çünkü henüz Railway URL'iniz yok. Backend deploy ettikten sonra gerçek URL'i buraya güncelleyeceğiz.

#### 4.2 Description (Opsiyonel)

```
Technician Platform Payments
```

#### 4.3 Events to Send

**"Select events"** veya **"Select events to listen to"** tıklayın.

Açılan listeden şu 3 event'i seçin:

- ✅ **payment_intent.succeeded** (Ödeme başarılı)
- ✅ **payment_intent.payment_failed** (Ödeme başarısız)
- ✅ **charge.refunded** (İade yapıldı)

**Nasıl bulunur?**
- Arama kutusuna "payment_intent" yazın
- `payment_intent.succeeded` ve `payment_intent.payment_failed` checkbox'larını işaretleyin
- Arama kutusuna "charge" yazın
- `charge.refunded` checkbox'ını işaretleyin

### Adım 5: Endpoint'i Oluştur

**"Add endpoint"** butonuna tıklayın.

### Adım 6: Webhook Secret'i Kopyala

Endpoint oluşturulduktan sonra, endpoint detay sayfasına yönlendirileceksiniz.

Sayfada **"Signing secret"** bölümünü bulun:

```
┌─────────────────────────────────────────┐
│ Signing secret                          │
├─────────────────────────────────────────┤
│ whsec_••••••••••••••••••••••••••••      │
│ [Reveal]  [Copy]                        │
└─────────────────────────────────────────┘
```

1. **"Reveal"** butonuna tıklayın
2. Secret görünecek: `whsec_1Abc...xyz`
3. **"Copy"** butonuna tıklayın veya manuel kopyalayın
4. **Kaydedin**: Bir yere not edin

---

## ✅ Webhook Secret Aldınız!

Şimdi elinizde webhook secret var:

```bash
STRIPE_WEBHOOK_SECRET=whsec_1Abc...xyz
```

Bu secret'i `DEPLOYMENT_ENV_TEMPLATE.md` dosyasına ekleyin.

---

## 🔄 Deployment Sonrası Yapılacaklar

Railway'e backend deploy ettikten sonra:

### 1. Railway URL'ini Alın

Railway'den backend URL'inizi alacaksınız:
```
https://your-app-name.up.railway.app
```

### 2. Stripe Webhook URL'ini Güncelleyin

1. **Stripe Dashboard** → Developers → Webhooks
2. Oluşturduğunuz endpoint'e tıklayın
3. **"..."** menü (sağ üstte) → **"Update details"** tıklayın
4. **Endpoint URL'i güncelleyin**:
   ```
   https://your-app-name.up.railway.app/api/v1/payments/webhook
   ```
5. **"Update endpoint"** tıklayın

### 3. Webhook'u Test Edin

1. Stripe Dashboard → Developers → Webhooks
2. Endpoint'e tıklayın
3. **"Send test webhook"** butonuna tıklayın
4. **"payment_intent.succeeded"** seçin
5. **"Send test webhook"** tıklayın
6. Railway loglarında webhook'un geldiğini görmelisiniz

---

## 🐛 Sorun Giderme

### "Add endpoint" Butonu Yok

**Çözüm**: 
- Sayfayı yenileyin (F5)
- Test mode aktif mi kontrol edin
- Farklı tarayıcı deneyin

### Webhook Secret Görünmüyor

**Çözüm**:
- Endpoint'e tıklayın (webhooks listesinden)
- "Signing secret" bölümünü bulun
- "Reveal" butonuna tıklayın

### Endpoint Oluşturamıyorum

**Çözüm**:
- Placeholder URL kullanın: `https://example.com/webhook`
- Event'leri seçmeyi unutmayın
- Test mode'da olduğunuzdan emin olun

---

## 📋 Özet

1. Stripe Dashboard → Developers → Webhooks
2. "Add endpoint" tıkla
3. URL: `https://example.com/api/v1/payments/webhook` (şimdilik)
4. Events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
5. "Add endpoint" tıkla
6. "Signing secret" → "Reveal" → Kopyala
7. `DEPLOYMENT_ENV_TEMPLATE.md` dosyasına ekle

---

**Webhook secret'i aldınız mı?**

Aldıysanız, `DEPLOYMENT_ENV_TEMPLATE.md` dosyasına ekleyin ve deployment'a geçelim!

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024
