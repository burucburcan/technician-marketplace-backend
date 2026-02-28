# Gereksinimler Dokümanı

## Giriş

Bu doküman, Meksika ve Güney Amerika pazarı için geliştirilecek teknisyen/usta bulma platformunun gereksinimlerini tanımlar. Platform, ev tamiratı, bakım ve kurulum hizmetleri arayan kullanıcıları kalifiye teknisyenlerle buluşturan çok taraflı bir pazar yeri sistemidir.

## Sözlük

- **Platform**: Profesyonel hizmet ve ürün bulma sistemi
- **Admin**: Platformu yöneten sistem yöneticisi
- **Provider**: Profesyonelleri yöneten ve platform ile entegre olan servis sağlayıcı şirket
- **Professional**: Servis sağlayan kalifiye profesyonel (teknisyen veya sanatçı)
- **Handyman**: Teknik servis sağlayan kalifiye teknisyen/usta
- **Artist**: Sanatsal hizmet sağlayan profesyonel (ressam, heykeltıraş, dekoratör vb.)
- **Supplier**: Malzeme ve yedek parça satan tedarikçi/satıcı
- **User**: Platform üzerinden hizmet veya ürün arayan son kullanıcı
- **Service_Request**: Kullanıcının oluşturduğu hizmet talebi
- **Booking**: Onaylanmış rezervasyon kaydı
- **Product**: Satışa sunulan malzeme veya yedek parça
- **Order**: Ürün siparişi
- **Profile**: Profesyonel, tedarikçi veya kullanıcı profil bilgileri
- **Service_Category**: Hizmet kategorisi (elektrik, tesisat, duvar resmi, heykel vb.)
- **Product_Category**: Ürün kategorisi (elektrik malzemeleri, boya, tesisat parçaları vb.)
- **Professional_Type**: Profesyonel tipi (HANDYMAN veya ARTIST)
- **Portfolio**: Sanatçının çalışma örnekleri galerisi
- **Inventory**: Tedarikçi stok yönetimi
- **Rating**: Kullanıcı değerlendirme puanı (hizmet veya ürün için)
- **Notification**: Sistem bildirimi

## Gereksinimler

### Gereksinim 1: Kullanıcı Kaydı ve Kimlik Doğrulama

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, platforma güvenli bir şekilde kaydolup giriş yapabilmek istiyorum, böylece hizmetlere erişebilirim.

#### Kabul Kriterleri

1. WHEN bir kullanıcı geçerli email ve şifre ile kayıt olduğunda, THE Platform SHALL kullanıcı hesabı oluşturmalı ve email doğrulama linki göndermelidir
2. WHEN bir kullanıcı email doğrulama linkine tıkladığında, THE Platform SHALL hesabı aktif hale getirmelidir
3. WHEN bir kullanıcı geçerli kimlik bilgileri ile giriş yaptığında, THE Platform SHALL oturum token'ı oluşturmalı ve kullanıcıyı dashboard'a yönlendirmelidir
4. IF bir kullanıcı yanlış kimlik bilgileri girerse, THEN THE Platform SHALL hata mesajı göstermeli ve giriş denemesini kaydetmelidir
5. WHEN bir kullanıcı şifre sıfırlama talebinde bulunduğunda, THE Platform SHALL kayıtlı email adresine sıfırlama linki göndermelidir
6. THE Platform SHALL kullanıcı şifrelerini hash'leyerek saklamalıdır

### Gereksinim 2: Çok Dilli Destek

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, platformu kendi dilimde kullanabilmek istiyorum, böylece hizmetleri daha iyi anlayabilirim.

#### Kabul Kriterleri

1. THE Platform SHALL İspanyolca ve İngilizce dil seçeneklerini desteklemelidir
2. WHEN bir kullanıcı dil seçimi yaptığında, THE Platform SHALL tüm arayüz metinlerini seçilen dilde göstermelidir
3. WHEN bir kullanıcı profil oluşturduğunda, THE Platform SHALL tercih edilen dili kullanıcı ayarlarına kaydetmelidir
4. THE Platform SHALL hizmet açıklamalarını ve kategori isimlerini her iki dilde saklamalıdır

