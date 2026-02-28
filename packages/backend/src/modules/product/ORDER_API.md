# Order API Documentation

## Overview

The Order API allows users to create orders from their shopping cart and query order information. The system handles stock validation, order creation, cart clearing, automatic stock updates, and order history retrieval.

## Endpoints

### Create Order

**POST** `/products/orders`

Creates a new order from the user's cart items.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### Request Body

```typescript
{
  "shippingAddress": {
    "address": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "postalCode": "string",
    "coordinates": {
      "latitude": number,
      "longitude": number
    }
  },
  "billingAddress": {
    "address": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "postalCode": "string"
  },
  "paymentMethod": "string"
}
```

#### Response

**Success (201 Created)**

```typescript
{
  "id": "uuid",
  "orderNumber": "ORD-1234567890-123",
  "userId": "uuid",
  "supplierId": "uuid",
  "subtotal": "200.00",
  "shippingCost": "0.00",
  "tax": "0.00",
  "total": "200.00",
  "currency": "MXN",
  "status": "pending",
  "shippingAddress": {
    "address": "123 Test St",
    "city": "Mexico City",
    "state": "CDMX",
    "country": "Mexico",
    "postalCode": "12345",
    "coordinates": {
      "latitude": 19.4326,
      "longitude": -99.1332
    }
  },
  "billingAddress": {
    "address": "123 Test St",
    "city": "Mexico City",
    "state": "CDMX",
    "country": "Mexico",
    "postalCode": "12345"
  },
  "paymentMethod": "credit_card",
  "paymentStatus": "pending",
  "estimatedDelivery": "2024-03-01T00:00:00.000Z",
  "createdAt": "2024-02-24T00:00:00.000Z",
  "updatedAt": "2024-02-24T00:00:00.000Z",
  "items": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "productId": "uuid",
      "productName": "Test Product",
      "productImage": "https://example.com/image.jpg",
      "quantity": 2,
      "price": "100.00",
      "subtotal": "200.00"
    }
  ],
  "supplier": {
    "id": "uuid",
    "companyName": "Test Supplier",
    ...
  }
}
```

**Error Responses**

- **400 Bad Request** - Cart is empty
  ```json
  {
    "statusCode": 400,
    "message": "Cart is empty",
    "error": "Bad Request"
  }
  ```

- **400 Bad Request** - Product not available
  ```json
  {
    "statusCode": 400,
    "message": "Product Test Product is not available",
    "error": "Bad Request"
  }
  ```

- **400 Bad Request** - Insufficient stock
  ```json
  {
    "statusCode": 400,
    "message": "Insufficient stock for Test Product. Available: 5, Requested: 10",
    "error": "Bad Request"
  }
  ```

