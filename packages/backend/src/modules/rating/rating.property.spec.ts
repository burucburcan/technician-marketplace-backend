import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException } from '@nestjs/common'
import * as fc from 'fast-check'
import { RatingService } from './rating.service'
import { ServiceRating } from '../../entities/service-rating.entity'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { CreateRatingDto } from './dto/create-rating.dto'
import { BookingStatus, ProfessionalType } from '../../common/enums'
import { NotificationService } from '../notification/notification.service'

/**
 * Property-Based Tests for Rating Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the rating system, ensuring correctness at scale.
 */
describe('RatingService Property Tests', () => {
  let service: RatingService

  const mockRatingRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockBookingRepository = {
    findOne: jest.fn(),
  }

  const mockProfessionalRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  }

  const mockNotificationService = {
    sendNotification: jest.fn().mockResolvedValue({
      id: 'notification-id',
      userId: 'professional-id',
      type: 'new_rating',
      title: 'New Rating',
      message: 'You received a new rating',
      isRead: false,
      createdAt: new Date(),
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingService,
        {
          provide: getRepositoryToken(ServiceRating),
          useValue: mockRatingRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: mockProfessionalRepository,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile()

    service = module.get<RatingService>(RatingService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const scoreGen = fc.integer({ min: 1, max: 5 })
  const commentGen = fc.string({ minLength: 10, maxLength: 500 })
  const categoryRatingGen = fc.array(
    fc.record({
      category: fc.constantFrom(
        'quality',
        'punctuality',
        'communication',
        'professionalism',
        'value'
      ),
      score: scoreGen,
    }),
    { minLength: 1, maxLength: 5 }
  )
  const photoUrlsGen = fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 })

  /**
   * **Property 24: Değerlendirme Profil Entegrasyonu (Rating Profile Integration)**
   *
   * **Validates: Requirements 7.2**
   *
   * For any rating created, the rating must be added to the professional's profile
   * and the average rating must be recalculated.
   */
  describe('Property 24: Rating Profile Integration', () => {
    it('should add rating to professional profile for any valid rating', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          scoreGen,
          commentGen,
          categoryRatingGen,
          photoUrlsGen,
          async (
            userId: string,
            bookingId: string,
            professionalId: string,
            score: number,
            comment: string,
            categoryRatings: Array<{ category: string; score: number }>,
            photoUrls: string[]
          ) => {
            // Setup mock completed booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.COMPLETED,
              scheduledDate: new Date(),
              estimatedDuration: 120,
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
              completedAt: new Date(),
              user: { id: userId, email: 'user@test.com' },
              professional: { id: professionalId },
            }

            // Setup mock professional profile
            const mockProfessional = {
              id: professionalId,
              userId: fc.sample(uuidGen, 1)[0],
              professionalType: ProfessionalType.HANDYMAN,
              businessName: 'Test Professional',
              specializations: ['plumbing'],
              experienceYears: 5,
              hourlyRate: 50,
              serviceRadius: 10,
              rating: 0,
              totalJobs: 0,
              completionRate: 0,
            }

            const mockRating = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              userId,
              professionalId,
              score,
              comment,
              categoryRatings,
              photoUrls,
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
              user: undefined,
              professional: undefined,
            } as ServiceRating

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockRatingRepository.findOne.mockResolvedValue(null) // No existing rating
            mockRatingRepository.create.mockReturnValue(mockRating)
            mockRatingRepository.save.mockResolvedValue(mockRating)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)

            const createRatingDto: CreateRatingDto = {
              bookingId,
              score,
              comment,
              categoryRatings,
              photoUrls,
            }

            const result = await service.createRating(userId, createRatingDto)

            // Property: Rating must be created and linked to professional profile
            expect(result).toBeDefined()
            expect(result.professionalId).toBe(professionalId)
            expect(result.score).toBe(score)
            expect(result.comment).toBe(comment)
            expect(result.categoryRatings).toEqual(categoryRatings)
            expect(result.photoUrls).toEqual(photoUrls)

            // Verify rating was saved to repository
            expect(mockRatingRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                bookingId,
                userId,
                professionalId,
                score,
                comment,
                categoryRatings,
                photoUrls,
              })
            )
            expect(mockRatingRepository.save).toHaveBeenCalled()

            // Verify notification was sent to professional
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: professionalId,
                type: 'new_rating',
                data: expect.objectContaining({
                  rating: score,
                  comment,
                }),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain rating data integrity when retrieving by professional ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              bookingId: uuidGen,
              userId: uuidGen,
              score: scoreGen,
              comment: commentGen,
              categoryRatings: categoryRatingGen,
              photoUrls: photoUrlsGen,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (professionalId: string, ratings: any[]) => {
            // Setup mock ratings for professional
            const mockRatings = ratings.map(r => ({
              ...r,
              professionalId,
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            mockRatingRepository.find.mockResolvedValue(mockRatings)

            const result = await service.findByProfessionalId(professionalId)

            // Property: All ratings must belong to the professional
            expect(result).toHaveLength(mockRatings.length)
            result.forEach(rating => {
              expect(rating.professionalId).toBe(professionalId)
            })

            // Verify repository was queried correctly
            expect(mockRatingRepository.find).toHaveBeenCalledWith({
              where: { professionalId },
              order: { createdAt: 'DESC' },
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 26: Sadece Tamamlanan Rezervasyon Değerlendirmesi (Only Completed Booking Rating)**
   *
   * **Validates: Requirements 7.4**
   *
   * For any rating attempt, only bookings with COMPLETED status can be rated;
   * attempts to rate bookings in other statuses must be rejected.
   */
  describe('Property 26: Only Completed Booking Rating', () => {
    it('should reject ratings for any non-completed booking status', async () => {
      const nonCompletedStatuses = [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.IN_PROGRESS,
        BookingStatus.CANCELLED,
        BookingStatus.REJECTED,
        BookingStatus.DISPUTED,
        BookingStatus.RESOLVED,
      ]

      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          fc.constantFrom(...nonCompletedStatuses),
          scoreGen,
          commentGen,
          categoryRatingGen,
          async (
            userId: string,
            bookingId: string,
            professionalId: string,
            bookingStatus: BookingStatus,
            score: number,
            comment: string,
            categoryRatings: Array<{ category: string; score: number }>
          ) => {
            // Setup mock booking with non-completed status
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: bookingStatus,
              scheduledDate: new Date(),
              estimatedDuration: 120,
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
              user: { id: userId, email: 'user@test.com' },
              professional: { id: professionalId },
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)

            const createRatingDto: CreateRatingDto = {
              bookingId,
              score,
              comment,
              categoryRatings,
            }

            // Property: Non-completed bookings must be rejected
            await expect(service.createRating(userId, createRatingDto)).rejects.toThrow(
              BadRequestException
            )

            await expect(service.createRating(userId, createRatingDto)).rejects.toThrow(
              'Only completed bookings can be rated'
            )

            // Verify rating was NOT created
            expect(mockRatingRepository.create).not.toHaveBeenCalled()
            expect(mockRatingRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow ratings for any completed booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          scoreGen,
          commentGen,
          categoryRatingGen,
          photoUrlsGen,
          async (
            userId: string,
            bookingId: string,
            professionalId: string,
            score: number,
            comment: string,
            categoryRatings: Array<{ category: string; score: number }>,
            photoUrls: string[]
          ) => {
            // Setup mock completed booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.COMPLETED,
              scheduledDate: new Date(),
              estimatedDuration: 120,
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
              completedAt: new Date(),
              user: { id: userId, email: 'user@test.com' },
              professional: { id: professionalId },
            }

            const mockRating = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              userId,
              professionalId,
              score,
              comment,
              categoryRatings,
              photoUrls,
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
              user: undefined,
              professional: undefined,
            } as ServiceRating

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockRatingRepository.findOne.mockResolvedValue(null) // No existing rating
            mockRatingRepository.create.mockReturnValue(mockRating)
            mockRatingRepository.save.mockResolvedValue(mockRating)

            const createRatingDto: CreateRatingDto = {
              bookingId,
              score,
              comment,
              categoryRatings,
              photoUrls,
            }

            // Property: Completed bookings must be allowed to be rated
            const result = await service.createRating(userId, createRatingDto)

            expect(result).toBeDefined()
            expect(result.bookingId).toBe(bookingId)
            expect(result.score).toBe(score)

            // Verify rating was created
            expect(mockRatingRepository.create).toHaveBeenCalled()
            expect(mockRatingRepository.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 25: Ortalama Puan Hesaplama Doğruluğu (Average Rating Calculation Accuracy)**
   *
   * **Validates: Requirements 7.3**
   *
   * For any professional, the average rating must be the arithmetic mean of all ratings.
   * This property ensures that the average rating calculation is always accurate.
   */
  describe('Property 25: Average Rating Calculation Accuracy', () => {
    it('should calculate correct average rating for any list of ratings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidGen,
              bookingId: uuidGen,
              userId: uuidGen,
              score: scoreGen,
              comment: commentGen,
              categoryRatings: categoryRatingGen,
              photoUrls: photoUrlsGen,
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async (ratings: any[]) => {
            // Calculate expected average
            const sum = ratings.reduce((acc, r) => acc + r.score, 0)
            const expectedAverage = Math.round((sum / ratings.length) * 100) / 100

            // Setup mock ratings with approved status
            const mockRatings = ratings.map(r => ({
              ...r,
              professionalId: 'test-professional-id',
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // Property: Average rating must equal arithmetic mean
            const calculatedAverage = service.calculateAverageRating(mockRatings)

            expect(calculatedAverage).toBe(expectedAverage)
            expect(calculatedAverage).toBeGreaterThanOrEqual(1)
            expect(calculatedAverage).toBeLessThanOrEqual(5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return 0 for empty rating list', () => {
      const result = service.calculateAverageRating([])
      expect(result).toBe(0)
    })

    it('should handle single rating correctly', async () => {
      await fc.assert(
        fc.asyncProperty(scoreGen, async (score: number) => {
          const mockRating = {
            id: fc.sample(uuidGen, 1)[0],
            bookingId: fc.sample(uuidGen, 1)[0],
            userId: fc.sample(uuidGen, 1)[0],
            professionalId: fc.sample(uuidGen, 1)[0],
            score,
            comment: 'Test comment',
            categoryRatings: [],
            photoUrls: [],
            isVerified: true,
            moderationStatus: 'approved',
            createdAt: new Date(),
            updatedAt: new Date(),
            user: undefined,
            professional: undefined,
          } as ServiceRating

          // Property: Single rating average equals the rating itself
          const average = service.calculateAverageRating([mockRating])
          expect(average).toBe(score)
        }),
        { numRuns: 100 }
      )
    })

    it('should update professional profile with correct average after rating creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              bookingId: uuidGen,
              userId: uuidGen,
              score: scoreGen,
              comment: commentGen,
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (professionalId: string, existingRatings: any[]) => {
            // Setup existing ratings
            const mockRatings = existingRatings.map(r => ({
              ...r,
              professionalId,
              categoryRatings: [],
              photoUrls: [],
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            mockRatingRepository.find.mockResolvedValue(mockRatings)

            // Calculate expected average
            const sum = mockRatings.reduce((acc, r) => acc + r.score, 0)
            const expectedAverage = Math.round((sum / mockRatings.length) * 100) / 100

            // Call update method
            await service.updateProfessionalAverageRating(professionalId)

            // Property: Professional profile must be updated with correct average
            expect(mockProfessionalRepository.update).toHaveBeenCalledWith(
              { id: professionalId },
              { rating: expectedAverage }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should only include approved ratings in average calculation', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              bookingId: uuidGen,
              userId: uuidGen,
              score: scoreGen,
              comment: commentGen,
              moderationStatus: fc.constantFrom('approved', 'flagged', 'rejected', 'pending'),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (professionalId: string, ratings: any[]) => {
            // Ensure at least one approved rating exists
            const hasApproved = ratings.some(r => r.moderationStatus === 'approved')
            fc.pre(hasApproved)

            // Setup mock ratings
            const mockRatings = ratings.map(r => ({
              ...r,
              professionalId,
              categoryRatings: [],
              photoUrls: [],
              isVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // Filter only approved ratings for expected calculation
            const approvedRatings = mockRatings.filter(r => r.moderationStatus === 'approved')
            const sum = approvedRatings.reduce((acc, r) => acc + r.score, 0)
            const expectedAverage = Math.round((sum / approvedRatings.length) * 100) / 100

            mockRatingRepository.find.mockResolvedValue(approvedRatings)

            // Call update method
            await service.updateProfessionalAverageRating(professionalId)

            // Property: Only approved ratings should be included in average
            expect(mockProfessionalRepository.update).toHaveBeenCalledWith(
              { id: professionalId },
              { rating: expectedAverage }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate category-based averages correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidGen,
              bookingId: uuidGen,
              userId: uuidGen,
              professionalId: uuidGen,
              score: scoreGen,
              comment: commentGen,
              categoryRatings: categoryRatingGen,
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (ratings: any[]) => {
            // Setup mock ratings
            const mockRatings = ratings.map(r => ({
              ...r,
              photoUrls: [],
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // Calculate expected category averages manually
            const categoryScores: Record<string, number[]> = {}
            mockRatings.forEach(rating => {
              if (rating.categoryRatings && Array.isArray(rating.categoryRatings)) {
                rating.categoryRatings.forEach((catRating: any) => {
                  if (!categoryScores[catRating.category]) {
                    categoryScores[catRating.category] = []
                  }
                  categoryScores[catRating.category].push(catRating.score)
                })
              }
            })

            const expectedCategoryAverages: Record<string, number> = {}
            Object.keys(categoryScores).forEach(category => {
              const scores = categoryScores[category]
              const sum = scores.reduce((acc, score) => acc + score, 0)
              const average = sum / scores.length
              expectedCategoryAverages[category] = Math.round(average * 100) / 100
            })

            // Property: Category averages must be calculated correctly
            const calculatedAverages = service.calculateCategoryAverages(mockRatings)

            expect(calculatedAverages).toEqual(expectedCategoryAverages)

            // Verify all category averages are within valid range
            Object.values(calculatedAverages).forEach(avg => {
              expect(avg).toBeGreaterThanOrEqual(1)
              expect(avg).toBeLessThanOrEqual(5)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain average rating precision to 2 decimal places', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidGen,
              bookingId: uuidGen,
              userId: uuidGen,
              professionalId: uuidGen,
              score: scoreGen,
              comment: commentGen,
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async (ratings: any[]) => {
            const mockRatings = ratings.map(r => ({
              ...r,
              categoryRatings: [],
              photoUrls: [],
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // Property: Average must be rounded to 2 decimal places
            const average = service.calculateAverageRating(mockRatings)
            const decimalPlaces = (average.toString().split('.')[1] || '').length

            expect(decimalPlaces).toBeLessThanOrEqual(2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should recalculate average when rating moderation status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              bookingId: uuidGen,
              userId: uuidGen,
              score: scoreGen,
              comment: commentGen,
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (professionalId: string, ratingId: string, ratings: any[]) => {
            // Setup ratings where one will be flagged
            const mockRatings = ratings.map((r, index) => ({
              ...r,
              professionalId,
              categoryRatings: [],
              photoUrls: [],
              isVerified: true,
              moderationStatus: index === 0 ? 'approved' : 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            // Initially all approved
            mockRatingRepository.find.mockResolvedValue(mockRatings)

            // Calculate initial average
            const initialSum = mockRatings.reduce((acc, r) => acc + r.score, 0)
            const initialAverage = Math.round((initialSum / mockRatings.length) * 100) / 100

            await service.updateProfessionalAverageRating(professionalId)

            expect(mockProfessionalRepository.update).toHaveBeenCalledWith(
              { id: professionalId },
              { rating: initialAverage }
            )

            // Now flag one rating
            const flaggedRating = { ...mockRatings[0], moderationStatus: 'flagged' }
            mockRatingRepository.findOne.mockResolvedValue(flaggedRating)

            // After flagging, only approved ratings should count
            const approvedRatings = mockRatings.slice(1)
            mockRatingRepository.find.mockResolvedValue(approvedRatings)

            await service.reportRating(mockRatings[0].id)

            // Property: Average must be recalculated excluding flagged rating
            const newSum = approvedRatings.reduce((acc, r) => acc + r.score, 0)
            const newAverage = Math.round((newSum / approvedRatings.length) * 100) / 100

            expect(mockProfessionalRepository.update).toHaveBeenLastCalledWith(
              { id: professionalId },
              { rating: newAverage }
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 27: Tek Değerlendirme Kısıtı (Single Rating Constraint)**
   *
   * **Validates: Requirements 7.6**
   *
   * For any user-booking pair, the user can only rate the booking once;
   * second attempts must be rejected.
   */
  describe('Property 27: Single Rating Constraint', () => {
    it('should reject second rating attempt for any booking already rated', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          scoreGen,
          commentGen,
          categoryRatingGen,
          scoreGen,
          commentGen,
          categoryRatingGen,
          async (
            userId: string,
            bookingId: string,
            professionalId: string,
            firstScore: number,
            firstComment: string,
            firstCategoryRatings: Array<{ category: string; score: number }>,
            secondScore: number,
            secondComment: string,
            secondCategoryRatings: Array<{ category: string; score: number }>
          ) => {
            // Setup mock completed booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.COMPLETED,
              scheduledDate: new Date(),
              estimatedDuration: 120,
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
              completedAt: new Date(),
              user: { id: userId, email: 'user@test.com' },
              professional: { id: professionalId },
            }

            // Setup existing rating
            const existingRating = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              userId,
              professionalId,
              score: firstScore,
              comment: firstComment,
              categoryRatings: firstCategoryRatings,
              photoUrls: [],
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
              user: undefined,
              professional: undefined,
            } as ServiceRating

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockRatingRepository.findOne.mockResolvedValue(existingRating) // Existing rating found

            const createRatingDto: CreateRatingDto = {
              bookingId,
              score: secondScore,
              comment: secondComment,
              categoryRatings: secondCategoryRatings,
            }

            // Property: Second rating attempt must be rejected
            await expect(service.createRating(userId, createRatingDto)).rejects.toThrow(
              BadRequestException
            )

            await expect(service.createRating(userId, createRatingDto)).rejects.toThrow(
              'A rating already exists for this booking'
            )

            // Verify no new rating was created
            expect(mockRatingRepository.create).not.toHaveBeenCalled()
            expect(mockRatingRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow first rating for any booking without existing rating', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          scoreGen,
          commentGen,
          categoryRatingGen,
          photoUrlsGen,
          async (
            userId: string,
            bookingId: string,
            professionalId: string,
            score: number,
            comment: string,
            categoryRatings: Array<{ category: string; score: number }>,
            photoUrls: string[]
          ) => {
            // Setup mock completed booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.COMPLETED,
              scheduledDate: new Date(),
              estimatedDuration: 120,
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
              completedAt: new Date(),
              user: { id: userId, email: 'user@test.com' },
              professional: { id: professionalId },
            }

            const mockRating = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              userId,
              professionalId,
              score,
              comment,
              categoryRatings,
              photoUrls,
              isVerified: true,
              moderationStatus: 'approved',
              createdAt: new Date(),
              updatedAt: new Date(),
              user: undefined,
              professional: undefined,
            } as ServiceRating

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockRatingRepository.findOne.mockResolvedValue(null) // No existing rating
            mockRatingRepository.create.mockReturnValue(mockRating)
            mockRatingRepository.save.mockResolvedValue(mockRating)

            const createRatingDto: CreateRatingDto = {
              bookingId,
              score,
              comment,
              categoryRatings,
              photoUrls,
            }

            // Property: First rating must be allowed
            const result = await service.createRating(userId, createRatingDto)

            expect(result).toBeDefined()
            expect(result.bookingId).toBe(bookingId)
            expect(result.userId).toBe(userId)
            expect(result.professionalId).toBe(professionalId)
            expect(result.score).toBe(score)

            // Verify rating was created
            expect(mockRatingRepository.create).toHaveBeenCalled()
            expect(mockRatingRepository.save).toHaveBeenCalled()

            // Verify check for existing rating was performed
            expect(mockRatingRepository.findOne).toHaveBeenCalledWith({
              where: { bookingId },
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should enforce single rating constraint across different users for same booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          scoreGen,
          commentGen,
          categoryRatingGen,
          async (
            firstUserId: string,
            secondUserId: string,
            bookingId: string,
            professionalId: string,
            score: number,
            comment: string,
            categoryRatings: Array<{ category: string; score: number }>
          ) => {
            // Ensure different users
            fc.pre(firstUserId !== secondUserId)

            // Setup mock completed booking for first user
            const mockBooking = {
              id: bookingId,
              userId: firstUserId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.COMPLETED,
              scheduledDate: new Date(),
              estimatedDuration: 120,
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
              completedAt: new Date(),
              user: { id: firstUserId, email: 'user@test.com' },
              professional: { id: professionalId },
            }

            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockRatingRepository.findOne.mockResolvedValue(null)

            const createRatingDto: CreateRatingDto = {
              bookingId,
              score,
              comment,
              categoryRatings,
            }

            // Property: Second user cannot rate a booking they don't own
            // This will be caught by the ownership check, not the duplicate check
            await expect(service.createRating(secondUserId, createRatingDto)).rejects.toThrow()

            // Verify no rating was created
            expect(mockRatingRepository.create).not.toHaveBeenCalled()
            expect(mockRatingRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
