# Supplier Service Module

## Overview

The Supplier Service module manages supplier profiles, product catalog, inventory, pricing, and supplier statistics for the technician marketplace platform.

## Features

### 1. Supplier Profile Management
- Create supplier profile with company information
- Update supplier profile details
- Get supplier profile information
- Upload company logo

**Endpoints:**
- `POST /suppliers/profile` - Create supplier profile
- `PUT /suppliers/:id/profile` - Update supplier profile
- `GET /suppliers/:id/profile` - Get supplier profile
- `POST /suppliers/:id/profile/logo` - Upload company logo

### 2. Product Management
- Create products with details and specifications
- Update product information
- Delete products
- Get product details
- List all products for a supplier

**Endpoints:**
- `POST /suppliers/:id/products` - Create product
- `PUT /suppliers/products/:productId` - Update product
- `DELETE /suppliers/products/:productId` - Delete product
- `GET /suppliers/products/:productId` - Get product details
- `GET /suppliers/:id/products` - List supplier products

### 3. Stock Management
- Update product stock quantity
- Get stock status
- Automatic "out of stock" marking when quantity is 0
- Low stock threshold detection (≤10 units)

**Endpoints:**
- `PUT /suppliers/products/:productId/stock` - Update stock
- `GET /suppliers/products/:productId/stock` - Get stock status

### 4. Product Image Management
- Upload product images (max 10 per product)
- Delete product images (min 1 required)
- Reorder product images
- Automatic image optimization and thumbnail generation

**Endpoints:**
- `POST /suppliers/products/:productId/images` - Upload image
- `DELETE /suppliers/products/:productId/images/:imageId` - Delete image
- `PUT /suppliers/products/:productId/images/reorder` - Reorder images

### 5. Price Management
- Update product prices
- Automatic cart price updates when product price changes

**Endpoints:**
- `PUT /suppliers/products/:productId/price` - Update price

### 6. Supplier Statistics
- Total products count
- Active products count
- Total orders count
- Completed orders count
- Average rating
- Total revenue
- Response rate

**Endpoints:**
- `GET /suppliers/:id/stats` - Get supplier statistics

## Requirements Validation

### Requirement 16.1 - Supplier Profile Management ✓
- Supplier registration with company info, tax ID, address, contact details
- Company logo storage
- Profile information display

### Requirement 16.2 - Profile Updates ✓
- Update supplier profile information
- Logo upload functionality

### Requirement 16.3 - Product Management ✓
- Create products with name, description, category, price, stock
- Update product information
- Delete products
- Product specifications support

### Requirement 16.4 - Product Images (Min 1, Max 10) ✓
- Minimum 1 image validation
- Maximum 10 images validation
- Image upload functionality

### Requirement 16.5 - Image Optimization ✓
- Image optimization (via S3Service)
- Multiple size storage (thumbnail + full size)

### Requirement 16.6 - Stock Management ✓
- Stock quantity updates
- Stock status tracking

### Requirement 16.7 - Out of Stock Handling ✓
- Automatic "out of stock" marking when quantity = 0
- Disable purchase when out of stock

### Requirement 16.9 - Product Specifications ✓
- Product specifications with key-value pairs
- Brand and model information
- Category assignment

### Requirement 16.10 - Price Updates ✓
- Price update functionality
- Automatic cart price synchronization

## Data Models

### SupplierProfile
- Company information (name, tax ID, address)
- Contact details (phone, email)
- Logo URL
- Verification status
- Rating and statistics

### Product
- Basic information (name, description, category)
- Pricing (price, currency)
- Inventory (stock quantity, availability)
- Specifications (brand, model, custom specs)
- Rating and reviews count

### ProductImage
- Image URLs (full size and thumbnail)
- Display order
- Product association

## Security

- JWT authentication required for all endpoints
- Role-based access control (SUPPLIER, ADMIN)
- Suppliers can only manage their own resources
- Admins have full access

## Activity Logging

All operations are logged via ActivityLogService:
- Supplier profile creation/updates
- Product creation/updates/deletion
- Stock updates
- Price updates
- Image uploads/deletions

## Dependencies

- **TypeORM**: Database operations
- **S3Service**: File storage for logos and product images
- **ActivityLogService**: Activity logging
- **JwtAuthGuard**: Authentication
- **Cart/CartItem**: Price synchronization

## Error Handling

- `NotFoundException`: Resource not found
- `BadRequestException`: Invalid input or business rule violation
- `ForbiddenException`: Unauthorized access attempt

## Business Rules

1. **Image Limits**: Products must have 1-10 images
2. **Stock Management**: Stock = 0 automatically marks product as unavailable
3. **Low Stock**: Products with ≤10 units are flagged as low stock
4. **Price Updates**: Changing product price updates all active cart items
5. **Access Control**: Suppliers can only manage their own products

## Testing

The module should be tested with:
- Unit tests for service methods
- Integration tests for API endpoints
- Property-based tests for business rules
- E2E tests for complete workflows

## Future Enhancements

- Bulk product import/export
- Product variants support
- Advanced inventory management
- Supplier analytics dashboard
- Product recommendations
- Automated reordering
