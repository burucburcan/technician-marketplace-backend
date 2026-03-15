# Kayıt Formu Doğrulama Düzeltmesi - Bugfix Design

## Overview

Kayıt formu (`RegisterPage.tsx`) şu anda istemci tarafında hiçbir doğrulama geri bildirimi sunmuyor. Kullanıcılar geçersiz veri girdiğinde herhangi bir anlık uyarı almıyor; hatalar yalnızca form gönderildikten sonra sunucu tarafından dönen genel bir mesajla gösteriliyor. Şifre eşleşme kontrolü ise `alert()` ile yapılıyor. Bu düzeltme, mevcut bileşen yapısını koruyarak ve yeni bağımlılık eklemeden, satır içi doğrulama geri bildirimleri, placeholder'lar, yardımcı metinler ve alan bazlı hata mesajları ekleyecektir.

## Glossary

- **Bug_Condition (C)**: Kullanıcının form alanlarına geçersiz veri girdiğinde veya eksik bilgiyle form gönderdiğinde doğrulama geri bildirimi alamaması durumu
- **Property (P)**: Kullanıcının gerçek zamanlı, alan bazlı doğrulama geri bildirimi alması gereken davranış
- **Preservation**: Mevcut başarılı kayıt akışı, RTK Query mutation yapısı, API istek formatı ve yönlendirme davranışının değişmeden kalması
- **RegisterPage**: `packages/web-frontend/src/pages/auth/RegisterPage.tsx` dosyasındaki kayıt formu bileşeni
- **formData**: Bileşen içindeki `useState` ile yönetilen form verisi (email, password, confirmPassword, firstName, lastName)
- **handleSubmit**: Form gönderimini işleyen ve `register` mutation'ını çağıran fonksiyon

## Bug Details

### Fault Condition

Bug, kullanıcı kayıt formundaki alanlara geçersiz veri girdiğinde veya eksik bilgiyle formu göndermeye çalıştığında ortaya çıkıyor. Bileşen; e-posta formatı ipucu, şifre uzunluk geri bildirimi, gerçek zamanlı şifre eşleşme kontrolü ve alan bazlı hata mesajları sağlamıyor. Şifre eşleşme kontrolü `alert()` ile yapılıyor.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type FormInteraction
  OUTPUT: boolean

  RETURN (input.field == 'email' AND input.value is not valid email format)
         OR (input.field == 'password' AND length(input.value) < 8)
         OR (input.field == 'confirmPassword' AND input.value != formData.password)
         OR (input.action == 'submit' AND hasClientSideValidationErrors(formData))