### Gereksinim 3: Profesyonel Profil Yönetimi

**Kullanıcı Hikayesi:** Bir profesyonel (teknisyen veya sanatçı) olarak, yeteneklerimi ve deneyimimi sergileyebilmek istiyorum, böylece müşteriler beni bulabilir ve güvenebilir.

#### Kabul Kriterleri

1. WHEN bir profesyonel profil oluşturduğunda, THE Platform SHALL ad, soyad, profesyonel tipi (teknisyen/sanatçı), uzmanlık alanları, deneyim yılı, sertifikalar ve profil fotoğrafı bilgilerini kaydetmelidir
2. THE Platform SHALL profesyonel profilinde iletişim bilgilerini (telefon, email) saklamalıdır
3. WHEN bir profesyonel uzmanlık alanı eklediğinde, THE Platform SHALL bu alanı mevcut Service_Category listesinden seçmesine izin vermelidir
4. WHEN bir profesyonel profil bilgilerini güncellediğinde, THE Platform SHALL değişiklikleri anında kaydetmeli ve profil sayfasına yansıtmalıdır
5. THE Platform SHALL profesyonel profilinde çalışma bölgesi bilgisini (şehir, bölge) saklamalıdır
6. WHEN bir profesyonel sertifika yüklediğinde, THE Platform SHALL dosyayı güvenli bir şekilde saklamalı ve profilde görüntülemelidir
7. WHEN bir sanatçı profil oluşturduğunda, THE Platform SHALL portfolyo (çalışma örnekleri) yükleme imkanı sunmalıdır
8. THE Platform SHALL sanatçı portfolyosunda en az 3, en fazla 20 görsel saklamalıdır
9. WHEN bir sanatçı portfolyo görseli yüklediğinde, THE Platform SHALL görseli optimize etmeli ve farklı boyutlarda saklamalıdır
10. THE Platform SHALL sanatçı profilinde sanat tarzı, kullanılan malzemeler ve özel teknikler bilgilerini saklamalıdır

### Gereksinim 4: Hizmet Kategorileri ve Arama

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, ihtiyacım olan hizmet türüne göre profesyonel arayabilmek istiyorum, böylece doğru uzmanlığa sahip kişileri bulabilirim.

#### Kabul Kriterleri

1. THE Platform SHALL teknik kategorileri (elektrik, tesisat, klima, boyama, marangozluk, temizlik, genel bakım) ve sanatsal kategorileri (duvar resmi, heykel, dekoratif sanat, mozaik, fresk, özel tasarım) desteklemelidir
2. WHEN bir kullanıcı kategori seçtiğinde, THE Platform SHALL o kategoride uzman profesyonelleri listelemelidir
3. WHEN bir kullanıcı konum bilgisi girdiğinde, THE Platform SHALL sadece o bölgede çalışan profesyonelleri göstermelidir
4. THE Platform SHALL arama sonuçlarını profesyonel puanına göre sıralayabilmelidir
5. WHEN bir kullanıcı arama filtresi uyguladığında, THE Platform SHALL sonuçları gerçek zamanlı olarak güncellemelidir
6. THE Platform SHALL her kategoride minimum 3 profesyonel bulunmasını sağlamalıdır
7. WHEN bir kullanıcı sanatçı ararken, THE Platform SHALL portfolyo görsellerini arama sonuçlarında önizleme olarak göstermelidir
8. THE Platform SHALL kullanıcılara profesyonel tipine göre (teknisyen/sanatçı) filtreleme imkanı sunmalıdır

### Gereksinim 5: Rezervasyon Sistemi

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, seçtiğim profesyonelden hizmet rezervasyonu yapabilmek istiyorum, böylece randevu alabilir ve hizmet alabilirim.

#### Kabul Kriterleri

