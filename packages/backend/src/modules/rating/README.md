# Rating Service

## Overview

The Rating Service manages service ratings and reviews for completed bookings. It implements requirements 7.2, 7.4, and 7.6 from the requirements document.

## Features

### Rating Creation (Requirement 7.2, 7.4, 7.6)

- **POST /ratings** - Create a new rating for a completed booking
  - Validates booking is in COMPLETED status (Requirement 7.4)
  - Prevents duplicate ratings for the same booking (Requirement 7.6)
  - Sends notification to professional when rated
  - Stores overall score, comment, category ratings, and optional photos

## API Endpoints

### POST /ratings

Creates a new rating for a completed booking.

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "bookingId": "uuid",
  "score": 5,
  "comment": "Excellent service!",
  "categoryRatings": [
    { "category": "quality", "score": 5 },
    { "category": "punctuality", "score": 5 },
    { "category": "communication", "score": 5 }
  ],
  "photoUrls": ["https://example.com/photo1.jpg"] // Optional
}
```

**Validation Rules:**
- `bookingId`: Must be a valid UUID
- `score`: Integer between 1-5
- `comment`: Required string
- `categoryRatings`: Array of category ratings with scores 1-5
- `photoUrls`: Optional array of valid URLs

**Response (201 Created):**
```json
{
  "id": "uuid",
  "bookingId": "uuid",
  "userId": "uuid",
  "professionalId": "uuid",
  "score": 5,
  "comment": "Excellent service!",
  "categoryRatings": [
    { "category": "quality", "score": 5 },
    { "category": "punctuality", "score": 5 },
    { "category": "communication", "score": 5 }
  ],
  "photoUrls": ["https://example.com/photo1.jpg"],
  "isVerified": true,
  "moderationStatus": "approved",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**

- **400 Bad Request** - Invalid input or business rule violation
  - "Only completed bookings can be rated" (Requirement 7.4)
  - "A rating already exists for this booking" (Requirement 7.6)
  - Validation errors (invalid score, missing fields, etc.)

- **401 Unauthorized** - Missing or invalid authentication token

- **403 Forbidden** - User attempting to rate a booking they don't own
  - "You can only rate your own bookings"

- **404 Not Found** - Booking not found
  - "Booking with ID {id} not found"

## Business Rules

### Requirement 7.2: Rating Creation
When a user submits a rating, the platform SHALL create a Rating record and add it to the professional profile.

**Implementation:**
- Rating is created with user ID, professional ID, and booking ID
- Overall score (1-5 stars) and comment are required
- Category ratings (quality, punctuality, communication, etc.) are required
- Optional photo URLs can be included
- Rating is automatically verified and approved (moderation can be added later)
- Notification is sent to the professional

### Requirement 7.4: Completed Bookings Only
The platform SHALL only allow ratings for bookings in Completed status.

**Implementation:**
- Service validates booking status before creating rating
- Returns 400 Bad Request if booking is not COMPLETED
- Error message: "Only completed bookings can be rated"

### Requirement 7.6: One Rating Per Booking
The platform SHALL allow each user to rate a booking only once.

**Implementation:**
- Service checks for existing rating before creating new one
- Returns 400 Bad Request if rating already exists
- Error message: "A rating already exists for this booking"

## Data Model

### ServiceRating Entity

```typescript
{
  id: string;                    // UUID primary key
  bookingId: string;             // UUID foreign key to booking
  userId: string;                // UUID foreign key to user
  professionalId: string;        // UUID foreign key to professional
  score: number;                 // Overall rating (1-5)
  comment: string;               // User comment
  categoryRatings: Array<{       // Category-specific ratings
    category: string;
    score: number;
  }>;
  photoUrls: string[];           // Optional photo URLs
  isVerified: boolean;           // Verification status
  moderationStatus: string;      // Moderation status
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp
}
```

## Notifications

When a rating is created, the service sends a notification to the professional:

- **Type:** NEW_RATING
- **Channels:** In-app, Email
- **Data:**
  - userName: Name of the user who left the rating
  - professionalName: Name of the professional
  - rating: Overall score
  - comment: User comment

## Testing

### Integration Tests

The service includes comprehensive integration tests covering:

1. **Successful Rating Creation** (Requirement 7.2)
   - Creates rating for completed booking
   - Verifies all fields are saved correctly
   - Checks notification is sent

2. **Completed Booking Validation** (Requirement 7.4)
   - Rejects rating for pending booking
   - Rejects rating for confirmed booking
   - Rejects rating for cancelled booking
   - Only accepts rating for completed booking

3. **Duplicate Rating Prevention** (Requirement 7.6)
   - Allows first rating for a booking
   - Rejects second rating for same booking
   - Error message is clear and specific

4. **Validation Tests**
   - Score must be 1-5
   - Category ratings must be 1-5
   - Required fields must be present
   - Booking must exist
   - User must own the booking

5. **Authentication Tests**
   - Requires valid JWT token
   - Rejects unauthenticated requests

6. **Authorization Tests**
   - User can only rate their own bookings
   - Rejects attempts to rate other users' bookings

### Running Tests

```bash
# Run all rating tests
npm test rating.integration.spec.ts

# Run with coverage
npm test rating.integration.spec.ts --coverage

# Run in watch mode
npm test rating.integration.spec.ts --watch
```

## Future Enhancements

1. **Rating Moderation** (Task 11.6)
   - Manual review of flagged ratings
   - Inappropriate content filtering
   - Report rating functionality

2. **Average Rating Calculation** (Task 11.3)
   - Calculate professional average rating
   - Update professional profile automatically
   - Category-specific averages

3. **Rating Statistics** (Task 11.5)
   - Get professional ratings with pagination
   - Get rating statistics
   - Rating distribution analysis

4. **Photo Upload**
   - Direct photo upload to S3
   - Image optimization and resizing
   - Photo moderation

## Dependencies

- **TypeORM**: Database ORM
- **NestJS**: Framework
- **class-validator**: DTO validation
- **NotificationService**: Sending notifications to professionals
- **BookingService**: Validating booking status

## Error Handling

The service uses NestJS exception filters for consistent error responses:

- `NotFoundException`: Booking not found
- `BadRequestException`: Validation errors, business rule violations
- `ForbiddenException`: Authorization errors

All errors include descriptive messages to help clients understand what went wrong.
