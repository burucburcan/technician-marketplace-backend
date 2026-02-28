import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotFoundException, ForbiddenException } from '@nestjs/common'
import { UserService } from './user.service'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Certificate } from '../../entities/certificate.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { ProfessionalType, VerificationStatus } from '../../common/enums'
import { UpdateLocationDto } from './dto'

describe('UserService - Professional Location Update', () => {
  let service: UserService
  let professionalProfileRepository: Repository<ProfessionalProfile>

  const mockProfessionalProfile: ProfessionalProfile = {
    id: 'prof-1',
    userId: 'user-1',
    professionalType: ProfessionalType.HANDYMAN,
    businessName: 'Test Business',
    experienceYears: 5,
    hourlyRate: 50,
    serviceRadius: 10,
    workingHours: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [],
      sunday: [],
    },
    verificationStatus: VerificationStatus.VERIFIED,
    isAvailable: true,
    currentLocation: undefined,
    serviceAddress: undefined,
    rating: 4.5,
    totalJobs: 10,
    completionRate: 95,
    artStyle: undefined,
    materials: undefined,
    techniques: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: undefined,
    certificates: [],
    specializations: [],
    portfolio: [],
    bookings: [],
  } as any

  const mockActivityLogService = {
    logActivity: jest.fn(),
  }

  const mockS3Service = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Certificate),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PortfolioItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
    professionalProfileRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('updateProfessionalLocation', () => {
    it('should update professional current location', async () => {
      const updateLocationDto: UpdateLocationDto = {
        address: '123 Main St, Mexico City',
        latitude: 19.4326,
        longitude: -99.1332,
      }

      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...mockProfessionalProfile,
        currentLocation: {
          latitude: 19.4326,
          longitude: -99.1332,
        },
        serviceAddress: {
          address: '123 Main St, Mexico City',
          latitude: 19.4326,
          longitude: -99.1332,
        },
      })

      const result = await service.updateProfessionalLocation('prof-1', updateLocationDto, 'user-1')

      expect(result.currentLocation).toEqual({
        latitude: 19.4326,
        longitude: -99.1332,
      })
      expect(result.serviceAddress).toMatchObject({
        address: '123 Main St, Mexico City',
        latitude: 19.4326,
        longitude: -99.1332,
      })
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'professional_location_updated',
        resource: 'professional_profile',
        metadata: expect.objectContaining({
          professionalId: 'prof-1',
          hasCurrentLocation: true,
          hasServiceAddress: true,
        }),
      })
    })

    it('should update service radius', async () => {
      const updateLocationDto: UpdateLocationDto = {
        address: '456 Oak Ave',
        latitude: 19.5,
        longitude: -99.2,
        serviceRadius: 25,
      }

      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...mockProfessionalProfile,
        serviceRadius: 25,
      })

      const result = await service.updateProfessionalLocation('prof-1', updateLocationDto, 'user-1')

      expect(result.serviceRadius).toBe(25)
    })

    it('should throw NotFoundException if professional profile does not exist', async () => {
      const updateLocationDto: UpdateLocationDto = {
        address: '123 Main St',
        latitude: 19.4326,
        longitude: -99.1332,
      }

      jest.spyOn(professionalProfileRepository, 'findOne').mockResolvedValue(null)

      await expect(
        service.updateProfessionalLocation('prof-1', updateLocationDto, 'user-1')
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is not the owner', async () => {
      const updateLocationDto: UpdateLocationDto = {
        address: '123 Main St',
        latitude: 19.4326,
        longitude: -99.1332,
      }

      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile)

      await expect(
        service.updateProfessionalLocation('prof-1', updateLocationDto, 'different-user')
      ).rejects.toThrow(ForbiddenException)
    })

    it('should update existing service address', async () => {
      const profileWithAddress = {
        ...mockProfessionalProfile,
        serviceAddress: {
          address: 'Old Address',
          city: 'Old City',
          latitude: 10,
          longitude: 20,
        },
      }

      const updateLocationDto: UpdateLocationDto = {
        address: 'New Address',
        latitude: 19.4326,
        longitude: -99.1332,
      }

      jest.spyOn(professionalProfileRepository, 'findOne').mockResolvedValue(profileWithAddress)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...profileWithAddress,
        serviceAddress: {
          ...profileWithAddress.serviceAddress,
          address: 'New Address',
          latitude: 19.4326,
          longitude: -99.1332,
        },
      })

      const result = await service.updateProfessionalLocation('prof-1', updateLocationDto, 'user-1')

      expect(result.serviceAddress.address).toBe('New Address')
      expect(result.serviceAddress.latitude).toBe(19.4326)
      expect(result.serviceAddress.longitude).toBe(-99.1332)
      expect(result.serviceAddress.city).toBe('Old City') // Should preserve existing fields
    })

    it('should only update current location if only coordinates provided', async () => {
      const updateLocationDto: UpdateLocationDto = {
        address: '',
        latitude: 19.4326,
        longitude: -99.1332,
      }

      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...mockProfessionalProfile,
        currentLocation: {
          latitude: 19.4326,
          longitude: -99.1332,
        },
      })

      const result = await service.updateProfessionalLocation('prof-1', updateLocationDto, 'user-1')

      expect(result.currentLocation).toEqual({
        latitude: 19.4326,
        longitude: -99.1332,
      })
    })
  })
})
