# Requirements Document

## Introduction

e-MANO platformunda kayıt sırasında kullanıcıların iki farklı profil tipinden birini seçmesini sağlayan çift profil kayıt sistemi. Kullanıcılar "Profesional" (hizmet veren profesyonel/usta) veya "Cliente" (hizmet alan müşteri) olarak kayıt olabilecek. Her profil tipi, kayıt sonrası farklı profil alanları ve dashboard deneyimi sunacak.

## Glossary

- **Registration_Page**: Kullanıcıların e-MANO platformuna kayıt olduğu sayfa (`RegisterPage.tsx`)
- **Role_Selector**: Kayıt formunda kullanıcının profil tipini seçtiği kart/buton bileşeni
- **Auth_API**: Kayıt ve kimlik doğrulama işlemlerini yöneten RTK Query API katmanı (`authApi.ts`)
- **Backend_Auth**: NestJS backend'deki kimlik doğrulama modülü ve `RegisterDto`
- **Professional_Profile_Page**: Profesyonel kullanıcıların uzmanlık, deneyim, portföy gibi bilgilerini yönettiği profil sayfası
- **Client_Profile_Page**: Müşteri kullanıcıların adres, tercih edilen hizmet türleri gibi bilgilerini yönettiği profil sayfası
- **UserRole_Enum**: Backend ve frontend'de tanımlı kullanıcı rollerini içeren enum (`PROFESSIONAL`, `USER`)
- **Dashboard_Router**: Kullanıcı rolüne göre uygun dashboard'a yönlendirme yapan bileşen
- **i18n_System**: Çoklu dil desteği sağlayan react-i18next sistemi (İspanyolca birincil, İngilizce ikincil)

## Requirements

### Requirement 1: Kayıt Formunda Rol Seçimi

**User Story:** Bir kullanıcı olarak, kayıt sırasında "Profesional" veya "Cliente" profil tipini seçmek istiyorum, böylece platforma doğru rolle kaydolabilirim.

#### Acceptance Criteria

1. WHEN a user navigates to the registration page, THE Registration_Page SHALL display two selectable profile type cards: "Profesional" and "Cliente" before the registration form fields.
2. THE Role_Selector SHALL visually distinguish the selected profile type card from the unselected card using a highlighted border or background color.
3. WHEN no profile type is selected, THE Registration_Page SHALL disable the submit button and display a validation message indicating that a profile type selection is required.
4. THE Role_Selector SHALL display a descriptive label and icon for each profile type: "Profesional" with a tools/work icon and "Cliente" with a home/person icon.
5. THE Registration_Page SHALL use i18n translation keys for all role selection labels and descriptions in both Spanish and English.

### Requirement 2: Rol Bilgisinin Backend'e Gönderilmesi

**User Story:** Bir geliştirici olarak, kayıt sırasında seçilen rolün backend'e doğru şekilde iletilmesini istiyorum, böylece kullanıcı doğru rolle oluşturulabilsin.

#### Acceptance Criteria

1. WHEN a user submits the registration form with "Profesional" selected, THE Auth_API SHALL send the `role` field with value `professional` in the registration request payload.
2. WHEN a user submits the registration form with "Cliente" selected, THE Auth_API SHALL send the `role` field with value `user` in the registration request payload.
3. THE Backend_Auth SHALL validate that the `role` field in the registration request contains only `professional` or `user` values for public registration.
4. IF the `role` field contains an unauthorized value such as `admin` or `provider`, THEN THE Backend_Auth SHALL reject the registration request with a 400 status code and a descriptive error message.
5. WHEN the registration request is processed, THE Backend_Auth SHALL store the selected role in the user record in the database.

### Requirement 3: RegisterRequest Tip Güncellemesi

**User Story:** Bir geliştirici olarak, frontend `RegisterRequest` tipinin `role` alanını içermesini istiyorum, böylece tip güvenliği sağlanabilsin.

#### Acceptance Criteria

1. THE Auth_API SHALL include an optional `role` field of type `UserRole` in the `RegisterRequest` interface.
2. WHEN the registration form is submitted, THE Auth_API SHALL include the selected role value in the request body sent to `/auth/register`.
3. THE Auth_API SHALL accept only `UserRole.PROFESSIONAL` or `UserRole.USER` as valid role values in the `RegisterRequest`.

### Requirement 4: Kayıt Sonrası Role Göre Yönlendirme

