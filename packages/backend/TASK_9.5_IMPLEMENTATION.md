# Task 9.5: Bildirim Tercihleri Sistemini Uygula

## Genel Bakış
Bu görev, kullanıcıların bildirim tercihlerini yönetmeleri için REST API endpoint'lerini ve altyapıyı oluşturur. Kullanıcılar hem bildirim kanallarını (email, SMS, push) hem de bildirim tiplerini (rezervasyon oluşturma, onay, iptal vb.) yönetebilirler.

## Uygulanan Özellikler

### 1. Bildirim Tercihleri Veri Modeli

**UserProfile Entity Güncellemesi:**
```typescript
preferences: {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  currency: string;
  notificationTypes?: Record<string, boolean>;
}
```

**Özellikler:**
- Kanal bazlı tercihler (email, SMS, push)
- Bildirim tipi bazlı tercihler (opsiyonel)
- Geriye dönük uyumluluk (notificationTypes opsiyonel)

### 2. DTO (Data Transfer Object)

**UpdateNotificationPreferencesDto:**
```typescript
{
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  notificationTypes?: {
    [NotificationType.BOOKING_CREATED]?: boolean;
    [NotificationType.BOOKING_CONFIRMED]?: boolean;
    // ... diğer bildirim tipleri
  };
}
```

**Validasyon:**
- Boolean değerler için tip kontrolü
- Nested object validasyonu
- Tüm alanlar opsiyonel (partial update desteği)

### 3. Service Metodları

#### updateNotificationPreferences()
Kullanıcının bildirim tercihlerini günceller.

**Özellikler:**
- Partial update desteği (sadece gönderilen alanlar güncellenir)
- Mevcut tercihleri korur
- notificationTypes için merge stratejisi
- 404 hatası (profil bulunamazsa)

**Parametreler:**
- `userId`: Kullanıcı ID'si
- `preferences`: Güncellenecek tercihler (partial)

**Dönüş:** Güncellenmiş UserProfile

#### getNotificationPreferences()
Kullanıcının mevcut bildirim tercihlerini getirir.

**Parametreler:**
- `userId`: Kullanıcı ID'si

**Dönüş:** UserProfile preferences objesi

#### sendNotification() - Güncelleme
Bildirim gönderme metoduna tip bazlı tercih kontrolü eklendi.

**Yeni Davranış:**
- Bildirim gönderilmeden önce kullanıcının tip tercihlerini kontrol eder
- Eğer kullanıcı belirli bir bildirim tipini devre dışı bırakmışsa, bildirim gönderilmez
- Devre dışı bırakılan bildirimler veritabanına kaydedilmez
- Varsayılan davranış: Tercih belirtilmemişse bildirim gönderilir

### 4. API Endpoints

#### PUT /notifications/preferences
Kullanıcının bildirim tercihlerini günceller.

**Request Body:**
```json
{
  "emailNotifications": false,
  "smsNotifications": true,
  "pushNotifications": false,
  "notificationTypes": {
    "booking_created": false,
    "booking_confirmed": true,
    "new_message": true
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "preferences": {
    "emailNotifications": false,
    "smsNotifications": true,
    "pushNotifications": false,
    "currency": "MXN",
    "notificationTypes": {
      "booking_created": false,
      "booking_confirmed": true,
      "new_message": true
    }
  }
}
```

**Özellikler:**
- Partial update (sadece gönderilen alanlar güncellenir)
- Mevcut tercihleri korur
- Kimlik doğrulama gerektirir
- 404 döndürür (profil bulunamazsa)
- 400 döndürür (geçersiz veri)

#### GET /notifications/preferences
Kullanıcının mevcut bildirim tercihlerini getirir.

**Response:**
```json
{
  "emailNotifications": true,
  "smsNotifications": true,
  "pushNotifications": true,
  "currency": "MXN",
  "notificationTypes": {
    "booking_created": false,
    "new_message": true
  }
}
```

**Özellikler:**
- Kimlik doğrulama gerektirir
- 404 döndürür (profil bulunamazsa)

## Güvenlik

### Kimlik Doğrulama
Tüm endpoint'ler `JwtAuthGuard` ile korunmaktadır:
```typescript
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  // ...
}
```

