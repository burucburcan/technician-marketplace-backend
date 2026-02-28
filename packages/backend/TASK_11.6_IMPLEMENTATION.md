# Task 11.6: Rating Moderation System Implementation

## Overview
Implemented a comprehensive rating moderation system that allows users to report inappropriate ratings and admins to moderate them. The system includes automatic content filtering and role-based access control.

## Implementation Details

### 1. DTOs Created

#### `report-rating.dto.ts`
- **Purpose**: Validate report submission data
- **Fields**:
  - `reason`: String (required, max 500 chars) - Reason for reporting

#### `moderate-rating.dto.ts`
- **Purpose**: Validate moderation actions
- **Fields**:
  - `action`: Enum (approved, rejected, flagged) - Moderation action
  - `reason`: String (optional, max 500 chars) - Reason for moderation

### 2. Role-Based Access Control

#### `roles.decorator.ts`
- Custom decorator to specify required roles for endpoints
- Usage: `@Roles(UserRole.ADMIN)`

#### `roles.guard.ts`
- Guard that checks if user has required role
- Integrates with JWT authentication
- Extracts role from JWT token payload

### 3. Content Filtering

#### `content-filter.util.ts`
- **Purpose**: Detect inappropriate content in ratings
- **Features**:
  - Profanity detection (English and Spanish)
  - Spam pattern detection (URLs, excessive caps)
  - Offensive term detection
  - Word boundary matching to avoid false positives
- **Methods**:
  - `containsInappropriateContent(content)`: Returns boolean
  - `getInappropriateWords(content)`: Returns array of detected words

### 4. Service Methods

#### `createRating()` - Enhanced
- Now includes automatic content filtering
- Ratings with inappropriate content are automatically flagged
- Only approved ratings count towards professional average

#### `reportRating(ratingId, reason)`
- Allows users to report inappropriate ratings
- Updates moderation status to 'flagged'
- Recalculates professional average (excluding flagged ratings)

#### `moderateRating(ratingId, moderateDto)`
- Admin-only method to moderate ratings
- Actions: approve, reject, flag
- Recalculates professional average when status changes

#### `updateProfessionalAverageRating()` - Enhanced
- Now only includes approved ratings in calculation
- Filters out flagged and rejected ratings

### 5. Controller Endpoints

#### `POST /ratings/:id/report`
- **Auth**: Required (any authenticated user)
- **Purpose**: Report inappropriate rating
- **Body**: `{ reason: string }`
- **Response**: Updated rating with flagged status

#### `PUT /ratings/:id/moderate`
- **Auth**: Required (admin only)
- **Purpose**: Moderate a rating
- **Body**: `{ action: 'approved' | 'rejected' | 'flagged', reason?: string }`
- **Response**: Updated rating with new moderation status
- **Access Control**: Uses `@Roles(UserRole.ADMIN)` and `RolesGuard`

### 6. Integration Tests

#### `rating-moderation.integration.spec.ts`
Comprehensive test suite covering:

**Report Endpoint Tests**:
- ✅ Users can report inappropriate ratings
- ✅ Returns 404 for non-existent ratings
- ✅ Requires authentication

**Moderate Endpoint Tests**:
- ✅ Admin can approve ratings
- ✅ Admin can reject ratings
- ✅ Admin can flag ratings
- ✅ Non-admin users are denied access (403)
- ✅ Requires authentication
- ✅ Returns 404 for non-existent ratings
- ✅ Validates moderation action enum

**Content Filtering Tests**:
- ✅ Automatically flags ratings with English profanity
- ✅ Automatically flags ratings with Spanish profanity
- ✅ Automatically flags ratings with excessive capitalization
- ✅ Approves clean ratings

**Average Rating Calculation Tests**:
- ✅ Only approved ratings count in average
- ✅ Flagged ratings excluded from average
- ✅ Average recalculated when rating is moderated

## Requirements Satisfied

### Requirement 7.2: Rating Moderation
- ✅ Users can report inappropriate ratings
- ✅ Admins can moderate ratings (approve/reject/flag)
- ✅ Automatic content filtering for inappropriate content
- ✅ Moderation status tracking (pending, approved, rejected, flagged)

## Technical Decisions

### 1. Automatic Content Filtering
- Implemented basic keyword-based filtering
- Supports both English and Spanish profanity
- Detects spam patterns (URLs, excessive caps, punctuation)
- Can be extended with ML-based filtering in the future

### 2. Moderation Status Flow
```
Rating Created → Auto-check content
  ├─ Clean → approved
  └─ Inappropriate → flagged

User Reports → flagged
Admin Moderates → approved | rejected | flagged
```

### 3. Average Rating Calculation
- Only approved ratings count towards professional average
- Flagged and rejected ratings are excluded
- Average is recalculated whenever:
  - New rating is created (if approved)
  - Rating is reported (status changes to flagged)
  - Admin moderates rating (status changes)

### 4. Role-Based Access Control
- Leverages existing JWT authentication
- Role is included in JWT token payload
- RolesGuard checks user role from token
- Flexible decorator-based approach

## Files Created/Modified

### Created:
1. `packages/backend/src/modules/rating/dto/report-rating.dto.ts`
2. `packages/backend/src/modules/rating/dto/moderate-rating.dto.ts`
3. `packages/backend/src/common/decorators/roles.decorator.ts`
4. `packages/backend/src/common/guards/roles.guard.ts`
5. `packages/backend/src/common/utils/content-filter.util.ts`
6. `packages/backend/src/modules/rating/rating-moderation.integration.spec.ts`

### Modified:
1. `packages/backend/src/modules/rating/rating.controller.ts`
   - Added report and moderate endpoints
   - Added role-based access control imports
2. `packages/backend/src/modules/rating/rating.service.ts`
   - Enhanced createRating with content filtering
   - Added reportRating method
   - Added moderateRating method
   - Updated updateProfessionalAverageRating to filter by status

## API Examples

### Report a Rating
```bash
POST /ratings/123e4567-e89b-12d3-a456-426614174000/report
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "reason": "Contains inappropriate language"
}
```

### Moderate a Rating (Admin)
```bash
PUT /ratings/123e4567-e89b-12d3-a456-426614174000/moderate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "rejected",
  "reason": "Violates community guidelines"
}
```

## Future Enhancements

1. **ML-Based Content Filtering**
   - Train model on reported content
   - Improve detection accuracy
   - Reduce false positives

2. **Moderation Dashboard**
   - Admin UI for reviewing flagged content
   - Bulk moderation actions
   - Moderation history and analytics

3. **User Reputation System**
   - Track users who frequently post inappropriate content
   - Automatic restrictions for repeat offenders

4. **Appeal System**
   - Allow users to appeal rejected ratings
   - Admin review queue for appeals

5. **Multilingual Support**
   - Expand profanity lists for more languages
   - Context-aware filtering

## Testing

To run the integration tests:
```bash
# From project root
npm test -- rating-moderation.integration.spec.ts

# Or from backend package
cd packages/backend
npm test -- rating-moderation.integration.spec.ts
```

## Notes

- The content filter is intentionally basic for MVP
- Admin role must be set during user registration
- JWT token includes user role for authorization
- Moderation actions are logged in the database
- Professional average rating updates automatically

## Compliance

This implementation ensures:
- ✅ Platform safety through content moderation
- ✅ User empowerment through reporting mechanism
- ✅ Admin control through moderation tools
- ✅ Fair rating system (only approved ratings count)
- ✅ Requirement 7.2 fully satisfied
