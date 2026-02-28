# Admin Module

This module provides administrative functionality for managing users, providers, and professionals in the platform.

## Overview

The Admin module allows administrators to:
- List and search all users, providers, and professionals
- Suspend/unsuspend user accounts
- Delete user accounts
- Filter and paginate results

## Requirements

This module implements the following requirements:
- **Requirement 9.1**: Admin can list all users, providers, and professionals
- **Requirement 9.2**: Admin can suspend or delete user accounts
- **Requirement 9.3**: Suspended users cannot log in

## API Endpoints

### GET /admin/users

List all users with optional filtering and pagination.

**Query Parameters:**
- `role` (optional): Filter by user role (admin, provider, handyman, user)
- `search` (optional): Search by email, first name, or last name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user",
      "isEmailVerified": true,
      "isSuspended": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "profile": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### GET /admin/providers

List all providers (suppliers) with optional filtering and pagination.

**Query Parameters:**
- `search` (optional): Search by company name, contact email, or user email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "companyName": "Test Supplier",
      "contactEmail": "supplier@example.com",
      "contactPhone": "+1234567890",
      "verificationStatus": "verified",
      "rating": 4.5,
      "totalOrders": 100,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "uuid",
        "email": "supplier@example.com",
        "isSuspended": false
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### GET /admin/professionals

List all professionals (technicians and artists) with optional filtering and pagination.

**Query Parameters:**
- `professionalType` (optional): Filter by professional type (handyman, artist)
- `search` (optional): Search by business name, first name, last name, or email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "professionalType": "handyman",
      "businessName": "John's Repairs",
      "experienceYears": 5,
      "hourlyRate": 50,
      "verificationStatus": "verified",
      "isAvailable": true,
      "rating": 4.8,
      "totalJobs": 150,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "uuid",
        "email": "professional@example.com",
        "isSuspended": false,
        "profile": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe",
          "phone": "+1234567890"
        }
      },
      "specializations": [
        {
          "id": "uuid",
          "name": "Plumbing"
        }
      ]
    }
  ],
  "total": 75,
  "page": 1,
  "limit": 20,
  "totalPages": 4
}
```

### PUT /admin/users/:id/suspend

Suspend or unsuspend a user account.

**Path Parameters:**
- `id`: User ID (UUID)

**Request Body:**
```json
{
  "isSuspended": true,
  "reason": "Violation of terms of service"
}
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "isSuspended": true
}
```

**Business Rules:**
- Admins cannot suspend themselves
- Admins cannot suspend other admins
- Suspended users cannot log in to the platform
- Activity is logged for audit purposes

### DELETE /admin/users/:id

Permanently delete a user account.

**Path Parameters:**
- `id`: User ID (UUID)

**Response:**
```json
{
  "message": "User deleted successfully",
  "deletedUserId": "uuid"
}
```

**Business Rules:**
- Admins cannot delete themselves
- Admins cannot delete other admins
- Deletion cascades to related entities (profile, bookings, etc.)
- Activity is logged for audit purposes

## Authorization

All endpoints require:
1. **Authentication**: Valid JWT token
2. **Authorization**: Admin role

Non-admin users will receive a 403 Forbidden response.

## Activity Logging

All admin actions are logged to the activity log service for audit purposes:
- User suspension/unsuspension
- User deletion

Logs include:
- Admin user ID
- Action performed
- Target user ID and email
- Timestamp
- Additional metadata (e.g., suspension reason)

## Error Handling

The module handles the following error cases:
- **400 Bad Request**: Invalid input or business rule violation
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User does not have admin role
- **404 Not Found**: User, provider, or professional not found

## Testing

The module includes:
- **Unit tests**: `admin.controller.spec.ts` - Tests controller logic
- **Integration tests**: `admin.integration.spec.ts` - Tests full API endpoints (requires database)

Run tests:
```bash
npm test -- admin.controller.spec.ts
npm test -- admin.integration.spec.ts
```

## Implementation Notes

### Service Layer

The `AdminService` handles all business logic:
- Query building with TypeORM
- Pagination and filtering
- Business rule validation
- Activity logging integration

### DTOs

Request validation is handled by class-validator decorators:
- `ListUsersDto`: User listing filters
- `ListProvidersDto`: Provider listing filters
- `ListProfessionalsDto`: Professional listing filters
- `SuspendUserDto`: Suspension request

### Database Queries

All list endpoints use:
- Left joins to include related entities
- ILIKE for case-insensitive search
- Pagination with skip/take
- Ordering by creation date (DESC)

## Future Enhancements

Potential improvements for future iterations:
- Bulk operations (suspend/delete multiple users)
- Advanced filtering (date ranges, verification status)
- Export functionality (CSV, Excel)
- Audit log viewing endpoint
- User activity statistics
- Automated suspension based on rules
