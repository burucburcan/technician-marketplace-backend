# Bugfix Requirements Document

## Introduction

Kayıt formu (`RegisterPage.tsx`) şu anda istemci tarafında hiçbir doğrulama geri bildirimi sunmuyor. Kullanıcılar hataları yalnızca formu gönderdikten sonra sunucu tarafından dönen genel bir hata mesajıyla görüyor. Bu durum kötü bir kullanıcı deneyimi yaratıyor. Form; e-posta formatı ipuçları, minimum karakter gereksinimleri uyarıları ve gerçek zamanlı doğrulama geri bildirimi sağlamalıdır.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN kullanıcı e-posta alanına odaklandığında THEN sistem herhangi bir format ipucu veya placeholder göstermiyor (örn. "ornek@email.com" gibi bir hatırlatıcı yok)

1.2 WHEN kullanıcı şifre alanına yazmaya başladığında THEN sistem minimum karakter gereksinimini (8 karakter) belirten herhangi bir uyarı veya geri bildirim göstermiyor

1.3 WHEN kullanıcı şifre onay alanına şifreyle eşleşmeyen bir değer girdiğinde THEN sistem gerçek zamanlı satır içi uyarı yerine yalnızca form gönderiminde `alert()` ile uyarı gösteriyor

1.4 WHEN kullanıcı geçersiz verilerle formu gönderdiğinde ve sunucu 400 hatası döndüğünde THEN sistem alan bazlı hata mesajları yerine genel "Registration failed. Please try again." mesajı gösteriyor

1.5 WHEN kullanıcı şifre alanına 8 karakterden az bir değer girdiğinde THEN sistem herhangi bir karakter sayısı geri bildirimi veya minimum uzunluk uyarısı göstermiyor

### Expected Behavior (Correct)

2.1 WHEN kullanıcı e-posta alanını gördüğünde THEN sistem e-posta formatını hatırlatan bir placeholder göstermelidir (örn. "ornek@email.com")

2.2 WHEN kullanıcı şifre alanına yazmaya başladığında THEN sistem minimum 8 karakter gereksinimini belirten bir bilgi metni göstermelidir

2.3 WHEN kullanıcı şifre onay alanına şifreyle eşleşmeyen bir değer girdiğinde THEN sistem gerçek zamanlı olarak satır içi "Şifreler eşleşmiyor" uyarısı göstermelidir (`alert()` yerine)

2.4 WHEN kullanıcı geçersiz verilerle formu gönderdiğinde THEN sistem alan bazlı doğrulama hata mesajları göstermelidir (örn. "Geçerli bir e-posta adresi giriniz", "Şifre en az 8 karakter olmalıdır")

2.5 WHEN kullanıcı şifre alanına yazarken THEN sistem mevcut karakter sayısını veya minimum uzunluk durumunu gösteren bir geri bildirim sağlamalıdır

### Unchanged Behavior (Regression Prevention)

3.1 WHEN kullanıcı tüm alanları geçerli verilerle doldurup formu gönderdiğinde THEN sistem başarılı kayıt işlemini gerçekleştirmeye ve e-posta doğrulama sayfasına yönlendirmeye devam etmelidir

3.2 WHEN kullanıcı kayıt formunu gönderdiğinde THEN sistem backend API'ye (`/auth/register`) aynı istek formatıyla (email, password, firstName, lastName) veri göndermeye devam etmelidir

3.3 WHEN kayıt işlemi devam ederken THEN sistem gönder butonunu devre dışı bırakmaya ve yükleniyor durumunu göstermeye devam etmelidir

3.4 WHEN kullanıcı "Giriş Yap" bağlantısına tıkladığında THEN sistem login sayfasına yönlendirmeye devam etmelidir

3.5 WHEN sunucu tarafından bir hata döndüğünde THEN sistem hata mesajını kullanıcıya göstermeye devam etmelidir
