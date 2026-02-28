# Product Module

This module handles product search and retrieval functionality for the marketplace platform.

## Features

- Product search with keyword, category, price range, brand, and supplier filters
- Category-based product listing
- Sorting by price, rating, popularity, and newest
- Stock availability filtering
- Product details retrieval

## API Endpoints

### POST /products/search
Search products with various filters.

**Request Body:**
```json
{
  "keyword": "string (optional)",
  "category": "string (optional)",
  "minPrice": "number (optional)",
  "maxPrice": "number (optional)",
  "brand": "string (optional)",
  "supplierId": "string (optional)",
  "inStock": "boolean (optional, default: true)",
  "sortBy": "price | rating | popularity | newest (optional, default: rating)",
  "page": "number (optional, default: 1)",
  "pageSize": "number (optional, default: 20, max: 100)"
}
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "category": "string",
      "price": "number",
      "currency": "string",
      "stockQuantity": "number",
      "isAvailable": "boolean",
      "brand": "string",
      "model": "string",
      "rating": "number",
      "totalReviews": "number",
      "images": [...],
      "supplier": {...}
    }
  ],
  "total": "number",
  "page": "number",
  "pageSize": "number"
}
```

### GET /products/category/:category
Get products by category with filters.

**Query Parameters:**
- `minPrice`: number (optional)
- `maxPrice`: number (optional)
- `brand`: string (optional)
- `supplierId`: string (optional)
- `inStock`: boolean (optional, default: true)
- `sortBy`: price | rating | popularity | newest (optional, default: rating)
- `page`: number (optional, default: 1)
- `pageSize`: number (optional, default: 20, max: 100)

**Response:** Same as search endpoint

### GET /products/:id
Get product details by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "category": "string",
  "price": "number",
  "currency": "string",
  "stockQuantity": "number",
  "isAvailable": "boolean",
  "specifications": [...],
  "brand": "string",
  "model": "string",
  "rating": "number",
  "totalReviews": "number",
  "images": [...],
  "supplier": {...},
  "reviews": [...]
}
```

## Requirements Implemented

- **Requirement 17.1**: Users can search products with filters for category, price range, brand, and supplier
- **Requirement 17.2**: Search results are sortable by price, popularity, and supplier rating

## Sorting Options

- **price**: Sort by price (ascending)
- **rating**: Sort by rating (descending), then by total reviews
- **popularity**: Sort by total reviews (descending), then by rating
- **newest**: Sort by creation date (descending)

## Notes

- The keyword search currently uses ILIKE for simple pattern matching
- For production, consider implementing full-text search or ElasticSearch integration
- All endpoints return paginated results
- Products include related images and supplier information