1. WHEN bir kullanıcı profesyonel seçip rezervasyon oluşturduğunda, THE Platform SHALL hizmet türü, tarih, saat, adres ve açıklama bilgilerini kaydetmelidir
2. WHEN bir rezervasyon oluşturulduğunda, THE Platform SHALL profesyonele bildirim göndermelidir
3. WHEN bir profesyonel rezervasyonu onayladığında, THE Platform SHALL Booking kaydı oluşturmalı ve kullanıcıya onay bildirimi göndermelidir
4. WHEN bir profesyonel rezervasyonu reddeddiğinde, THE Platform SHALL kullanıcıya bildirim göndermeli ve alternatif profesyoneller önermelidir
5. THE Platform SHALL aynı profesyonel için çakışan zaman dilimlerinde rezervasyon oluşturulmasını engellemelidir
6. WHEN bir rezervasyon tarihi 24 saatten az kaldığında, THE Platform SHALL hem kullanıcıya hem profesyonele hatırlatma bildirimi göndermelidir
7. WHEN bir sanatçı rezervasyonu oluşturulduğunda, THE Platform SHALL proje detayları, beklenen süre ve referans görseller yükleme imkanı sunmalıdır
8. THE Platform SHALL sanatsal projeler için tahmini süre ve fiyat aralığı bilgilerini saklamalıdır

### Gereksinim 6: Rezervasyon Durumu Takibi

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, rezervasyonumun durumunu takip edebilmek istiyorum, böylece hizmetin hangi aşamada olduğunu bilebilirim.

#### Kabul Kriterleri

1. THE Platform SHALL rezervasyon durumlarını Pending, Confirmed, In_Progress, Completed, Cancelled olarak yönetmelidir
2. WHEN bir rezervasyon durumu değiştiğinde, THE Platform SHALL ilgili taraflara bildirim göndermelidir
3. WHEN bir profesyonel hizmete başladığında, THE Platform SHALL rezervasyon durumunu In_Progress olarak güncellemelidir
4. WHEN bir profesyonel hizmeti tamamladığında, THE Platform SHALL rezervasyon durumunu Completed olarak işaretlemeli ve kullanıcıdan değerlendirme istemelidir
5. THE Platform SHALL kullanıcının aktif ve geçmiş rezervasyonlarını ayrı listelerde göstermelidir
6. WHEN bir kullanıcı rezervasyonu iptal ettiğinde, THE Platform SHALL iptal nedenini kaydetmeli ve profesyonele bildirim göndermelidir
7. WHEN bir sanatsal proje In_Progress durumuna geçtiğinde, THE Platform SHALL sanatçıya ilerleme fotoğrafları yükleme imkanı sunmalıdır
8. THE Platform SHALL kullanıcılara sanatsal projelerin ilerleme fotoğraflarını görüntüleme imkanı sunmalıdır

### Gereksinim 7: Değerlendirme ve Puanlama Sistemi

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, aldığım hizmeti değerlendirebilmek istiyorum, böylece diğer kullanıcılara yardımcı olabilir ve kaliteyi artırabilirim.

#### Kabul Kriterleri

1. WHEN bir hizmet tamamlandığında, THE Platform SHALL kullanıcıya 1-5 yıldız arası puanlama ve yorum yazma imkanı sunmalıdır
2. WHEN bir kullanıcı değerlendirme gönderdiğinde, THE Platform SHALL Rating kaydı oluşturmalı ve teknisyen profiline eklemelidir
3. THE Platform SHALL teknisyen ortalama puanını tüm değerlendirmelere göre hesaplamalı ve profilde göstermelidir
4. THE Platform SHALL sadece Completed durumundaki rezervasyonlar için değerlendirme yapılmasına izin vermelidir
5. WHEN bir teknisyen değerlendirme aldığında, THE Platform SHALL bildirim göndermelidir
6. THE Platform SHALL her kullanıcının bir rezervasyon için sadece bir kez değerlendirme yapmasına izin vermelidir

### Gereksinim 8: Provider Yönetim Paneli

**Kullanıcı Hikayesi:** Bir provider olarak, profesyonellerimi yönetebilmek ve performanslarını takip edebilmek istiyorum, böylece hizmet kalitesini artırabilirim.

#### Kabul Kriterleri

