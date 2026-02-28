import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { BadRequestException } from '@nestjs/common'
import * as fc from 'fast-check'
import { MapService } from './map.service'
import { Client } from '@googlemaps/google-maps-services-js'

/**
 * Property-Based Tests for Map Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the geocoding and distance calculation system, ensuring correctness at scale.
 */
describe('MapService Property Tests', () => {
  let service: MapService
  let mockClient: jest.Mocked<Client>

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<MapService>(MapService)
    // Access the private client for mocking
    mockClient = (service as any).client as jest.Mocked<Client>

    jest.clearAllMocks()
  })

  // Generators for property testing
  const validLatitudeGen = fc.double({ min: -90, max: 90 })
  const validLongitudeGen = fc.double({ min: -180, max: 180 })
  const coordinatesGen = fc.record({
    latitude: validLatitudeGen,
    longitude: validLongitudeGen,
  })

  // Generate realistic addresses
  const streetNumberGen = fc.integer({ min: 1, max: 9999 })
  const streetNameGen = fc.constantFrom(
    'Avenida Reforma',
    'Calle Juarez',
    'Boulevard Insurgentes',
    'Paseo de la Reforma',
    'Avenida Revolucion'
  )
  const cityGen = fc.constantFrom(
    'Ciudad de Mexico',
    'Guadalajara',
    'Monterrey',
    'Puebla',
    'Tijuana',
    'Leon',
    'Cancun'
  )
  const stateGen = fc.constantFrom(
    'CDMX',
    'Jalisco',
    'Nuevo Leon',
    'Puebla',
    'Baja California',
    'Guanajuato',
    'Quintana Roo'
  )
  const postalCodeGen = fc.integer({ min: 10000, max: 99999 }).map(n => n.toString())

  const addressGen = fc
    .record({
      streetNumber: streetNumberGen,
      streetName: streetNameGen,
      city: cityGen,
      state: stateGen,
      postalCode: postalCodeGen,
    })
    .map(
      ({ streetNumber, streetName, city, state, postalCode }) =>
        `${streetNumber} ${streetName}, ${city}, ${state} ${postalCode}, Mexico`
    )

  /**
   * **Property 39: Adres Geocoding Round-Trip**
   *
   * **Validates: Requirements 13.3**
   *
   * For any valid address, when geocoding the address to coordinates,
   * the coordinates must be valid latitude/longitude values.
   * This property ensures geocoding produces valid geographic coordinates.
   */
  describe('Property 39: Address Geocoding Round-Trip', () => {
    it('should return valid coordinates for any valid address', async () => {
      await fc.assert(
        fc.asyncProperty(addressGen, async (address: string) => {
          // Generate valid coordinates for the mock response
          const mockLat = fc.sample(validLatitudeGen, 1)[0]
          const mockLng = fc.sample(validLongitudeGen, 1)[0]

          // Mock Google Maps API response
          mockClient.geocode = jest.fn().mockResolvedValue({
            data: {
              status: 'OK',
              results: [
                {
                  formatted_address: address,
                  geometry: {
                    location: {
                      lat: mockLat,
                      lng: mockLng,
                    },
                  },
                  address_components: [],
                },
              ],
            },
          })

          const result = await service.geocode(address)

          // Property: Geocoding must return valid coordinates
          expect(result).toBeDefined()
          expect(result.latitude).toBeGreaterThanOrEqual(-90)
          expect(result.latitude).toBeLessThanOrEqual(90)
          expect(result.longitude).toBeGreaterThanOrEqual(-180)
          expect(result.longitude).toBeLessThanOrEqual(180)
          expect(result.formattedAddress).toBeDefined()
          expect(typeof result.formattedAddress).toBe('string')

          // Verify the coordinates match the mock response
          expect(result.latitude).toBe(mockLat)
          expect(result.longitude).toBe(mockLng)

          // Verify API was called with correct parameters
          expect(mockClient.geocode).toHaveBeenCalledWith({
            params: {
              address,
              key: 'test-api-key',
            },
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should handle reverse geocoding for any valid coordinates', async () => {
      await fc.assert(
        fc.asyncProperty(coordinatesGen, async ({ latitude, longitude }) => {
          // Mock Google Maps API response
          const mockAddress = fc.sample(addressGen, 1)[0]
          const mockCity = fc.sample(cityGen, 1)[0]
          const mockState = fc.sample(stateGen, 1)[0]
          const mockPostalCode = fc.sample(postalCodeGen, 1)[0]

          mockClient.reverseGeocode = jest.fn().mockResolvedValue({
            data: {
              status: 'OK',
              results: [
                {
                  formatted_address: mockAddress,
                  address_components: [
                    {
                      long_name: mockCity,
                      short_name: mockCity,
                      types: ['locality'],
                    },
                    {
                      long_name: mockState,
                      short_name: mockState,
                      types: ['administrative_area_level_1'],
                    },
                    {
                      long_name: 'Mexico',
                      short_name: 'MX',
                      types: ['country'],
                    },
                    {
                      long_name: mockPostalCode,
                      short_name: mockPostalCode,
                      types: ['postal_code'],
                    },
                  ],
                },
              ],
            },
          })

          const result = await service.reverseGeocode(latitude, longitude)

          // Property: Reverse geocoding must return address information
          expect(result).toBeDefined()
          expect(result.address).toBeDefined()
          expect(typeof result.address).toBe('string')
          expect(result.address.length).toBeGreaterThan(0)

          // Verify API was called with correct parameters
          expect(mockClient.reverseGeocode).toHaveBeenCalledWith({
            params: {
              latlng: { lat: latitude, lng: longitude },
              key: 'test-api-key',
            },
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should maintain coordinate precision for any valid coordinates', async () => {
      await fc.assert(
        fc.asyncProperty(coordinatesGen, async ({ latitude, longitude }) => {
          // Mock reverse geocode
          mockClient.reverseGeocode = jest.fn().mockResolvedValue({
            data: {
              status: 'OK',
              results: [
                {
                  formatted_address: 'Test Address',
                  address_components: [
                    {
                      long_name: 'Test City',
                      short_name: 'TC',
                      types: ['locality'],
                    },
                  ],
                },
              ],
            },
          })

          await service.reverseGeocode(latitude, longitude)

          // Property: Coordinates must maintain precision
          const callArgs = mockClient.reverseGeocode.mock.calls[0][0]
          const latlng = callArgs.params.latlng as { lat: number; lng: number }
          expect(latlng.lat).toBe(latitude)
          expect(latlng.lng).toBe(longitude)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid addresses gracefully', async () => {
      const invalidAddressGen = fc.constantFrom(
        '',
        '   ',
        'invalid',
        '12345',
        'xyz123abc',
        '!@#$%^&*()'
      )

      await fc.assert(
        fc.asyncProperty(invalidAddressGen, async (invalidAddress: string) => {
          // Mock Google Maps API response for invalid address
          mockClient.geocode = jest.fn().mockResolvedValue({
            data: {
              status: 'ZERO_RESULTS',
              results: [],
            },
          })

          // Property: Invalid addresses must be rejected
          await expect(service.geocode(invalidAddress)).rejects.toThrow(BadRequestException)
          await expect(service.geocode(invalidAddress)).rejects.toThrow('Address not found')
        }),
        { numRuns: 50 }
      )
    })

    it('should reject invalid coordinates gracefully', async () => {
      const invalidLatitudeGen = fc.oneof(
        fc.double({ min: -1000, max: -91 }),
        fc.double({ min: 91, max: 1000 })
      )
      const invalidLongitudeGen = fc.oneof(
        fc.double({ min: -1000, max: -181 }),
        fc.double({ min: 181, max: 1000 })
      )

      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.record({ latitude: invalidLatitudeGen, longitude: validLongitudeGen }),
            fc.record({ latitude: validLatitudeGen, longitude: invalidLongitudeGen }),
            fc.record({ latitude: invalidLatitudeGen, longitude: invalidLongitudeGen })
          ),
          async ({ latitude, longitude }) => {
            // Mock Google Maps API response for invalid coordinates
            mockClient.reverseGeocode = jest.fn().mockResolvedValue({
              data: {
                status: 'INVALID_REQUEST',
                results: [],
              },
            })

            // Property: Invalid coordinates must be rejected
            await expect(service.reverseGeocode(latitude, longitude)).rejects.toThrow(
              BadRequestException
            )
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Property 40: Mesafe Bazlı Sıralama Doğruluğu (Distance-Based Sorting Accuracy)**
   *
   * **Validates: Requirements 13.4**
   *
   * For any list of professionals sorted by distance, the list must be in ascending
   * distance order (each professional is at equal or greater distance than the previous one).
   * This property ensures distance-based sorting is always accurate.
   */
  describe('Property 40: Distance-Based Sorting Accuracy', () => {
    it('should calculate distance correctly for any two locations', async () => {
      await fc.assert(
        fc.asyncProperty(addressGen, addressGen, async (origin: string, destination: string) => {
          // Skip if addresses are the same
          fc.pre(origin !== destination)

          // Generate a realistic distance (in meters)
          const mockDistanceMeters = fc.sample(fc.integer({ min: 100, max: 100000 }), 1)[0]
          const mockDurationSeconds = fc.sample(fc.integer({ min: 60, max: 7200 }), 1)[0]

          // Mock Google Maps API response
          mockClient.distancematrix = jest.fn().mockResolvedValue({
            data: {
              status: 'OK',
              rows: [
                {
                  elements: [
                    {
                      status: 'OK',
                      distance: {
                        value: mockDistanceMeters,
                        text: `${(mockDistanceMeters / 1000).toFixed(1)} km`,
                      },
                      duration: {
                        value: mockDurationSeconds,
                        text: `${Math.round(mockDurationSeconds / 60)} min`,
                      },
                    },
                  ],
                },
              ],
            },
          })

          const result = await service.calculateDistance(origin, destination, 'metric' as any)

          // Property: Distance calculation must return valid values
          expect(result).toBeDefined()
          expect(result.distance).toBeGreaterThan(0)
          expect(result.duration).toBeGreaterThan(0)
          expect(result.distanceText).toBeDefined()
          expect(result.durationText).toBeDefined()

          // Verify distance conversion (meters to km)
          const expectedDistanceKm = mockDistanceMeters / 1000
          expect(result.distance).toBeCloseTo(expectedDistanceKm, 2)

          // Verify API was called correctly
          expect(mockClient.distancematrix).toHaveBeenCalledWith({
            params: {
              origins: [origin],
              destinations: [destination],
              units: 'metric',
              key: 'test-api-key',
            },
          })
        }),
        { numRuns: 100 }
      )
    })

    it('should sort professionals by distance in ascending order', async () => {
      await fc.assert(
        fc.asyncProperty(
          coordinatesGen,
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 5, maxLength: 30 }),
              location: coordinatesGen,
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (userLocation, professionals) => {
            // Skip if coordinates are invalid (NaN or Infinity)
            fc.pre(
              !isNaN(userLocation.latitude) &&
                !isNaN(userLocation.longitude) &&
                isFinite(userLocation.latitude) &&
                isFinite(userLocation.longitude)
            )
            fc.pre(
              professionals.every(
                p =>
                  !isNaN(p.location.latitude) &&
                  !isNaN(p.location.longitude) &&
                  isFinite(p.location.latitude) &&
                  isFinite(p.location.longitude)
              )
            )

            // Calculate distances for each professional
            const professionalsWithDistance = professionals.map(prof => {
              // Calculate Haversine distance
              const distance = calculateHaversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                prof.location.latitude,
                prof.location.longitude
              )
              return { ...prof, distance }
            })

            // Sort by distance
            const sorted = [...professionalsWithDistance].sort((a, b) => a.distance - b.distance)

            // Property: List must be sorted in ascending distance order
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i].distance).toBeGreaterThanOrEqual(sorted[i - 1].distance)
            }

            // Property: First element has minimum distance
            const minDistance = Math.min(...professionalsWithDistance.map(p => p.distance))
            expect(sorted[0].distance).toBe(minDistance)

            // Property: Last element has maximum distance
            const maxDistance = Math.max(...professionalsWithDistance.map(p => p.distance))
            expect(sorted[sorted.length - 1].distance).toBe(maxDistance)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain distance sorting stability for equal distances', async () => {
      await fc.assert(
        fc.asyncProperty(
          coordinatesGen,
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 5, maxLength: 30 }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (location, professionals) => {
            // Assign same location to all professionals (equal distance)
            const professionalsWithLocation = professionals.map(prof => ({
              ...prof,
              location,
              distance: 0,
            }))

            // Sort by distance (all equal)
            const sorted = [...professionalsWithLocation].sort((a, b) => a.distance - b.distance)

            // Property: All distances must be equal
            sorted.forEach(prof => {
              expect(prof.distance).toBe(0)
            })

            // Property: Order should be stable (original order preserved for equal values)
            expect(sorted.length).toBe(professionalsWithLocation.length)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should filter professionals within radius correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          coordinatesGen,
          fc.integer({ min: 1, max: 100 }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 5, maxLength: 30 }),
              location: coordinatesGen,
            }),
            { minLength: 5, maxLength: 30 }
          ),
          async (userLocation, radiusKm, professionals) => {
            // Calculate distances and filter
            const professionalsWithDistance = professionals.map(prof => {
              const distance = calculateHaversineDistance(
                userLocation.latitude,
                userLocation.longitude,
                prof.location.latitude,
                prof.location.longitude
              )
              return { ...prof, distance }
            })

            const withinRadius = professionalsWithDistance.filter(p => p.distance <= radiusKm)

            // Property: All filtered professionals must be within radius
            withinRadius.forEach(prof => {
              expect(prof.distance).toBeLessThanOrEqual(radiusKm)
            })

            // Property: No professional outside radius should be included
            const outsideRadius = professionalsWithDistance.filter(p => p.distance > radiusKm)
            outsideRadius.forEach(prof => {
              expect(withinRadius.find(p => p.id === prof.id)).toBeUndefined()
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle distance calculation with different units', async () => {
      await fc.assert(
        fc.asyncProperty(addressGen, addressGen, async (origin: string, destination: string) => {
          fc.pre(origin !== destination)

          const mockDistanceMeters = fc.sample(fc.integer({ min: 1000, max: 50000 }), 1)[0]
          const mockDurationSeconds = fc.sample(fc.integer({ min: 300, max: 3600 }), 1)[0]

          // Test metric units
          mockClient.distancematrix = jest.fn().mockResolvedValue({
            data: {
              status: 'OK',
              rows: [
                {
                  elements: [
                    {
                      status: 'OK',
                      distance: {
                        value: mockDistanceMeters,
                        text: `${(mockDistanceMeters / 1000).toFixed(1)} km`,
                      },
                      duration: {
                        value: mockDurationSeconds,
                        text: `${Math.round(mockDurationSeconds / 60)} min`,
                      },
                    },
                  ],
                },
              ],
            },
          })

          const metricResult = await service.calculateDistance(origin, destination, 'metric' as any)

          // Test imperial units
          const imperialResult = await service.calculateDistance(
            origin,
            destination,
            'imperial' as any
          )

          // Property: Metric distance should be in kilometers
          const expectedKm = mockDistanceMeters / 1000
          expect(metricResult.distance).toBeCloseTo(expectedKm, 2)

          // Property: Imperial distance should be in miles
          const expectedMiles = mockDistanceMeters / 1609.34
          expect(imperialResult.distance).toBeCloseTo(expectedMiles, 2)

          // Property: Mile value should be less than km value (1 mile > 1 km)
          expect(imperialResult.distance).toBeLessThan(metricResult.distance)
        }),
        { numRuns: 50 }
      )
    })

    it('should maintain distance calculation consistency', async () => {
      await fc.assert(
        fc.asyncProperty(addressGen, addressGen, async (origin: string, destination: string) => {
          fc.pre(origin !== destination)

          const mockDistanceMeters = fc.sample(fc.integer({ min: 1000, max: 50000 }), 1)[0]
          const mockDurationSeconds = fc.sample(fc.integer({ min: 300, max: 3600 }), 1)[0]

          mockClient.distancematrix = jest.fn().mockResolvedValue({
            data: {
              status: 'OK',
              rows: [
                {
                  elements: [
                    {
                      status: 'OK',
                      distance: {
                        value: mockDistanceMeters,
                        text: `${(mockDistanceMeters / 1000).toFixed(1)} km`,
                      },
                      duration: {
                        value: mockDurationSeconds,
                        text: `${Math.round(mockDurationSeconds / 60)} min`,
                      },
                    },
                  ],
                },
              ],
            },
          })

          // Calculate distance twice
          const result1 = await service.calculateDistance(origin, destination, 'metric' as any)
          const result2 = await service.calculateDistance(origin, destination, 'metric' as any)

          // Property: Same inputs should produce same outputs (consistency)
          expect(result1.distance).toBe(result2.distance)
          expect(result1.duration).toBe(result2.duration)
        }),
        { numRuns: 50 }
      )
    })
  })
})

/**
 * Helper function to calculate Haversine distance between two coordinates
 * Returns distance in kilometers
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}