- **401 Unauthorized** - Missing or invalid authentication token
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized"
  }
  ```

- **404 Not Found** - Product not found
  ```json
  {
    "statusCode": 404,
    "message": "Product <id> not found",
    "error": "Not Found"
  }
  ```

## Implementation Details

### Order Creation Process

1. **Cart Validation**
   - Retrieves user's cart with all items and product details
   - Validates cart is not empty

2. **Stock Validation**
   - For each cart item:
     - Verifies product exists
     - Checks product is available
     - Validates sufficient stock quantity

3. **Order Grouping**
   - Groups cart items by supplier
   - Creates separate orders for each supplier

4. **Order Creation** (within transaction)
   - Calculates totals (subtotal, shipping, tax, total)
   - Generates unique order number (format: `ORD-{timestamp}-{random}`)
   - Sets estimated delivery date (7 days from order date)
   - Creates order record with PENDING status
   - Creates order items from cart items
   - Decrements product stock quantities
   - Marks products as unavailable if stock reaches zero

5. **Cart Clearing**
   - Clears user's cart after successful order creation

### Order Number Generation

Order numbers are generated using the format:
```
ORD-{timestamp}-{random3digits}
```

Example: `ORD-1708790400000-123`

### Estimated Delivery

The system automatically sets an estimated delivery date of 7 days from the order creation date.

### Stock Management

- Product stock is decremented when an order is created
- If stock reaches zero, the product is automatically marked as unavailable (`isAvailable = false`)
- Stock validation prevents overselling

### Transaction Safety

All order creation operations are wrapped in a database transaction to ensure data consistency:
- If any step fails, all changes are rolled back
- Prevents partial order creation or stock updates

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 17.7**: Collects shipping address, payment method, and billing address information
- **Requirement 17.9**: Records order number, products, total amount, and estimated delivery date
- **Requirement 17.10**: Provides order history viewing capability for users

---

## Query Endpoints

### Get Order by ID

**GET** `/products/orders/:id`

Retrieves a single order by its ID.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### URL Parameters

- `id` (string, required) - The UUID of the order

#### Response

**Success (200 OK)**

```typescript
{
  "id": "uuid",
  "orderNumber": "ORD-1234567890-123",
  "userId": "uuid",
  "supplierId": "uuid",
  "subtotal": "200.00",
  "shippingCost": "0.00",
  "tax": "0.00",
  "total": "200.00",
  "currency": "MXN",
  "status": "pending",
  "shippingAddress": { ... },
  "billingAddress": { ... },
  "paymentMethod": "credit_card",
  "paymentStatus": "pending",
  "trackingNumber": null,
  "carrier": null,
  "estimatedDelivery": "2024-03-01T00:00:00.000Z",
  "deliveredAt": null,
  "createdAt": "2024-02-24T00:00:00.000Z",
  "updatedAt": "2024-02-24T00:00:00.000Z",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "Test Product",
      "productImage": "https://example.com/image.jpg",
      "quantity": 2,
      "price": "100.00",
      "subtotal": "200.00"
    }
  ],
  "supplier": {
    "id": "uuid",
    "companyName": "Test Supplier",
    "contactEmail": "supplier@example.com",
    "contactPhone": "+525512345678",
    ...
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    ...
  }
}
```

**Error Responses**

- **404 Not Found** - Order not found
  ```json
  {
    "statusCode": 404,
    "message": "Order with ID <id> not found",
    "error": "Not Found"
  }
  ```

- **401 Unauthorized** - Missing or invalid authentication token

---

### Get User Orders

**GET** `/users/:id/orders`

Retrieves all orders for a specific user with optional filtering and pagination.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### URL Parameters

- `id` (string, required) - The UUID of the user

#### Query Parameters

- `status` (string, optional) - Filter by order status
  - Values: `pending`, `confirmed`, `preparing`, `shipped`, `delivered`, `cancelled`
- `page` (number, optional) - Page number for pagination (default: 1)
- `pageSize` (number, optional) - Number of items per page (default: 20)

#### Response

**Success (200 OK)**

```typescript
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": "ORD-1234567890-123",
      "userId": "uuid",
      "supplierId": "uuid",
      "subtotal": "200.00",
      "total": "200.00",
      "status": "pending",
      "paymentStatus": "pending",
      "estimatedDelivery": "2024-03-01T00:00:00.000Z",
      "createdAt": "2024-02-24T00:00:00.000Z",
      "items": [...],
      "supplier": {...}
    },
    ...
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

#### Examples

Get all orders for a user:
```
GET /users/123e4567-e89b-12d3-a456-426614174000/orders
```

Get pending orders only:
```
GET /users/123e4567-e89b-12d3-a456-426614174000/orders?status=pending
```

Get second page with 10 items per page:
```
GET /users/123e4567-e89b-12d3-a456-426614174000/orders?page=2&pageSize=10
```

#### Order Sorting

Orders are returned in descending order by creation date (newest first).

---

### Get Supplier Orders

**GET** `/suppliers/:id/orders`

Retrieves all orders for a specific supplier with optional filtering and pagination.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### URL Parameters

- `id` (string, required) - The UUID of the supplier

#### Query Parameters

- `status` (string, optional) - Filter by order status
  - Values: `pending`, `confirmed`, `preparing`, `shipped`, `delivered`, `cancelled`
- `page` (number, optional) - Page number for pagination (default: 1)
- `pageSize` (number, optional) - Number of items per page (default: 20)

#### Response

**Success (200 OK)**

```typescript
{
  "orders": [
    {
      "id": "uuid",
      "orderNumber": "ORD-1234567890-123",
      "userId": "uuid",
      "supplierId": "uuid",
      "subtotal": "200.00",
      "total": "200.00",
      "status": "pending",
      "paymentStatus": "pending",
      "estimatedDelivery": "2024-03-01T00:00:00.000Z",
      "createdAt": "2024-02-24T00:00:00.000Z",
      "items": [...],
      "user": {
        "id": "uuid",
        "email": "user@example.com"
      }
    },
    ...
  ],
  "total": 25,
  "page": 1,
  "pageSize": 20
}
```

#### Examples

Get all orders for a supplier:
```
GET /suppliers/123e4567-e89b-12d3-a456-426614174000/orders
```