1. WHEN bir provider giriş yaptığında, THE Platform SHALL bağlı tüm profesyonellerin listesini göstermelidir
2. THE Platform SHALL provider'ın yeni profesyonel eklemesine, düzenlemesine ve devre dışı bırakmasına izin vermelidir
3. WHEN bir provider profesyonel eklerken, THE Platform SHALL profesyonel bilgilerini doğrulamalı ve onay bekletmelidir
4. THE Platform SHALL provider'a profesyonellerin rezervasyon istatistiklerini (toplam, tamamlanan, iptal edilen) göstermelidir
5. THE Platform SHALL provider'a profesyonellerin ortalama puanlarını ve aldıkları yorumları göstermelidir
6. WHEN bir provider profesyoneli devre dışı bıraktığında, THE Platform SHALL o profesyonelin yeni rezervasyon almasını engellemelidir
7. THE Platform SHALL provider'a profesyonel tipine göre (teknisyen/sanatçı) filtreleme imkanı sunmalıdır

### Gereksinim 9: Admin Yönetim Paneli

**Kullanıcı Hikayesi:** Bir admin olarak, tüm platformu yönetebilmek istiyorum, böylece kullanıcıları, provider'ları ve içeriği kontrol edebilirim.

#### Kabul Kriterleri

1. THE Platform SHALL admin'e tüm kullanıcıları, provider'ları ve profesyonelleri listeleme yetkisi vermelidir
2. THE Platform SHALL admin'e herhangi bir hesabı askıya alma veya silme yetkisi vermelidir
3. WHEN admin bir hesabı askıya aldığında, THE Platform SHALL o hesabın giriş yapmasını engellemelidir
4. THE Platform SHALL admin'e hizmet kategorilerini ekleme, düzenleme ve silme yetkisi vermelidir
5. THE Platform SHALL admin'e platform istatistiklerini (toplam kullanıcı, rezervasyon, gelir) göstermelidir
6. THE Platform SHALL admin'e kullanıcı şikayetlerini görüntüleme ve yönetme yetkisi vermelidir
7. THE Platform SHALL admin'e sanatçı portfolyolarını inceleme ve onaylama yetkisi vermelidir
8. THE Platform SHALL admin'e profesyonel tipine göre (teknisyen/sanatçı) istatistik görüntüleme imkanı sunmalıdır

### Gereksinim 10: Bildirim Sistemi

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, rezervasyonlarım ve platform aktiviteleri hakkında bilgilendirilmek istiyorum, böylece önemli güncellemeleri kaçırmam.

#### Kabul Kriterleri

1. WHEN bir rezervasyon oluşturulduğunda, THE Platform SHALL teknisyene email ve platform içi bildirim göndermelidir
2. WHEN bir rezervasyon onaylandığında, THE Platform SHALL kullanıcıya email ve platform içi bildirim göndermelidir
3. WHEN bir rezervasyon iptal edildiğinde, THE Platform SHALL her iki tarafa da bildirim göndermelidir
4. THE Platform SHALL kullanıcılara okunmamış bildirimlerin sayısını göstermelidir
5. WHEN bir kullanıcı bildirime tıkladığında, THE Platform SHALL ilgili sayfaya yönlendirmeli ve bildirimi okundu olarak işaretlemelidir
6. THE Platform SHALL kullanıcılara bildirim tercihlerini yönetme imkanı sunmalıdır

### Gereksinim 11: İletişim ve Mesajlaşma

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, profesyonelle doğrudan iletişim kurabilmek istiyorum, böylece hizmet detaylarını netleştirebilirim.

#### Kabul Kriterleri

1. WHEN bir rezervasyon oluşturulduğunda, THE Platform SHALL kullanıcı ve profesyonel arasında mesajlaşma kanalı açmalıdır
2. WHEN bir kullanıcı mesaj gönderdiğinde, THE Platform SHALL mesajı kaydetmeli ve alıcıya bildirim göndermelidir
3. THE Platform SHALL mesajlaşma geçmişini her iki taraf için de saklamalıdır
4. THE Platform SHALL sadece aktif rezervasyonu olan kullanıcıların mesajlaşmasına izin vermelidir
5. WHEN bir rezervasyon tamamlandığında, THE Platform SHALL mesajlaşma kanalını salt okunur hale getirmelidir
6. THE Platform SHALL mesajlarda uygunsuz içerik için otomatik filtreleme yapmalıdır
7. THE Platform SHALL kullanıcıların ve sanatçıların mesajlaşma sırasında görsel paylaşmasına izin vermelidir
8. WHEN bir sanatçı proje görseli paylaştığında, THE Platform SHALL görseli optimize etmeli ve güvenli bir şekilde saklamalıdır

