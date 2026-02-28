# Booking Module

## Overview

The Booking Module implements the reservation system for the Technician Marketplace Platform. It handles booking creation, validation, conflict checking, and supports both handyman and artist bookings with specialized features.

## Features

### Task 8.1: Booking Creation Endpoint

Implements POST /bookings endpoint with the following capabilities:

1. **Booking Validation**
   - User existence validation
   - Professional existence and availability validation
   - Professional type matching (handyman vs artist)
   - Required fields validation
   - Artist-specific project details validation

2. **Conflict Checking** (Requirement 5.5)
   - Prevents overlapping bookings for the same professional
   - Checks against PENDING, CONFIRMED, and IN_PROGRESS bookings
   - Calculates time slot overlaps based on scheduled date and estimated duration

3. **Artist Project Support** (Requirements 5.7, 5.8)
   - Project details (type, duration, price range, requirements, materials)
   - Reference images support
   - Progress photos placeholder (for future updates)

4. **Handyman Bookings** (Requirement 5.1)
   - Standard service booking
   - Service category specification
   - Address and location details
   - Estimated price and duration

## API Endpoints

### POST /bookings

Creates a new booking.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "professionalId": "uuid",
  "professionalType": "handyman" | "artist",
  "serviceCategory": "string",
  "scheduledDate": "ISO 8601 date",
  "estimatedDuration": "number (minutes)",
  "serviceAddress": {
    "address": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "postalCode": "string",
    "coordinates": {
      "latitude": "number",
      "longitude": "number"
    }
  },
  "description": "string",
  "estimatedPrice": "number",
  "projectDetails": {  // Required for artist bookings
    "projectType": "string",
    "estimatedDuration": "string",
    "priceRange": {
      "min": "number",
      "max": "number",
      "currency": "string"
    },
    "specialRequirements": "string (optional)",
    "materials": ["string"] (optional)
  },
  "referenceImages": ["url"] (optional)
}
```

**Response:** 201 Created
```json
{
  "id": "uuid",
  "userId": "uuid",
  "professionalId": "uuid",
  "professionalType": "handyman" | "artist",
  "serviceCategory": "string",
  "status": "pending",
  "scheduledDate": "ISO 8601 date",
  "estimatedDuration": "number",
  "serviceAddress": { ... },
  "description": "string",
  "estimatedPrice": "number",
  "paymentStatus": "pending",
  "projectDetails": { ... },
  "referenceImages": ["url"],
  "progressPhotos": [],
  "createdAt": "ISO 8601 date",
  "updatedAt": "ISO 8601 date"
}
```

**Error Responses:**
- 400 Bad Request: Invalid data, professional not available, missing project details for artist
- 404 Not Found: User or professional not found
- 409 Conflict: Scheduling conflict with existing booking

### GET /bookings/:id

Retrieves a booking by ID, including progress photos for artistic projects.

**Authentication:** Required (JWT)

**Response:** 200 OK
```json
{
  "id": "uuid",
  "userId": "uuid",
  "professionalId": "uuid",
  // ... all booking fields
  "progressPhotos": [
    {
      "id": "string",
      "url": "string",
      "caption": "string (optional)",
      "uploadedAt": "ISO 8601 date",
      "uploadedBy": "uuid"
    }
  ],
  "user": { ... },
  "professional": { ... }
}
```

**Error Responses:**
- 404 Not Found: Booking not found

### GET /bookings/users/:userId

Retrieves bookings for a specific user with optional filtering.

**Authentication:** Required (JWT)

**Query Parameters:**
- `filter` (optional): Filter type - `active`, `past`, or `all` (default: `all`)
  - `active`: Returns bookings with status PENDING, CONFIRMED, or IN_PROGRESS
  - `past`: Returns bookings with status COMPLETED, CANCELLED, REJECTED, DISPUTED, or RESOLVED
  - `all`: Returns all bookings

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "professionalId": "uuid",
    "professionalType": "handyman" | "artist",
    "serviceCategory": "string",
    "status": "string",
    "scheduledDate": "ISO 8601 date",
    "estimatedDuration": "number",
    "serviceAddress": { ... },
    "description": "string",
    "estimatedPrice": "number",
    "paymentStatus": "string",
    "progressPhotos": [ ... ],
    "professional": { ... },
    "createdAt": "ISO 8601 date"
  }
]
```

**Example Requests:**
```bash
# Get all bookings
GET /bookings/users/123e4567-e89b-12d3-a456-426614174000?filter=all

# Get active bookings only
GET /bookings/users/123e4567-e89b-12d3-a456-426614174000?filter=active

# Get past bookings only
GET /bookings/users/123e4567-e89b-12d3-a456-426614174000?filter=past
```

### GET /bookings/professionals/:professionalId

Retrieves bookings for a specific professional with optional filtering.

**Authentication:** Required (JWT)

**Query Parameters:**
- `filter` (optional): Filter type - `active`, `past`, or `all` (default: `all`)

**Response:** 200 OK
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "professionalId": "uuid",
    "professionalType": "handyman" | "artist",
    "serviceCategory": "string",
    "status": "string",
    "scheduledDate": "ISO 8601 date",
    "estimatedDuration": "number",
    "serviceAddress": { ... },
    "description": "string",
    "estimatedPrice": "number",
    "paymentStatus": "string",
    "progressPhotos": [ ... ],
    "user": { ... },
    "createdAt": "ISO 8601 date"
  }
]
```

### PUT /bookings/:id/status

Updates the status of a booking (implemented in Task 8.3).

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "status": "confirmed" | "rejected" | "in_progress" | "completed" | "cancelled",
  "notes": "string (optional)",
  "progressPhotos": [  // Optional, for artist bookings in IN_PROGRESS status
    {
      "url": "string",
      "caption": "string (optional)"
    }
  ]
}
```