END FUNCTION
```

### Examples

- **Örnek 1**: Kullanıcı e-posta alanını görüyor → Placeholder yok, format ipucu yok → Kullanıcı "abc" yazıp gönderene kadar hata görmüyor
- **Örnek 2**: Kullanıcı şifre alanına "123" yazıyor → Minimum 8 karakter uyarısı yok, karakter sayacı yok → Kullanıcı gönderene kadar yetersiz uzunluktan habersiz
- **Örnek 3**: Kullanıcı şifre onay alanına farklı bir değer giriyor → Satır içi uyarı yerine form gönderiminde `alert('Passwords do not match')` çıkıyor
- **Örnek 4**: Kullanıcı geçersiz e-posta ile formu gönderiyor → Sunucu 400 döndürüyor → Genel "Registration failed. Please try again." mesajı gösteriliyor, alan bazlı hata yok
- **Edge Case**: Kullanıcı şifre alanına tam 8 karakter giriyor → Geçerli, hata gösterilmemeli

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Tüm alanlar geçerli verilerle doldurulup form gönderildiğinde başarılı kayıt ve `/auth/verify-email` yönlendirmesi aynı şekilde çalışmalı
- Backend API'ye gönderilen istek formatı (email, password, firstName, lastName) değişmemeli
- RTK Query `useRegisterMutation` kullanım şekli ve `setCredentials` dispatch'i korunmalı
- Form gönderimi sırasında butonun devre dışı kalması ve yükleniyor durumu korunmalı
- "Giriş Yap" bağlantısının login sayfasına yönlendirmesi korunmalı
- Sunucu hatası durumunda hata mesajı gösterimi korunmalı (artık alan bazlı olacak ama sunucu hatası yine gösterilecek)

**Scope:**
Geçerli verilerle yapılan form gönderimleri bu düzeltmeden etkilenmemelidir. Mevcut başarılı kayıt akışı, API iletişimi ve yönlendirme mantığı tamamen aynı kalmalıdır.

## Hypothesized Root Cause

Bug'ın temel nedeni, bileşenin tasarım aşamasında istemci tarafı doğrulama mantığının hiç eklenmemiş olmasıdır:

1. **Placeholder Eksikliği**: E-posta input alanına `placeholder` attribute'u eklenmemiş
   - HTML `<input>` elementinde `placeholder="ornek@email.com"` gibi bir değer yok

2. **Yardımcı Metin Eksikliği**: Şifre alanının altında minimum karakter gereksinimini belirten bir metin yok
   - Backend `@MinLength(8)` kuralı var ama frontend'de bu bilgi kullanıcıya gösterilmiyor

3. **alert() Kullanımı**: Şifre eşleşme kontrolü `handleSubmit` içinde `alert()` ile yapılıyor
   - Gerçek zamanlı satır içi doğrulama yerine eski usul `alert()` dialog'u kullanılmış
   - Kullanıcı formu göndermeden eşleşme durumunu göremiyor

4. **İstemci Tarafı Doğrulama Eksikliği**: `handleSubmit` fonksiyonunda şifre eşleşme dışında hiçbir doğrulama yok
   - E-posta format kontrolü yok
   - Şifre uzunluk kontrolü yok
   - Alan bazlı hata state'i yok

5. **Genel Hata Mesajı**: Sunucu hatası durumunda sabit "Registration failed. Please try again." metni gösteriliyor
   - Sunucudan dönen alan bazlı hata mesajları parse edilmiyor

## Correctness Properties

Property 1: Fault Condition - İstemci Tarafı Doğrulama Geri Bildirimi

_For any_ form etkileşimi where kullanıcı geçersiz veri girdiğinde (isBugCondition true döndüğünde), düzeltilmiş bileşen SHALL ilgili alan altında satır içi hata mesajı göstermeli, şifre alanında karakter sayısı/uzunluk geri bildirimi sağlamalı ve `alert()` yerine satır içi uyarı kullanmalıdır.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

Property 2: Preservation - Mevcut Kayıt Akışı

_For any_ form etkileşimi where kullanıcı geçerli verilerle formu gönderdiğinde (isBugCondition false döndüğünde), düzeltilmiş bileşen SHALL orijinal bileşenle aynı şekilde başarılı kayıt işlemini gerçekleştirmeli, aynı API istek formatını kullanmalı ve aynı yönlendirme davranışını korumalıdır.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Kök neden analizi doğruysa (istemci tarafı doğrulama mantığı hiç eklenmemiş):

**File**: `packages/web-frontend/src/pages/auth/RegisterPage.tsx`

**Function**: `RegisterPage` bileşeni ve `handleSubmit` fonksiyonu

**Specific Changes**:

1. **Doğrulama Hata State'i Ekleme**: Alan bazlı hata mesajlarını tutacak bir `validationErrors` state'i ekle
   - `useState<Record<string, string>>({})` ile hata state'i oluştur
   - Her alan için ayrı hata mesajı tutabilecek yapı

2. **E-posta Placeholder Ekleme**: E-posta input alanına `placeholder="ornek@email.com"` ekle
   - Mevcut `<input type="email">` elementine placeholder attribute'u ekle

3. **Şifre Yardımcı Metni Ekleme**: Şifre alanının altına "Minimum 8 karakter" bilgi metni ekle
   - Şifre input'unun altına küçük bir `<p>` veya `<span>` elementi ekle
   - Karakter sayısına göre renk değişimi (kırmızı: yetersiz, yeşil: yeterli)

4. **Gerçek Zamanlı Şifre Eşleşme Kontrolü**: `alert()` yerine satır içi uyarı ekle
   - `confirmPassword` alanının `onChange` handler'ında eşleşme kontrolü yap
   - Eşleşmiyorsa alan altında "Şifreler eşleşmiyor" mesajı göster
   - `handleSubmit` içindeki `alert()` çağrısını kaldır, yerine `validationErrors` kontrolü koy

5. **İstemci Tarafı Doğrulama Fonksiyonu**: Form gönderiminden önce tüm alanları doğrulayan bir `validateForm` fonksiyonu ekle
   - E-posta format kontrolü (basit regex)
   - Şifre minimum 8 karakter kontrolü
   - Şifre eşleşme kontrolü
   - Ad/soyad boş olmamalı kontrolü

6. **Alan Bazlı Hata Gösterimi**: Her input alanının altında koşullu hata mesajı göster
   - Kırmızı renkli küçük metin (`text-red-500 text-sm`)
   - Hata varsa görünür, yoksa gizli

7. **Sunucu Hata Mesajı İyileştirmesi**: RTK Query error response'undan alan bazlı hataları parse et
   - `error` objesinden `data.message` alanını oku
   - Mümkünse alan bazlı hataları ilgili alanlara eşle
   - Genel hata mesajını daha açıklayıcı hale getir

## Testing Strategy

### Validation Approach

Test stratejisi iki aşamalı bir yaklaşım izler: önce düzeltilmemiş kodda bug'ı gösteren karşı örnekler bulunur, ardından düzeltmenin doğru çalıştığı ve mevcut davranışın korunduğu doğrulanır.

### Exploratory Fault Condition Checking

**Goal**: Düzeltme uygulanmadan ÖNCE bug'ı gösteren karşı örnekler bul. Kök neden analizini doğrula veya çürüt.

**Test Plan**: Kayıt formunu render edip, geçersiz veri girişi senaryolarını simüle eden testler yaz. Düzeltilmemiş kodda çalıştırarak doğrulama geri bildiriminin olmadığını gözlemle.

**Test Cases**:
1. **Placeholder Testi**: E-posta alanını render et → placeholder attribute'unun olmadığını doğrula (düzeltilmemiş kodda başarısız olacak)
2. **Şifre Yardımcı Metin Testi**: Şifre alanını render et → altında minimum karakter bilgisinin olmadığını doğrula (düzeltilmemiş kodda başarısız olacak)
3. **Şifre Eşleşme Testi**: Farklı şifreler gir → satır içi uyarı yerine `alert()` çağrıldığını doğrula (düzeltilmemiş kodda başarısız olacak)
4. **Alan Bazlı Hata Testi**: Geçersiz e-posta ile formu gönder → alan bazlı hata mesajının olmadığını doğrula (düzeltilmemiş kodda başarısız olacak)

**Expected Counterexamples**:
- E-posta alanında placeholder yok
- Şifre alanı altında yardımcı metin yok
- Şifre eşleşme hatası `alert()` ile gösteriliyor
- Doğrulama hataları alan bazlı değil, genel mesaj olarak gösteriliyor

### Fix Checking

**Goal**: Bug koşulunun geçerli olduğu tüm girdiler için düzeltilmiş fonksiyonun beklenen davranışı ürettiğini doğrula.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderRegisterPage_fixed()
  
  IF input.field == 'email' THEN
    ASSERT emailInput.placeholder == 'ornek@email.com'
  END IF
  
  IF input.field == 'password' AND length(input.value) < 8 THEN
    ASSERT passwordHelperText.visible == true
    ASSERT passwordHelperText.color == 'red'
  END IF
  
  IF input.field == 'confirmPassword' AND input.value != password THEN
    ASSERT inlineError('Şifreler eşleşmiyor').visible == true
    ASSERT alert.notCalled == true
  END IF
  
  IF input.action == 'submit' THEN
    ASSERT fieldSpecificErrors.visible == true
    ASSERT apiCall.notMade == true  // istemci tarafı doğrulama engeller
  END IF
END FOR
```