### Gereksinim 12: Ödeme Entegrasyonu

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, hizmet bedelini güvenli bir şekilde ödeyebilmek istiyorum, böylece işlem güvenliğinden emin olabilirim.

#### Kabul Kriterleri

1. WHEN bir rezervasyon onaylandığında, THE Platform SHALL kullanıcıya ödeme seçeneklerini sunmalıdır
2. THE Platform SHALL kredi kartı, banka kartı ve dijital cüzdan ödeme yöntemlerini desteklemelidir
3. WHEN bir ödeme işlemi başlatıldığında, THE Platform SHALL ödeme bilgilerini şifreli olarak işlemelidir
4. WHEN bir ödeme başarılı olduğunda, THE Platform SHALL ödeme onayını kaydetmeli ve kullanıcıya fatura göndermelidir
5. IF bir ödeme başarısız olursa, THEN THE Platform SHALL kullanıcıya hata mesajı göstermeli ve tekrar deneme imkanı sunmalıdır
6. THE Platform SHALL hizmet tamamlanana kadar ödemeyi emanette tutmalı, tamamlandıktan sonra teknisyene transfer etmelidir
7. WHEN bir kullanıcı rezervasyon oluştururken, THE Platform SHALL fatura veya faturasız ödeme seçeneği sunmalıdır
8. IF kullanıcı faturalı ödeme seçerse, THEN THE Platform SHALL vergi numarası ve fatura bilgilerini istemelidir
9. WHEN faturalı ödeme tamamlandığında, THE Platform SHALL yasal gerekliliklere uygun resmi fatura oluşturmalı ve kullanıcıya göndermelidir
10. WHEN faturasız ödeme tamamlandığında, THE Platform SHALL basit ödeme makbuzu oluşturmalı ve kullanıcıya göndermelidir
11. THE Platform SHALL faturalı ödemelerde KDV/vergi hesaplamasını otomatik olarak yapmalıdır

### Gereksinim 13: Coğrafi Konum ve Harita Entegrasyonu

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, yakınımdaki teknisyenleri görebilmek istiyorum, böylece hızlı hizmet alabilirim.

#### Kabul Kriterleri

1. WHEN bir kullanıcı konum izni verdiğinde, THE Platform SHALL mevcut konumu tespit etmeli ve yakındaki teknisyenleri göstermelidir
2. THE Platform SHALL teknisyenleri harita üzerinde işaretleyerek görselleştirmelidir
3. WHEN bir kullanıcı adres girdiğinde, THE Platform SHALL adresi koordinatlara dönüştürmeli ve mesafe hesaplamalıdır
4. THE Platform SHALL teknisyenleri kullanıcıya olan uzaklığa göre sıralayabilmelidir
5. THE Platform SHALL sadece 50 km yarıçapındaki teknisyenleri göstermelidir
6. WHEN bir rezervasyon oluşturulduğunda, THE Platform SHALL hizmet adresini harita üzerinde göstermelidir

### Gereksinim 14: Güvenlik ve Veri Koruma

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, kişisel bilgilerimin güvende olduğundan emin olmak istiyorum, böylece platformu güvenle kullanabilirim.

#### Kabul Kriterleri

1. THE Platform SHALL tüm hassas verileri (şifreler, ödeme bilgileri) şifreli olarak saklamalıdır
2. THE Platform SHALL HTTPS protokolü kullanarak tüm iletişimi şifrelemelidir
3. WHEN bir kullanıcı 5 kez yanlış giriş denemesi yaptığında, THE Platform SHALL hesabı geçici olarak kilitlemeli ve email bildirimi göndermelidir
4. THE Platform SHALL kullanıcı oturumlarını 24 saat sonra otomatik olarak sonlandırmalıdır
5. THE Platform SHALL kullanıcılara kişisel verilerini indirme ve silme hakkı sunmalıdır
6. THE Platform SHALL tüm veri erişim loglarını kaydetmeli ve düzenli olarak denetlemelidir

