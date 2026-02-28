# Task 9.4: Bildirim Yönetimi Endpoint'lerini Oluştur

## Genel Bakış
Bu görev, kullanıcıların bildirimlerini yönetmeleri için REST API endpoint'lerini oluşturur.

## Uygulanan Endpoint'ler

### 1. GET /notifications
Kullanıcının bildirimlerini listeler.

**Özellikler:**
- Sayfalama desteği (limit, offset)
- Okunma durumuna göre filtreleme (isRead)
- Bildirim tipine göre filtreleme (type)
- Oluşturma tarihine göre azalan sıralama
- Toplam bildirim sayısı döndürme

**Query Parametreleri:**
- `isRead` (boolean, optional): Okunma durumuna göre filtrele
- `type` (NotificationType, optional): Bildirim tipine göre filtrele
- `limit` (number, optional): Sayfa başına kayıt sayısı (varsayılan: 50)
- `offset` (number, optional): Başlangıç noktası (varsayılan: 0)

**Yanıt:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "booking_created",
      "title": "Yeni Rezervasyon",
      "message": "Plumbing hizmeti için yeni bir rezervasyon oluşturuldu",
      "data": { "bookingId": "booking-1", "serviceName": "Plumbing" },
      "isRead": false,
      "channels": ["in_app"],
      "createdAt": "2024-01-15T10:00:00Z",
      "readAt": null
    }
  ],
  "total": 10
}
```

### 2. GET /notifications/unread-count
Kullanıcının okunmamış bildirim sayısını döndürür.

**Yanıt:**
```json
{
  "count": 5
}
```

**Gereksinim Validasyonu:** Requirement 10.4
- Platform kullanıcılara okunmamış bildirimlerin sayısını gösterir

### 3. PUT /notifications/:id/read
Belirli bir bildirimi okundu olarak işaretler.

**Parametreler:**
- `id` (path parameter): Bildirim ID'si

**Özellikler:**
- İdempotent (zaten okunmuş bildirimi tekrar işaretleme güvenli)
- readAt timestamp'i otomatik olarak ayarlanır
- Sadece bildirimin sahibi işaretleyebilir

**Yanıt:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "booking_created",
  "title": "Yeni Rezervasyon",
  "message": "Plumbing hizmeti için yeni bir rezervasyon oluşturuldu",
  "data": { "bookingId": "booking-1", "serviceName": "Plumbing" },
  "isRead": true,
  "channels": ["in_app"],
  "createdAt": "2024-01-15T10:00:00Z",
  "readAt": "2024-01-15T10:30:00Z"
}
```

**Gereksinim Validasyonu:** Requirement 10.5
- Kullanıcı bildirime tıkladığında, bildirim okundu olarak işaretlenir

### 4. PUT /notifications/read-all
Kullanıcının tüm bildirimlerini okundu olarak işaretler.

**Özellikler:**
- İdempotent (tüm bildirimler zaten okunmuşsa güvenli)
- Sadece okunmamış bildirimleri günceller
- Diğer kullanıcıların bildirimlerini etkilemez

**Yanıt:** 204 No Content

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
- Her endpoint sadece kimliği doğrulanmış kullanıcının kendi bildirimlerine erişim sağlar
- `req.user.userId` kullanılarak kullanıcı kimliği doğrulanır
- Başka kullanıcıların bildirimlerine erişim engellenir

## Test Kapsamı

### Integration Tests (notification-endpoints.integration.spec.ts)

#### GET /notifications Tests
1. ✅ Kimliği doğrulanmış kullanıcının tüm bildirimlerini getirme
2. ✅ Okunmamış bildirimlere göre filtreleme
3. ✅ Okunmuş bildirimlere göre filtreleme
4. ✅ Bildirim tipine göre filtreleme
5. ✅ Sayfalama desteği (limit)
6. ✅ Sayfalama desteği (offset)
7. ✅ Bildirimlerin oluşturma tarihine göre azalan sıralanması
8. ✅ Kimlik doğrulama gerekliliği
9. ✅ Diğer kullanıcıların bildirimlerinin döndürülmemesi