### Preservation Checking

**Goal**: Bug koşulunun geçerli OLMADIĞI tüm girdiler için düzeltilmiş fonksiyonun orijinal fonksiyonla aynı sonucu ürettiğini doğrula.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT registerPage_original(input).apiRequest == registerPage_fixed(input).apiRequest
  ASSERT registerPage_original(input).navigation == registerPage_fixed(input).navigation
  ASSERT registerPage_original(input).authState == registerPage_fixed(input).authState
END FOR
```

**Testing Approach**: Property-based testing, preservation kontrolü için önerilir çünkü:
- Giriş alanı genelinde birçok test vakasını otomatik olarak üretir
- Manuel birim testlerinin kaçırabileceği edge case'leri yakalar
- Bug olmayan tüm girdiler için davranışın değişmediğine dair güçlü garanti sağlar

**Test Plan**: Önce düzeltilmemiş kodda geçerli verilerle kayıt akışını gözlemle, ardından bu davranışı yakalayan property-based testler yaz.

**Test Cases**:
1. **Başarılı Kayıt Korunması**: Geçerli verilerle form gönderiminin başarılı kayıt ve yönlendirme yapmasını doğrula
2. **API İstek Formatı Korunması**: Gönderilen isteğin aynı formatta (email, password, firstName, lastName) olmasını doğrula
3. **Yükleniyor Durumu Korunması**: Form gönderimi sırasında butonun devre dışı kalmasını doğrula
4. **Navigasyon Korunması**: "Giriş Yap" bağlantısının login sayfasına yönlendirmesini doğrula

### Unit Tests

- E-posta alanında placeholder varlığını test et
- Şifre alanı altında yardımcı metin varlığını test et
- Kısa şifre girildiğinde karakter sayısı/renk geri bildirimini test et
- Farklı şifrelerde satır içi "Şifreler eşleşmiyor" mesajını test et
- `alert()` çağrılmadığını test et
- Geçersiz e-posta ile form gönderiminde istemci tarafı hata mesajını test et
- Geçerli verilerle form gönderiminde hata mesajı olmadığını test et

### Property-Based Tests

- Rastgele geçersiz e-posta adresleri üret ve her birinde doğrulama hatası gösterildiğini doğrula
- Rastgele 1-7 karakter uzunluğunda şifreler üret ve her birinde uzunluk uyarısı gösterildiğini doğrula
- Rastgele geçerli form verileri üret ve hiçbirinde doğrulama hatası gösterilmediğini doğrula (preservation)
- Rastgele geçerli form verileri üret ve API istek formatının korunduğunu doğrula

### Integration Tests

- Tam kayıt akışını test et: geçersiz veri → hata mesajları → düzeltme → başarılı gönderim
- Şifre alanına yazarken karakter sayısı geri bildiriminin gerçek zamanlı güncellendiğini test et
- Şifre onay alanına yazarken eşleşme durumunun gerçek zamanlı güncellendiğini test et
- Sunucu hatası döndüğünde hata mesajının doğru gösterildiğini test et
