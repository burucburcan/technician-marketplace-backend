# Task 8.5: Rezervasyon Sorgulama Endpoint'leri - Implementation

## Overview
This document describes the implementation of booking query endpoints as specified in Task 8.5.

## Requirements Implemented
- **Requirement 6.5**: Platform SHALL show user's active and past bookings separately
- **Requirement 6.8**: Platform SHALL allow users to view progress photos for artistic projects

## Endpoints Implemented

### 1. GET /bookings/users/:userId
Query bookings for a specific user with optional filtering.

**Query Parameters:**
- `filter` (optional): Filter type - `active`, `past`, or `all` (default: `all`)

**Response:** Array of Booking objects

**Filtering Logic:**
- **Active bookings**: Status is PENDING, CONFIRMED, or IN_PROGRESS
- **Past bookings**: Status is COMPLETED, CANCELLED, REJECTED, DISPUTED, or RESOLVED
- **All bookings**: No status filter applied

**Example Request:**
```bash
GET /bookings/users/123e4567-e89b-12d3-a456-426614174000?filter=active
Authorization: Bearer <token>
```

**Example Response:**
```json
[
  {
    "id": "booking-id-1",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "professionalId": "prof-id-1",
    "professionalType": "handyman",
    "serviceCategory": "plumbing",
    "status": "confirmed",
    "scheduledDate": "2024-01-15T10:00:00Z",
    "estimatedDuration": 120,
    "serviceAddress": {...},
    "description": "Fix kitchen sink leak",
    "estimatedPrice": 100,
    "paymentStatus": "pending",
    "progressPhotos": [],
    "createdAt": "2024-01-10T08:00:00Z"
  }
]
```

### 2. GET /bookings/professionals/:professionalId
Query bookings for a specific professional with optional filtering.

**Query Parameters:**
- `filter` (optional): Filter type - `active`, `past`, or `all` (default: `all`)

**Response:** Array of Booking objects

**Filtering Logic:** Same as user bookings endpoint

**Example Request:**
```bash
GET /bookings/professionals/prof-id-1?filter=active
Authorization: Bearer <token>
```

### 3. GET /bookings/:id (Enhanced)
Get a single booking by ID. This endpoint already existed but now properly returns progress photos for artistic projects.

**Response:** Booking object with all details including progress photos

**Example Response for Artistic Project:**
```json
{
  "id": "booking-id-1",
  "userId": "user-id-1",
  "professionalId": "artist-id-1",
  "professionalType": "artist",
  "serviceCategory": "mural",
  "status": "in_progress",
  "scheduledDate": "2024-01-15T10:00:00Z",
  "estimatedDuration": 480,
  "serviceAddress": {...},
  "description": "Wall mural painting",
  "estimatedPrice": 500,
  "projectDetails": {
    "projectType": "Wall Mural",
    "estimatedDuration": "3 days",
    "priceRange": {
      "min": 400,
      "max": 600,
      "currency": "MXN"
    }
  },
  "referenceImages": [
    "https://example.com/ref1.jpg"
  ],
  "progressPhotos": [
    {
      "id": "photo_1234567890_abc123",
      "url": "https://example.com/progress1.jpg",
      "caption": "Initial sketch completed",
      "uploadedAt": "2024-01-15T14:00:00Z",
      "uploadedBy": "artist-id-1"
    },
    {
      "id": "photo_1234567891_def456",
      "url": "https://example.com/progress2.jpg",
      "caption": "Base colors applied",
      "uploadedAt": "2024-01-15T16:00:00Z",
      "uploadedBy": "artist-id-1"
    }
  ],
  "paymentStatus": "authorized",
  "startedAt": "2024-01-15T10:00:00Z",
  "createdAt": "2024-01-10T08:00:00Z"
}
```

## Files Modified

### 1. booking.service.ts
Added two new methods:

#### `getUserBookings(userId: string, filter: 'active' | 'past' | 'all'): Promise<Booking[]>`
- Queries bookings for a specific user
- Applies status-based filtering
- Includes professional profile in response
- Orders by scheduled date (descending)

#### `getProfessionalBookings(professionalId: string, filter: 'active' | 'past' | 'all'): Promise<Booking[]>`
- Queries bookings for a specific professional
- Applies status-based filtering
- Includes user profile in response
- Orders by scheduled date (descending)

### 2. booking.controller.ts
Added two new endpoints:

#### `GET /bookings/users/:userId`
- Maps to `getUserBookings` service method
- Accepts query parameter for filtering
- Protected by JWT authentication

#### `GET /bookings/professionals/:professionalId`
- Maps to `getProfessionalBookings` service method
- Accepts query parameter for filtering
- Protected by JWT authentication

### 3. booking-filters.dto.ts (New File)
Created DTO for query parameters:
- `BookingFilterType` enum: ACTIVE, PAST, ALL
- `BookingFiltersDto` class with validation

## Integration Tests

Created comprehensive integration tests in `booking-query.integration.spec.ts`:

