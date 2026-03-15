# Uygulama Planı

- [ ] 1. Bug koşulu keşif testi yaz
  - **Property 1: Fault Condition** - İstemci Tarafı Doğrulama Geri Bildirimi Eksikliği
  - **KRİTİK**: Bu test düzeltilmemiş kodda BAŞARISIZ OLMALIDIR - başarısızlık bug'ın varlığını doğrular
  - **Düzeltme yapılmadan ÖNCE bu testi yazın**
  - **NOT**: Bu test beklenen davranışı kodlar - düzeltme sonrası geçtiğinde fix'i doğrulayacaktır
  - **AMAÇ**: Bug'ın varlığını gösteren karşı örnekler bul
  - **Test Dosyası**: `packages/web-frontend/src/pages/auth/__tests__/RegisterPage.validation.test.tsx`
  - **Scoped PBT Yaklaşımı**: fast-check kullanarak geçersiz form girdileri üret ve doğrulama geri bildiriminin olmadığını göster
  - Test ortamı: vitest + @testing-library/react + fast-check
  - RegisterPage bileşenini render et (RTK Query ve react-router mock'ları ile)
  - Property test 1: Rastgele geçersiz e-posta adresleri üret → e-posta alanında placeholder ("ornek@email.com") olmadığını doğrula
  - Property test 2: 1-7 karakter uzunluğunda rastgele şifreler üret → şifre alanı altında minimum uzunluk geri bildirimi olmadığını doğrula
  - Property test 3: Eşleşmeyen şifre çiftleri üret → satır içi uyarı yerine `alert()` çağrıldığını doğrula
  - Property test 4: Geçersiz verilerle form gönder → alan bazlı hata mesajı olmadığını doğrula
  - Düzeltilmemiş kodda çalıştır - BAŞARISIZ olması beklenir (bu bug'ın varlığını kanıtlar)
  - Bulunan karşı örnekleri belgele
  - Test yazılıp çalıştırıldığında ve başarısızlık belgelendiğinde görevi tamamla
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Koruma (preservation) property testleri yaz (düzeltme uygulanmadan ÖNCE)
  - **Property 2: Preservation** - Mevcut Kayıt Akışı Korunması
  - **ÖNEMLİ**: Gözlem-öncelikli metodolojisini takip edin
  - **Test Dosyası**: `packages/web-frontend/src/pages/auth/__tests__/RegisterPage.preservation.test.tsx`
  - Test ortamı: vitest + @testing-library/react + fast-check
  - RegisterPage bileşenini render et (RTK Query ve react-router mock'ları ile)
  - Gözlem: Düzeltilmemiş kodda geçerli verilerle form gönderildiğinde register mutation çağrılıyor ve `/auth/verify-email`'e yönlendiriliyor
  - Gözlem: API isteği {email, password, firstName, lastName} formatında gönderiliyor (confirmPassword dahil değil)
  - Gözlem: Form gönderimi sırasında buton devre dışı kalıyor (isLoading)
  - Gözlem: "Giriş Yap" bağlantısı `/auth/login`'e yönlendiriyor
  - Property test 1: fast-check ile rastgele geçerli form verileri üret (geçerli email, 8+ karakter şifre, eşleşen confirmPassword, dolu ad/soyad) → register mutation'ın doğru formatta çağrıldığını doğrula
  - Property test 2: Geçerli verilerle form gönderiminde navigate('/auth/verify-email') çağrıldığını doğrula
  - Unit test: Butonun isLoading durumunda disabled olduğunu doğrula
  - Unit test: "Giriş Yap" bağlantısının `/auth/login` href'ine sahip olduğunu doğrula
  - Düzeltilmemiş kodda çalıştır - BAŞARILI olması beklenir (mevcut davranışı doğrular)
  - Test yazılıp çalıştırıldığında ve düzeltilmemiş kodda geçtiğinde görevi tamamla
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Kayıt formu doğrulama düzeltmesi

  - [ ] 3.1 Düzeltmeyi uygula
    - `validationErrors` state'i ekle: `useState<Record<string, string>>({})`
    - E-posta input'una `placeholder="ornek@email.com"` ekle
    - Şifre alanı altına "Minimum 8 karakter" yardımcı metni ekle (karakter sayısına göre renk: kırmızı/yeşil)
    - `confirmPassword` onChange'de gerçek zamanlı şifre eşleşme kontrolü ekle, eşleşmiyorsa satır içi "Şifreler eşleşmiyor" uyarısı göster
    - `handleSubmit` içindeki `alert()` çağrısını kaldır
    - `validateForm` fonksiyonu ekle: e-posta format kontrolü, şifre min 8 karakter, şifre eşleşme, ad/soyad boş olmamalı
    - `handleSubmit` başında `validateForm` çağır, hata varsa gönderimi engelle
    - Her input altında koşullu hata mesajı göster (`text-red-500 text-sm`)
    - RTK Query error response'undan alan bazlı hataları parse et
    - _Bug_Condition: isBugCondition(input) where input geçersiz form verisi veya eksik doğrulama geri bildirimi_
    - _Expected_Behavior: Geçersiz girdilerde satır içi hata mesajları, placeholder, yardımcı metin ve renk geri bildirimi_
    - _Preservation: Geçerli verilerle kayıt akışı, API formatı, yönlendirme ve yükleniyor durumu korunmalı_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Bug koşulu keşif testinin artık geçtiğini doğrula
    - **Property 1: Expected Behavior** - İstemci Tarafı Doğrulama Geri Bildirimi
    - **ÖNEMLİ**: Görev 1'deki AYNI testi tekrar çalıştır - yeni test YAZMA
    - Görev 1'deki test beklenen davranışı kodlar
    - Bu test geçtiğinde, beklenen davranışın sağlandığını doğrular
    - `RegisterPage.validation.test.tsx` testini çalıştır
    - **BEKLENEN SONUÇ**: Test BAŞARILI (bug'ın düzeltildiğini doğrular)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.3 Koruma testlerinin hâlâ geçtiğini doğrula
    - **Property 2: Preservation** - Mevcut Kayıt Akışı Korunması
    - **ÖNEMLİ**: Görev 2'deki AYNI testleri tekrar çalıştır - yeni test YAZMA
    - `RegisterPage.preservation.test.tsx` testlerini çalıştır
    - **BEKLENEN SONUÇ**: Testler BAŞARILI (regresyon olmadığını doğrular)
    - Düzeltme sonrası tüm testlerin hâlâ geçtiğini onayla

- [ ] 4. Kontrol noktası - Tüm testlerin geçtiğinden emin ol
  - Tüm testleri çalıştır ve geçtiğini doğrula, sorular ortaya çıkarsa kullanıcıya sor.