### Gereksinim 15: Mobil Uyumluluk

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, platformu mobil cihazımdan kullanabilmek istiyorum, böylece her yerden erişim sağlayabilirim.

#### Kabul Kriterleri

1. THE Platform SHALL responsive tasarım kullanarak mobil, tablet ve masaüstü cihazlarda düzgün görüntülenmelidir
2. WHEN bir kullanıcı mobil cihazdan eriştiğinde, THE Platform SHALL dokunmatik kontrollere optimize edilmiş arayüz sunmalıdır
3. THE Platform SHALL mobil cihazlarda hızlı yükleme için optimize edilmiş görseller kullanmalıdır
4. THE Platform SHALL mobil cihazlarda konum servislerini kullanarak otomatik konum tespiti yapmalıdır
5. THE Platform SHALL mobil cihazlarda push notification desteği sunmalıdır
6. THE Platform SHALL tüm temel işlevlerin mobil cihazlarda tam olarak çalışmasını sağlamalıdır

### Gereksinim 16: Tedarikçi ve Ürün Yönetimi

**Kullanıcı Hikayesi:** Bir tedarikçi olarak, malzeme ve yedek parçalarımı platformda satabilmek istiyorum, böylece müşterilere ulaşabilir ve kalitemi gösterebilirim.

#### Kabul Kriterleri

1. WHEN bir tedarikçi kayıt olduğunda, THE Platform SHALL şirket bilgileri, vergi numarası, adres ve iletişim bilgilerini kaydetmelidir
2. THE Platform SHALL tedarikçi profilinde şirket logosu ve tanıtım bilgilerini saklamalıdır
3. WHEN bir tedarikçi ürün eklediğinde, THE Platform SHALL ürün adı, açıklama, kategori, fiyat, stok miktarı ve ürün görselleri bilgilerini kaydetmelidir
4. THE Platform SHALL her ürün için en az 1, en fazla 10 görsel yüklenmesine izin vermelidir
5. WHEN bir ürün görseli yüklendiğinde, THE Platform SHALL görseli optimize etmeli ve farklı boyutlarda saklamalıdır
6. THE Platform SHALL tedarikçilere stok yönetimi (ekleme, güncelleme, silme) imkanı sunmalıdır
7. WHEN bir ürün stokta kalmadığında, THE Platform SHALL ürünü "stokta yok" olarak işaretlemeli ve satın alma butonunu devre dışı bırakmalıdır
8. THE Platform SHALL ürün kategorilerini (elektrik malzemeleri, tesisat parçaları, boya ve vernik, ahşap malzemeler, dekoratif ürünler, sanat malzemeleri) desteklemelidir
9. THE Platform SHALL tedarikçilerin ürün özelliklerini (marka, model, boyut, renk, malzeme) eklemesine izin vermelidir
10. WHEN bir tedarikçi ürün fiyatını güncellediğinde, THE Platform SHALL değişikliği anında yansıtmalı ve aktif sepetlerdeki fiyatları güncellemelidir

### Gereksinim 17: Ürün Arama ve Satın Alma

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, ihtiyacım olan malzemeleri ve yedek parçaları platformdan satın alabilmek istiyorum, böylece tek bir yerden hem hizmet hem ürün alabilirim.

#### Kabul Kriterleri

