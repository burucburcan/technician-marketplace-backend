import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as fc from 'fast-check'
import { BookingService } from '../booking/booking.service'
import { NotificationService } from './notification.service'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import {
  Notification,
  NotificationType,
  NotificationChannel,
} from '../../entities/notification.entity'
import { CreateBookingDto } from '../booking/dto/create-booking.dto'
import { BookingStatus, PaymentStatus, ProfessionalType } from '../../common/enums'
import { EmailService } from './services/email.service'
import { SmsService } from './services/sms.service'

/**
 * Property-Based Tests for Notification System
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the notification system, ensuring correctness at scale.
 */
describe('NotificationService Property Tests', () => {
  let bookingService: BookingService
  let notificationService: NotificationService
  let mockBookingRepository: any
  let mockProfessionalRepository: any
  let mockUserRepository: any
  let mockUserProfileRepository: any
  let mockNotificationRepository: any
  let mockEmailService: any
  let mockSmsService: any

  beforeEach(async () => {
    // Create mock repositories
    mockBookingRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    }

    mockProfessionalRepository = {
      findOne: jest.fn(),
    }

    mockUserRepository = {
      findOne: jest.fn(),
    }

    mockUserProfileRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    }

    mockNotificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    }

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    }

    mockSmsService = {
      sendSms: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        NotificationService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: mockProfessionalRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile()

    bookingService = module.get<BookingService>(BookingService)
    notificationService = module.get<NotificationService>(NotificationService)

    jest.clearAllMocks()

    // Setup default mock for notification repository
    mockNotificationRepository.create.mockImplementation((data: any) => ({
      id: 'notification-id',
      ...data,
      isRead: false,
      createdAt: new Date(),
    }))
    mockNotificationRepository.save.mockImplementation((notification: any) =>
      Promise.resolve(notification)
    )
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const professionalTypeGen = fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST)
  const serviceCategoryGen = fc.constantFrom('plumbing', 'electrical', 'carpentry')
  const positiveNumberGen = fc.integer({ min: 1, max: 100 })
  const priceGen = fc.float({ min: 100, max: 1000, noNaN: true })
  const descriptionGen = fc.string({ minLength: 10, maxLength: 100 })
  const addressGen = fc.string({ minLength: 5, maxLength: 50 })
  const cityGen = fc.string({ minLength: 3, maxLength: 30 })
  const emailGen = fc.emailAddress()
  const nameGen = fc.string({ minLength: 2, maxLength: 30 })

  // Future date generator (at least 1 hour from now)
  const futureDateGen = fc
    .integer({ min: 3600000, max: 7 * 24 * 3600000 })
    .map((ms: number) => new Date(Date.now() + ms))

  // Service address generator
  const serviceAddressGen = fc.record({
    address: addressGen,
    city: cityGen,
    state: fc.string({ minLength: 2, maxLength: 30 }),
    country: fc.constantFrom('Mexico', 'Colombia'),
    postalCode: fc.string({ minLength: 5, maxLength: 10 }),
    coordinates: fc.record({
      latitude: fc.float({ min: -90, max: 90, noNaN: true }),
      longitude: fc.float({ min: -180, max: 180, noNaN: true }),
    }),
  })

  // Helper function to setup common mocks
  const setupCommonMocks = (params: {
    userId: string
    professionalId: string
    professionalUserId: string
    userEmail: string
    firstName: string
    lastName: string
    professionalType: ProfessionalType
    serviceCategory: string
    scheduledDate: Date
    estimatedDuration: number
    serviceAddress: any
    description: string
    estimatedPrice: number
    bookingId?: string
    currentStatus?: BookingStatus
  }) => {
    const {
      userId,
      professionalId,
      professionalUserId,
      userEmail,
      firstName,
      lastName,
      professionalType,
      serviceCategory,
      scheduledDate,
      estimatedDuration,
      serviceAddress,
      description,
      estimatedPrice,
      bookingId = 'booking-id',
      currentStatus = BookingStatus.PENDING,
    } = params

    const mockUser: Partial<User> = {
      id: userId,
      email: userEmail,
    }

    const mockUserProfile: Partial<UserProfile> = {
      userId,
      firstName,
      lastName,
      language: 'es',
      preferences: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        currency: 'MXN',
      },
    }

    const mockProfessional: Partial<ProfessionalProfile> = {
      id: professionalId,
      userId: professionalUserId,
      professionalType,
      businessName: 'Test Professional',
      isAvailable: true,
    }

    const mockProfessionalUserProfile: Partial<UserProfile> = {
      userId: professionalUserId,
      firstName: 'Professional',
      lastName: 'User',
      language: 'es',
      preferences: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        currency: 'MXN',
      },
    }

    const mockBooking: Partial<Booking> = {
      id: bookingId,
      userId,
      professionalId,
      professionalType,
      serviceCategory,
      scheduledDate,
      estimatedDuration,
      serviceAddress,
      description,
      estimatedPrice,
      status: currentStatus,
      paymentStatus: PaymentStatus.PENDING,
      referenceImages: [],
      progressPhotos: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockUserRepository.findOne.mockResolvedValue(mockUser)
    mockUserProfileRepository.findOne.mockImplementation((options: any) => {
      if (options.where.userId === userId) {
        return Promise.resolve(mockUserProfile)
      }
      return Promise.resolve(mockProfessionalUserProfile)
    })
    mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)
    mockBookingRepository.create.mockReturnValue(mockBooking)
    mockBookingRepository.save.mockResolvedValue(mockBooking)
    mockBookingRepository.findOne.mockResolvedValue(mockBooking)

    return {
      mockUser,
      mockUserProfile,
      mockProfessional,
      mockProfessionalUserProfile,
      mockBooking,
    }
  }

  /**
   * **Property 16: Rezervasyon Bildirimi Garantisi (Booking Notification Guarantee)**
   *
   * **Validates: Requirements 5.2**
   *
   * For any valid booking creation, a notification MUST be sent to the professional.
   * The notification must contain correct booking information and be sent through
   * the appropriate channels (IN_APP, EMAIL, SMS).
   */
  describe('Property 16: Booking Notification Guarantee', () => {
    it('should always send notification to professional when any booking is created', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          emailGen,
          nameGen,
          nameGen,
          professionalTypeGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            userId: string,
            professionalId: string,
            professionalUserId: string,
            userEmail: string,
            firstName: string,
            lastName: string,
            professionalType: ProfessionalType,
            serviceCategory: string,
            scheduledDate: Date,
            estimatedDuration: number,
            serviceAddress: any,
            description: string,
            estimatedPrice: number
          ) => {
            setupCommonMocks({
              userId,
              professionalId,
              professionalUserId,
              userEmail,
              firstName,
              lastName,
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
            })

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
            }

            const result = await bookingService.createBooking(userId, createBookingDto)

            expect(mockNotificationRepository.create).toHaveBeenCalled()
            expect(mockNotificationRepository.save).toHaveBeenCalled()

            const notificationCreateCall = mockNotificationRepository.create.mock.calls[0][0]
            expect(notificationCreateCall.userId).toBe(professionalUserId)
            expect(notificationCreateCall.type).toBe(NotificationType.BOOKING_CREATED)
            expect(result).toBeDefined()
            expect(result.professionalId).toBe(professionalId)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should include correct booking details in notification for any booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          emailGen,
          nameGen,
          nameGen,
          professionalTypeGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            userId: string,
            professionalId: string,
            professionalUserId: string,
            userEmail: string,
            firstName: string,
            lastName: string,
            professionalType: ProfessionalType,
            serviceCategory: string,
            scheduledDate: Date,
            estimatedDuration: number,
            serviceAddress: any,
            description: string,
            estimatedPrice: number
          ) => {
            setupCommonMocks({
              userId,
              professionalId,
              professionalUserId,
              userEmail,
              firstName,
              lastName,
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
            })

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
            }

            await bookingService.createBooking(userId, createBookingDto)

            const notificationCreateCall = mockNotificationRepository.create.mock.calls[0][0]
            expect(notificationCreateCall.data).toBeDefined()
            expect(notificationCreateCall.data.serviceCategory).toBe(serviceCategory)
            expect(notificationCreateCall.data.userName).toContain(firstName)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should send notification through multiple channels for any booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          emailGen,
          nameGen,
          professionalTypeGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            userId: string,
            professionalId: string,
            professionalUserId: string,
            userEmail: string,
            firstName: string,
            professionalType: ProfessionalType,
            serviceCategory: string,
            scheduledDate: Date,
            estimatedDuration: number,
            serviceAddress: any,
            description: string,
            estimatedPrice: number
          ) => {
            setupCommonMocks({
              userId,
              professionalId,
              professionalUserId,
              userEmail,
              firstName,
              lastName: 'Doe',
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
            })

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
            }

            await bookingService.createBooking(userId, createBookingDto)

            const notificationCreateCall = mockNotificationRepository.create.mock.calls[0][0]
            expect(notificationCreateCall.channels).toBeDefined()
            expect(notificationCreateCall.channels).toContain(NotificationChannel.IN_APP)
            expect(notificationCreateCall.channels).toContain(NotificationChannel.EMAIL)
            expect(notificationCreateCall.channels).toContain(NotificationChannel.SMS)
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * **Property 17: Rezervasyon Onay Bildirimi (Booking Confirmation Notification)**
   *
   * **Validates: Requirements 5.3**
   *
   * For any booking confirmation, when a professional confirms a booking,
   * a notification MUST be sent to the user with confirmation details.
   */
  describe('Property 17: Booking Confirmation Notification', () => {
    it('should always send confirmation notification to user when any booking is confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            bookingId: string,
            userId: string,
            professionalId: string,
            professionalType: ProfessionalType,
            serviceCategory: string,
            scheduledDate: Date,
            estimatedDuration: number,
            serviceAddress: any,
            description: string,
            estimatedPrice: number
          ) => {
            const professionalUserId = 'prof-user-id'
            setupCommonMocks({
              userId,
              professionalId,
              professionalUserId,
              userEmail: 'user@test.com',
              firstName: 'John',
              lastName: 'Doe',
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
              bookingId,
              currentStatus: BookingStatus.PENDING,
            })

            const confirmedBooking = {
              ...mockBookingRepository.findOne.mock.results[0].value,
              status: BookingStatus.CONFIRMED,
            }
            mockBookingRepository.save.mockResolvedValue(confirmedBooking)

            const result = await bookingService.updateBookingStatus(bookingId, {
              status: BookingStatus.CONFIRMED,
            })

            expect(result.status).toBe(BookingStatus.CONFIRMED)
            expect(mockNotificationRepository.create).toHaveBeenCalled()
            expect(mockNotificationRepository.save).toHaveBeenCalled()

            // Find the notification sent to the user (not professional)
            const userNotificationCalls = mockNotificationRepository.create.mock.calls.filter(
              (call: any[]) => call[0]?.userId === userId
            )
            expect(userNotificationCalls.length).toBeGreaterThan(0)
            const notificationCreateCall = userNotificationCalls[0][0]
            expect(notificationCreateCall.type).toBe(NotificationType.BOOKING_CONFIRMED)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should include professional and booking details in confirmation notification', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          async (
            bookingId: string,
            userId: string,
            professionalId: string,
            professionalType: ProfessionalType,
            serviceCategory: string,
            scheduledDate: Date,
            estimatedDuration: number,
            serviceAddress: any,
            businessName: string
          ) => {
            const professionalUserId = 'prof-user-id'
            setupCommonMocks({
              userId,
              professionalId,
              professionalUserId,
              userEmail: 'user@test.com',
              firstName: 'John',
              lastName: 'Doe',
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description: 'Test booking',
              estimatedPrice: 500,
              bookingId,
              currentStatus: BookingStatus.PENDING,
            })

            mockProfessionalRepository.findOne.mockResolvedValue({
              id: professionalId,
              userId: professionalUserId,
              professionalType,
              businessName,
              isAvailable: true,
            })

            const confirmedBooking = {
              ...mockBookingRepository.findOne.mock.results[0].value,
              status: BookingStatus.CONFIRMED,
            }
            mockBookingRepository.save.mockResolvedValue(confirmedBooking)

            await bookingService.updateBookingStatus(bookingId, {
              status: BookingStatus.CONFIRMED,
            })

            // Find the notification sent to the user
            const userNotificationCalls = mockNotificationRepository.create.mock.calls.filter(
              (call: any[]) => call[0]?.userId === userId
            )
            expect(userNotificationCalls.length).toBeGreaterThan(0)
            const notificationCreateCall = userNotificationCalls[0][0]
            expect(notificationCreateCall.data).toBeDefined()
            expect(notificationCreateCall.data.bookingId).toBe(bookingId)
            expect(notificationCreateCall.data.professionalName).toBe(businessName)
            expect(notificationCreateCall.data.serviceCategory).toBe(serviceCategory)
            expect(notificationCreateCall.data.address).toBe(serviceAddress.address)
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * **Property 20: Durum Değişikliği Bildirimi (Status Change Notification)**
   *
   * **Validates: Requirements 6.2**
   *
   * For any booking status change, notifications MUST be sent to relevant parties.
   * The notification must contain the new status and relevant booking information.
   */
  describe('Property 20: Status Change Notification', () => {
    type StatusTransition = [BookingStatus, BookingStatus, NotificationType]

    const statusChangesWithNotifications: StatusTransition[] = [
      [BookingStatus.PENDING, BookingStatus.CONFIRMED, NotificationType.BOOKING_CONFIRMED],
      [BookingStatus.PENDING, BookingStatus.REJECTED, NotificationType.BOOKING_REJECTED],
      [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, NotificationType.BOOKING_STARTED],
      [BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, NotificationType.BOOKING_COMPLETED],
      [BookingStatus.PENDING, BookingStatus.CANCELLED, NotificationType.BOOKING_CANCELLED],
      [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, NotificationType.BOOKING_CANCELLED],
    ]

    it('should send notification when booking status changes for any valid transition', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          fc.constantFrom(...statusChangesWithNotifications),
          async (
            bookingId: string,
            userId: string,
            professionalId: string,
            professionalType: ProfessionalType,
            serviceCategory: string,
            scheduledDate: Date,
            estimatedDuration: number,
            serviceAddress: any,
            transition: StatusTransition
          ) => {
            const [currentStatus, newStatus, expectedNotificationType] = transition
            const professionalUserId = 'prof-user-id'

            setupCommonMocks({
              userId,
              professionalId,
              professionalUserId,
              userEmail: 'user@test.com',
              firstName: 'John',
              lastName: 'Doe',
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description: 'Test booking',
              estimatedPrice: 500,
              bookingId,
              currentStatus,
            })

            const updatedBooking = {
              ...mockBookingRepository.findOne.mock.results[0].value,
              status: newStatus,
              startedAt: newStatus === BookingStatus.IN_PROGRESS ? new Date() : undefined,
              completedAt: newStatus === BookingStatus.COMPLETED ? new Date() : undefined,
              cancelledAt: newStatus === BookingStatus.CANCELLED ? new Date() : undefined,
            }
            mockBookingRepository.save.mockResolvedValue(updatedBooking)

            const result = await bookingService.updateBookingStatus(bookingId, {
              status: newStatus,
            })

            expect(result.status).toBe(newStatus)
            expect(mockNotificationRepository.create).toHaveBeenCalled()
            expect(mockNotificationRepository.save).toHaveBeenCalled()

            // Find notifications with the expected type
            const notificationCalls = mockNotificationRepository.create.mock.calls.filter(
              (call: any[]) => call[0]?.type === expectedNotificationType
            )
            expect(notificationCalls.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 10 }
      )
    })

    it('should include booking details in status change notification', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          fc.constantFrom(...statusChangesWithNotifications),
          async (
            bookingId: string,
            userId: string,
            professionalId: string,
            professionalType: ProfessionalType,
            serviceCategory: string,
            scheduledDate: Date,
            estimatedDuration: number,
            serviceAddress: any,
            transition: StatusTransition
          ) => {
            const [currentStatus, newStatus] = transition
            const professionalUserId = 'prof-user-id'

            setupCommonMocks({
              userId,
              professionalId,
              professionalUserId,
              userEmail: 'user@test.com',
              firstName: 'John',
              lastName: 'Doe',
              professionalType,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description: 'Test booking',
              estimatedPrice: 500,
              bookingId,
              currentStatus,
            })

            const updatedBooking = {
              ...mockBookingRepository.findOne.mock.results[0].value,
              status: newStatus,
              startedAt: newStatus === BookingStatus.IN_PROGRESS ? new Date() : undefined,
              completedAt: newStatus === BookingStatus.COMPLETED ? new Date() : undefined,
              cancelledAt: newStatus === BookingStatus.CANCELLED ? new Date() : undefined,
            }
            mockBookingRepository.save.mockResolvedValue(updatedBooking)

            await bookingService.updateBookingStatus(bookingId, {
              status: newStatus,
            })

            // Find notifications with booking details
            const notificationCalls = mockNotificationRepository.create.mock.calls.filter(
              (call: any[]) => call[0]?.data?.bookingId === bookingId
            )
            expect(notificationCalls.length).toBeGreaterThan(0)
            const notificationCreateCall = notificationCalls[0][0]
            expect(notificationCreateCall.data).toBeDefined()
            expect(notificationCreateCall.data.bookingId).toBe(bookingId)
            expect(notificationCreateCall.data.serviceCategory).toBe(serviceCategory)
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
