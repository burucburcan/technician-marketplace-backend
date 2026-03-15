# Implementation Plan: Dual Profile Registration

## Overview

Kayıt formuna rol seçimi eklenmesi, RegisterRequest güncellenmesi, backend rol doğrulaması, kayıt sonrası rol bazlı yönlendirme, müşteri profil sayfası oluşturulması ve i18n desteği. Ana çalışma frontend tarafında; backend zaten `role` alanını destekliyor, sadece doğrulama guard'ı eklenmesi gerekiyor.

## Tasks

- [x] 1. i18n çeviri anahtarlarını ekle
  - [x] 1.1 `es.json` dosyasına `auth.roleSelection` ve `clientProfile` namespace'leri altında İspanyolca çeviri anahtarlarını ekle
    - Rol seçim başlığı, etiketleri, açıklamaları ve doğrulama mesajları
    - Müşteri profil sayfası etiketleri ve mesajları
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  - [x] 1.2 `en.json` dosyasına aynı anahtarların İngilizce karşılıklarını ekle
    - _Requirements: 7.1, 7.2, 7.4, 7.5_
  - [ ]* 1.3 Write property test for i18n key completeness
    - **Property 8: i18n keys exist in both languages**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 2. RoleSelector bileşenini oluştur
  - [x] 2.1 `RoleSelector.tsx` bileşenini oluştur
    - `RoleSelectorProps` interface'ini tanımla (`selectedRole`, `onRoleSelect`, `error`)
    - İki seçilebilir kart: "Profesional" (tools ikonu) ve "Cliente" (person ikonu)
    - Seçili kart mavi border ve açık mavi arka plan ile vurgulanır
    - `role="radiogroup"` container, `role="radio"` ve `aria-checked` her kart için
    - Klavye navigasyonu: Tab ile geçiş, Enter/Space ile seçim
    - `aria-live` bölgesi ile seçim değişikliği duyurusu
    - Tüm metinler `t()` fonksiyonu ile i18n
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 8.1, 8.2, 8.3_
  - [ ]* 2.2 Write property test for ARIA attributes
    - **Property 10: ARIA attributes reflect selection state**
    - **Validates: Requirements 8.2**
  - [ ]* 2.3 Write property test for visual distinction
    - **Property 12: Selected card visually distinguished**
    - **Validates: Requirements 1.2**

- [x] 3. RegisterPage'i güncelle ve rol seçimini entegre et
  - [x] 3.1 `RegisterPage.tsx` formData state'ine `role` alanını ekle ve `RoleSelector` bileşenini form alanlarının üstüne yerleştir
    - `role: 'professional' | 'user' | null` state eklenmesi
    - `validateForm` fonksiyonuna rol seçimi kontrolü eklenmesi
    - Rol seçilmediğinde submit butonu disabled olmalı ve doğrulama mesajı gösterilmeli
    - _Requirements: 1.1, 1.3_
  - [x] 3.2 `authApi.ts` içindeki `RegisterRequest` interface'ine opsiyonel `role` alanını ekle
    - `role?: 'professional' | 'user'` alanı eklenmesi
    - `register` mutation'ında `role` değerinin request body'ye dahil edilmesi
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 3.3 `handleSubmit` fonksiyonunda kayıt sonrası rol bazlı yönlendirme ekle
    - `professional` rolü → `/professional` dashboard'una yönlendir
    - `user` rolü → `/user` dashboard'una yönlendir
    - Email doğrulama gerekiyorsa önce doğrulama sayfasına yönlendir
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 3.4 Write property test for role selection to request mapping
    - **Property 1: Role selection maps to correct request value**
    - **Validates: Requirements 2.1, 2.2, 3.2**
  - [ ]* 3.5 Write property test for post-registration redirect
    - **Property 4: Post-registration redirect matches role**
    - **Validates: Requirements 4.1, 4.2**