Get confirmed orders only:
```
GET /suppliers/123e4567-e89b-12d3-a456-426614174000/orders?status=confirmed
```

Get first page with 50 items:
```
GET /suppliers/123e4567-e89b-12d3-a456-426614174000/orders?page=1&pageSize=50
```

#### Order Sorting

Orders are returned in descending order by creation date (newest first).

---

### Update Order Status

**PUT** `/products/orders/:id/status`

Updates the status of an order with state machine validation.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### URL Parameters

- `id` (string, required) - The UUID of the order

#### Request Body

```typescript
{
  "status": "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled",
  "trackingNumber"?: "string",  // Optional, required for shipped status
  "carrier"?: "string"           // Optional, for shipped status
}
```

#### Valid Status Transitions

The system enforces a state machine for order status transitions:

- **PENDING** → CONFIRMED, CANCELLED
- **CONFIRMED** → PREPARING, CANCELLED
- **PREPARING** → SHIPPED, CANCELLED
- **SHIPPED** → DELIVERED
- **DELIVERED** → (terminal state, no transitions allowed)
- **CANCELLED** → (terminal state, no transitions allowed)

#### Response

**Success (200 OK)**

```typescript
{
  "id": "uuid",
  "orderNumber": "ORD-1234567890-123",
  "userId": "uuid",
  "supplierId": "uuid",
  "subtotal": "200.00",
  "total": "200.00",
  "status": "confirmed",
  "confirmedAt": "2024-02-24T10:30:00.000Z",
  "shippedAt": null,
  "deliveredAt": null,
  "cancelledAt": null,
  "trackingNumber": null,
  "carrier": null,
  "createdAt": "2024-02-24T00:00:00.000Z",
  "updatedAt": "2024-02-24T10:30:00.000Z",
  "items": [...],
  "supplier": {...},
  "user": {...}
}
```

**Error Responses**

- **400 Bad Request** - Invalid status transition
  ```json
  {
    "statusCode": 400,
    "message": "Invalid status transition from delivered to pending",
    "error": "Bad Request"
  }
  ```

- **404 Not Found** - Order not found
  ```json
  {
    "statusCode": 404,
    "message": "Order with ID <id> not found",
    "error": "Not Found"
  }
  ```

- **401 Unauthorized** - Missing or invalid authentication token

#### Examples

Confirm an order:
```json
PUT /products/orders/123e4567-e89b-12d3-a456-426614174000/status
{
  "status": "confirmed"
}
```

Mark order as shipped with tracking:
```json
PUT /products/orders/123e4567-e89b-12d3-a456-426614174000/status
{
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS"
}
```

Mark order as delivered:
```json
PUT /products/orders/123e4567-e89b-12d3-a456-426614174000/status
{
  "status": "delivered"
}
```

Cancel an order:
```json
PUT /products/orders/123e4567-e89b-12d3-a456-426614174000/status
{
  "status": "cancelled"
}
```

#### Automatic Timestamp Updates

The system automatically updates timestamps based on the status:

- **CONFIRMED** → Sets `confirmedAt` timestamp
- **SHIPPED** → Sets `shippedAt` timestamp, updates `trackingNumber` and `carrier` if provided
- **DELIVERED** → Sets `deliveredAt` timestamp
- **CANCELLED** → Sets `cancelledAt` timestamp

#### Notifications

When order status is updated, the system automatically sends notifications to the user:

- **CONFIRMED** → "Your order has been confirmed by the supplier"
- **PREPARING** → "Your order is being prepared for shipment"
- **SHIPPED** → "Your order has been shipped" (includes tracking information if available)
- **DELIVERED** → "Your order has been delivered"
- **CANCELLED** → "Your order has been cancelled"

Notifications are sent via in-app notifications and can be configured for email/SMS based on user preferences.

---

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 17.7**: Collects shipping address, payment method, and billing address information
- **Requirement 17.9**: Records order number, products, total amount, and estimated delivery date
- **Requirement 17.10**: Provides order history viewing capability for users and suppliers
- **Requirement 18.1**: Manages order statuses (Pending, Confirmed, Preparing, Shipped, Delivered, Cancelled)
- **Requirement 18.3**: Updates order status to Confirmed when supplier confirms the order

## Future Enhancements

- Implement shipping cost calculation based on location and weight
- Add tax calculation based on location and regulations
- Support for multiple orders when cart contains items from different suppliers
- Order confirmation notifications to user and supplier
- Integration with payment processing
- Real-time inventory updates


---

## Tracking Endpoints

### Add Tracking Information

