import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as fc from 'fast-check'
import { ProductRatingService } from './product-rating.service'
import { ProductReview } from '../../entities/product-review.entity'
import { SupplierReview } from '../../entities/supplier-review.entity'
import { ReviewReply } from '../../entities/review-reply.entity'
import { Order } from '../../entities/order.entity'
import { Product } from '../../entities/product.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { User } from '../../entities/user.entity'
import { OrderStatus } from '../../common/enums'
import { DataSource } from 'typeorm'
import { NotificationService } from '../notification/notification.service'

/**
 * Property-Based Tests for Supplier Review Average Rating Calculation
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the supplier review system, ensuring correctness at scale.
 */
describe('ProductRatingService Supplier Review Property Tests', () => {
  let service: ProductRatingService

  const mockProductReviewRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockSupplierReviewRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockReviewReplyRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockOrderRepository = {
    findOne: jest.fn(),
  }

  const mockProductRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  }

  const mockSupplierProfileRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  }

  const mockUserRepository = {
    findOne: jest.fn(),
  }

  const mockDataSource = {
    transaction: jest.fn(),
  }

  const mockNotificationService = {
    sendNotification: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRatingService,
        {
          provide: getRepositoryToken(ProductReview),
          useValue: mockProductReviewRepository,
        },
        {
          provide: getRepositoryToken(SupplierReview),
          useValue: mockSupplierReviewRepository,
        },
        {
          provide: getRepositoryToken(ReviewReply),
          useValue: mockReviewReplyRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(SupplierProfile),
          useValue: mockSupplierProfileRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile()

    service = module.get<ProductRatingService>(ProductRatingService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const categoryRatingGen = fc.integer({ min: 1, max: 5 })
  const commentGen = fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10)

  /**
   * **Property 54: Tedarikçi Ortalama Puan Hesaplama (Supplier Average Rating Calculation)**
   *
   * **Validates: Requirement 19.6**
   *
   * For any supplier, the average rating must be calculated correctly from all reviews.
   * The calculation includes:
   * - productQualityRating
   * - deliverySpeedRating
   * - communicationRating
   * - overallRating is the average of these three category ratings
   * - Supplier profile is updated with the correct average of all overallRatings
   *
   * This property ensures that supplier ratings accurately reflect customer feedback
   * across all review dimensions.
   */
  describe('Property 54: Supplier Average Rating Calculation', () => {
    it('should calculate supplier average rating correctly from all reviews', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              orderId: uuidGen,
              userId: uuidGen,
              productQualityRating: categoryRatingGen,
              deliverySpeedRating: categoryRatingGen,
              communicationRating: categoryRatingGen,
              comment: commentGen,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (supplierId, firstOrderId, reviewsData) => {
            jest.clearAllMocks()

            // Create reviews with calculated overallRating
            const reviews: SupplierReview[] = []
            let expectedAverageRating = 0

            for (let i = 0; i < reviewsData.length; i++) {
              const reviewData = reviewsData[i]
              
              // Calculate overallRating as average of three category ratings (rounded)
              const overallRating = Math.round(
                (reviewData.productQualityRating +
                  reviewData.deliverySpeedRating +
                  reviewData.communicationRating) /
                  3
              )

              const review: SupplierReview = {
                id: fc.sample(uuidGen, 1)[0],
                orderId: i === 0 ? firstOrderId : reviewData.orderId,
                userId: reviewData.userId,
                supplierId,
                productQualityRating: reviewData.productQualityRating,
                deliverySpeedRating: reviewData.deliverySpeedRating,
                communicationRating: reviewData.communicationRating,
                overallRating,
                comment: reviewData.comment,
                createdAt: new Date(),
                user: null as any,
                supplier: null as any,
              }

              reviews.push(review)
              expectedAverageRating += overallRating
            }

            // Calculate expected average
            expectedAverageRating = expectedAverageRating / reviews.length

            // Setup: First review creation
            const firstReview = reviewsData[0]
            const order = {
              id: firstOrderId,
              userId: firstReview.userId,
              supplierId,
              status: OrderStatus.DELIVERED,
            }

            mockOrderRepository.findOne.mockResolvedValue(order)
            mockSupplierReviewRepository.findOne.mockResolvedValue(null)

            const createdReview = reviews[0]
            mockSupplierReviewRepository.create.mockReturnValue(createdReview)
            mockSupplierReviewRepository.save.mockResolvedValue(createdReview)

            // Mock: All reviews for average calculation
            mockSupplierReviewRepository.find.mockResolvedValue(reviews)
            mockSupplierProfileRepository.update.mockResolvedValue({ affected: 1 })

            // Mock notification service
            mockSupplierProfileRepository.findOne.mockResolvedValue({
              id: supplierId,
              userId: fc.sample(uuidGen, 1)[0],
            })
            mockUserRepository.findOne.mockResolvedValue({
              id: firstReview.userId,
              email: 'user@example.com',
            })
            mockNotificationService.sendNotification.mockResolvedValue({})

            // Act: Create supplier review
            const result = await service.createSupplierReview(firstReview.userId, {
              orderId: firstOrderId,
              supplierId,
              productQualityRating: firstReview.productQualityRating,
              deliverySpeedRating: firstReview.deliverySpeedRating,
              communicationRating: firstReview.communicationRating,
              comment: firstReview.comment,
            })

            // Assert: Review was created with correct overallRating
            expect(result).toBeDefined()
            expect(result.overallRating).toBe(reviews[0].overallRating)

            // Property: overallRating must be average of three category ratings (rounded)
            const expectedOverallRating = Math.round(
              (firstReview.productQualityRating +
                firstReview.deliverySpeedRating +
                firstReview.communicationRating) /
                3
            )
            expect(result.overallRating).toBe(expectedOverallRating)

            // Property: Supplier profile must be updated with correct average
            expect(mockSupplierProfileRepository.update).toHaveBeenCalledWith(
              { id: supplierId },
              { rating: expectedAverageRating }
            )

            // Verify the average is within valid range [1, 5]
            expect(expectedAverageRating).toBeGreaterThanOrEqual(1)
            expect(expectedAverageRating).toBeLessThanOrEqual(5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update supplier average rating when new reviews are added', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          categoryRatingGen,
          categoryRatingGen,
          categoryRatingGen,
          categoryRatingGen,
          categoryRatingGen,
          categoryRatingGen,
          commentGen,
          commentGen,
          async (
            supplierId,
            userId1,
            userId2,
            quality1,
            delivery1,
            communication1,
            quality2,
            delivery2,
            communication2,
            comment1,
            comment2
          ) => {
            // Ensure different users
            if (userId1 === userId2) return

            jest.clearAllMocks()

            // First review
            const orderId1 = fc.sample(uuidGen, 1)[0]
            const overallRating1 = Math.round((quality1 + delivery1 + communication1) / 3)

            const review1: SupplierReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId: orderId1,
              userId: userId1,
              supplierId,
              productQualityRating: quality1,
              deliverySpeedRating: delivery1,
              communicationRating: communication1,
              overallRating: overallRating1,
              comment: comment1,
              createdAt: new Date(),
              user: null as any,
              supplier: null as any,
            }

            const order1 = {
              id: orderId1,
              userId: userId1,
              supplierId,
              status: OrderStatus.DELIVERED,
            }

            mockOrderRepository.findOne.mockResolvedValue(order1)
            mockSupplierReviewRepository.findOne.mockResolvedValue(null)
            mockSupplierReviewRepository.create.mockReturnValue(review1)
            mockSupplierReviewRepository.save.mockResolvedValue(review1)
            mockSupplierReviewRepository.find.mockResolvedValue([review1])
            mockSupplierProfileRepository.update.mockResolvedValue({ affected: 1 })
            mockSupplierProfileRepository.findOne.mockResolvedValue({
              id: supplierId,
              userId: fc.sample(uuidGen, 1)[0],
            })
            mockUserRepository.findOne.mockResolvedValue({
              id: userId1,
              email: 'user1@example.com',
            })
            mockNotificationService.sendNotification.mockResolvedValue({})

            // Create first review
            await service.createSupplierReview(userId1, {
              orderId: orderId1,
              supplierId,
              productQualityRating: quality1,
              deliverySpeedRating: delivery1,
              communicationRating: communication1,
              comment: comment1,
            })

            // Property: After first review, average should equal first review's overallRating
            expect(mockSupplierProfileRepository.update).toHaveBeenCalledWith(
              { id: supplierId },
              { rating: overallRating1 }
            )

            jest.clearAllMocks()

            // Second review
            const orderId2 = fc.sample(uuidGen, 1)[0]
            const overallRating2 = Math.round((quality2 + delivery2 + communication2) / 3)

            const review2: SupplierReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId: orderId2,
              userId: userId2,
              supplierId,
              productQualityRating: quality2,
              deliverySpeedRating: delivery2,
              communicationRating: communication2,
              overallRating: overallRating2,
              comment: comment2,
              createdAt: new Date(),
              user: null as any,
              supplier: null as any,
            }

            const order2 = {
              id: orderId2,
              userId: userId2,
              supplierId,
              status: OrderStatus.DELIVERED,
            }

            mockOrderRepository.findOne.mockResolvedValue(order2)
            mockSupplierReviewRepository.findOne.mockResolvedValue(null)
            mockSupplierReviewRepository.create.mockReturnValue(review2)
            mockSupplierReviewRepository.save.mockResolvedValue(review2)
            mockSupplierReviewRepository.find.mockResolvedValue([review1, review2])
            mockSupplierProfileRepository.update.mockResolvedValue({ affected: 1 })
            mockUserRepository.findOne.mockResolvedValue({
              id: userId2,
              email: 'user2@example.com',
            })

            // Create second review
            await service.createSupplierReview(userId2, {
              orderId: orderId2,
              supplierId,
              productQualityRating: quality2,
              deliverySpeedRating: delivery2,
              communicationRating: communication2,
              comment: comment2,
            })

            // Property: After second review, average should be mean of both overallRatings
            const expectedAverage = (overallRating1 + overallRating2) / 2
            expect(mockSupplierProfileRepository.update).toHaveBeenCalledWith(
              { id: supplierId },
              { rating: expectedAverage }
            )

            // Verify the average is within valid range
            expect(expectedAverage).toBeGreaterThanOrEqual(1)
            expect(expectedAverage).toBeLessThanOrEqual(5)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate correct average across all three rating categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          categoryRatingGen,
          categoryRatingGen,
          categoryRatingGen,
          commentGen,
          async (
            supplierId,
            userId,
            orderId,
            productQuality,
            deliverySpeed,
            communication,
            comment
          ) => {
            jest.clearAllMocks()

            // Calculate expected overallRating
            const expectedOverallRating = Math.round(
              (productQuality + deliverySpeed + communication) / 3
            )

            const order = {
              id: orderId,
              userId,
              supplierId,
              status: OrderStatus.DELIVERED,
            }

            mockOrderRepository.findOne.mockResolvedValue(order)
            mockSupplierReviewRepository.findOne.mockResolvedValue(null)

            const createdReview: SupplierReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId,
              supplierId,
              productQualityRating: productQuality,
              deliverySpeedRating: deliverySpeed,
              communicationRating: communication,
              overallRating: expectedOverallRating,
              comment,
              createdAt: new Date(),
              user: null as any,
              supplier: null as any,
            }

            mockSupplierReviewRepository.create.mockReturnValue(createdReview)
            mockSupplierReviewRepository.save.mockResolvedValue(createdReview)
            mockSupplierReviewRepository.find.mockResolvedValue([createdReview])
            mockSupplierProfileRepository.update.mockResolvedValue({ affected: 1 })
            mockSupplierProfileRepository.findOne.mockResolvedValue({
              id: supplierId,
              userId: fc.sample(uuidGen, 1)[0],
            })
            mockUserRepository.findOne.mockResolvedValue({
              id: userId,
              email: 'user@example.com',
            })
            mockNotificationService.sendNotification.mockResolvedValue({})

            // Act
            const result = await service.createSupplierReview(userId, {
              orderId,
              supplierId,
              productQualityRating: productQuality,
              deliverySpeedRating: deliverySpeed,
              communicationRating: communication,
              comment,
            })

            // Property: overallRating must equal rounded average of three categories
            expect(result.overallRating).toBe(expectedOverallRating)

            // Property: All three category ratings must be preserved
            expect(result.productQualityRating).toBe(productQuality)
            expect(result.deliverySpeedRating).toBe(deliverySpeed)
            expect(result.communicationRating).toBe(communication)

            // Property: Supplier profile updated with correct rating
            expect(mockSupplierProfileRepository.update).toHaveBeenCalledWith(
              { id: supplierId },
              { rating: expectedOverallRating }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle edge case where all category ratings are at extremes', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          fc.constantFrom(1, 5),
          fc.constantFrom(1, 5),
          fc.constantFrom(1, 5),
          commentGen,
          async (supplierId, userId, orderId, rating1, rating2, rating3, comment) => {
            jest.clearAllMocks()

            const expectedOverallRating = Math.round((rating1 + rating2 + rating3) / 3)

            const order = {
              id: orderId,
              userId,
              supplierId,
              status: OrderStatus.DELIVERED,
            }

            mockOrderRepository.findOne.mockResolvedValue(order)
            mockSupplierReviewRepository.findOne.mockResolvedValue(null)

            const createdReview: SupplierReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId,
              supplierId,
              productQualityRating: rating1,
              deliverySpeedRating: rating2,
              communicationRating: rating3,
              overallRating: expectedOverallRating,
              comment,
              createdAt: new Date(),
              user: null as any,
              supplier: null as any,
            }

            mockSupplierReviewRepository.create.mockReturnValue(createdReview)
            mockSupplierReviewRepository.save.mockResolvedValue(createdReview)
            mockSupplierReviewRepository.find.mockResolvedValue([createdReview])
            mockSupplierProfileRepository.update.mockResolvedValue({ affected: 1 })
            mockSupplierProfileRepository.findOne.mockResolvedValue({
              id: supplierId,
              userId: fc.sample(uuidGen, 1)[0],
            })
            mockUserRepository.findOne.mockResolvedValue({
              id: userId,
              email: 'user@example.com',
            })
            mockNotificationService.sendNotification.mockResolvedValue({})

            // Act
            const result = await service.createSupplierReview(userId, {
              orderId,
              supplierId,
              productQualityRating: rating1,
              deliverySpeedRating: rating2,
              communicationRating: rating3,
              comment,
            })

            // Property: overallRating must be within valid range [1, 5]
            expect(result.overallRating).toBeGreaterThanOrEqual(1)
            expect(result.overallRating).toBeLessThanOrEqual(5)

            // Property: overallRating must equal expected calculation
            expect(result.overallRating).toBe(expectedOverallRating)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
