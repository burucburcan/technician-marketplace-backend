# 🔑 API Keys Kurulum Rehberi
## Teknisyen Bulma Platformu - Gerekli API Key'leri

**Tarih**: 2024  
**Süre**: ~30 dakika (tüm servisler için)  
**Maliyet**: Tümü ücretsiz test/başlangıç tier'ı

---

## 📋 Gerekli API Key'ler

### Zorunlu (Platform çalışması için gerekli)
1. ✅ **Stripe** - Ödeme işlemleri
2. ✅ **Google Maps** - Konum servisleri
3. ✅ **JWT Secrets** - Authentication (kendiniz oluşturacaksınız)

### Opsiyonel (Başlangıçta mock/test mode ile çalışabilir)
4. 🔶 **SendGrid** - Email gönderimi
5. 🔶 **Twilio** - SMS gönderimi
6. 🔶 **AWS S3** - Dosya depolama (başlangıçta local storage kullanılabilir)

---

## 1️⃣ Stripe API Keys (Zorunlu - 5 dakika)

### Neden Gerekli?
- Ödeme işlemleri (kredi kartı, banka kartı)
- Abonelik yönetimi
- Ödeme geçmişi

### Adımlar

1. **Hesap Oluştur**: https://dashboard.stripe.com/register
   - Email ile kayıt ol
   - Email'i doğrula

2. **Test Mode'a Geç**:
   - Dashboard'da sağ üstte "Test mode" toggle'ını aktif et
   - Test mode'da gerçek para hareket etmez

3. **API Keys Al**:
   - Sol menüden "Developers" → "API keys" tıkla
   - İki key göreceksiniz:
     - **Publishable key** (pk_test_...): Frontend için
     - **Secret key** (sk_test_...): Backend için
   - "Reveal test key" tıklayarak secret key'i göster
   - Her iki key'i de kopyala ve kaydet

4. **Webhook Secret Al** (Ödeme bildirimleri için):
   - "Developers" → "Webhooks" tıkla
   - "Add endpoint" tıkla
   - Endpoint URL: `https://your-backend-url.railway.app/api/v1/payments/webhook`
   - Events to send: Şunları seç:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - "Add endpoint" tıkla
   - Webhook signing secret'i kopyala (whsec_...)

### Kaydetmeniz Gerekenler

```bash
# Frontend için (.env)
VITE_STRIPE_PUBLIC_KEY=pk_test_51Abc...xyz

# Backend için (.env)
STRIPE_SECRET_KEY=sk_test_51Abc...xyz
STRIPE_WEBHOOK_SECRET=whsec_1Abc...xyz
```

### Test Kartları

Stripe test mode'da bu kartları kullanabilirsiniz:
- **Başarılı ödeme**: 4242 4242 4242 4242
- **Başarısız ödeme**: 4000 0000 0000 0002
- **3D Secure gerekli**: 4000 0027 6000 3184
- CVV: Herhangi 3 rakam (örn: 123)
- Tarih: Gelecekte herhangi bir tarih (örn: 12/25)

---

## 2️⃣ Google Maps API Key (Zorunlu - 8 dakika)

### Neden Gerekli?
- Profesyonel konum gösterimi
- Adres arama ve otomatik tamamlama
- Mesafe hesaplama
- Harita görüntüleme

### Adımlar

1. **Google Cloud Console'a Git**: https://console.cloud.google.com
   - Google hesabınızla giriş yapın

2. **Yeni Proje Oluştur**:
   - Üst menüden "Select a project" → "New Project" tıkla
   - Project name: `technician-platform`
   - "Create" tıkla

3. **Billing Aktif Et** (Zorunlu ama ücretsiz tier var):
   - Sol menüden "Billing" tıkla
   - "Link a billing account" tıkla
   - Kredi kartı bilgilerini gir
   - **Not**: İlk $200 ücretsiz, sonra kullandıkça öde
   - Aylık ~$100'a kadar kullanım genelde ücretsiz kalır

4. **APIs Aktif Et**:
   - Sol menüden "APIs & Services" → "Library" tıkla
   - Şu API'leri ara ve aktif et:
     - ✅ **Maps JavaScript API**
     - ✅ **Places API**
     - ✅ **Geocoding API**
     - ✅ **Distance Matrix API**
   - Her biri için "Enable" tıkla

5. **API Key Oluştur**:
   - "APIs & Services" → "Credentials" tıkla
   - "Create Credentials" → "API key" seç
   - API key oluşturuldu! Kopyala ve kaydet

6. **API Key'i Güvenli Hale Getir** (Önemli!):
   - Oluşturulan key'in yanındaki "Edit" tıkla
   - "Application restrictions":
     - "HTTP referrers (web sites)" seç
     - Website restrictions ekle:
       - `https://your-app.vercel.app/*`
       - `http://localhost:5173/*` (local test için)
   - "API restrictions":
     - "Restrict key" seç
     - Sadece şunları seç:
       - Maps JavaScript API
       - Places API
       - Geocoding API
       - Distance Matrix API
   - "Save" tıkla