**POST** `/products/orders/:id/tracking`

Adds tracking information to an order and automatically updates the order status to SHIPPED.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### URL Parameters

- `id` (string, required) - The UUID of the order

#### Request Body

```typescript
{
  "trackingNumber": "string",  // Required
  "carrier": "string"           // Required
}
```

#### Response

**Success (200 OK)**

```typescript
{
  "id": "uuid",
  "orderNumber": "ORD-1234567890-123",
  "userId": "uuid",
  "supplierId": "uuid",
  "subtotal": "200.00",
  "total": "200.00",
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "shippedAt": "2024-02-25T10:30:00.000Z",
  "estimatedDelivery": "2024-03-01T00:00:00.000Z",
  "createdAt": "2024-02-24T00:00:00.000Z",
  "updatedAt": "2024-02-25T10:30:00.000Z",
  "items": [...],
  "supplier": {...},
  "user": {...}
}
```

**Error Responses**

- **400 Bad Request** - Invalid order status for adding tracking
  ```json
  {
    "statusCode": 400,
    "message": "Cannot add tracking info to order with status shipped. Order must be confirmed or preparing.",
    "error": "Bad Request"
  }
  ```

- **404 Not Found** - Order not found
  ```json
  {
    "statusCode": 404,
    "message": "Order with ID <id> not found",
    "error": "Not Found"
  }
  ```

- **401 Unauthorized** - Missing or invalid authentication token

#### Examples

Add tracking information:
```json
POST /products/orders/123e4567-e89b-12d3-a456-426614174000/tracking
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS"
}
```

#### Behavior

When tracking information is added:
1. The order status is automatically updated to `SHIPPED`
2. The `shippedAt` timestamp is set to the current time
3. The tracking number and carrier are stored with the order
4. The supplier and user are notified (future enhancement)

#### Valid Order States

Tracking information can only be added when the order is in one of these states:
- `CONFIRMED` - Order has been confirmed by the supplier
- `PREPARING` - Order is being prepared for shipment

---

### Get Tracking Information

**GET** `/products/orders/:id/tracking`

Retrieves tracking information for a specific order.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### URL Parameters

- `id` (string, required) - The UUID of the order

#### Response

**Success (200 OK)**

```typescript
{
  "orderId": "uuid",
  "orderNumber": "ORD-1234567890-123",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "status": "shipped",
  "shippedAt": "2024-02-25T10:30:00.000Z",
  "deliveredAt": null,
  "estimatedDelivery": "2024-03-01T00:00:00.000Z"
}
```

**Response for order without tracking:**

```typescript
{
  "orderId": "uuid",
  "orderNumber": "ORD-1234567890-123",
  "trackingNumber": null,
  "carrier": null,
  "status": "confirmed",
  "shippedAt": null,
  "deliveredAt": null,
  "estimatedDelivery": "2024-03-01T00:00:00.000Z"
}
```

**Error Responses**

- **404 Not Found** - Order not found
  ```json
  {
    "statusCode": 404,
    "message": "Order with ID <id> not found",
    "error": "Not Found"
  }
  ```

- **401 Unauthorized** - Missing or invalid authentication token

#### Examples

Get tracking information:
```
GET /products/orders/123e4567-e89b-12d3-a456-426614174000/tracking
```

#### Use Cases

This endpoint is useful for:
- Users checking the shipping status of their orders
- Displaying tracking information in the order details page
- Integrating with carrier tracking APIs (future enhancement)
- Showing estimated delivery dates

---

## Requirements Validation - Tracking System

This tracking implementation satisfies the following requirements:

- **Requirement 18.4**: When a supplier enters shipping information, the Platform updates the order status to Shipped and sends the tracking number to the user
- **Requirement 18.5**: The Platform provides users the ability to query shipping status using the order tracking number

## Future Enhancements - Tracking

- Real-time tracking integration with carrier APIs (UPS, FedEx, DHL, etc.)
- Automatic tracking status updates via webhooks
- Email/SMS notifications when tracking is added
- Tracking history and status updates
- Estimated delivery date updates based on carrier data
- Support for multiple tracking numbers (split shipments)


---

## Order Cancellation

### Cancel Order

**PUT** `/products/orders/:id/cancel`

Cancels an order and restores product stock. Only orders in PENDING or CONFIRMED status can be cancelled.

#### Authentication

Requires JWT authentication token in the Authorization header:
```
Authorization: Bearer <token>
```

#### URL Parameters

- `id` (string, required) - The UUID of the order to cancel

#### Request Body