#### GET /notifications/unread-count Tests
1. ✅ Okunmamış bildirim sayısını döndürme
2. ✅ Tüm bildirimler okunduğunda 0 döndürme
3. ✅ Kimlik doğrulama gerekliliği

#### PUT /notifications/:id/read Tests
1. ✅ Bildirimi okundu olarak işaretleme
2. ✅ İdempotent davranış (zaten okunmuş bildirimi tekrar işaretleme)
3. ✅ Var olmayan bildirim için 404 döndürme
4. ✅ Başka kullanıcının bildirimini işaretlemeye izin vermeme
5. ✅ Kimlik doğrulama gerekliliği

#### PUT /notifications/read-all Tests
1. ✅ Tüm bildirimleri okundu olarak işaretleme
2. ✅ İdempotent davranış (zaten okunmuş bildirimler)
3. ✅ Sadece mevcut kullanıcının bildirimlerini işaretleme
4. ✅ Kimlik doğrulama gerekliliği

#### Requirement Validation Tests
1. ✅ Requirement 10.4: Okunmamış bildirim sayısını gösterme
2. ✅ Requirement 10.5: Bildirime tıklandığında okundu olarak işaretleme

## Mevcut Dosyalar

### Controller
- `packages/backend/src/modules/notification/notification.controller.ts`
  - Tüm endpoint'ler zaten uygulanmış
  - JwtAuthGuard ile korunmuş
  - Uygun HTTP durum kodları kullanılmış

### Service
- `packages/backend/src/modules/notification/notification.service.ts`
  - `getUserNotifications()`: Filtreleme ve sayfalama ile bildirimleri getir
  - `getUnreadCount()`: Okunmamış bildirim sayısını getir
  - `markAsRead()`: Tek bildirimi okundu olarak işaretle
  - `markAllAsRead()`: Tüm bildirimleri okundu olarak işaretle

### Entity
- `packages/backend/src/entities/notification.entity.ts`
  - Bildirim veri modeli
  - İndeksler: userId, isRead, createdAt
  - NotificationType ve NotificationChannel enum'ları

## Test Çalıştırma

```bash
# Backend dizinine git
cd packages/backend

# Integration testleri çalıştır
npm test -- notification-endpoints.integration.spec.ts --run

# Tüm testleri çalıştır
npm test

# Test coverage
npm run test:cov
```

## API Kullanım Örnekleri

### Tüm bildirimleri getir
```bash
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer <token>"
```

### Okunmamış bildirimleri getir
```bash
curl -X GET "http://localhost:3000/notifications?isRead=false&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Okunmamış bildirim sayısını getir
```bash
curl -X GET http://localhost:3000/notifications/unread-count \
  -H "Authorization: Bearer <token>"
```

### Bildirimi okundu olarak işaretle
```bash
curl -X PUT http://localhost:3000/notifications/<notification-id>/read \
  -H "Authorization: Bearer <token>"
```

### Tüm bildirimleri okundu olarak işaretle
```bash
curl -X PUT http://localhost:3000/notifications/read-all \
  -H "Authorization: Bearer <token>"
```

## Sonraki Adımlar

1. Task 9.3: Bildirim sistemi için property testleri yazılmalı
2. Frontend entegrasyonu için WebSocket bildirimleri eklenebilir
3. Push notification desteği (Firebase Cloud Messaging) eklenebilir
4. Bildirim tercihleri yönetimi için endpoint'ler eklenebilir

## Notlar

- Tüm endpoint'ler RESTful prensiplere uygun
- Hata yönetimi NestJS exception filters ile yapılıyor
- Validation pipes ile input validasyonu sağlanıyor
- TypeORM ile veritabanı işlemleri optimize edilmiş
- İndeksler ile sorgu performansı artırılmış
