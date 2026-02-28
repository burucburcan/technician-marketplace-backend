# Provider Module

This module implements the provider management panel functionality, allowing providers to manage their professionals (technicians and artists).

## Overview

Providers are entities that manage multiple professionals. This module provides endpoints for:
- Listing professionals under a provider
- Creating new professionals
- Updating professional information
- Disabling professionals (soft delete)
- Filtering professionals by type (HANDYMAN/ARTIST)

## Requirements

This module implements the following requirements from the specification:
- **Requirement 8.1**: Provider can view list of all connected professionals
- **Requirement 8.2**: Provider can add, edit, and disable professionals
- **Requirement 8.7**: Provider can filter professionals by type (technician/artist)

## API Endpoints

### GET /providers/:id/professionals
Get all professionals managed by a provider.

**Query Parameters:**
- `professionalType` (optional): Filter by professional type (HANDYMAN or ARTIST)

**Authorization:** Provider role required, can only access own professionals

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "providerId": "uuid",
    "professionalType": "HANDYMAN",
    "businessName": "Pro Services",
    "specializations": [...],
    "experienceYears": 5,
    "hourlyRate": 50,
    "serviceRadius": 10,
    "isAvailable": true,
    ...
  }
]
```

### GET /providers/:id/professionals/:professionalId
Get a specific professional's details.

**Authorization:** Provider role required, can only access own professionals

**Response:** Professional profile with full details including specializations, certificates, and portfolio

### POST /providers/:id/professionals
Create a new professional under the provider.

**Authorization:** Provider role required

**Request Body:**
```json
{
  "professionalType": "HANDYMAN",
  "businessName": "Pro Services",
  "specializationIds": ["uuid1", "uuid2"],
  "experienceYears": 5,
  "hourlyRate": 50,
  "serviceRadius": 10,
  "workingHours": {
    "monday": [{ "start": "09:00", "end": "17:00" }],
    ...
  },
  "serviceAddress": {
    "address": "123 Main St",
    "latitude": 19.4326,
    "longitude": -99.1332
  }
}
```

**Response:** Created professional profile

### PUT /providers/:id/professionals/:professionalId
Update a professional's information.

**Authorization:** Provider role required, can only update own professionals

**Request Body:** Partial professional data (same structure as POST, all fields optional)

**Response:** Updated professional profile

### DELETE /providers/:id/professionals/:professionalId
Disable a professional (soft delete).

**Authorization:** Provider role required, can only disable own professionals

**Response:**
```json
{
  "message": "Professional disabled successfully"
}
```

**Note:** This endpoint sets `isAvailable` to `false` instead of deleting the record, preserving historical data and bookings.

## Authorization

All endpoints require JWT authentication and provider role. Providers can only manage their own professionals. Admins have access to all providers' professionals.

## Database Changes

This module adds a `providerId` column to the `professional_profiles` table to establish the relationship between providers and professionals.

**Migration:** `1704900000001-AddProviderIdToProfessionalProfile.ts`

## Implementation Notes

1. **Professional Creation**: When a provider creates a professional, a placeholder user account is created. In a production system, this would trigger an invitation flow where the professional completes their registration.

2. **Soft Delete**: Professionals are disabled rather than deleted to preserve historical booking data and maintain referential integrity.

3. **Filtering**: The module supports filtering by professional type (HANDYMAN/ARTIST) to help providers manage different types of professionals separately.

4. **Authorization**: The controller includes role-based access control to ensure providers can only manage their own professionals.

## Testing

Unit tests and integration tests should be added to verify:
- Provider can list their professionals
- Provider can create professionals with valid data
- Provider can update professional information
- Provider can disable professionals
- Provider cannot access other providers' professionals
- Filtering by professional type works correctly
- Invalid service category IDs are rejected

## Future Enhancements

1. **Invitation System**: Implement a proper invitation flow for professionals
2. **Bulk Operations**: Add endpoints for bulk updates/disables
3. **Statistics**: Add endpoint to get provider statistics (total professionals, active bookings, etc.)
4. **Professional Transfer**: Allow transferring professionals between providers
5. **Approval Workflow**: Add admin approval for new professionals
