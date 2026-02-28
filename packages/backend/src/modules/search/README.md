# Search Service Module

This module implements the complete Search Service with ElasticSearch integration for the technician marketplace platform.

## Features

### 1. ElasticSearch Integration
- Professional index with optimized mappings
- Spanish language analyzer for better search results
- Geo-point support for location-based queries
- Automatic index creation on module initialization

### 2. Search Endpoints

#### POST /search/professionals
Main search endpoint with comprehensive filtering:
- **Location-based**: Search by coordinates with configurable radius (default 50km)
- **Category filtering**: Filter by service categories
- **Professional type**: Filter by HANDYMAN or ARTIST
- **Rating filter**: Minimum rating threshold
- **Price filter**: Maximum hourly rate
- **Artist-specific**: Filter by art style and materials
- **Availability**: Filter only available professionals
- **Verification**: Filter only verified professionals
- **Sorting**: By distance, rating, price, experience, or portfolio

**Request Body:**
```json
{
  "latitude": 19.4326,
  "longitude": -99.1332,
  "category": "elektrik",
  "professionalType": "handyman",
  "radius": 30,
  "minRating": 4.0,
  "maxPrice": 100,
  "sortBy": "rating",
  "page": 1,
  "pageSize": 20
}
```

**Response:**
```json
{
  "professionals": [
    {
      "professional": { /* ProfessionalProfile */ },
      "distance": 5.2,
      "estimatedPrice": 75,
      "portfolioPreview": [ /* PortfolioItems for artists */ ]
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 20
}
```

#### POST /search/recommended
Smart matching algorithm for personalized recommendations:
- Uses multi-factor scoring algorithm
- Considers distance, rating, experience, availability, price, success rate
- Artist-specific: Portfolio quality and style compatibility
- Returns top matches sorted by match score

**Scoring Formula:**
```
Match Score = (
  Distance Score * 0.25 +
  Rating Score * 0.20 +
  Experience Score * 0.15 +
  Availability Score * 0.15 +
  Price Compatibility * 0.10 +
  Past Success Rate * 0.10 +
  User Preference Match * 0.05
)

For artists, add:
+ Portfolio Quality * 0.10
+ Style Compatibility * 0.05
```

**Request Body:**
```json
{
  "latitude": 19.4326,
  "longitude": -99.1332,
  "category": "duvar resmi",
  "professionalType": "artist",
  "maxPrice": 150,
  "preferredStyles": ["modern", "abstract"],
  "limit": 10
}
```

#### GET /professionals/:id/availability
Check professional availability for a specific date and duration:
- Checks working hours for the requested day
- Identifies time slot conflicts with existing bookings
- Returns available time slots in 30-minute intervals

**Query Parameters:**
- `date`: ISO date string (e.g., "2024-01-15")
- `duration`: Duration in minutes (minimum 30)

**Response:**
```json
[
  {
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-15T10:30:00Z",
    "isAvailable": true
  },
  {
    "start": "2024-01-15T10:30:00Z",
    "end": "2024-01-15T12:00:00Z",
    "isAvailable": false
  }
]
```

### 3. Synchronization Service

The `ProfessionalSyncService` keeps PostgreSQL and ElasticSearch in sync:

```typescript
// Sync single professional
await professionalSyncService.syncProfessional(professionalId);

// Sync all professionals (bulk operation)
await professionalSyncService.syncAllProfessionals();

// Remove professional from index
await professionalSyncService.removeProfessional(professionalId);

// Update availability
await professionalSyncService.updateProfessionalAvailability(professionalId, true);

// Update rating
await professionalSyncService.updateProfessionalRating(professionalId, 4.5, 25);
```

**Integration Points:**
- Call `syncProfessional()` after creating/updating professional profiles
- Call `removeProfessional()` when deactivating professionals
- Call `updateProfessionalAvailability()` when availability changes
- Call `updateProfessionalRating()` after new ratings are submitted

### 4. Artist Portfolio Support

For artists, the search service automatically:
- Includes portfolio preview images in search results
- Counts portfolio items for scoring
- Filters by art style and materials
- Sorts by portfolio quality

### 5. Property-Based Tests

The module includes comprehensive property-based tests validating:
- **Property 11**: Category-based search accuracy
- **Property 11.1**: Professional type filtering
- **Property 11.2**: Artist portfolio preview
- **Property 12**: Geographic filtering accuracy
- **Property 13**: Rating-based sorting accuracy

Run tests with:
```bash
npm test -- search.property.test.ts --run
```

## Configuration

Add to your `.env` file:

```env
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=changeme
```

## ElasticSearch Index

The module automatically creates the `professionals` index with:
- Spanish language analyzer
- Geo-point mapping for location queries
- Keyword fields for exact matching
- Text fields for full-text search

## Usage Example

```typescript
import { SearchService } from './modules/search/search.service';

// Inject in your service
constructor(private readonly searchService: SearchService) {}

// Search for professionals
const results = await this.searchService.searchProfessionals({
  latitude: 19.4326,
  longitude: -99.1332,
  category: 'elektrik',
  radius: 30,
  minRating: 4.0,
  sortBy: 'rating',
});

// Get smart recommendations
const recommended = await this.searchService.getRecommendedProfessionals({
  latitude: 19.4326,
  longitude: -99.1332,
  category: 'duvar resmi',
  professionalType: 'artist',
  preferredStyles: ['modern'],
  limit: 10,
});

// Check availability
const slots = await this.searchService.checkAvailability(
  professionalId,
  new Date('2024-01-15'),
  90, // 90 minutes
);
```

## Architecture

```
search/
├── elasticsearch.module.ts       # ElasticSearch client configuration
├── elasticsearch.service.ts      # Low-level ES operations
├── professional-sync.service.ts  # PostgreSQL ↔ ES synchronization
├── search.service.ts             # High-level search logic
├── search.controller.ts          # REST API endpoints
├── search.module.ts              # Module definition
├── search.property.test.ts       # Property-based tests
└── dto/
    ├── search-professionals.dto.ts
    ├── recommended-professionals.dto.ts
    └── check-availability.dto.ts
```

## Requirements Validated

This implementation validates the following requirements:
- **4.2**: Category-based professional search
- **4.3**: Location-based filtering
- **4.4**: Rating-based sorting
- **4.5**: Real-time result updates
- **4.7**: Artist portfolio preview in search
- **4.8**: Professional type filtering
- **5.5**: Availability checking with conflict detection

## Notes

- ElasticSearch must be running before starting the application
- Initial sync can be triggered manually: `professionalSyncService.syncAllProfessionals()`
- The search service uses geo-distance queries for accurate location-based search
- Portfolio images are limited to 5 in search results for performance
- Availability slots are generated in 30-minute intervals