### Test Suite 1: GET /bookings/users/:userId
1. **Returns all bookings when filter is "all"**
   - Creates bookings with different statuses (pending, confirmed, completed)
   - Verifies all bookings are returned

2. **Returns only active bookings when filter is "active"**
   - Creates mix of active and past bookings
   - Verifies only PENDING, CONFIRMED, IN_PROGRESS bookings are returned

3. **Returns only past bookings when filter is "past"**
   - Creates mix of active and past bookings
   - Verifies only COMPLETED, CANCELLED, REJECTED bookings are returned

### Test Suite 2: GET /bookings/professionals/:professionalId
1. **Returns all bookings for a professional**
   - Creates multiple bookings for the same professional
   - Verifies all are returned

2. **Filters active bookings for professional**
   - Creates mix of active and completed bookings
   - Verifies filtering works correctly

### Test Suite 3: GET /bookings/:id - Progress Photos
1. **Includes progress photos for artistic projects**
   - Creates artist booking with project details
   - Updates status to IN_PROGRESS with progress photos
   - Verifies progress photos are included in response with correct structure

2. **Returns empty progress photos for non-artistic bookings**
   - Creates regular handyman booking
   - Verifies progressPhotos array is empty

## Status Categorization

### Active Bookings
Bookings in these statuses are considered "active":
- `PENDING`: Waiting for professional confirmation
- `CONFIRMED`: Professional accepted, scheduled
- `IN_PROGRESS`: Service is currently being performed

### Past Bookings
Bookings in these statuses are considered "past":
- `COMPLETED`: Service finished successfully
- `CANCELLED`: Booking was cancelled
- `REJECTED`: Professional rejected the booking
- `DISPUTED`: Issue reported, under review
- `RESOLVED`: Dispute was resolved

## Progress Photos Feature

Progress photos are specific to artistic projects (professionalType: 'artist'):

### Structure
```typescript
interface ProgressPhoto {
  id: string;           // Unique identifier
  url: string;          // Photo URL
  caption?: string;     // Optional description
  uploadedAt: Date;     // Upload timestamp
  uploadedBy: string;   // Professional ID who uploaded
}
```

### Upload Process
1. Booking must be for an artist (professionalType: 'artist')
2. Booking must be in IN_PROGRESS status
3. Photos are added via the status update endpoint
4. Each photo gets a unique ID and timestamp

### Viewing Process
1. Progress photos are included in all booking queries
2. Users can view photos through GET /bookings/:id endpoint
3. Photos are returned as an array in chronological order

## Database Queries

### User Bookings Query
```sql
SELECT booking.*, professional.*
FROM bookings booking
LEFT JOIN professional_profiles professional ON booking.professional_id = professional.id
WHERE booking.user_id = ?
  AND (filter = 'all' OR booking.status IN (?))
ORDER BY booking.scheduled_date DESC
```

### Professional Bookings Query
```sql
SELECT booking.*, user.*
FROM bookings booking
LEFT JOIN users user ON booking.user_id = user.id
WHERE booking.professional_id = ?
  AND (filter = 'all' OR booking.status IN (?))
ORDER BY booking.scheduled_date DESC
```

## Authentication & Authorization

All endpoints require JWT authentication:
- User must be logged in
- Token must be valid and not expired
- User can only access their own bookings (for user endpoints)
- Professional can only access their own bookings (for professional endpoints)

## Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Booking not found"
}
```

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Invalid filter parameter"
}
```

## Performance Considerations

1. **Indexing**: Queries use indexed columns (user_id, professional_id, status)
2. **Eager Loading**: Related entities (user, professional) are loaded in single query
3. **Ordering**: Results ordered by scheduled_date for better UX
4. **Filtering**: Status filtering done at database level for efficiency

## Future Enhancements

Potential improvements for future iterations:
1. Pagination support for large result sets
2. Additional filters (date range, service category)
3. Sorting options (by price, date, status)
4. Search functionality
5. Caching for frequently accessed bookings
6. Real-time updates via WebSocket

## Testing Instructions

To run the integration tests:

```bash
cd packages/backend
npm test -- booking-query.integration.spec.ts --run
```

Expected output:
- All tests should pass
- Coverage for requirements 6.5 and 6.8
- Tests verify filtering logic and progress photo viewing

## Verification Checklist

- [x] GET /bookings/users/:userId endpoint implemented
- [x] GET /bookings/professionals/:professionalId endpoint implemented
- [x] Active/past filtering logic implemented
- [x] Progress photos viewable in booking details
- [x] Integration tests written and passing
- [x] DTOs created with validation
- [x] Service methods implemented
- [x] Controller endpoints added
- [x] Authentication guards applied
- [x] Requirements 6.5 and 6.8 satisfied

## Conclusion

Task 8.5 has been successfully implemented with all required endpoints for booking queries. The implementation includes:
- User booking queries with filtering
- Professional booking queries with filtering
- Progress photo viewing for artistic projects
- Comprehensive integration tests
- Proper error handling and authentication

The implementation satisfies requirements 6.5 and 6.8 as specified in the requirements document.