**User Story:** Bir kullanıcı olarak, kayıt sonrası rolüme uygun dashboard'a yönlendirilmek istiyorum, böylece hemen ilgili özelliklere erişebilirim.

#### Acceptance Criteria

1. WHEN a user with the `professional` role completes registration, THE Dashboard_Router SHALL redirect the user to the professional dashboard page.
2. WHEN a user with the `user` role completes registration, THE Dashboard_Router SHALL redirect the user to the client dashboard page.
3. WHEN a user completes registration and email verification is required, THE Registration_Page SHALL redirect the user to the email verification page before the role-based dashboard redirect.
4. WHEN an authenticated user navigates to the generic dashboard route, THE Dashboard_Router SHALL redirect the user to the appropriate dashboard based on the stored user role.

### Requirement 5: Profesyonel Profil Sayfası

**User Story:** Bir profesyonel olarak, uzmanlık alanlarım, deneyimim, saatlik ücretim ve portföyüm gibi bilgilerimi yönetebileceğim bir profil sayfasına sahip olmak istiyorum.

#### Acceptance Criteria

1. THE Professional_Profile_Page SHALL display editable fields for: professional type (handyman or artist), specializations, years of experience, hourly rate, business name, and service area radius.
2. THE Professional_Profile_Page SHALL display a portfolio section where the professional can view uploaded portfolio items.
3. WHEN a professional updates profile fields and clicks save, THE Professional_Profile_Page SHALL send the updated data to the backend API and display a success confirmation message.
4. IF the backend returns a validation error during profile update, THEN THE Professional_Profile_Page SHALL display the specific error message next to the relevant field.
5. THE Professional_Profile_Page SHALL use i18n translation keys for all labels and messages in both Spanish and English.
6. WHILE the profile data is loading from the backend, THE Professional_Profile_Page SHALL display a loading indicator.

### Requirement 6: Müşteri Profil Sayfası

**User Story:** Bir müşteri olarak, adresim ve tercih ettiğim hizmet türleri gibi bilgilerimi yönetebileceğim bir profil sayfasına sahip olmak istiyorum.

#### Acceptance Criteria

1. THE Client_Profile_Page SHALL display editable fields for: address (street, city, state, postal code), preferred service categories, and contact phone number.
2. THE Client_Profile_Page SHALL display a booking history summary section showing the count of past bookings by status.
3. WHEN a client updates profile fields and clicks save, THE Client_Profile_Page SHALL send the updated data to the backend API and display a success confirmation message.
4. IF the backend returns a validation error during profile update, THEN THE Client_Profile_Page SHALL display the specific error message next to the relevant field.
5. THE Client_Profile_Page SHALL use i18n translation keys for all labels and messages in both Spanish and English.
6. WHILE the profile data is loading from the backend, THE Client_Profile_Page SHALL display a loading indicator.

### Requirement 7: i18n Çeviri Anahtarları

**User Story:** Bir kullanıcı olarak, rol seçimi ve profil sayfalarındaki tüm metinleri tercih ettiğim dilde (İspanyolca veya İngilizce) görmek istiyorum.

#### Acceptance Criteria

1. THE i18n_System SHALL include Spanish and English translation keys for role selection labels: "Profesional" / "Professional" and "Cliente" / "Client".
2. THE i18n_System SHALL include Spanish and English translation keys for role selection descriptions explaining each profile type.
3. THE i18n_System SHALL include Spanish and English translation keys for all professional profile page labels and messages.
4. THE i18n_System SHALL include Spanish and English translation keys for all client profile page labels and messages.
5. THE i18n_System SHALL include Spanish and English translation keys for validation error messages related to role selection and profile forms.

### Requirement 8: Erişilebilirlik (Accessibility)

**User Story:** Bir kullanıcı olarak, rol seçimi ve profil sayfalarını ekran okuyucu ve klavye ile kullanabilmek istiyorum.

#### Acceptance Criteria

1. THE Role_Selector SHALL support keyboard navigation, allowing users to select a profile type using Tab and Enter or Space keys.
2. THE Role_Selector SHALL include appropriate ARIA attributes: `role="radiogroup"` for the container and `role="radio"` with `aria-checked` for each option.
3. WHEN a profile type card is selected, THE Role_Selector SHALL announce the selection change to screen readers using `aria-live` or equivalent mechanism.
4. THE Professional_Profile_Page and Client_Profile_Page SHALL associate all form labels with their corresponding input fields using `htmlFor` and `id` attributes.