### Yetkilendirme
- Her endpoint sadece kimliği doğrulanmış kullanıcının kendi tercihlerine erişim sağlar
- `req.user.userId` kullanılarak kullanıcı kimliği doğrulanır
- Başka kullanıcıların tercihlerine erişim engellenir

## Test Kapsamı

### Integration Tests (notification-preferences.integration.spec.ts)

#### PUT /notifications/preferences Tests
1. ✅ Email bildirim tercihini güncelleme
2. ✅ SMS bildirim tercihini güncelleme
3. ✅ Push bildirim tercihini güncelleme
4. ✅ Birden fazla kanal tercihini aynı anda güncelleme
5. ✅ Bildirim tipi tercihlerini güncelleme
6. ✅ Hem kanal hem tip tercihlerini güncelleme
7. ✅ Mevcut tip tercihlerini koruma (merge)
8. ✅ Kimlik doğrulama gerekliliği
9. ✅ Boolean değer validasyonu
10. ✅ Profil bulunamadığında 404 döndürme

#### GET /notifications/preferences Tests
1. ✅ Mevcut bildirim tercihlerini getirme
2. ✅ Güncelleme sonrası tercihleri getirme
3. ✅ Kimlik doğrulama gerekliliği
4. ✅ Profil bulunamadığında 404 döndürme

#### Requirement 10.6 Validation Tests
1. ✅ Kullanıcıların bildirim tercihlerini yönetme imkanı
2. ✅ Tercihlerin kalıcı olarak saklanması
3. ✅ Bildirim tipi tercihlerinin bildirim gönderiminde uygulanması
4. ✅ Devre dışı bırakılan bildirimlerin gönderilmemesi
5. ✅ Etkinleştirilen bildirimlerin gönderilmesi
6. ✅ Varsayılan davranış (tercih belirtilmemişse gönder)

## Kullanım Senaryoları

### Senaryo 1: Tüm Email Bildirimlerini Kapatma
```bash
curl -X PUT http://localhost:3000/notifications/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"emailNotifications": false}'
```

### Senaryo 2: Sadece Rezervasyon Bildirimlerini Alma
```bash
curl -X PUT http://localhost:3000/notifications/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationTypes": {
      "booking_created": true,
      "booking_confirmed": true,
      "booking_cancelled": true,
      "new_message": false,
      "new_rating": false
    }
  }'
```

### Senaryo 3: Sadece Önemli Bildirimleri SMS ile Alma
```bash
curl -X PUT http://localhost:3000/notifications/preferences \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "emailNotifications": true,
    "smsNotifications": true,
    "pushNotifications": false,
    "notificationTypes": {
      "booking_confirmed": true,
      "booking_cancelled": true,
      "booking_reminder": true
    }
  }'
```

### Senaryo 4: Mevcut Tercihleri Görüntüleme
```bash
curl -X GET http://localhost:3000/notifications/preferences \
  -H "Authorization: Bearer <token>"
```

## Teknik Detaylar

### Veri Akışı

1. **Tercih Güncelleme:**
   ```
   Client → Controller → Service → UserProfile Repository → Database
   ```

2. **Bildirim Gönderimi:**
   ```
   Event → NotificationService.sendNotification()
   ↓
   UserProfile tercihlerini kontrol et
   ↓
   Tip tercihi devre dışı mı?
   ├─ Evet → Bildirim gönderme, log yaz
   └─ Hayır → Bildirim oluştur ve gönder
   ```

### Merge Stratejisi

Bildirim tipi tercihleri güncellenirken mevcut tercihler korunur:

```typescript
profile.preferences.notificationTypes = {
  ...profile.preferences.notificationTypes,  // Mevcut tercihler
  ...preferences.notificationTypes,          // Yeni tercihler
};
```

Bu sayede kullanıcı sadece belirli bir bildirim tipini güncelleyebilir, diğerleri etkilenmez.

### Varsayılan Davranış

- Yeni kullanıcılar için tüm kanallar etkin (emailNotifications: true, smsNotifications: true, pushNotifications: true)
- notificationTypes belirtilmemişse tüm bildirim tipleri gönderilir
- Sadece açıkça `false` olarak işaretlenen tipler engellenir

## Gereksinim Validasyonu

