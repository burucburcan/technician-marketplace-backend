# Task 8.3: Booking Status Management Implementation

## Overview
Implemented booking status management system with state machine validation and support for progress photo uploads for artistic projects.

## Requirements Addressed
- **6.1**: Booking status management (Pending, Confirmed, In_Progress, Completed, Cancelled, Rejected, Disputed, Resolved)
- **6.3**: Professional starts service (status → In_Progress)
- **6.4**: Professional completes service (status → Completed)
- **6.7**: Progress photo upload for artistic projects (In_Progress status)
- **6.8**: User can view progress photos for artistic projects

## Implementation Details

### 1. DTO Created
**File**: `src/modules/booking/dto/update-booking-status.dto.ts`
- `UpdateBookingStatusDto`: Main DTO for status updates
- `ProgressPhotoDto`: DTO for progress photo data
- Validation using class-validator decorators

### 2. Service Methods Added
**File**: `src/modules/booking/booking.service.ts`

#### `updateBookingStatus(bookingId, updateStatusDto)`
- Updates booking status with state machine validation
- Handles status-specific updates:
  - `IN_PROGRESS`: Sets `startedAt` timestamp, allows progress photos for artists
  - `COMPLETED`: Sets `completedAt` timestamp
  - `CANCELLED`: Sets `cancelledAt` timestamp and cancellation reason

#### `validateStatusTransition(currentStatus, newStatus)`
- Implements state machine validation
- Valid transitions:
  - `PENDING` → `CONFIRMED`, `REJECTED`, `CANCELLED`
  - `CONFIRMED` → `IN_PROGRESS`, `CANCELLED`
  - `IN_PROGRESS` → `COMPLETED`, `DISPUTED`
  - `DISPUTED` → `RESOLVED`
  - Terminal states: `COMPLETED`, `CANCELLED`, `REJECTED`, `RESOLVED`

#### `uploadProgressPhoto(bookingId, photoUrl, caption)`
- Uploads progress photos for artistic projects
- Validates:
  - Booking is for an artist (professionalType === 'artist')
  - Booking is in IN_PROGRESS status
- Generates unique photo IDs with timestamp

#### `addProgressPhotos(booking, newPhotos)`
- Private helper to add progress photos to booking
- Creates photo objects with metadata (id, url, caption, uploadedAt, uploadedBy)

### 3. Controller Endpoint Added
**File**: `src/modules/booking/booking.controller.ts`

#### `PUT /bookings/:id/status`
- Updates booking status
- Protected by JWT authentication
- Accepts `UpdateBookingStatusDto` in request body
- Returns updated booking

### 4. State Machine Diagram
```
[*] → PENDING
PENDING → CONFIRMED (professional accepts)
PENDING → REJECTED (professional declines)
PENDING → CANCELLED (user cancels)
CONFIRMED → IN_PROGRESS (professional starts)
CONFIRMED → CANCELLED (user/professional cancels)
IN_PROGRESS → COMPLETED (professional finishes)
IN_PROGRESS → DISPUTED (issue reported)
DISPUTED → RESOLVED (admin resolves)
COMPLETED → [*]
CANCELLED → [*]
REJECTED → [*]
RESOLVED → [*]
```

### 5. Progress Photos Feature
- **Artist-only feature**: Only bookings with `professionalType: 'artist'` can have progress photos
- **Status requirement**: Photos can only be uploaded when booking is `IN_PROGRESS`
- **Photo structure**:
  ```typescript
  {
    id: string,           // Unique identifier
    url: string,          // Photo URL
    caption?: string,     // Optional caption
    uploadedAt: Date,     // Upload timestamp
    uploadedBy: string    // Professional ID
  }
  ```
- **Storage**: Photos stored in `progressPhotos` JSONB array in booking entity

## Tests Created

### Unit Tests
**File**: `src/modules/booking/booking.service.spec.ts`
- Status transition tests (PENDING → CONFIRMED → IN_PROGRESS → COMPLETED)
- Invalid transition rejection tests
- Cancellation with reason test
- Progress photo upload tests for artists
- Validation tests for non-artist bookings
- All state machine transitions covered

### Integration Tests
**File**: `src/modules/booking/booking-status.integration.spec.ts`
- Full workflow tests with real HTTP requests
- State machine validation tests
- Progress photo upload during status update
- Cancellation with reason
- Invalid transition rejection
- All valid state transitions tested

## API Usage Examples

### Update Status to Confirmed
```http
PUT /bookings/123/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

### Start Service with Progress Photos (Artist)
```http
PUT /bookings/123/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "progressPhotos": [
    {
      "url": "https://example.com/photo1.jpg",
      "caption": "Initial sketch"
    }
  ]
}
```

### Complete Service
```http
PUT /bookings/123/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

### Cancel with Reason
```http
PUT /bookings/123/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "cancelled",
  "notes": "Client requested cancellation"
}
```

## Error Handling

### Invalid Transition
```json
{
  "statusCode": 400,
  "message": "Invalid status transition from pending to completed"
}
```

### Progress Photos for Non-Artist
```json
{
  "statusCode": 400,
  "message": "Progress photos are only available for artistic projects"
}
```

### Progress Photos Wrong Status
```json
{
  "statusCode": 400,
  "message": "Progress photos can only be uploaded for in-progress bookings"
}
```

## Database Schema Impact
No schema changes required. The implementation uses existing fields:
- `status` (enum)
- `startedAt` (timestamp)
- `completedAt` (timestamp)
- `cancelledAt` (timestamp)
- `cancellationReason` (text)
- `progressPhotos` (jsonb array)

## Next Steps
- Task 8.4: Write property tests for booking status management
- Task 8.5: Implement booking query endpoints
- Integration with notification service for status change notifications
- Integration with payment service for status-based payment processing
