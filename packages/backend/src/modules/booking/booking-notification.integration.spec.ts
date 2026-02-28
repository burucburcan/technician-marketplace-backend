import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BookingService } from './booking.service'
import { NotificationService } from '../notification/notification.service'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { BookingStatus, PaymentStatus, ProfessionalType } from '../../common/enums'
import { NotificationType, NotificationChannel } from '../../entities/notification.entity'

describe('BookingService - Notification Integration', () => {
  let service: BookingService
  let notificationService: NotificationService
  let bookingRepository: Repository<Booking>
  let professionalRepository: Repository<ProfessionalProfile>
  let userRepository: Repository<User>
  let userProfileRepository: Repository<UserProfile>

  const mockUser: User = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hash',
    role: 'user' as any,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User

  const mockUserProfile: UserProfile = {
    id: 'profile-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    language: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserProfile

  const mockProfessional: ProfessionalProfile = {
    id: 'prof-1',
    userId: 'prof-user-1',
    providerId: 'provider-1',
    professionalType: ProfessionalType.HANDYMAN,
    businessName: 'Pro Services',
    specializations: ['plumbing'] as any,
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
    verificationStatus: 'verified' as any,
    isAvailable: true,
    currentLocation: { latitude: 19.4326, longitude: -99.1332 },
    serviceAddress: {
      address: '123 Service St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postalCode: '12345',
      latitude: 19.4326,
      longitude: -99.1332,
    },
    rating: 4.5,
    totalJobs: 10,
    completionRate: 95,
    artStyle: [],
    materials: [],
    techniques: [],
    certificates: [],
    portfolio: [],
    bookings: [],
    user: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProfessionalProfile

  const mockBooking: Booking = {
    id: 'booking-1',
    userId: 'user-1',
    professionalId: 'prof-1',
    professionalType: ProfessionalType.HANDYMAN,
    serviceCategory: 'plumbing',
    status: BookingStatus.PENDING,
    scheduledDate: new Date('2024-12-20T10:00:00Z'),
    estimatedDuration: 120,
    serviceAddress: {
      address: '123 Main St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postalCode: '12345',
      coordinates: { latitude: 0, longitude: 0 },
    },
    description: 'Fix leaking pipe',
    estimatedPrice: 100,
    paymentStatus: PaymentStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Booking

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<BookingService>(BookingService)
    notificationService = module.get<NotificationService>(NotificationService)
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking))
    professionalRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    userProfileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Requirement 5.2: Booking Creation Notification', () => {
    it('should send notification to professional when booking is created', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile)
      jest.spyOn(bookingRepository, 'create').mockReturnValue(mockBooking)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(mockBooking)
      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.createBooking('user-1', {
        professionalId: 'prof-1',
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'plumbing',
        scheduledDate: new Date('2024-12-20T10:00:00Z'),
        estimatedDuration: 120,
        serviceAddress: mockBooking.serviceAddress,
        description: 'Fix leaking pipe',
        estimatedPrice: 100,
      })

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId: mockProfessional.userId,
        type: NotificationType.BOOKING_CREATED,
        data: expect.objectContaining({
          bookingId: mockBooking.id,
          userName: 'John Doe',
          serviceCategory: 'plumbing',
          professionalName: 'Pro Services',
        }),
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      })
    })

    it('should use email as fallback when user profile is not found', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(null)
      jest.spyOn(bookingRepository, 'create').mockReturnValue(mockBooking)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(mockBooking)
      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.createBooking('user-1', {
        professionalId: 'prof-1',
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'plumbing',
        scheduledDate: new Date('2024-12-20T10:00:00Z'),
        estimatedDuration: 120,
        serviceAddress: mockBooking.serviceAddress,
        description: 'Fix leaking pipe',
        estimatedPrice: 100,
      })

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userName: 'user@example.com',
          }),
        })
      )
    })
  })

  describe('Requirement 5.3: Booking Confirmation Notification', () => {
    it('should send notification to user when booking is confirmed', async () => {
      // Arrange
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED }
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(confirmedBooking)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.updateBookingStatus('booking-1', {
        status: BookingStatus.CONFIRMED,
      })

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId: mockBooking.userId,
        type: NotificationType.BOOKING_CONFIRMED,
        data: expect.objectContaining({
          bookingId: mockBooking.id,
          professionalName: 'Pro Services',
          serviceCategory: 'plumbing',
        }),
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      })
    })
  })

  describe('Requirement 5.4: Booking Rejection Notification', () => {
    it('should send notification to user when booking is rejected', async () => {
      // Arrange
      const rejectedBooking = { ...mockBooking, status: BookingStatus.REJECTED }
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(rejectedBooking)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.updateBookingStatus('booking-1', {
        status: BookingStatus.REJECTED,
      })

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId: mockBooking.userId,
        type: NotificationType.BOOKING_REJECTED,
        data: expect.objectContaining({
          bookingId: mockBooking.id,
          professionalName: 'Pro Services',
        }),
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    })
  })

  describe('Requirement 6.2: Status Change Notifications', () => {
    it('should send notification when booking status changes to IN_PROGRESS', async () => {
      // Arrange
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED }
      const inProgressBooking = { ...mockBooking, status: BookingStatus.IN_PROGRESS }
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(confirmedBooking)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(inProgressBooking)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.updateBookingStatus('booking-1', {
        status: BookingStatus.IN_PROGRESS,
      })

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId: mockBooking.userId,
        type: NotificationType.BOOKING_STARTED,
        data: expect.objectContaining({
          bookingId: mockBooking.id,
          professionalName: 'Pro Services',
        }),
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    })

    it('should send notification when booking status changes to COMPLETED', async () => {
      // Arrange
      const inProgressBooking = { ...mockBooking, status: BookingStatus.IN_PROGRESS }
      const completedBooking = { ...mockBooking, status: BookingStatus.COMPLETED }
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(inProgressBooking)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(completedBooking)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.updateBookingStatus('booking-1', {
        status: BookingStatus.COMPLETED,
      })

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId: mockBooking.userId,
        type: NotificationType.BOOKING_COMPLETED,
        data: expect.objectContaining({
          bookingId: mockBooking.id,
        }),
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    })

    it('should send notifications to both parties when booking is cancelled', async () => {
      // Arrange
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED }
      const cancelledBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancellationReason: 'User cancelled',
      }
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(confirmedBooking)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(cancelledBooking)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.updateBookingStatus('booking-1', {
        status: BookingStatus.CANCELLED,
        notes: 'User cancelled',
      })

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledTimes(2)
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockBooking.userId,
          type: NotificationType.BOOKING_CANCELLED,
        })
      )
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockProfessional.userId,
          type: NotificationType.BOOKING_CANCELLED,
        })
      )
    })
  })

  describe('Requirement 6.6: Cancellation Notifications', () => {
    it('should send notifications to both parties when booking is cancelled via cancelBooking', async () => {
      // Arrange
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED }
      const cancelledBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Emergency',
      }
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(confirmedBooking)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(cancelledBooking)
      jest.spyOn(notificationService, 'sendNotification').mockResolvedValue({} as any)

      // Act
      await service.cancelBooking('booking-1', 'Emergency')

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledTimes(2)
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockProfessional.userId,
          type: NotificationType.BOOKING_CANCELLED,
          data: expect.objectContaining({
            cancellationReason: 'Emergency',
          }),
        })
      )
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockBooking.userId,
          type: NotificationType.BOOKING_CANCELLED,
          data: expect.objectContaining({
            cancellationReason: 'Emergency',
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should not fail booking creation if notification fails', async () => {
      // Arrange
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile)
      jest.spyOn(bookingRepository, 'create').mockReturnValue(mockBooking)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(mockBooking)
      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any)
      jest
        .spyOn(notificationService, 'sendNotification')
        .mockRejectedValue(new Error('Notification service error'))

      // Act & Assert
      await expect(
        service.createBooking('user-1', {
          professionalId: 'prof-1',
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: 'plumbing',
          scheduledDate: new Date('2024-12-20T10:00:00Z'),
          estimatedDuration: 120,
          serviceAddress: mockBooking.serviceAddress,
          description: 'Fix leaking pipe',
          estimatedPrice: 100,
        })
      ).resolves.toBeDefined()
    })

    it('should not fail status update if notification fails', async () => {
      // Arrange
      const confirmedBooking = { ...mockBooking, status: BookingStatus.CONFIRMED }
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(confirmedBooking)
      jest
        .spyOn(notificationService, 'sendNotification')
        .mockRejectedValue(new Error('Notification service error'))

      // Act & Assert
      await expect(
        service.updateBookingStatus('booking-1', {
          status: BookingStatus.CONFIRMED,
        })
      ).resolves.toBeDefined()
    })
  })
})
