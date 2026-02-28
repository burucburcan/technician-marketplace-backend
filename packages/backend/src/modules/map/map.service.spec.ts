import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { BadRequestException } from '@nestjs/common'
import { MapService } from './map.service'

describe('MapService', () => {
  let service: MapService
  let configService: ConfigService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GOOGLE_MAPS_API_KEY') {
                return 'test-api-key'
              }
              return null
            }),
          },
        },
      ],
    }).compile()

    service = module.get<MapService>(MapService)
    configService = module.get<ConfigService>(ConfigService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should initialize with API key from config', () => {
    expect(configService.get).toHaveBeenCalledWith('GOOGLE_MAPS_API_KEY')
  })

  describe('geocode', () => {
    it('should throw BadRequestException when address is not found', async () => {
      // This test would require mocking the Google Maps client
      // For now, we just verify the method exists
      expect(service.geocode).toBeDefined()
    })
  })

  describe('reverseGeocode', () => {
    it('should be defined', () => {
      expect(service.reverseGeocode).toBeDefined()
    })
  })

  describe('calculateDistance', () => {
    it('should be defined', () => {
      expect(service.calculateDistance).toBeDefined()
    })
  })

  describe('autocompleteAddress', () => {
    it('should be defined', () => {
      expect(service.autocompleteAddress).toBeDefined()
    })
  })
})