- [x] 4. Checkpoint - Kayıt akışı doğrulaması
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Backend rol doğrulaması ekle
  - [x] 5.1 `auth.service.ts` register metoduna yetkisiz rol kontrolü ekle
    - `allowedPublicRoles` listesi: `[UserRole.PROFESSIONAL, UserRole.USER]`
    - İzin verilmeyen roller (`admin`, `provider`, `supplier` vb.) için `BadRequestException` fırlat
    - Rol belirtilmezse varsayılan `user` davranışı korunsun
    - _Requirements: 2.3, 2.4, 2.5_
  - [ ]* 5.2 Write property test for unauthorized role rejection
    - **Property 2: Backend rejects unauthorized roles**
    - **Validates: Requirements 2.3, 2.4**
  - [ ]* 5.3 Write property test for role round-trip
    - **Property 3: Role round-trip through registration**
    - **Validates: Requirements 2.5**

- [x] 6. Dashboard router'da rol bazlı yönlendirme ekle
  - [x] 6.1 Generic dashboard route'unda authenticated kullanıcının rolüne göre uygun dashboard'a yönlendirme yap
    - `professional` → `/professional`, `user` → `/user`
    - Bilinmeyen rol durumunda varsayılan `/user` yönlendirmesi
    - _Requirements: 4.4_
  - [ ]* 6.2 Write property test for authenticated dashboard redirect
    - **Property 5: Authenticated dashboard redirect matches role**
    - **Validates: Requirements 4.4**

- [x] 7. Müşteri profil sayfasını oluştur
  - [x] 7.1 `ClientProfilePage.tsx` bileşenini oluştur
    - Adres alanları: sokak, şehir, eyalet, posta kodu
    - Tercih edilen hizmet kategorileri seçimi
    - İletişim telefon numarası alanı
    - Geçmiş rezervasyon özeti bölümü (duruma göre sayılar: toplam, tamamlanan, iptal, bekleyen)
    - Düzenleme/kaydetme işlevselliği (backend API'ye gönderim ve başarı mesajı)
    - Backend doğrulama hatalarını ilgili alanın yanında gösterme
    - Yükleme göstergesi (loading indicator)
    - Tüm label'lar `htmlFor` ve `id` ile input'lara bağlı
    - Tüm metinler `t()` fonksiyonu ile i18n
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.4_
  - [x] 7.2 Müşteri profil sayfasını router'a ekle ve `/user/profile` route'unu tanımla
    - _Requirements: 6.1_
  - [ ]* 7.3 Write property test for profile save round-trip
    - **Property 6: Profile save round-trip**
    - **Validates: Requirements 5.3, 6.3**
  - [ ]* 7.4 Write property test for validation errors per field
    - **Property 7: Validation errors displayed per field**
    - **Validates: Requirements 5.4, 6.4**
  - [ ]* 7.5 Write property test for booking history counts
    - **Property 9: Booking history counts match data**
    - **Validates: Requirements 6.2**
  - [ ]* 7.6 Write property test for form label-input association
    - **Property 11: Form labels associated with inputs**
    - **Validates: Requirements 8.4**

- [x] 8. Profesyonel profil sayfasını güncelle
  - [x] 8.1 Mevcut `ProfilePage.tsx`'e eksik i18n anahtarlarını ve `htmlFor`/`id` label-input eşleşmelerini ekle
    - Profesyonel profil alanlarının i18n desteğini doğrula ve eksikleri tamamla
    - Label-input erişilebilirlik eşleşmelerini kontrol et ve düzelt
    - _Requirements: 5.5, 8.4_

- [x] 9. Entegrasyon ve son bağlantılar
  - [x] 9.1 Tüm bileşenlerin birbirine bağlı olduğunu doğrula
    - RoleSelector → RegisterPage → authApi → Backend akışının uçtan uca çalışması
    - Kayıt sonrası yönlendirmenin doğru çalışması
    - Profil sayfalarının route'lardan erişilebilir olması
    - _Requirements: 1.1, 2.1, 2.2, 4.1, 4.2_

- [x] 10. Final checkpoint - Tüm testlerin geçtiğinden emin ol
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` ile işaretli görevler opsiyoneldir ve daha hızlı MVP için atlanabilir
- Her görev belirli gereksinimlere referans verir (izlenebilirlik)
- Checkpoint'ler artımlı doğrulama sağlar
- Property testleri fast-check kütüphanesi ile yazılacak
- Backend zaten `role` alanını destekliyor, minimal backend değişikliği gerekli
- Ana çalışma frontend tarafında: RoleSelector, RegisterPage güncellemesi, ClientProfilePage
