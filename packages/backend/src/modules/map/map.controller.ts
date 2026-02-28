import { Controller, Post, Body, Get, Query } from '@nestjs/common'
import { MapService } from './map.service'
import {
  GeocodeDto,
  GeocodeResponseDto,
  ReverseGeocodeDto,
  ReverseGeocodeResponseDto,
  CalculateDistanceDto,
  DistanceResponseDto,
  AutocompleteDto,
  AutocompleteResponseDto,
} from './dto'

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  /**
   * Geocode an address to coordinates
   * POST /map/geocode
   */
  @Post('geocode')
  async geocode(@Body() geocodeDto: GeocodeDto): Promise<GeocodeResponseDto> {
    return this.mapService.geocode(geocodeDto.address)
  }

  /**
   * Reverse geocode coordinates to address
   * POST /map/reverse-geocode
   */
  @Post('reverse-geocode')
  async reverseGeocode(
    @Body() reverseGeocodeDto: ReverseGeocodeDto
  ): Promise<ReverseGeocodeResponseDto> {
    return this.mapService.reverseGeocode(reverseGeocodeDto.latitude, reverseGeocodeDto.longitude)
  }

  /**
   * Calculate distance between two locations
   * POST /map/calculate-distance
   */
  @Post('calculate-distance')
  async calculateDistance(
    @Body() calculateDistanceDto: CalculateDistanceDto
  ): Promise<DistanceResponseDto> {
    return this.mapService.calculateDistance(
      calculateDistanceDto.origin,
      calculateDistanceDto.destination,
      calculateDistanceDto.units
    )
  }

  /**
   * Get address autocomplete suggestions
   * GET /map/autocomplete?input=...
   */
  @Get('autocomplete')
  async autocomplete(@Query() autocompleteDto: AutocompleteDto): Promise<AutocompleteResponseDto> {
    return this.mapService.autocompleteAddress(
      autocompleteDto.input,
      autocompleteDto.sessionToken,
      autocompleteDto.language
    )
  }
}
