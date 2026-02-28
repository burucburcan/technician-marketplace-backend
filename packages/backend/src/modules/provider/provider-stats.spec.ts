import { Test, TestingModule } from '@nestjs/testing'
import { ProviderService } from './provider.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { User } from '../../entities/user.entity'
import { Booking } from '../../entities/booking.entity'
import { ServiceRating } from '../../entities/service-rating.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { UserRole, ProfessionalType, BookingStatus } from '../../common/enums'
import { NotFoundException } from '@nestjs/common'

describe('ProviderService - Statistics', () => {
  let service: ProviderService
  let mockProfessionalRepository: any
  let mockUserRepository: any
  let mockBookingRepository: any
  let mockRatingRepository: any

  const mockProviderId = 'provider-1'
  const mockProfessional1 = {
    id: 'prof-1',
    userId: 'user-1',
    providerId: mockProviderId,
    professionalType: ProfessionalType.HANDYMAN,
    user: {
      id: 'user-1',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
    },
  }

  const mockProfessional2 = {
    id: 'prof-2',
    userId: 'user-2',
    providerId: mockProviderId,
    professionalType: ProfessionalType.ARTIST,
    user: {
      id: 'user-2',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
      },
    },
  }

  beforeEach(async () => {
    mockProfessionalRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      }),
    }

    mockUserRepository = {
      findOne: jest.fn(),
    }

    mockBookingRepository = {
      find: jest.fn(),
    }

    mockRatingRepository = {
      find: jest.fn(),
    }

    const mockActivityLogService = {
      logActivity: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: mockProfessionalRepository,
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(ServiceRating),
          useValue: mockRatingRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile()

    service = module.get<ProviderService>(ProviderService)
  })

  describe('getProviderStats', () => {
    it('should throw NotFoundException if provider does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      await expect(service.getProviderStats(mockProviderId)).rejects.toThrow(NotFoundException)
    })

    it('should return statistics with no bookings', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: mockProviderId,
        role: UserRole.PROVIDER,
      })

      const queryBuilder = mockProfessionalRepository.createQueryBuilder()
      queryBuilder.getMany.mockResolvedValue([mockProfessional1, mockProfessional2])

      mockBookingRepository.find.mockResolvedValue([])
      mockRatingRepository.find.mockResolvedValue([])

      const result = await service.getProviderStats(mockProviderId)

      expect(result).toMatchObject({
        providerId: mockProviderId,
        totalProfessionals: 2,
        professionalsByType: {
          handyman: 1,
          artist: 1,
        },
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        inProgressBookings: 0,
        completionRate: 0,
        averageRating: 0,
        totalRatings: 0,
        totalRevenue: 0,
      })

      expect(result.professionals).toHaveLength(2)
      expect(result.professionals[0]).toMatchObject({
        professionalId: expect.any(String),
        professionalName: expect.any(String),
        professionalType: expect.any(String),
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        averageRating: 0,
        totalRatings: 0,
        completionRate: 0,
        totalRevenue: 0,
      })
    })

    it('should calculate statistics with bookings and ratings', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: mockProviderId,
        role: UserRole.PROVIDER,
      })

      const queryBuilder = mockProfessionalRepository.createQueryBuilder()
      queryBuilder.getMany.mockResolvedValue([mockProfessional1, mockProfessional2])

      const mockBookings = [
        {
          id: 'booking-1',
          professionalId: 'prof-1',
          status: BookingStatus.COMPLETED,
          estimatedPrice: 100,
          actualPrice: 100,
        },
        {
          id: 'booking-2',
          professionalId: 'prof-1',
          status: BookingStatus.PENDING,
          estimatedPrice: 50,
          actualPrice: null,
        },
        {
          id: 'booking-3',
          professionalId: 'prof-2',
          status: BookingStatus.CANCELLED,
          estimatedPrice: 200,
          actualPrice: null,
        },
      ]

      const mockRatings = [
        {
          id: 'rating-1',
          professionalId: 'prof-1',
          score: 5,
        },
        {
          id: 'rating-2',
          professionalId: 'prof-1',
          score: 4,
        },
      ]

      mockBookingRepository.find.mockResolvedValue(mockBookings)
      mockRatingRepository.find.mockResolvedValue(mockRatings)

      const result = await service.getProviderStats(mockProviderId)

      expect(result).toMatchObject({
        providerId: mockProviderId,
        totalProfessionals: 2,
        totalBookings: 3,
        completedBookings: 1,
        cancelledBookings: 1,
        pendingBookings: 1,
        inProgressBookings: 0,
        completionRate: 33.33,
        averageRating: 4.5,
        totalRatings: 2,
        totalRevenue: 100,
      })

      // Check professional 1 stats
      const prof1Stats = result.professionals.find(p => p.professionalId === 'prof-1')
      expect(prof1Stats).toMatchObject({
        totalBookings: 2,
        completedBookings: 1,
        cancelledBookings: 0,
        averageRating: 4.5,
        totalRatings: 2,
        completionRate: 50,
        totalRevenue: 100,
      })

      // Check professional 2 stats
      const prof2Stats = result.professionals.find(p => p.professionalId === 'prof-2')
      expect(prof2Stats).toMatchObject({
        totalBookings: 1,
        completedBookings: 0,
        cancelledBookings: 1,
        averageRating: 0,
        totalRatings: 0,
        completionRate: 0,
        totalRevenue: 0,
      })
    })

    it('should filter by professional type', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: mockProviderId,
        role: UserRole.PROVIDER,
      })

      const queryBuilder = mockProfessionalRepository.createQueryBuilder()
      queryBuilder.getMany.mockResolvedValue([mockProfessional1])

      mockBookingRepository.find.mockResolvedValue([])
      mockRatingRepository.find.mockResolvedValue([])

      const result = await service.getProviderStats(mockProviderId, {
        professionalType: ProfessionalType.HANDYMAN,
      })

      expect(result.totalProfessionals).toBe(1)
      expect(result.professionals).toHaveLength(1)
      expect(result.professionals[0].professionalType).toBe(ProfessionalType.HANDYMAN)

      // Verify the filter was applied
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'professional.professionalType = :professionalType',
        { professionalType: ProfessionalType.HANDYMAN }
      )
    })

    it('should handle professionals with no user profile', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        id: mockProviderId,
        role: UserRole.PROVIDER,
      })

      const professionalWithoutProfile = {
        id: 'prof-3',
        userId: 'user-3',
        providerId: mockProviderId,
        professionalType: ProfessionalType.HANDYMAN,
        user: {
          id: 'user-3',
          profile: null,
        },
      }

      const queryBuilder = mockProfessionalRepository.createQueryBuilder()
      queryBuilder.getMany.mockResolvedValue([professionalWithoutProfile])

      mockBookingRepository.find.mockResolvedValue([])
      mockRatingRepository.find.mockResolvedValue([])

      const result = await service.getProviderStats(mockProviderId)

      expect(result.professionals[0].professionalName).toBe('Unknown')
    })
  })
})
