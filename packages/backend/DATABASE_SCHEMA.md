# Database Schema Documentation

## Overview

The Technician Marketplace Platform uses a hybrid database architecture:
- **PostgreSQL**: Primary relational database for structured data
- **MongoDB**: Document store for messaging and activity logs
- **Redis**: Cache and session storage
- **Elasticsearch**: Search indexing for professionals and products

## PostgreSQL Entities

### User Management

#### users
Core user authentication table
- `id` (uuid, PK)
- `email` (string, unique)
- `password_hash` (string)
- `role` (enum: admin, provider, professional, supplier, user)
- `is_email_verified` (boolean)
- `two_factor_enabled` (boolean)
- `two_factor_secret` (string, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### user_profiles
User profile information
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `first_name` (string)
- `last_name` (string)
- `phone` (string)
- `avatar_url` (string, nullable)
- `language` (string, default: 'es')
- `location` (jsonb: address, city, state, country, postalCode, coordinates)
- `preferences` (jsonb: notifications, currency)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Professional Management

#### professional_profiles
Professional (handyman/artist) profiles
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `professional_type` (enum: handyman, artist)
- `business_name` (string, nullable)
- `experience_years` (int)
- `hourly_rate` (decimal)
- `service_radius` (int, km)
- `working_hours` (jsonb)
- `verification_status` (enum: pending, verified, rejected)
- `is_available` (boolean)
- `current_location` (jsonb: latitude, longitude, nullable)
- `rating` (decimal)
- `total_jobs` (int)
- `completion_rate` (decimal)
- Artist-specific fields:
  - `art_style` (text[])
  - `materials` (text[])
  - `techniques` (text[])
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### certificates
Professional certificates
- `id` (uuid, PK)
- `professional_id` (uuid, FK → professional_profiles)
- `name` (string)
- `issuer` (string)
- `issue_date` (date)
- `expiry_date` (date, nullable)
- `file_url` (string)
- `verified_by_admin` (boolean)
- `created_at` (timestamp)

#### portfolio_items
Artist portfolio items
- `id` (uuid, PK)
- `professional_id` (uuid, FK → professional_profiles)
- `image_url` (string)
- `thumbnail_url` (string)
- `title` (string)
- `description` (text, nullable)
- `category` (string)
- `completion_date` (date, nullable)
- `dimensions` (string, nullable)
- `materials` (text[], nullable)
- `display_order` (int)
- `created_at` (timestamp)

### Categories

#### service_categories
Service categories for professionals
- `id` (uuid, PK)
- `name` (string, unique)
- `name_translations` (jsonb: es, en)
- `description` (text, nullable)
- `is_technical` (boolean)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### product_categories
Product categories for suppliers
- `id` (uuid, PK)
- `name` (string, unique)
- `name_translations` (jsonb: es, en)
- `description` (text, nullable)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Booking System

#### bookings
Service bookings
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `professional_id` (uuid, FK → professional_profiles)
- `professional_type` (enum: handyman, artist)
- `service_category` (string)
- `status` (enum: pending, confirmed, in_progress, completed, cancelled, rejected, disputed, resolved)
- `scheduled_date` (timestamp)
- `estimated_duration` (int, minutes)
- `service_address` (jsonb)
- `description` (text)
- `estimated_price` (decimal)
- `actual_price` (decimal, nullable)
- `payment_status` (enum: pending, authorized, captured, refunded, failed)
- Artist project fields:
  - `project_details` (jsonb: projectType, estimatedDuration, priceRange, specialRequirements, materials)
  - `progress_photos` (jsonb[]: id, url, caption, uploadedAt, uploadedBy)
  - `reference_images` (text[])
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `started_at` (timestamp, nullable)
- `completed_at` (timestamp, nullable)
- `cancelled_at` (timestamp, nullable)
- `cancellation_reason` (text, nullable)

#### service_ratings
Service ratings and reviews
- `id` (uuid, PK)
- `booking_id` (uuid)
- `user_id` (uuid, FK → users)
- `professional_id` (uuid, FK → professional_profiles)
- `score` (int, 1-5)
- `comment` (text)
- `category_ratings` (jsonb[]: category, score)
- `photo_urls` (text[])
- `is_verified` (boolean)
- `moderation_status` (string)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Supplier & Product System

#### supplier_profiles
Supplier profiles
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `company_name` (string)
- `tax_id` (string)
- `business_address` (jsonb)
- `contact_phone` (string)
- `contact_email` (string)
- `logo_url` (string, nullable)
- `description` (text, nullable)
- `verification_status` (enum: pending, verified, rejected)
- `rating` (decimal)
- `total_orders` (int)
- `response_rate` (decimal)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### products
Products for sale
- `id` (uuid, PK)
- `supplier_id` (uuid, FK → supplier_profiles)
- `name` (string)
- `description` (text)
- `category` (string)
- `price` (decimal)
- `currency` (string)
- `stock_quantity` (int)
- `is_available` (boolean)
- `specifications` (jsonb[]: key, value, unit)
- `brand` (string, nullable)
- `model` (string, nullable)
- `rating` (decimal)
- `total_reviews` (int)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### product_images
Product images
- `id` (uuid, PK)
- `product_id` (uuid, FK → products)
- `image_url` (string)
- `thumbnail_url` (string)
- `display_order` (int)
- `created_at` (timestamp)

#### carts
Shopping carts
- `id` (uuid, PK)
- `user_id` (uuid, FK → users)
- `subtotal` (decimal)
- `total` (decimal)
- `currency` (string)
- `updated_at` (timestamp)

#### cart_items
Cart items
- `id` (uuid, PK)
- `cart_id` (uuid, FK → carts)
- `product_id` (uuid, FK → products)
- `quantity` (int)
- `price` (decimal)
- `subtotal` (decimal)

#### orders
Product orders
- `id` (uuid, PK)
- `order_number` (string, unique)
- `user_id` (uuid, FK → users)
- `supplier_id` (uuid, FK → supplier_profiles)
- `subtotal` (decimal)
- `shipping_cost` (decimal)
- `tax` (decimal)
- `total` (decimal)
- `currency` (string)
- `status` (enum: pending, confirmed, preparing, shipped, delivered, cancelled)
- `shipping_address` (jsonb)
- `billing_address` (jsonb)
- `payment_method` (string)
- `payment_status` (enum: pending, authorized, captured, refunded, failed)
- `tracking_number` (string, nullable)
- `carrier` (string, nullable)
- `estimated_delivery` (timestamp, nullable)
- `delivered_at` (timestamp, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### order_items
Order items
- `id` (uuid, PK)
- `order_id` (uuid, FK → orders)
- `product_id` (uuid, FK → products)
- `product_name` (string)
- `product_image` (string)
- `quantity` (int)
- `price` (decimal)
- `subtotal` (decimal)

#### product_reviews
Product reviews
- `id` (uuid, PK)
- `order_id` (uuid)
- `user_id` (uuid, FK → users)
- `product_id` (uuid, FK → products)
- `rating` (int, 1-5)
- `comment` (text)
- `images` (text[])
- `is_verified_purchase` (boolean)
- `helpful_count` (int)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### supplier_reviews
Supplier reviews
- `id` (uuid, PK)
- `order_id` (uuid)
- `user_id` (uuid, FK → users)
- `supplier_id` (uuid, FK → supplier_profiles)
- `product_quality_rating` (int, 1-5)
- `delivery_speed_rating` (int, 1-5)
- `communication_rating` (int, 1-5)
- `overall_rating` (int, 1-5)
- `comment` (text)
- `created_at` (timestamp)

### Payment System

#### payments
Payment records
- `id` (uuid, PK)
- `booking_id` (uuid, FK → bookings, nullable)
- `order_id` (uuid, FK → orders, nullable)
- `amount` (decimal)
- `currency` (string)
- `status` (enum: pending, authorized, captured, refunded, failed)
- `payment_method` (string)
- `stripe_payment_id` (string, nullable)
- `platform_fee` (decimal)
- `professional_amount` (decimal, nullable)
- `invoice_type` (string, nullable)
- `tax_amount` (decimal, nullable)
- `created_at` (timestamp)

## MongoDB Collections

### conversations
Real-time messaging conversations
```javascript
{
  _id: ObjectId,
  bookingId: String (indexed),
  participants: [String] (indexed),
  messages: [
    {
      id: String,
      senderId: String,
      content: String,
      type: 'text' | 'image' | 'file',
      fileUrl: String (optional),
      isRead: Boolean,
      createdAt: Date
    }
  ],
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
- `bookingId`
- `participants`
- `messages.createdAt` (descending)

### activity_logs
System activity logs for auditing
```javascript
{
  _id: ObjectId,
  userId: String (indexed),
  action: String (indexed),
  resource: String (indexed),
  resourceId: String (indexed),
  metadata: Object,
  ipAddress: String,
  userAgent: String,
  timestamp: Date (indexed)
}
```

Indexes:
- `userId, timestamp` (compound, descending)
- `resource, resourceId` (compound)
- `action, timestamp` (compound, descending)
- `timestamp` (descending)

## Relationships

### One-to-One
- User → UserProfile
- User → ProfessionalProfile
- User → SupplierProfile
- User → Cart
- Booking → Payment
- Order → Payment

### One-to-Many
- User → Bookings
- User → Orders
- User → ServiceRatings
- User → ProductReviews
- User → SupplierReviews
- ProfessionalProfile → Certificates
- ProfessionalProfile → PortfolioItems
- ProfessionalProfile → Bookings
- SupplierProfile → Products
- SupplierProfile → Orders
- Product → ProductImages
- Product → OrderItems
- Product → CartItems
- Product → ProductReviews
- Cart → CartItems
- Order → OrderItems

### Many-to-Many
- ProfessionalProfile ↔ ServiceCategory (through professional_service_categories)

## Indexes

### Performance Indexes
- `users.email` (unique)
- `professional_profiles.user_id`
- `professional_profiles.professional_type`
- `professional_profiles.verification_status`
- `professional_profiles.is_available`
- `bookings.user_id`
- `bookings.professional_id`
- `bookings.status`
- `bookings.scheduled_date`
- `products.supplier_id`
- `products.category`
- `products.is_available`
- `orders.user_id`
- `orders.supplier_id`
- `orders.status`
- `orders.order_number` (unique)

## Enums

### UserRole
- admin
- provider
- professional
- supplier
- user

### ProfessionalType
- handyman
- artist

### VerificationStatus
- pending
- verified
- rejected

### BookingStatus
- pending
- confirmed
- in_progress
- completed
- cancelled
- rejected
- disputed
- resolved

### OrderStatus
- pending
- confirmed
- preparing
- shipped
- delivered
- cancelled

### PaymentStatus
- pending
- authorized
- captured
- refunded
- failed