### Kaydetmeniz Gerekenler

```bash
# Frontend için (.env)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAbc...xyz

# Backend için (.env)
GOOGLE_MAPS_API_KEY=AIzaSyAbc...xyz
```

### Test Etme

API key'i test etmek için:
```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Mexico+City&key=YOUR_API_KEY"
```

Başarılı response almalısınız.

---

## 3️⃣ JWT Secrets (Zorunlu - 2 dakika)

### Neden Gerekli?
- Kullanıcı authentication
- Token güvenliği
- Session yönetimi

### Adımlar

JWT secret'ları kendiniz oluşturmalısınız. Güçlü, rastgele string'ler olmalı.

**Yöntem 1: Node.js ile oluştur**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Yöntem 2: OpenSSL ile oluştur**
```bash
openssl rand -hex 32
```

**Yöntem 3: Online generator**
- https://randomkeygen.com/
- "CodeIgniter Encryption Keys" bölümünden 256-bit key seç

### Kaydetmeniz Gerekenler

```bash
# Backend için (.env)
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_REFRESH_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d
```

**Önemli**: Her environment için farklı secret'lar kullanın!

---

## 4️⃣ SendGrid API Key (Opsiyonel - 5 dakika)

### Neden Gerekli?
- Hoşgeldin email'leri
- Şifre sıfırlama email'leri
- Rezervasyon onay email'leri
- Bildirim email'leri

### Başlangıçta Atlanabilir mi?
✅ Evet! Email gönderimi olmadan da platform çalışır. Console'a log yazılır.

### Adımlar (İsterseniz)

1. **Hesap Oluştur**: https://signup.sendgrid.com
   - Email ile kayıt ol
   - Email'i doğrula

2. **Free Plan Seç**:
   - 100 email/gün ücretsiz
   - Kredi kartı gerekmez

3. **Sender Identity Oluştur**:
   - "Settings" → "Sender Authentication" tıkla
   - "Verify a Single Sender" seç
   - Email adresinizi girin
   - Doğrulama email'ini onaylayın

4. **API Key Oluştur**:
   - "Settings" → "API Keys" tıkla
   - "Create API Key" tıkla
   - Name: `technician-platform`
   - Permissions: "Full Access" seç
   - "Create & View" tıkla
   - API key'i kopyala (bir daha gösterilmez!)

### Kaydetmeniz Gerekenler

```bash
# Backend için (.env)
SENDGRID_API_KEY=SG.Abc123...xyz
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Technician Platform
```

---

## 5️⃣ Twilio API (Opsiyonel - 5 dakika)

### Neden Gerekli?
- SMS bildirimleri
- Telefon doğrulama (2FA)
- Rezervasyon hatırlatmaları

### Başlangıçta Atlanabilir mi?
✅ Evet! SMS olmadan da platform çalışır. Console'a log yazılır.

### Adımlar (İsterseniz)

1. **Hesap Oluştur**: https://www.twilio.com/try-twilio
   - Email ile kayıt ol
   - Telefon numaranızı doğrulayın

2. **Free Trial**:
   - $15 ücretsiz kredi
   - Sadece doğrulanmış numaralara SMS gönderebilirsiniz

3. **Credentials Al**:
   - Dashboard'da göreceksiniz:
     - **Account SID**: AC...
     - **Auth Token**: (Show butonuna tıklayın)

4. **Telefon Numarası Al**:
   - "Phone Numbers" → "Manage" → "Buy a number" tıkla
   - Ülke seçin (örn: US)
   - SMS capability olan bir numara seçin
   - "Buy" tıkla (ücretsiz krediden düşer)

### Kaydetmeniz Gerekenler

```bash
# Backend için (.env)
TWILIO_ACCOUNT_SID=AC1234567890abcdef
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

---

## 6️⃣ AWS S3 (Opsiyonel - 10 dakika)

### Neden Gerekli?
- Profil fotoğrafları
- Portfolyo görselleri
- Ürün resimleri
- Sertifika dosyaları

### Başlangıçta Atlanabilir mi?
✅ Evet! Başlangıçta local file system kullanılabilir veya Vercel/Railway'in file storage'ı.

### Adımlar (İsterseniz)

1. **AWS Hesabı Oluştur**: https://aws.amazon.com
   - Email ve kredi kartı gerekli
   - İlk 12 ay free tier

2. **S3 Bucket Oluştur**:
   - AWS Console → S3 → "Create bucket"
   - Bucket name: `technician-platform-files`
   - Region: `us-east-1` (veya yakın)
   - "Block all public access" kapalı (görseller public olmalı)
   - "Create bucket" tıkla

3. **IAM User Oluştur**:
   - AWS Console → IAM → "Users" → "Add user"
   - User name: `technician-platform-app`
   - Access type: "Programmatic access"
   - Permissions: "Attach existing policies directly"
   - Policy: `AmazonS3FullAccess` seç
   - "Create user" tıkla
   - **Access Key ID** ve **Secret Access Key** kopyala

4. **Bucket Policy Ekle** (Public read için):
   - S3 bucket'a git → "Permissions" → "Bucket Policy"
   - Şu policy'yi ekle:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::technician-platform-files/*"
    }
  ]
}
```

