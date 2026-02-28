import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConflictException } from '@nestjs/common'
import * as fc from 'fast-check'
import { BookingService } from './booking.service'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { CreateBookingDto } from './dto/create-booking.dto'
import { BookingStatus, PaymentStatus, ProfessionalType } from '../../common/enums'
import { NotificationService } from '../notification/notification.service'

/**
 * Property-Based Tests for Booking Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the booking system, ensuring correctness at scale.
 */
describe('BookingService Property Tests', () => {
  let service: BookingService

  const mockBookingRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockProfessionalRepository = {
    findOne: jest.fn(),
  }

  const mockUserRepository = {
    findOne: jest.fn(),
  }

  const mockUserProfileRepository = {
    findOne: jest.fn(),
  }

  const mockNotificationService = {
    sendNotification: jest.fn().mockResolvedValue({
      id: 'notification-id',
      userId: 'user-id',
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: 'Your booking has been cancelled',
      isRead: false,
      createdAt: new Date(),
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
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
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile()

    service = module.get<BookingService>(BookingService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const professionalTypeGen = fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST)
  const serviceCategoryGen = fc.constantFrom(
    'plumbing',
    'electrical',
    'carpentry',
    'mural',
    'sculpture'
  )
  const positiveNumberGen = fc.integer({ min: 1, max: 1000 })
  const priceGen = fc.float({ min: 100, max: 10000, noNaN: true })
  const descriptionGen = fc.string({ minLength: 10, maxLength: 500 })
  const addressGen = fc.string({ minLength: 5, maxLength: 100 })
  const cityGen = fc.string({ minLength: 3, maxLength: 50 })
  const postalCodeGen = fc.string({ minLength: 5, maxLength: 10 })
  const latitudeGen = fc.float({ min: -90, max: 90, noNaN: true })
  const longitudeGen = fc.float({ min: -180, max: 180, noNaN: true })

  // Future date generator (at least 1 hour from now)
  const futureDateGen = fc
    .integer({ min: 3600000, max: 30 * 24 * 3600000 }) // 1 hour to 30 days
    .map(ms => new Date(Date.now() + ms))

  // Service address generator
  const serviceAddressGen = fc.record({
    address: addressGen,
    city: cityGen,
    state: fc.string({ minLength: 2, maxLength: 50 }),
    country: fc.constantFrom('Mexico', 'Colombia', 'Argentina'),
    postalCode: postalCodeGen,
    coordinates: fc.record({
      latitude: latitudeGen,
      longitude: longitudeGen,
    }),
  })

  // Project details generator for artist bookings
  const projectDetailsGen = fc.record({
    projectType: fc.constantFrom('Mural', 'Sculpture', 'Decorative Art'),
    estimatedDuration: fc.constantFrom('1 week', '2 weeks', '1 month'),
    priceRange: fc.record({
      min: fc.float({ min: 1000, max: 5000, noNaN: true }),
      max: fc.float({ min: 5000, max: 20000, noNaN: true }),
      currency: fc.constantFrom('MXN', 'USD'),
    }),
    specialRequirements: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    materials: fc.option(
      fc.array(fc.constantFrom('paint', 'canvas', 'wood', 'metal'), {
        minLength: 1,
        maxLength: 5,
      }),
      { nil: undefined }
    ),
  })

  /**
   * **Property 15: Rezervasyon Oluşturma Round-Trip**
   *
   * **Validates: Requirements 5.1**
   *
   * For any valid booking data, when a booking is created, all fields
   * (service type, date, time, address, description) must be retrievable
   * from the database with the same values.
   */
  describe('Property 15: Booking Creation Round-Trip', () => {
    it('should create and retrieve handyman booking with same values for any valid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            userId,
            professionalId,
            serviceCategory,
            scheduledDate,
            estimatedDuration,
            serviceAddress,
            description,
            estimatedPrice
          ) => {
            // Setup mocks
            const mockUser = { id: userId, email: 'user@test.com' }
            const mockProfessional = {
              id: professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              isAvailable: true,
            }

            const mockBooking = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
              status: BookingStatus.PENDING,
              paymentStatus: PaymentStatus.PENDING,
              referenceImages: [],
              progressPhotos: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)
            mockBookingRepository.create.mockReturnValue(mockBooking)
            mockBookingRepository.save.mockResolvedValue(mockBooking)

            // Mock query builder for conflict check
            const mockQueryBuilder = {
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]), // No conflicts
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
            }

            const result = await service.createBooking(userId, createBookingDto)

            // Property: Booking data round-trip integrity
            expect(result.userId).toBe(userId)
            expect(result.professionalId).toBe(professionalId)
            expect(result.professionalType).toBe(ProfessionalType.HANDYMAN)
            expect(result.serviceCategory).toBe(serviceCategory)
            expect(result.scheduledDate).toEqual(scheduledDate)
            expect(result.estimatedDuration).toBe(estimatedDuration)
            expect(result.serviceAddress).toEqual(serviceAddress)
            expect(result.description).toBe(description)
            expect(result.estimatedPrice).toBe(estimatedPrice)
            expect(result.status).toBe(BookingStatus.PENDING)
            expect(result.paymentStatus).toBe(PaymentStatus.PENDING)

            // Verify repository was called with correct data
            expect(mockBookingRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                userId,
                professionalId,
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory,
                scheduledDate,
                estimatedDuration,
                serviceAddress,
                description,
                estimatedPrice,
                status: BookingStatus.PENDING,
                paymentStatus: PaymentStatus.PENDING,
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create and retrieve artist booking with project details for any valid data', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          serviceCategoryGen,
          futureDateGen,
          positiveNumberGen,
          serviceAddressGen,
          descriptionGen,
          priceGen,
          projectDetailsGen,
          fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
          async (
            userId,
            professionalId,
            serviceCategory,
            scheduledDate,
            estimatedDuration,
            serviceAddress,
            description,
            estimatedPrice,
            projectDetails,
            referenceImages
          ) => {
            // Setup mocks
            const mockUser = { id: userId, email: 'user@test.com' }
            const mockProfessional = {
              id: professionalId,
              professionalType: ProfessionalType.ARTIST,
              isAvailable: true,
            }

            const mockBooking = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              professionalId,
              professionalType: ProfessionalType.ARTIST,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
              projectDetails,
              referenceImages,
              status: BookingStatus.PENDING,
              paymentStatus: PaymentStatus.PENDING,
              progressPhotos: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)
            mockBookingRepository.create.mockReturnValue(mockBooking)
            mockBookingRepository.save.mockResolvedValue(mockBooking)

            // Mock query builder for conflict check
            const mockQueryBuilder = {
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]), // No conflicts
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType: ProfessionalType.ARTIST,
              serviceCategory,
              scheduledDate,
              estimatedDuration,
              serviceAddress,
              description,
              estimatedPrice,
              projectDetails,
              referenceImages,
            }

            const result = await service.createBooking(userId, createBookingDto)

            // Property: Artist booking data round-trip integrity including project details
            expect(result.userId).toBe(userId)
            expect(result.professionalId).toBe(professionalId)
            expect(result.professionalType).toBe(ProfessionalType.ARTIST)
            expect(result.serviceCategory).toBe(serviceCategory)
            expect(result.scheduledDate).toEqual(scheduledDate)
            expect(result.estimatedDuration).toBe(estimatedDuration)
            expect(result.serviceAddress).toEqual(serviceAddress)
            expect(result.description).toBe(description)
            expect(result.estimatedPrice).toBe(estimatedPrice)
            expect(result.projectDetails).toEqual(projectDetails)
            expect(result.referenceImages).toEqual(referenceImages)
            expect(result.status).toBe(BookingStatus.PENDING)
            expect(result.paymentStatus).toBe(PaymentStatus.PENDING)

            // Verify repository was called with correct data
            expect(mockBookingRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                userId,
                professionalId,
                professionalType: ProfessionalType.ARTIST,
                serviceCategory,
                scheduledDate,
                estimatedDuration,
                serviceAddress,
                description,
                estimatedPrice,
                projectDetails,
                referenceImages,
                status: BookingStatus.PENDING,
                paymentStatus: PaymentStatus.PENDING,
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 18: Zaman Çakışması Engelleme**
   *
   * **Validates: Requirements 5.5**
   *
   * For any professional, when attempting to create two bookings with
   * overlapping time slots, the second booking must be rejected.
   */
  describe('Property 18: Time Conflict Prevention', () => {
    it('should reject overlapping bookings for any professional at conflicting times', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          serviceCategoryGen,
          futureDateGen,
          fc.integer({ min: 60, max: 240 }), // First booking duration
          fc.integer({ min: 30, max: 120 }), // Overlap offset in minutes
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            userId,
            professionalId,
            serviceCategory,
            firstBookingDate,
            firstDuration,
            overlapOffset,
            serviceAddress,
            description,
            estimatedPrice
          ) => {
            // Calculate overlapping second booking time
            // Second booking starts during the first booking
            const secondBookingDate = new Date(firstBookingDate.getTime() + overlapOffset * 60000)

            // Ensure second booking actually overlaps (starts before first ends)
            fc.pre(overlapOffset < firstDuration)

            // Setup mocks
            const mockUser = { id: userId, email: 'user@test.com' }
            const mockProfessional = {
              id: professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              isAvailable: true,
            }

            // Mock existing conflicting booking
            const existingBooking = {
              id: fc.sample(uuidGen, 1)[0],
              professionalId,
              scheduledDate: firstBookingDate,
              estimatedDuration: firstDuration,
              status: BookingStatus.CONFIRMED,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)

            // Mock query builder to return conflicting booking
            const mockQueryBuilder = {
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([existingBooking]),
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory,
              scheduledDate: secondBookingDate,
              estimatedDuration: 60,
              serviceAddress,
              description,
              estimatedPrice,
            }

            // Property: Overlapping bookings must be rejected
            await expect(service.createBooking(userId, createBookingDto)).rejects.toThrow(
              ConflictException
            )

            // Verify conflict check was performed
            expect(mockBookingRepository.createQueryBuilder).toHaveBeenCalledWith('booking')
            expect(mockQueryBuilder.where).toHaveBeenCalled()
            expect(mockQueryBuilder.andWhere).toHaveBeenCalled()

            // Verify booking was NOT created
            expect(mockBookingRepository.create).not.toHaveBeenCalled()
            expect(mockBookingRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow non-overlapping bookings for any professional at different times', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          serviceCategoryGen,
          futureDateGen,
          fc.integer({ min: 60, max: 240 }), // First booking duration
          fc.integer({ min: 300, max: 1440 }), // Gap in minutes (at least 5 hours)
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            userId,
            professionalId,
            serviceCategory,
            firstBookingDate,
            firstDuration,
            gap,
            serviceAddress,
            description,
            estimatedPrice
          ) => {
            // Calculate non-overlapping second booking time
            // Second booking starts after first booking ends plus gap
            const secondBookingDate = new Date(
              firstBookingDate.getTime() + (firstDuration + gap) * 60000
            )

            // Setup mocks
            const mockUser = { id: userId, email: 'user@test.com' }
            const mockProfessional = {
              id: professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              isAvailable: true,
            }

            const mockNewBooking = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory,
              scheduledDate: secondBookingDate,
              estimatedDuration: 60,
              serviceAddress,
              description,
              estimatedPrice,
              status: BookingStatus.PENDING,
              paymentStatus: PaymentStatus.PENDING,
              referenceImages: [],
              progressPhotos: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)
            mockBookingRepository.create.mockReturnValue(mockNewBooking)
            mockBookingRepository.save.mockResolvedValue(mockNewBooking)

            // Mock query builder to return NO conflicting bookings
            const mockQueryBuilder = {
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]), // No conflicts
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory,
              scheduledDate: secondBookingDate,
              estimatedDuration: 60,
              serviceAddress,
              description,
              estimatedPrice,
            }

            // Property: Non-overlapping bookings must be allowed
            const result = await service.createBooking(userId, createBookingDto)

            expect(result).toBeDefined()
            expect(result.professionalId).toBe(professionalId)
            expect(result.scheduledDate).toEqual(secondBookingDate)
            expect(result.status).toBe(BookingStatus.PENDING)

            // Verify booking was created
            expect(mockBookingRepository.create).toHaveBeenCalled()
            expect(mockBookingRepository.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only check conflicts for active bookings (PENDING, CONFIRMED, IN_PROGRESS)', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          serviceCategoryGen,
          futureDateGen,
          fc.integer({ min: 60, max: 240 }),
          serviceAddressGen,
          descriptionGen,
          priceGen,
          async (
            userId,
            professionalId,
            serviceCategory,
            scheduledDate,
            duration,
            serviceAddress,
            description,
            estimatedPrice
          ) => {
            // Setup mocks
            const mockUser = { id: userId, email: 'user@test.com' }
            const mockProfessional = {
              id: professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              isAvailable: true,
            }

            const mockNewBooking = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory,
              scheduledDate,
              estimatedDuration: duration,
              serviceAddress,
              description,
              estimatedPrice,
              status: BookingStatus.PENDING,
              paymentStatus: PaymentStatus.PENDING,
              referenceImages: [],
              progressPhotos: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)
            mockBookingRepository.create.mockReturnValue(mockNewBooking)
            mockBookingRepository.save.mockResolvedValue(mockNewBooking)

            // Mock query builder to return NO conflicts (inactive bookings filtered out)
            const mockQueryBuilder = {
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]), // No active conflicts
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            const createBookingDto: CreateBookingDto = {
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory,
              scheduledDate,
              estimatedDuration: duration,
              serviceAddress,
              description,
              estimatedPrice,
            }

            // Property: Inactive bookings should not prevent new bookings
            const result = await service.createBooking(userId, createBookingDto)

            expect(result).toBeDefined()
            expect(result.status).toBe(BookingStatus.PENDING)

            // Verify conflict check filtered by active statuses
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'booking.status IN (:...statuses)',
              {
                statuses: [
                  BookingStatus.PENDING,
                  BookingStatus.CONFIRMED,
                  BookingStatus.IN_PROGRESS,
                ],
              }
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 19: Geçerli Durum Geçişleri (Valid State Transitions)**
   *
   * **Validates: Requirements 6.1**
   *
   * For any booking, status changes must follow the valid state machine.
   * Valid transitions:
   * - Pending → Confirmed, Rejected, Cancelled
   * - Confirmed → InProgress, Cancelled
   * - InProgress → Completed, Disputed
   * - Disputed → Resolved
   * Invalid transitions must be rejected.
   */
  describe('Property 19: Valid State Transitions', () => {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.DISPUTED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.REJECTED]: [],
      [BookingStatus.DISPUTED]: [BookingStatus.RESOLVED],
      [BookingStatus.RESOLVED]: [],
    }

    it('should allow all valid state transitions for any booking', async () => {
      // Generate test cases for all valid transitions
      const validTransitionCases: Array<[BookingStatus, BookingStatus]> = []
      for (const [fromStatus, toStatuses] of Object.entries(validTransitions)) {
        for (const toStatus of toStatuses) {
          validTransitionCases.push([fromStatus as BookingStatus, toStatus])
        }
      }

      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.constantFrom(...validTransitionCases),
          async (bookingId, [currentStatus, newStatus]) => {
            // Setup mock booking with current status
            const mockBooking = {
              id: bookingId,
              userId: fc.sample(uuidGen, 1)[0],
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: currentStatus,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const updatedBooking = {
              ...mockBooking,
              status: newStatus,
              startedAt: newStatus === BookingStatus.IN_PROGRESS ? new Date() : undefined,
              completedAt: newStatus === BookingStatus.COMPLETED ? new Date() : undefined,
              cancelledAt: newStatus === BookingStatus.CANCELLED ? new Date() : undefined,
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockResolvedValue(updatedBooking)

            // Property: Valid transitions must be allowed
            const result = await service.updateBookingStatus(bookingId, {
              status: newStatus,
            })

            expect(result.status).toBe(newStatus)
            expect(mockBookingRepository.save).toHaveBeenCalled()

            // Verify status-specific fields are set
            if (newStatus === BookingStatus.IN_PROGRESS) {
              expect(result.startedAt).toBeDefined()
            }
            if (newStatus === BookingStatus.COMPLETED) {
              expect(result.completedAt).toBeDefined()
            }
            if (newStatus === BookingStatus.CANCELLED) {
              expect(result.cancelledAt).toBeDefined()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject all invalid state transitions for any booking', async () => {
      // Generate test cases for all invalid transitions
      const allStatuses = Object.values(BookingStatus)
      const invalidTransitionCases: Array<[BookingStatus, BookingStatus]> = []

      for (const fromStatus of allStatuses) {
        const validToStatuses = validTransitions[fromStatus] || []
        for (const toStatus of allStatuses) {
          // Skip if it's a valid transition or same status
          if (!validToStatuses.includes(toStatus) && fromStatus !== toStatus) {
            invalidTransitionCases.push([fromStatus, toStatus])
          }
        }
      }

      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.constantFrom(...invalidTransitionCases),
          async (bookingId, [currentStatus, newStatus]) => {
            // Setup mock booking with current status
            const mockBooking = {
              id: bookingId,
              userId: fc.sample(uuidGen, 1)[0],
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: currentStatus,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)

            // Property: Invalid transitions must be rejected
            await expect(
              service.updateBookingStatus(bookingId, { status: newStatus })
            ).rejects.toThrow()

            // Verify booking was NOT saved
            expect(mockBookingRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle status-specific updates correctly for any valid transition', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.constantFrom(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS
          ),
          async (bookingId, currentStatus) => {
            // Determine next valid status based on current status
            let newStatus: BookingStatus
            switch (currentStatus) {
              case BookingStatus.PENDING:
                newStatus = BookingStatus.CONFIRMED
                break
              case BookingStatus.CONFIRMED:
                newStatus = BookingStatus.IN_PROGRESS
                break
              case BookingStatus.IN_PROGRESS:
                newStatus = BookingStatus.COMPLETED
                break
              default:
                return // Skip invalid cases
            }

            const mockBooking = {
              id: bookingId,
              userId: fc.sample(uuidGen, 1)[0],
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: currentStatus,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockImplementation(booking => Promise.resolve(booking))

            const result = await service.updateBookingStatus(bookingId, {
              status: newStatus,
            })

            // Property: Status-specific fields must be set correctly
            if (newStatus === BookingStatus.IN_PROGRESS) {
              expect(result.startedAt).toBeDefined()
              expect(result.startedAt).toBeInstanceOf(Date)
            }
            if (newStatus === BookingStatus.COMPLETED) {
              expect(result.completedAt).toBeDefined()
              expect(result.completedAt).toBeInstanceOf(Date)
            }
            // Note: CANCELLED is not tested here as it's not part of the valid transitions in this test
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 22: Aktif/Geçmiş Rezervasyon Ayrımı (Active/Past Booking Separation)**
   *
   * **Validates: Requirements 6.5**
   *
   * For any user or professional, when querying bookings with filters:
   * - 'active' filter must return only PENDING, CONFIRMED, IN_PROGRESS bookings
   * - 'past' filter must return only COMPLETED, CANCELLED, REJECTED, DISPUTED, RESOLVED bookings
   * - 'all' filter must return all bookings regardless of status
   */
  describe('Property 22: Active/Past Booking Separation', () => {
    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ]

    const pastStatuses = [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.REJECTED,
      BookingStatus.DISPUTED,
      BookingStatus.RESOLVED,
    ]

    it('should return only active bookings when filter is "active" for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...activeStatuses),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...pastStatuses),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (userId, activeBookings, pastBookings) => {
            // Create mock bookings with mixed statuses
            const allBookings = [
              ...activeBookings.map(b => ({
                id: b.id,
                userId,
                professionalId: fc.sample(uuidGen, 1)[0],
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
              ...pastBookings.map(b => ({
                id: b.id,
                userId,
                professionalId: fc.sample(uuidGen, 1)[0],
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            ]

            // Mock query builder to return only active bookings
            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest
                .fn()
                .mockResolvedValue(allBookings.filter(b => activeStatuses.includes(b.status))),
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            // Property: Active filter returns only active bookings
            const result = await service.getUserBookings(userId, 'active')

            expect(result).toHaveLength(activeBookings.length)
            expect(result.every(b => activeStatuses.includes(b.status))).toBe(true)

            // Verify query builder was called with active statuses
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'booking.status IN (:...statuses)',
              {
                statuses: activeStatuses,
              }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only past bookings when filter is "past" for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...activeStatuses),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...pastStatuses),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (userId, activeBookings, pastBookings) => {
            // Create mock bookings with mixed statuses
            const allBookings = [
              ...activeBookings.map(b => ({
                id: b.id,
                userId,
                professionalId: fc.sample(uuidGen, 1)[0],
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
              ...pastBookings.map(b => ({
                id: b.id,
                userId,
                professionalId: fc.sample(uuidGen, 1)[0],
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            ]

            // Mock query builder to return only past bookings
            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest
                .fn()
                .mockResolvedValue(allBookings.filter(b => pastStatuses.includes(b.status))),
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            // Property: Past filter returns only past bookings
            const result = await service.getUserBookings(userId, 'past')

            expect(result).toHaveLength(pastBookings.length)
            expect(result.every(b => pastStatuses.includes(b.status))).toBe(true)

            // Verify query builder was called with past statuses
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'booking.status IN (:...statuses)',
              {
                statuses: pastStatuses,
              }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all bookings when filter is "all" for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...Object.values(BookingStatus)),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (userId, bookings) => {
            // Create mock bookings with all possible statuses
            const allBookings = bookings.map(b => ({
              id: b.id,
              userId,
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: b.status,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // Mock query builder to return all bookings
            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(allBookings),
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            // Property: All filter returns all bookings
            const result = await service.getUserBookings(userId, 'all')

            expect(result).toHaveLength(bookings.length)

            // Verify query builder was NOT called with status filter
            expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
              'booking.status IN (:...statuses)',
              expect.anything()
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only active bookings when filter is "active" for any professional', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...activeStatuses),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...pastStatuses),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (professionalId, activeBookings, pastBookings) => {
            // Create mock bookings with mixed statuses
            const allBookings = [
              ...activeBookings.map(b => ({
                id: b.id,
                userId: fc.sample(uuidGen, 1)[0],
                professionalId,
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
              ...pastBookings.map(b => ({
                id: b.id,
                userId: fc.sample(uuidGen, 1)[0],
                professionalId,
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            ]

            // Mock query builder to return only active bookings
            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest
                .fn()
                .mockResolvedValue(allBookings.filter(b => activeStatuses.includes(b.status))),
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            // Property: Active filter returns only active bookings for professionals
            const result = await service.getProfessionalBookings(professionalId, 'active')

            expect(result).toHaveLength(activeBookings.length)
            expect(result.every(b => activeStatuses.includes(b.status))).toBe(true)

            // Verify query builder was called with active statuses
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'booking.status IN (:...statuses)',
              {
                statuses: activeStatuses,
              }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return only past bookings when filter is "past" for any professional', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...activeStatuses),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...pastStatuses),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (professionalId, activeBookings, pastBookings) => {
            // Create mock bookings with mixed statuses
            const allBookings = [
              ...activeBookings.map(b => ({
                id: b.id,
                userId: fc.sample(uuidGen, 1)[0],
                professionalId,
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
              ...pastBookings.map(b => ({
                id: b.id,
                userId: fc.sample(uuidGen, 1)[0],
                professionalId,
                professionalType: ProfessionalType.HANDYMAN,
                serviceCategory: 'plumbing',
                status: b.status,
                scheduledDate: new Date(),
                estimatedDuration: 60,
                serviceAddress: {
                  address: '123 Test St',
                  city: 'Test City',
                  state: 'Test State',
                  country: 'Mexico',
                  postalCode: '12345',
                  coordinates: { latitude: 19.4326, longitude: -99.1332 },
                },
                description: 'Test booking',
                estimatedPrice: 500,
                paymentStatus: PaymentStatus.PENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            ]

            // Mock query builder to return only past bookings
            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest
                .fn()
                .mockResolvedValue(allBookings.filter(b => pastStatuses.includes(b.status))),
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            // Property: Past filter returns only past bookings for professionals
            const result = await service.getProfessionalBookings(professionalId, 'past')

            expect(result).toHaveLength(pastBookings.length)
            expect(result.every(b => pastStatuses.includes(b.status))).toBe(true)

            // Verify query builder was called with past statuses
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'booking.status IN (:...statuses)',
              {
                statuses: pastStatuses,
              }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return all bookings when filter is "all" for any professional', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              status: fc.constantFrom(...Object.values(BookingStatus)),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (professionalId, bookings) => {
            // Create mock bookings with all possible statuses
            const allBookings = bookings.map(b => ({
              id: b.id,
              userId: fc.sample(uuidGen, 1)[0],
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: b.status,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // Mock query builder to return all bookings
            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(allBookings),
            }
            mockBookingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            // Property: All filter returns all bookings for professionals
            const result = await service.getProfessionalBookings(professionalId, 'all')

            expect(result).toHaveLength(bookings.length)

            // Verify query builder was NOT called with status filter
            expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
              'booking.status IN (:...statuses)',
              expect.anything()
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 21: Hizmet Tamamlama Değerlendirme İsteği (Service Completion Rating Request)**
   *
   * **Validates: Requirements 6.4**
   *
   * For any booking, when the status changes to Completed, a rating request
   * notification must be sent to the user.
   */
  describe('Property 21: Service Completion Rating Request', () => {
    let notificationService: any

    beforeEach(() => {
      // Mock notification service
      notificationService = {
        sendNotification: jest.fn().mockResolvedValue({
          id: fc.sample(uuidGen, 1)[0],
          userId: fc.sample(uuidGen, 1)[0],
          type: 'booking_completed',
          title: 'Service Completed',
          message: 'Please rate your service',
          isRead: false,
          createdAt: new Date(),
        }),
      }

      // Inject notification service into booking service
      ;(service as any).notificationService = notificationService
    })

    it('should send rating request notification when any booking is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          async (bookingId, userId, professionalId, professionalType, serviceCategory) => {
            // Setup mock booking in IN_PROGRESS status
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType,
              serviceCategory,
              status: BookingStatus.IN_PROGRESS,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const completedBooking = {
              ...mockBooking,
              status: BookingStatus.COMPLETED,
              completedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockResolvedValue(completedBooking)

            // Update booking to COMPLETED status
            const result = await service.updateBookingStatus(bookingId, {
              status: BookingStatus.COMPLETED,
            })

            // Property: Rating request notification must be sent when booking is completed
            expect(result.status).toBe(BookingStatus.COMPLETED)
            expect(result.completedAt).toBeDefined()

            // Verify notification was sent to the user
            expect(notificationService.sendNotification).toHaveBeenCalledWith(
              expect.objectContaining({
                userId,
                type: 'booking_completed',
              })
            )

            // Verify notification data includes booking information
            const notificationCall = notificationService.sendNotification.mock.calls[0][0]
            expect(notificationCall.data).toBeDefined()
            expect(notificationCall.data.bookingId).toBe(bookingId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should NOT send rating request notification for non-completed status transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          fc.constantFrom(
            [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
            [BookingStatus.PENDING, BookingStatus.CANCELLED],
            [BookingStatus.IN_PROGRESS, BookingStatus.DISPUTED]
          ),
          async (bookingId, userId, [currentStatus, newStatus]) => {
            // Setup mock booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: currentStatus,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const updatedBooking = { ...mockBooking, status: newStatus }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockResolvedValue(updatedBooking)

            // Reset notification service mock
            notificationService.sendNotification.mockClear()

            // Update booking to non-completed status
            await service.updateBookingStatus(bookingId, { status: newStatus })

            // Property: Rating request notification should NOT be sent for non-completed transitions
            expect(notificationService.sendNotification).not.toHaveBeenCalledWith(
              expect.objectContaining({
                type: 'booking_completed',
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include professional and service details in rating request notification', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          async (bookingId, userId, professionalId, professionalType, serviceCategory) => {
            // Setup mock booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType,
              serviceCategory,
              status: BookingStatus.IN_PROGRESS,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const completedBooking = {
              ...mockBooking,
              status: BookingStatus.COMPLETED,
              completedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockResolvedValue(completedBooking)

            // Update booking to COMPLETED status
            await service.updateBookingStatus(bookingId, {
              status: BookingStatus.COMPLETED,
            })

            // Property: Notification data must include booking context for rating
            expect(notificationService.sendNotification).toHaveBeenCalledWith(
              expect.objectContaining({
                userId,
                type: 'booking_completed',
                data: expect.objectContaining({
                  bookingId,
                  professionalId,
                  serviceCategory,
                }),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 23: İptal Nedeni Kaydı (Cancellation Reason Recording)**
   *
   * **Validates: Requirements 6.6**
   *
   * For any booking cancellation, when a user or professional cancels a booking,
   * the cancellation reason must be properly recorded and persisted in the database.
   * The cancellation timestamp must also be recorded.
   */
  describe('Property 23: Cancellation Reason Recording', () => {
    // Cancellation reason generator
    const cancellationReasonGen = fc.oneof(
      fc.constantFrom(
        'Schedule conflict',
        'Found another professional',
        'Service no longer needed',
        'Emergency came up',
        'Price too high',
        'Customer not available',
        'Weather conditions',
        'Equipment not available'
      ),
      fc.string({ minLength: 10, maxLength: 200 }), // Custom reasons
      fc.string({ minLength: 1, maxLength: 5 }), // Edge case: very short reasons
      fc.string({ minLength: 500, maxLength: 1000 }) // Edge case: long reasons
    )

    it('should record cancellation reason when any PENDING booking is cancelled', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          cancellationReasonGen,
          async (
            bookingId,
            userId,
            professionalId,
            professionalType,
            serviceCategory,
            cancellationReason
          ) => {
            // Setup mock booking in PENDING status
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType,
              serviceCategory,
              status: BookingStatus.PENDING,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockImplementation(booking =>
              Promise.resolve({ ...booking })
            )

            // Cancel booking with reason
            const result = await service.cancelBooking(bookingId, cancellationReason)

            // Property: Cancellation reason must be recorded
            expect(result.status).toBe(BookingStatus.CANCELLED)
            expect(result.cancellationReason).toBe(cancellationReason)
            expect(result.cancelledAt).toBeDefined()
            expect(result.cancelledAt).toBeInstanceOf(Date)

            // Verify repository save was called with cancellation data
            expect(mockBookingRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                status: BookingStatus.CANCELLED,
                cancellationReason,
                cancelledAt: expect.any(Date),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should record cancellation reason when any CONFIRMED booking is cancelled', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          serviceCategoryGen,
          cancellationReasonGen,
          async (
            bookingId,
            userId,
            professionalId,
            professionalType,
            serviceCategory,
            cancellationReason
          ) => {
            // Setup mock booking in CONFIRMED status
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType,
              serviceCategory,
              status: BookingStatus.CONFIRMED,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockImplementation(booking =>
              Promise.resolve({ ...booking })
            )

            // Cancel booking with reason
            const result = await service.cancelBooking(bookingId, cancellationReason)

            // Property: Cancellation reason must be recorded for confirmed bookings
            expect(result.status).toBe(BookingStatus.CANCELLED)
            expect(result.cancellationReason).toBe(cancellationReason)
            expect(result.cancelledAt).toBeDefined()
            expect(result.cancelledAt).toBeInstanceOf(Date)

            // Verify repository save was called with cancellation data
            expect(mockBookingRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                status: BookingStatus.CANCELLED,
                cancellationReason,
                cancelledAt: expect.any(Date),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge cases: empty, very short, and very long cancellation reasons', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.oneof(
            fc.constant(''), // Empty reason
            fc.string({ minLength: 1, maxLength: 3 }), // Very short
            fc.string({ minLength: 1000, maxLength: 2000 }) // Very long
          ),
          async (bookingId, cancellationReason) => {
            // Setup mock booking
            const mockBooking = {
              id: bookingId,
              userId: fc.sample(uuidGen, 1)[0],
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.PENDING,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockImplementation(booking =>
              Promise.resolve({ ...booking })
            )

            // Cancel booking with edge case reason
            const result = await service.cancelBooking(bookingId, cancellationReason)

            // Property: System must handle edge case reasons without errors
            expect(result.status).toBe(BookingStatus.CANCELLED)
            expect(result.cancellationReason).toBe(cancellationReason)
            expect(result.cancelledAt).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle special characters in cancellation reasons', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.oneof(
            fc.constant('Reason with "quotes" and \'apostrophes\''),
            fc.constant('Reason with special chars: @#$%^&*()'),
            fc.constant('Reason with unicode: 你好 مرحبا'),
            fc.constant('Reason with newlines\nand\ttabs'),
            fc.constant('Reason with emoji: 😊 👍 ❌')
          ),
          async (bookingId, cancellationReason) => {
            // Setup mock booking
            const mockBooking = {
              id: bookingId,
              userId: fc.sample(uuidGen, 1)[0],
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.CONFIRMED,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockImplementation(booking =>
              Promise.resolve({ ...booking })
            )

            // Cancel booking with special character reason
            const result = await service.cancelBooking(bookingId, cancellationReason)

            // Property: Special characters must be preserved in cancellation reason
            expect(result.status).toBe(BookingStatus.CANCELLED)
            expect(result.cancellationReason).toBe(cancellationReason)
            expect(result.cancelledAt).toBeDefined()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject cancellation for bookings in non-cancellable states', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.constantFrom(
            BookingStatus.IN_PROGRESS,
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
            BookingStatus.REJECTED,
            BookingStatus.DISPUTED,
            BookingStatus.RESOLVED
          ),
          cancellationReasonGen,
          async (bookingId, nonCancellableStatus, cancellationReason) => {
            // Setup mock booking in non-cancellable status
            const mockBooking = {
              id: bookingId,
              userId: fc.sample(uuidGen, 1)[0],
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: nonCancellableStatus,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)

            // Property: Cancellation must be rejected for non-cancellable statuses
            await expect(service.cancelBooking(bookingId, cancellationReason)).rejects.toThrow()

            // Verify booking was NOT saved
            expect(mockBookingRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve cancellation reason across multiple queries for any booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          cancellationReasonGen,
          async (bookingId, userId, cancellationReason) => {
            // Setup mock booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.PENDING,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            let savedBooking: any = null

            mockBookingRepository.findOne.mockImplementation(() => {
              if (savedBooking) {
                return Promise.resolve(savedBooking)
              }
              return Promise.resolve(mockBooking)
            })

            mockBookingRepository.save.mockImplementation(booking => {
              savedBooking = { ...booking }
              return Promise.resolve(savedBooking)
            })

            // Cancel booking
            const cancelResult = await service.cancelBooking(bookingId, cancellationReason)

            // Property: Cancellation reason must persist across queries
            expect(cancelResult.cancellationReason).toBe(cancellationReason)

            // Simulate retrieving the booking again
            const retrievedBooking = await service.findById(bookingId)

            // Verify cancellation reason is still present
            expect(retrievedBooking.cancellationReason).toBe(cancellationReason)
            expect(retrievedBooking.status).toBe(BookingStatus.CANCELLED)
            expect(retrievedBooking.cancelledAt).toBeDefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should work for both user-initiated and professional-initiated cancellations', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          professionalTypeGen,
          cancellationReasonGen,
          async (bookingId, userId, professionalId, professionalType, cancellationReason) => {
            // Setup mock booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType,
              serviceCategory: 'plumbing',
              status: BookingStatus.CONFIRMED,
              scheduledDate: new Date(),
              estimatedDuration: 60,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              paymentStatus: PaymentStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockBookingRepository.save.mockImplementation(booking =>
              Promise.resolve({ ...booking })
            )

            // Cancel booking (regardless of who initiates)
            const result = await service.cancelBooking(bookingId, cancellationReason)

            // Property: Cancellation reason must be recorded regardless of initiator
            expect(result.status).toBe(BookingStatus.CANCELLED)
            expect(result.cancellationReason).toBe(cancellationReason)
            expect(result.cancelledAt).toBeDefined()

            // Verify the cancellation data is consistent
            expect(mockBookingRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                status: BookingStatus.CANCELLED,
                cancellationReason,
                cancelledAt: expect.any(Date),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should record cancellation timestamp that is after or equal to booking creation time', async () => {
      await fc.assert(
        fc.asyncProperty(uuidGen, cancellationReasonGen, async (bookingId, cancellationReason) => {
          const createdAt = new Date()

          // Setup mock booking
          const mockBooking = {
            id: bookingId,
            userId: fc.sample(uuidGen, 1)[0],
            professionalId: fc.sample(uuidGen, 1)[0],
            professionalType: ProfessionalType.HANDYMAN,
            serviceCategory: 'plumbing',
            status: BookingStatus.PENDING,
            scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
            estimatedDuration: 60,
            serviceAddress: {
              address: '123 Test St',
              city: 'Test City',
              state: 'Test State',
              country: 'Mexico',
              postalCode: '12345',
              coordinates: { latitude: 19.4326, longitude: -99.1332 },
            },
            description: 'Test booking',
            estimatedPrice: 500,
            paymentStatus: PaymentStatus.PENDING,
            createdAt,
            updatedAt: createdAt,
          }

          mockBookingRepository.findOne.mockResolvedValue(mockBooking)
          mockBookingRepository.save.mockImplementation(booking => Promise.resolve({ ...booking }))

          // Cancel booking
          const result = await service.cancelBooking(bookingId, cancellationReason)

          // Property: Cancellation timestamp must be after or equal to creation time
          expect(result.cancelledAt).toBeDefined()
          expect(result.cancelledAt!.getTime()).toBeGreaterThanOrEqual(createdAt.getTime())
        }),
        { numRuns: 100 }
      )
    })
  })
})