### Requirement 10.6
**"THE Platform SHALL kullanıcılara bildirim tercihlerini yönetme imkanı sunmalıdır"**

✅ **Karşılandı:**
- PUT /notifications/preferences endpoint'i ile tercih güncelleme
- GET /notifications/preferences endpoint'i ile tercih görüntüleme
- Kanal bazlı tercihler (email, SMS, push)
- Bildirim tipi bazlı tercihler
- Tercihlerin kalıcı olarak saklanması
- Tercihlerin bildirim gönderiminde uygulanması

## Mevcut Dosyalar

### Controller
- `packages/backend/src/modules/notification/notification.controller.ts`
  - PUT /notifications/preferences endpoint'i
  - GET /notifications/preferences endpoint'i
  - JwtAuthGuard ile korunmuş

### Service
- `packages/backend/src/modules/notification/notification.service.ts`
  - `updateNotificationPreferences()`: Tercihleri güncelle
  - `getNotificationPreferences()`: Tercihleri getir
  - `sendNotification()`: Tip tercihlerini kontrol et (güncellendi)

### DTO
- `packages/backend/src/modules/notification/dto/update-notification-preferences.dto.ts`
  - UpdateNotificationPreferencesDto
  - NotificationTypePreferences
  - Validasyon kuralları

### Entity
- `packages/backend/src/entities/user-profile.entity.ts`
  - preferences.notificationTypes alanı eklendi

### Tests
- `packages/backend/src/modules/notification/notification-preferences.integration.spec.ts`
  - 18 integration test
  - Requirement 10.6 validasyon testleri

## Test Çalıştırma

```bash
# Backend dizinine git
cd packages/backend

# Integration testleri çalıştır
npm test -- notification-preferences.integration.spec.ts --run

# Tüm notification testlerini çalıştır
npm test -- notification --run

# Test coverage
npm run test:cov
```

## Sonraki Adımlar

1. ✅ Task 9.5 tamamlandı
2. Task 10: Checkpoint - Rezervasyon ve bildirim testlerini çalıştır
3. Frontend entegrasyonu için bildirim tercihleri UI'ı
4. Push notification desteği (Firebase Cloud Messaging) eklenebilir
5. Bildirim tercihleri için admin paneli (kullanıcı adına tercih yönetimi)

## Notlar

- Tüm endpoint'ler RESTful prensiplere uygun
- Partial update desteği ile kullanıcı deneyimi iyileştirildi
- Merge stratejisi ile mevcut tercihler korunuyor
- Varsayılan davranış kullanıcı dostu (opt-out yaklaşımı)
- Geriye dönük uyumluluk sağlandı (notificationTypes opsiyonel)
- Bildirim gönderimi sırasında performans optimizasyonu (sadece gerekli kontroller)

## API Dokümantasyonu

### Bildirim Tipi Enum Değerleri

```typescript
enum NotificationType {
  // Rezervasyon bildirimleri
  BOOKING_CREATED = 'booking_created',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_REJECTED = 'booking_rejected',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_STARTED = 'booking_started',
  BOOKING_COMPLETED = 'booking_completed',

  // Mesajlaşma bildirimleri
  NEW_MESSAGE = 'new_message',

  // Değerlendirme bildirimleri
  NEW_RATING = 'new_rating',

  // Ödeme bildirimleri
  PAYMENT_RECEIVED = 'payment_received',
  PAYOUT_PROCESSED = 'payout_processed',

  // Sistem bildirimleri
  ACCOUNT_VERIFIED = 'account_verified',
  PROFILE_APPROVED = 'profile_approved',
  PROFILE_REJECTED = 'profile_rejected',
}
```

### Hata Kodları

- **400 Bad Request**: Geçersiz veri formatı veya tip
- **401 Unauthorized**: Kimlik doğrulama başarısız
- **404 Not Found**: Kullanıcı profili bulunamadı
- **500 Internal Server Error**: Sunucu hatası

## Performans Notları

- Bildirim tercihleri UserProfile entity'sinde JSONB olarak saklanır (PostgreSQL)
- JSONB indeksleme ile hızlı sorgulama
- Bildirim gönderimi sırasında tek bir veritabanı sorgusu (UserProfile)
- Tercih kontrolü memory'de yapılır (veritabanı sorgusu gerektirmez)
