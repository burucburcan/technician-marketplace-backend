# 🎯 Google Cloud Proje Oluşturma - Görsel Rehber

## Sorun: "Proje oluştur" butonunu bulamıyorum

Endişelenmeyin! Çok yaygın bir durum. İşte adım adım çözüm:

---

## 📍 Yöntem 1: Üst Menüden (En Kolay)

### Adım 1: Console'a Git
- **URL**: https://console.cloud.google.com
- Google hesabınızla giriş yapın

### Adım 2: Proje Seçici'yi Bul

**Ekranın EN ÜSTÜNDE**, sol tarafta şunları göreceksiniz:

```
[☰ Menü]  [Google Cloud]  [▼ Proje Seçici]  [🔍 Arama]
```

**Proje Seçici** şöyle görünür:
- Mavi/gri bir dropdown
- Yanında aşağı ok (▼) var
- "Select a project" veya mevcut proje adı yazıyor

### Adım 3: Proje Seçici'ye Tıkla

Proje seçici'ye tıkladığınızda bir popup açılır:

```
┌─────────────────────────────────────┐
│  Select a project                   │
├─────────────────────────────────────┤
│  🔍 Search projects                 │
├─────────────────────────────────────┤
│  📁 My First Project                │
│  📁 Project 2                       │
├─────────────────────────────────────┤
│  [NEW PROJECT]  ← BU BUTONA TIKLA   │
└─────────────────────────────────────┘
```

### Adım 4: "NEW PROJECT" Butonuna Tıkla

Popup'ın **SAĞ ÜST KÖŞESINDE** "NEW PROJECT" butonu var.

---

## 📍 Yöntem 2: Direkt Link (Daha Hızlı!)

Proje oluşturma sayfasına direkt gitmek için:

**Direkt Link**: https://console.cloud.google.com/projectcreate

Bu linke tıklayın, direkt proje oluşturma formuna gider.

---

## 📝 Proje Oluşturma Formu

Link'e tıkladıktan veya "NEW PROJECT" dedikten sonra şu formu göreceksiniz:

```
┌─────────────────────────────────────────┐
│  New Project                            │
├─────────────────────────────────────────┤
│  Project name *                         │
│  [technician-platform          ]        │
│                                         │
│  Project ID                             │
│  [technician-platform-123456   ]        │
│  (Otomatik oluşturulur)                 │
│                                         │
│  Location                               │
│  Organization: [No organization    ▼]   │
│                                         │
│  [CANCEL]              [CREATE]         │
└─────────────────────────────────────────┘
```

### Doldurulacak Alanlar:

1. **Project name**: `technician-platform` yazın
2. **Project ID**: Otomatik oluşur (değiştirmeyin)
3. **Location**: "No organization" bırakın
4. **"CREATE"** butonuna tıklayın

---

## ⏳ Proje Oluşturuluyor

"CREATE" dedikten sonra:

1. **Bildirim** göreceksiniz: "Creating project..."
2. **30-60 saniye** bekleyin
3. **Başarılı** mesajı: "Project created successfully"

---

## ✅ Proje Oluşturuldu! Şimdi Ne Yapmalı?

### Proje Seçili mi Kontrol Et

Ekranın üstünde proje seçici'de **"technician-platform"** yazıyor mu?

- ✅ **Evet**: Harika! Devam edin
- ❌ **Hayır**: Proje seçici'ye tıklayın ve "technician-platform" seçin

---

## 🐛 Sorun Giderme

### "NEW PROJECT" Butonu Yok

**Sebep 1**: Popup tam açılmadı
- **Çözüm**: Popup'ı kapatın, tekrar proje seçici'ye tıklayın
- Popup'ın sağ üst köşesine bakın

**Sebep 2**: Hesap kısıtlaması
- **Çözüm**: Farklı bir Google hesabı deneyin
- Veya direkt link kullanın: https://console.cloud.google.com/projectcreate

### "You don't have permission" Hatası

**Sebep**: Kurumsal Google hesabı kullanıyorsunuz
- **Çözüm**: Kişisel Gmail hesabınızla giriş yapın
- Veya IT departmanınızdan izin isteyin

### Proje Oluşturuldu Ama Göremiyorum

**Çözüm**:
1. Sayfayı yenileyin (F5)
2. Proje seçici'ye tıklayın
3. Arama kutusuna "technician" yazın
4. Projenizi bulup seçin

---

## 🎯 Hızlı Özet

**En kolay yol**:

1. Bu linke tıkla: https://console.cloud.google.com/projectcreate
2. Project name: `technician-platform`
3. "CREATE" tıkla
4. 30 saniye bekle
5. ✅ Hazır!

---

## 📸 Görsel Referans

Proje seçici **BURADA**:

```
Ekranın en üstü:
┌────────────────────────────────────────────────────┐
│ ☰  Google Cloud  [▼ Select a project]  🔍  👤     │
│                   ↑                                │
│                   BURAYA TIKLA                     │
└────────────────────────────────────────────────────┘
```

---

## ✅ Proje Oluşturduktan Sonra

Şimdi sıradaki adımlar:

1. **Billing Aktif Et** (kredi kartı ekle)
2. **4 API'yi Aktif Et** (Maps, Places, Geocoding, Distance Matrix)
3. **API Key Oluştur**
4. **Key'i Güvenli Hale Getir**

`GOOGLE_MAPS_SETUP_STEP_BY_STEP.md` dosyasındaki **Adım 3**'ten devam edin.

---

**Hala sorun mu yaşıyorsunuz?**

Bana şunu söyleyin:
- Hangi sayfadasınız? (URL)
- Ne görüyorsunuz? (ekran açıklaması)
- Hangi butonu bulamıyorsunuz?

Yardımcı olayım!

---

**Hazırlayan**: Kiro AI  
**Tarih**: 2024
