import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client, UnitSystem } from '@googlemaps/google-maps-services-js'
import {
  GeocodeResponseDto,
  ReverseGeocodeResponseDto,
  DistanceResponseDto,
  AutocompleteResponseDto,
  AutocompletePrediction,
  DistanceUnit,
} from './dto'

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name)
  private readonly client: Client
  private readonly apiKey: string

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || ''
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY is not configured')
    }
    this.client = new Client({})
  }

  /**
   * Convert address to coordinates (geocoding)
   * @param address - The address to geocode
   * @returns Coordinates and formatted address
   */
  async geocode(address: string): Promise<GeocodeResponseDto> {
    try {
      this.logger.log(`Geocoding address: ${address}`)

      const response = await this.client.geocode({
        params: {
          address,
          key: this.apiKey,
        },
      })

      if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new BadRequestException('Address not found')
      }

      const result = response.data.results[0]
      const location = result.geometry.location

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
      }
    } catch (error) {
      this.logger.error(`Geocoding error: ${error.message}`, error.stack)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('Failed to geocode address')
    }
  }

  /**
   * Convert coordinates to address (reverse geocoding)
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @returns Address information
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponseDto> {
    try {
      this.logger.log(`Reverse geocoding: ${latitude}, ${longitude}`)

      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: this.apiKey,
        },
      })

      if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new BadRequestException('Location not found')
      }

      const result = response.data.results[0]
      const addressComponents = result.address_components

      // Extract address components
      const getComponent = (type: string): string | undefined => {
        const component = addressComponents.find(c => c.types.includes(type as any))
        return component?.long_name
      }

      return {
        address: result.formatted_address,
        city: getComponent('locality') || getComponent('administrative_area_level_2'),
        state: getComponent('administrative_area_level_1'),
        country: getComponent('country'),
        postalCode: getComponent('postal_code'),
      }
    } catch (error) {
      this.logger.error(`Reverse geocoding error: ${error.message}`, error.stack)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('Failed to reverse geocode coordinates')
    }
  }

  /**
   * Calculate distance between two locations
   * @param origin - Origin address or coordinates
   * @param destination - Destination address or coordinates
   * @param units - Distance units (metric or imperial)
   * @returns Distance and duration information
   */
  async calculateDistance(
    origin: string,
    destination: string,
    units: DistanceUnit = DistanceUnit.METRIC
  ): Promise<DistanceResponseDto> {
    try {
      this.logger.log(`Calculating distance from ${origin} to ${destination}`)

      const response = await this.client.distancematrix({
        params: {
          origins: [origin],
          destinations: [destination],
          units: units === DistanceUnit.METRIC ? UnitSystem.metric : UnitSystem.imperial,
          key: this.apiKey,
        },
      })

      if (response.data.status !== 'OK') {
        throw new BadRequestException('Failed to calculate distance')
      }

      const element = response.data.rows[0]?.elements[0]
      if (!element || element.status !== 'OK') {
        throw new BadRequestException('Route not found')
      }

      // Convert distance to km or miles
      const distance =
        units === DistanceUnit.METRIC
          ? element.distance.value / 1000 // meters to km
          : element.distance.value / 1609.34 // meters to miles

      return {
        distance,
        duration: element.duration.value, // in seconds
        distanceText: element.distance.text,
        durationText: element.duration.text,
      }
    } catch (error) {
      this.logger.error(`Distance calculation error: ${error.message}`, error.stack)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('Failed to calculate distance')
    }
  }

  /**
   * Get address autocomplete suggestions
   * @param input - User input text
   * @param sessionToken - Session token for billing optimization
   * @param language - Language code (e.g., 'es', 'en')
   * @returns List of address predictions
   */
  async autocompleteAddress(
    input: string,
    sessionToken?: string,
    language: string = 'es'
  ): Promise<AutocompleteResponseDto> {
    try {
      this.logger.log(`Autocomplete for: ${input}`)

      const response = await this.client.placeAutocomplete({
        params: {
          input,
          key: this.apiKey,
          language,
          ...(sessionToken && { sessiontoken: sessionToken }),
        },
      })

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new BadRequestException('Autocomplete request failed')
      }

      const predictions: AutocompletePrediction[] = response.data.predictions.map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
      }))

      return { predictions }
    } catch (error) {
      this.logger.error(`Autocomplete error: ${error.message}`, error.stack)
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('Failed to get autocomplete suggestions')
    }
  }
}
