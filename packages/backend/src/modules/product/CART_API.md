# Cart Management API

This document describes the cart management endpoints implemented for the technician marketplace platform.

## Endpoints

### 1. Add Item to Cart
**POST** `/cart/items`

Adds a product to the user's cart. If the product already exists in the cart, the quantity is incremented.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "productId": "uuid",
  "quantity": 1
}
```

**Validation:**
- `productId`: Must be a valid UUID
- `quantity`: Must be an integer >= 1

**Response:** Returns the updated cart with all items

**Error Cases:**
- `404 Not Found`: Product does not exist
- `400 Bad Request`: Product is not available
- `400 Bad Request`: Insufficient stock

---

### 2. Update Cart Item Quantity
**PUT** `/cart/items/:id`

Updates the quantity of a specific cart item.

**Authentication:** Required (JWT)

**URL Parameters:**
- `id`: Cart item ID (UUID)

**Request Body:**
```json
{
  "quantity": 5
}
```

**Validation:**
- `quantity`: Must be an integer >= 1

**Response:** Returns the updated cart with all items

**Error Cases:**
- `404 Not Found`: Cart item does not exist
- `400 Bad Request`: Cart item does not belong to user
- `400 Bad Request`: Insufficient stock

---

### 3. Remove Item from Cart
**DELETE** `/cart/items/:id`

Removes a specific item from the cart.

**Authentication:** Required (JWT)

**URL Parameters:**
- `id`: Cart item ID (UUID)

**Response:** Returns the updated cart with remaining items

**Error Cases:**
- `404 Not Found`: Cart item does not exist
- `400 Bad Request`: Cart item does not belong to user

---

### 4. Get Cart
**GET** `/cart`

Retrieves the current user's cart with all items and product details.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "quantity": 2,
      "price": 100.00,
      "subtotal": 200.00,
      "product": {
        "id": "uuid",
        "name": "Product Name",
        "description": "Product description",
        "price": 100.00,
        "stockQuantity": 10,
        "isAvailable": true,
        "images": [...]
      }
    }
  ],
  "subtotal": 200.00,
  "total": 200.00,
  "currency": "MXN",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Note:** If the user doesn't have a cart, an empty cart is automatically created.

---

### 5. Clear Cart
**DELETE** `/cart`

Removes all items from the cart and resets totals to zero.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "message": "Cart cleared successfully"
}
```

---

## Business Logic

### Stock Validation
- When adding items to cart, the system validates that sufficient stock is available
- When updating cart item quantity, the system validates against current stock levels
- Products marked as unavailable cannot be added to cart

### Cart Total Calculation
The cart automatically calculates:
- **Item Subtotal**: `price × quantity` for each item
- **Cart Subtotal**: Sum of all item subtotals
- **Cart Total**: Currently equals subtotal (future: may include taxes, shipping, etc.)

**Property 48 (Design Document):** For any cart, the total must equal the sum of all item subtotals: `total = Σ(item.price × item.quantity)`

### User Isolation
- Each user has their own cart
- Users can only access and modify their own cart items
- Cart items are automatically associated with the authenticated user

### Automatic Cart Creation
- If a user doesn't have a cart when accessing cart endpoints, an empty cart is automatically created
- This ensures seamless user experience without requiring explicit cart initialization

---

## Implementation Details

### Files Created
- `cart.controller.ts`: REST API endpoints
- `cart.service.ts`: Business logic and database operations
- `dto/add-to-cart.dto.ts`: DTO for adding items
- `dto/update-cart-item.dto.ts`: DTO for updating quantities
- `cart.service.spec.ts`: Unit tests

### Database Entities
Uses existing entities:
- `Cart`: Main cart entity (one per user)
- `CartItem`: Individual items in cart
- `Product`: Product information

### Dependencies
- TypeORM for database operations
- class-validator for DTO validation
- JWT authentication guard for security

---

## Testing

### Unit Tests
Run unit tests:
```bash
npm test -- cart.service.spec.ts
```

Tests cover:
- Product validation (existence, availability, stock)
- Cart creation and retrieval
- Item addition, update, and removal
- Error handling
- Property 48: Cart total calculation

### Manual Testing
Use tools like Postman or curl to test endpoints:

```bash
# Get cart
curl -H "Authorization: Bearer <token>" http://localhost:3000/cart

# Add item
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<uuid>","quantity":2}' \
  http://localhost:3000/cart/items

# Update item
curl -X PUT -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity":5}' \
  http://localhost:3000/cart/items/<item-id>

# Remove item
curl -X DELETE -H "Authorization: Bearer <token>" \
  http://localhost:3000/cart/items/<item-id>

# Clear cart
curl -X DELETE -H "Authorization: Bearer <token>" \
  http://localhost:3000/cart
```

---

## Requirements Validation

This implementation satisfies the following requirements from the design document:

- **Requirement 17.4**: Users can add products to cart
- **Requirement 17.5**: Cart content and total are updated when products are added
- **Requirement 17.6**: Users can increase, decrease, and remove product quantities in cart

All endpoints include proper validation, error handling, and authentication as specified in the task requirements.