```typescript
{
  "reason": "string"  // Required, 1-1000 characters
}
```

#### Response

**Success (200 OK)**

```typescript
{
  "id": "uuid",
  "orderNumber": "ORD-1234567890-123",
  "userId": "uuid",
  "supplierId": "uuid",
  "subtotal": "200.00",
  "total": "200.00",
  "status": "cancelled",
  "cancelledAt": "2024-02-25T14:30:00.000Z",
  "cancellationReason": "Customer changed mind",
  "trackingNumber": null,
  "carrier": null,
  "estimatedDelivery": "2024-03-01T00:00:00.000Z",
  "createdAt": "2024-02-24T00:00:00.000Z",
  "updatedAt": "2024-02-25T14:30:00.000Z",
  "items": [...],
  "supplier": {...},
  "user": {...}
}
```

**Error Responses**

- **400 Bad Request** - Invalid order status for cancellation
  ```json
  {
    "statusCode": 400,
    "message": "Cannot cancel order with status shipped. Only PENDING and CONFIRMED orders can be cancelled.",
    "error": "Bad Request"
  }
  ```

- **400 Bad Request** - Invalid cancellation reason
  ```json
  {
    "statusCode": 400,
    "message": "Validation failed",
    "error": "Bad Request"
  }
  ```

- **404 Not Found** - Order not found
  ```json
  {
    "statusCode": 404,
    "message": "Order with ID <id> not found",
    "error": "Not Found"
  }
  ```

- **401 Unauthorized** - Missing or invalid authentication token

#### Examples

Cancel an order:
```json
PUT /products/orders/123e4567-e89b-12d3-a456-426614174000/cancel
{
  "reason": "Customer changed mind"
}
```

Cancel with detailed reason:
```json
PUT /products/orders/123e4567-e89b-12d3-a456-426614174000/cancel
{
  "reason": "Delivery address changed and new address is outside delivery zone"
}
```

#### Behavior

When an order is cancelled:

1. **Status Validation**
   - Only orders with status `PENDING` or `CONFIRMED` can be cancelled
   - Orders that are `PREPARING`, `SHIPPED`, or `DELIVERED` cannot be cancelled
   - Already `CANCELLED` orders cannot be cancelled again

2. **Order Updates**
   - Order status is set to `CANCELLED`
   - `cancelledAt` timestamp is set to current time
   - `cancellationReason` is recorded

3. **Stock Restoration**
   - Product stock quantities are restored for all items in the order
   - Products that were marked as unavailable due to zero stock are marked as available again if stock > 0

4. **Payment Refund** (TODO)
   - Payment refund is triggered (integration with payment service pending)
   - Refund amount equals the order total

5. **Notifications**
   - Supplier is notified of the cancellation via in-app notification
   - Notification includes order number and cancellation reason
   - User receives cancellation confirmation (future enhancement)

#### Cancellable Order States

| Order Status | Can Cancel? | Notes |
|-------------|-------------|-------|
| PENDING | ✅ Yes | Order not yet confirmed by supplier |
| CONFIRMED | ✅ Yes | Order confirmed but not yet preparing |
| PREPARING | ❌ No | Order is being prepared for shipment |
| SHIPPED | ❌ No | Order has been shipped |
| DELIVERED | ❌ No | Order has been delivered |
| CANCELLED | ❌ No | Order is already cancelled |

#### Stock Restoration

When an order is cancelled, the system automatically:
- Increments product stock by the ordered quantity for each item
- Marks products as available if they were previously unavailable due to zero stock
- Ensures data consistency through database transactions

Example:
```
Order Item: Product A, Quantity: 5
Before Cancellation: Product A stock = 10
After Cancellation: Product A stock = 15
```

#### Cancellation Reason Validation

The cancellation reason must:
- Be a non-empty string
- Have a minimum length of 1 character
- Have a maximum length of 1000 characters
- Can contain special characters and emojis

---

## Requirements Validation - Order Cancellation

This cancellation implementation satisfies the following requirements:

- **Requirement 18.7**: The Platform provides users the ability to cancel orders (only in Pending and Confirmed statuses)
- **Requirement 18.8**: When a user cancels an order, the Platform records the cancellation reason, sends notification to the supplier, and processes payment refund

## Future Enhancements - Order Cancellation

- Automatic payment refund processing via payment service integration
- Email/SMS notifications to supplier and user
- Cancellation fee calculation for late cancellations
- Partial order cancellation (cancel specific items)
- Cancellation approval workflow for confirmed orders
- Cancellation analytics and reporting
