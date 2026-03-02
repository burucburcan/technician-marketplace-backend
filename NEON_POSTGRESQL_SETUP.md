# Neon.tech PostgreSQL Setup

Supabase IPv6 sorunu nedeniyle Neon.tech'e geçiyoruz.

## Adım 1: Neon.tech Hesabı Oluştur

1. https://neon.tech/ adresine git
2. "Sign Up" → GitHub ile giriş yap
3. Ücretsiz (Free Tier)

## Adım 2: Yeni Proje Oluştur

1. "Create a project" tıkla
2. Project name: `technician-marketplace`
3. Region: `AWS / US East (N. Virginia)` seç
4. PostgreSQL version: `16` (default)
5. "Create Project" tıkla

## Adım 3: Connection String Al

Proje oluşturulduktan sonra:
1. Dashboard'da "Connection string" göreceksiniz
2. "Pooled connection" sekmesini seç (önemli!)
3. Connection string'i kopyalayın

Format:
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

## Adım 4: Railway Environment Variables Güncelle

Railway dashboard'da Variables sekmesine git ve şunları değiştir:

**SİL:**
- DB_HOST
- DB_PORT
- DB_USERNAME
- DB_PASSWORD
- DB_NAME

**EKLE:**
```
DATABASE_URL=[Neon connection string buraya]
```

## Adım 5: Database Config Güncelle

Kod değişikliği gerekiyor - DATABASE_URL kullanacak şekilde.

## Neon Avantajları

- IPv4/IPv6 sorunu yok
- Otomatik scaling
- Serverless PostgreSQL
- Ücretsiz 0.5 GB storage
- Daha hızlı bağlantı
- Modern altyapı
