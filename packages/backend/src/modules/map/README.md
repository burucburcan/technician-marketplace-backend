# Map Module

This module provides Google Maps API integration for the technician marketplace platform.

## Features

- **Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Distance Calculation**: Calculate distance and duration between two locations
- **Address Autocomplete**: Get address suggestions as users type

## Configuration

Add your Google Maps API key to the `.env` file:

```env
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

## API Endpoints

### 1. Geocode Address

Convert an address to coordinates.

**Endpoint:** `POST /map/geocode`

**Request Body:**
```json
{
  "address": "Av. Paseo de la Reforma 222, Juárez, CDMX, Mexico"
}
```

**Response:**
```json
{
  "latitude": 19.4326,
  "longitude": -99.1332,
  "formattedAddress": "Av. Paseo de la Reforma 222, Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX, Mexico"
}
```

### 2. Reverse Geocode

Convert coordinates to an address.

**Endpoint:** `POST /map/reverse-geocode`

**Request Body:**
```json
{
  "latitude": 19.4326,
  "longitude": -99.1332
}
```

**Response:**
```json
{
  "address": "Av. Paseo de la Reforma 222, Juárez, Cuauhtémoc, 06600 Ciudad de México, CDMX, Mexico",
  "city": "Ciudad de México",
  "state": "Ciudad de México",
  "country": "Mexico",
  "postalCode": "06600"
}
```

### 3. Calculate Distance

Calculate distance and duration between two locations.

**Endpoint:** `POST /map/calculate-distance`

**Request Body:**
```json
{
  "origin": "Av. Paseo de la Reforma 222, CDMX, Mexico",
  "destination": "Zócalo, CDMX, Mexico",
  "units": "metric"
}
```

**Response:**
```json
{
  "distance": 2.5,
  "duration": 600,
  "distanceText": "2.5 km",
  "durationText": "10 mins"
}
```

### 4. Address Autocomplete

Get address suggestions for autocomplete.

**Endpoint:** `GET /map/autocomplete?input=reforma&language=es`

**Query Parameters:**
- `input` (required): The search text
- `sessionToken` (optional): Session token for billing optimization
- `language` (optional): Language code (default: 'es')

**Response:**
```json
{
  "predictions": [
    {
      "placeId": "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "description": "Av. Paseo de la Reforma, Ciudad de México, CDMX, Mexico",
      "mainText": "Av. Paseo de la Reforma",
      "secondaryText": "Ciudad de México, CDMX, Mexico"
    }
  ]
}
```

## Usage in Other Modules

The `MapService` is exported and can be injected into other modules:

```typescript
import { MapService } from '../map/map.service';

@Injectable()
export class SearchService {
  constructor(private readonly mapService: MapService) {}

  async findNearbyProfessionals(address: string) {
    // Geocode the address
    const coords = await this.mapService.geocode(address);
    
    // Use coordinates to search for professionals
    // ...
  }
}
```

## Error Handling

All methods throw `BadRequestException` with descriptive messages when:
- Invalid addresses or coordinates are provided
- Google Maps API returns an error
- API key is not configured or invalid

## Requirements Validation

This module implements:
- **Requirement 13.1**: Address to coordinates conversion (geocoding)
- **Requirement 13.3**: Coordinates to address conversion (reverse geocoding)
- **Requirement 13.3**: Distance calculation between locations
- Address autocomplete for better UX

## Google Maps APIs Used

- **Geocoding API**: Convert addresses to coordinates
- **Reverse Geocoding API**: Convert coordinates to addresses
- **Distance Matrix API**: Calculate distances and durations
- **Places API (Autocomplete)**: Provide address suggestions