1. WHEN bir kullanıcı ürün ararken, THE Platform SHALL kategori, fiyat aralığı, marka ve tedarikçiye göre filtreleme imkanı sunmalıdır
2. THE Platform SHALL arama sonuçlarını fiyat, popülerlik ve tedarikçi puanına göre sıralayabilmelidir
3. WHEN bir kullanıcı ürün detayına tıkladığında, THE Platform SHALL ürün görselleri, açıklama, özellikler, fiyat, stok durumu ve tedarikçi bilgilerini göstermelidir
4. THE Platform SHALL kullanıcılara ürünleri sepete ekleme imkanı sunmalıdır
5. WHEN bir kullanıcı sepete ürün eklediğinde, THE Platform SHALL sepet içeriğini ve toplam tutarı güncellemelidir
6. THE Platform SHALL kullanıcılara sepetteki ürün miktarını artırma, azaltma ve silme imkanı sunmalıdır
7. WHEN bir kullanıcı sipariş verdiğinde, THE Platform SHALL teslimat adresi, ödeme yöntemi ve fatura bilgilerini istemelidir
8. THE Platform SHALL sipariş onaylandığında kullanıcıya ve tedarikçiye bildirim göndermelidir
9. WHEN bir sipariş oluşturulduğunda, THE Platform SHALL sipariş numarası, ürünler, toplam tutar ve tahmini teslimat tarihi bilgilerini kaydetmelidir
10. THE Platform SHALL kullanıcılara sipariş geçmişini görüntüleme imkanı sunmalıdır

### Gereksinim 18: Sipariş Takibi ve Teslimat

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, siparişlerimin durumunu takip edebilmek istiyorum, böylece ürünlerimin ne zaman geleceğini bilebilirim.

#### Kabul Kriterleri

1. THE Platform SHALL sipariş durumlarını Pending, Confirmed, Preparing, Shipped, Delivered, Cancelled olarak yönetmelidir
2. WHEN bir sipariş durumu değiştiğinde, THE Platform SHALL kullanıcıya ve tedarikçiye bildirim göndermelidir
3. WHEN bir tedarikçi siparişi onayladığında, THE Platform SHALL sipariş durumunu Confirmed olarak güncellemelidir
4. WHEN bir tedarikçi kargo bilgilerini girdiğinde, THE Platform SHALL sipariş durumunu Shipped olarak güncellemeli ve takip numarasını kullanıcıya göndermelidir
5. THE Platform SHALL kullanıcılara sipariş takip numarası ile kargo durumunu sorgulama imkanı sunmalıdır
6. WHEN bir sipariş teslim edildiğinde, THE Platform SHALL sipariş durumunu Delivered olarak işaretlemeli ve kullanıcıdan ürün değerlendirmesi istemelidir
7. THE Platform SHALL kullanıcılara sipariş iptal etme imkanı sunmalıdır (sadece Pending ve Confirmed durumlarında)
8. WHEN bir kullanıcı siparişi iptal ettiğinde, THE Platform SHALL iptal nedenini kaydetmeli, tedarikçiye bildirim göndermeli ve ödemeyi iade etmelidir

### Gereksinim 19: Ürün Değerlendirme ve Tedarikçi Puanlama

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, satın aldığım ürünleri ve tedarikçileri değerlendirebilmek istiyorum, böylece diğer kullanıcılara yardımcı olabilirim.

#### Kabul Kriterleri

1. WHEN bir sipariş teslim edildiğinde, THE Platform SHALL kullanıcıya ürün ve tedarikçi değerlendirmesi yapma imkanı sunmalıdır
2. THE Platform SHALL kullanıcılara ürün için 1-5 yıldız arası puan ve yorum yazma imkanı sunmalıdır
3. THE Platform SHALL kullanıcılara tedarikçi için 1-5 yıldız arası puan (ürün kalitesi, teslimat hızı, iletişim) ve yorum yazma imkanı sunmalıdır
4. WHEN bir kullanıcı ürün değerlendirmesi gönderdiğinde, THE Platform SHALL değerlendirmeyi ürün sayfasında göstermelidir
5. THE Platform SHALL ürün ortalama puanını tüm değerlendirmelere göre hesaplamalı ve ürün sayfasında göstermelidir
6. THE Platform SHALL tedarikçi ortalama puanını tüm değerlendirmelere göre hesaplamalı ve tedarikçi profilinde göstermelidir
7. THE Platform SHALL sadece Delivered durumundaki siparişler için değerlendirme yapılmasına izin vermelidir
8. THE Platform SHALL her kullanıcının bir sipariş için sadece bir kez değerlendirme yapmasına izin vermelidir
9. WHEN bir tedarikçi değerlendirme aldığında, THE Platform SHALL bildirim göndermelidir
10. THE Platform SHALL tedarikçilere değerlendirmelere yanıt verme imkanı sunmalıdır