### PUT /bookings/:id/cancel

Cancels a booking with a reason (implemented in Task 8.7).

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "reason": "string (required, max 500 characters)"
}
```

**Response:** 200 OK
```json
{
  "id": "uuid",
  "userId": "uuid",
  "professionalId": "uuid",
  "status": "cancelled",
  "cancelledAt": "ISO 8601 date",
  "cancellationReason": "string",
  // ... other booking fields
}
```

**Error Responses:**
- 400 Bad Request: Booking cannot be cancelled (only PENDING or CONFIRMED bookings can be cancelled), missing reason, or reason exceeds max length
- 404 Not Found: Booking not found

**Validation Rules:**
- Only bookings with status PENDING or CONFIRMED can be cancelled
- Cancellation reason is required and must not be empty
- Cancellation reason must not exceed 500 characters
- Bookings with status IN_PROGRESS, COMPLETED, CANCELLED, REJECTED, DISPUTED, or RESOLVED cannot be cancelled

## Validation Rules

### General Booking Validation
- All required fields must be present
- Professional must exist and be available
- Professional type must match the booking type
- Scheduled date must be a valid date
- Estimated duration must be at least 1 minute
- Estimated price must be non-negative

### Artist Booking Validation
- Project details are mandatory
- Project type must be specified
- Price range must have valid min/max values
- Reference images must be valid URLs (if provided)

### Conflict Detection
- Checks for time slot overlaps with existing bookings
- Only considers PENDING, CONFIRMED, and IN_PROGRESS bookings
- Calculates overlap using: booking starts before new booking ends AND booking ends after new booking starts

## Database Schema

The module uses the `bookings` table with the following key fields:

- `id`: UUID primary key
- `user_id`: Foreign key to users table
- `professional_id`: Foreign key to professional_profiles table
- `professional_type`: Enum (handyman, artist)
- `service_category`: String
- `status`: Enum (pending, confirmed, in_progress, completed, cancelled, rejected, disputed, resolved)
- `scheduled_date`: Timestamp
- `estimated_duration`: Integer (minutes)
- `service_address`: JSONB
- `description`: Text
- `estimated_price`: Decimal
- `payment_status`: Enum (pending, authorized, captured, refunded, failed)
- `project_details`: JSONB (nullable, for artist bookings)
- `progress_photos`: JSONB array (nullable)
- `reference_images`: Text array (nullable)
- Timestamps: created_at, updated_at, started_at, completed_at, cancelled_at

## Testing

### Unit Tests
Located in `booking.service.spec.ts`:
- Successful booking creation
- User not found validation
- Professional not found validation
- Professional availability validation
- Professional type mismatch validation
- Artist booking without project details validation
- Artist booking with project details
- Scheduling conflict detection
- Booking retrieval by ID

### Integration Tests
Located in `booking.integration.spec.ts`:
- End-to-end booking creation flow
- Handyman booking creation
- Artist booking with project details
- Conflict detection
- Validation error handling
- Authentication requirements

## Requirements Mapping

This implementation satisfies the following requirements:

- **5.1**: Booking creation with service type, date, time, address, and description
- **5.5**: Conflict checking to prevent overlapping bookings
- **5.7**: Artist project details support (type, duration, price range)
- **5.8**: Reference images support for artistic projects
- **6.5**: User can view active and past bookings separately (Task 8.5)
- **6.6**: Platform SHALL record cancellation reason and notify professional (Task 8.7)
- **6.8**: Users can view progress photos for artistic projects (Task 8.5)

## Future Enhancements

The following features are planned for future tasks:

- Notification integration (Task 9.2)
- Payment integration (Task 13)
- Property-based tests for booking queries (Task 8.2, 8.4, 8.6, 8.8)

## Dependencies

- NestJS framework
- TypeORM for database operations
- class-validator for DTO validation
- class-transformer for DTO transformation
- PostgreSQL database

## Usage Example

```typescript
// Create a handyman booking
const handymanBooking = await bookingService.createBooking(userId, {
  professionalId: 'prof-123',
  professionalType: ProfessionalType.HANDYMAN,
  serviceCategory: 'plumbing',
  scheduledDate: new Date('2024-12-20T10:00:00Z'),
  estimatedDuration: 120,
  serviceAddress: {
    address: '123 Main St',
    city: 'Mexico City',
    state: 'CDMX',
    country: 'Mexico',
    postalCode: '12345',
    coordinates: { latitude: 19.4326, longitude: -99.1332 }
  },
  description: 'Fix leaking pipe',
  estimatedPrice: 500
});

// Create an artist booking
const artistBooking = await bookingService.createBooking(userId, {
  professionalId: 'artist-456',
  professionalType: ProfessionalType.ARTIST,
  serviceCategory: 'mural',
  scheduledDate: new Date('2024-12-25T09:00:00Z'),
  estimatedDuration: 480,
  serviceAddress: { /* ... */ },
  description: 'Create exterior mural',
  estimatedPrice: 8000,
  projectDetails: {
    projectType: 'Exterior Mural',
    estimatedDuration: '2 weeks',
    priceRange: { min: 5000, max: 10000, currency: 'MXN' },
    specialRequirements: 'Weather-resistant paint',
    materials: ['acrylic paint', 'spray paint']
  },
  referenceImages: ['https://example.com/ref1.jpg']
});
```