### Kaydetmeniz Gerekenler

```bash
# Backend için (.env)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=technician-platform-files
```

---

## 📝 Tüm Environment Variables Özeti

### Backend (.env veya Railway Variables)

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
REDIS_URL=redis://default:[TOKEN]@[ENDPOINT]:6379
MONGODB_URI=mongodb+srv://admin:[PASSWORD]@cluster.mongodb.net/technician_platform

# JWT (Kendiniz oluşturun)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-characters
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGIN=https://your-app.vercel.app

# Stripe (Zorunlu)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Google Maps (Zorunlu)
GOOGLE_MAPS_API_KEY=AIzaSyAbc...xyz

# SendGrid (Opsiyonel)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Technician Platform

# Twilio (Opsiyonel)
TWILIO_ACCOUNT_SID=AC1234567890abcdef
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# AWS S3 (Opsiyonel)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET=technician-platform-files

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

### Frontend (.env veya Vercel Variables)

```bash
# API
VITE_API_URL=https://your-app.up.railway.app/api/v1

# Stripe (Zorunlu)
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key

# Google Maps (Zorunlu)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyAbc...xyz
```

---

## ✅ Kontrol Listesi

Deployment öncesi bu listeyi kontrol edin:

### Zorunlu (Platform çalışmaz)
- [ ] Stripe test keys alındı (pk_test_... ve sk_test_...)
- [ ] Stripe webhook secret alındı (whsec_...)
- [ ] Google Maps API key alındı ve kısıtlamalar eklendi
- [ ] JWT secret'ları oluşturuldu (2 adet, 32+ karakter)
- [ ] Database connection string'leri hazır (PostgreSQL, Redis, MongoDB)

### Opsiyonel (Başlangıçta atlanabilir)
- [ ] SendGrid API key alındı (email için)
- [ ] Twilio credentials alındı (SMS için)
- [ ] AWS S3 bucket oluşturuldu (dosya depolama için)

---

## 🎯 Sonraki Adım

Tüm zorunlu API key'leri aldıktan sonra:

1. **QUICK_DEPLOYMENT_GUIDE.md** dosyasını açın
2. Environment variables bölümüne aldığınız key'leri yapıştırın
3. Deployment adımlarını takip edin

---

## 💰 Maliyet Özeti

### Ücretsiz Tier Limitleri

| Servis | Ücretsiz Limit | Sonrası Maliyet |
|--------|----------------|-----------------|
| **Stripe** | Sınırsız test işlem | Production: %2.9 + $0.30/işlem |
| **Google Maps** | $200/ay kredi | Kullandıkça öde (~$7/1000 istek) |
| **SendGrid** | 100 email/gün | $15/ay (40,000 email) |
| **Twilio** | $15 trial kredi | $0.0075/SMS |
| **AWS S3** | 5 GB depolama (12 ay) | $0.023/GB/ay |

### Tahmini Aylık Maliyet (İlk 6 Ay)

- **Minimum**: $0/ay (sadece test mode, düşük trafik)
- **Orta**: $20-50/ay (production, orta trafik)
- **Yüksek**: $100-200/ay (yüksek trafik, çok kullanıcı)

---

## 🐛 Sorun Giderme

### Stripe Test Mode Çalışmıyor

**Kontrol**:
- Test mode aktif mi? (Dashboard'da toggle)
- Test kartı kullanıyor musunuz? (4242 4242 4242 4242)
- Webhook endpoint doğru mu?

### Google Maps Harita Görünmüyor

**Kontrol**:
- API key kısıtlamaları doğru mu?
- Billing aktif mi?
- Tüm gerekli API'ler enable mi?
- Console'da hata var mı?

### SendGrid Email Gönderilmiyor

**Kontrol**:
- Sender email doğrulandı mı?
- API key full access mi?
- Spam klasörünü kontrol edin

---

## 📚 Faydalı Linkler

- **Stripe Docs**: https://stripe.com/docs
- **Google Maps Docs**: https://developers.google.com/maps/documentation
- **SendGrid Docs**: https://docs.sendgrid.com
- **Twilio Docs**: https://www.twilio.com/docs
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024  
**Güncelleme**: API key'leri alındıkça bu dosyayı güncelleyin
