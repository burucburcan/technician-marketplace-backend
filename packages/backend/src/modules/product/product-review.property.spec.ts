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
import { BadRequestException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { NotificationService } from '../notification/notification.service'

/**
 * Property-Based Tests for Product Review Constraints
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the product review system, ensuring correctness at scale.
 */
describe('ProductRatingService Product Review Property Tests', () => {
  let service: ProductRatingService

  const mockProductReviewRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockSupplierReviewRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  const mockNotificationService = {
    sendNotification: jest.fn(),
  }

  const mockDataSource = {
    transaction: jest.fn(),
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
  const ratingGen = fc.integer({ min: 1, max: 5 })
  const commentGen = fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10)
  const orderStatusGen = fc.constantFrom(
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED
  )

  const productGen = fc.record({
    id: uuidGen,
    name: fc.string({ minLength: 3, maxLength: 100 }),
    price: fc.float({ min: 1, max: 10000, noNaN: true }),
  })

  /**
   * **Property 52: Ürün Değerlendirme Kısıtı (Product Review Constraint)**
   *
   * **Validates: Requirement 19.7**
   *
   * For any product review attempt, only orders with DELIVERED status can be reviewed.
   * Orders with other statuses (PENDING, CONFIRMED, PREPARING, SHIPPED, CANCELLED)
   * must be rejected with a BadRequestException.
   *
   * This property ensures that users can only review products they have actually received,
   * maintaining the integrity of the review system.
   */
  describe('Property 52: Product Review Constraint - Only Delivered Orders', () => {
    it('should allow reviews only for DELIVERED orders and reject all other statuses', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          productGen,
          orderStatusGen,
          ratingGen,
          commentGen,
          async (userId, orderId, product, orderStatus, rating, comment) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Setup: Create order with the given status
            const order = {
              id: orderId,
              userId,
              status: orderStatus,
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  productId: product.id,
                  productName: product.name,
                  quantity: 1,
                  price: product.price,
                },
              ],
            }

            mockOrderRepository.findOne.mockResolvedValue(order)

            // Mock: No existing review
            mockProductReviewRepository.findOne.mockResolvedValue(null)

            // Mock: Product exists
            mockProductRepository.findOne.mockResolvedValue(product)

            // Mock: Review creation
            const createdReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId,
              productId: product.id,
              rating,
              comment,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValue(createdReview)
            mockProductReviewRepository.save.mockResolvedValue(createdReview)

            // Mock: Average rating calculation
            mockProductReviewRepository.find.mockResolvedValue([createdReview])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            // Act & Assert
            if (orderStatus === OrderStatus.DELIVERED) {
              // Property: DELIVERED orders should allow review creation
              const result = await service.createProductReview(userId, {
                orderId,
                productId: product.id,
                rating,
                comment,
              })

              expect(result).toBeDefined()
              expect(result.orderId).toBe(orderId)
              expect(result.userId).toBe(userId)
              expect(result.productId).toBe(product.id)
              expect(result.rating).toBe(rating)
              expect(result.comment).toBe(comment)
              expect(result.isVerifiedPurchase).toBe(true)

              // Verify review was created
              expect(mockProductReviewRepository.create).toHaveBeenCalled()
              expect(mockProductReviewRepository.save).toHaveBeenCalled()
            } else {
              // Property: Non-DELIVERED orders should reject review creation
              await expect(
                service.createProductReview(userId, {
                  orderId,
                  productId: product.id,
                  rating,
                  comment,
                })
              ).rejects.toThrow(BadRequestException)

              await expect(
                service.createProductReview(userId, {
                  orderId,
                  productId: product.id,
                  rating,
                  comment,
                })
              ).rejects.toThrow(/Only delivered orders can be reviewed/)

              // Verify review was NOT created
              expect(mockProductReviewRepository.create).not.toHaveBeenCalled()
              expect(mockProductReviewRepository.save).not.toHaveBeenCalled()
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should consistently reject non-DELIVERED orders across multiple attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          productGen,
          ratingGen,
          commentGen,
          fc.integer({ min: 2, max: 5 }),
          async (userId, orderId, product, rating, comment, attemptCount) => {
            // Test each non-DELIVERED status
            const nonDeliveredStatuses = [
              OrderStatus.PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.PREPARING,
              OrderStatus.SHIPPED,
              OrderStatus.CANCELLED,
            ]

            for (const status of nonDeliveredStatuses) {
              jest.clearAllMocks()

              const order = {
                id: orderId,
                userId,
                status,
                items: [
                  {
                    id: fc.sample(uuidGen, 1)[0],
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    price: product.price,
                  },
                ],
              }

              mockOrderRepository.findOne.mockResolvedValue(order)
              mockProductReviewRepository.findOne.mockResolvedValue(null)

              // Property: Multiple attempts should all fail consistently
              for (let i = 0; i < attemptCount; i++) {
                await expect(
                  service.createProductReview(userId, {
                    orderId,
                    productId: product.id,
                    rating,
                    comment,
                  })
                ).rejects.toThrow(BadRequestException)

                // Verify error message mentions the current status
                try {
                  await service.createProductReview(userId, {
                    orderId,
                    productId: product.id,
                    rating,
                    comment,
                  })
                } catch (error) {
                  expect(error.message).toContain(status)
                }
              }

              // Property: No reviews should have been created
              expect(mockProductReviewRepository.save).not.toHaveBeenCalled()
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should allow review after order status changes to DELIVERED', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          productGen,
          ratingGen,
          commentGen,
          fc.constantFrom(
            OrderStatus.PENDING,
            OrderStatus.CONFIRMED,
            OrderStatus.PREPARING,
            OrderStatus.SHIPPED
          ),
          async (userId, orderId, product, rating, comment, initialStatus) => {
            jest.clearAllMocks()

            // Setup: Order initially has non-DELIVERED status
            const orderBeforeDelivery = {
              id: orderId,
              userId,
              status: initialStatus,
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  productId: product.id,
                  productName: product.name,
                  quantity: 1,
                  price: product.price,
                },
              ],
            }

            mockOrderRepository.findOne.mockResolvedValueOnce(orderBeforeDelivery)
            mockProductReviewRepository.findOne.mockResolvedValue(null)

            // Property: Review should be rejected before delivery
            await expect(
              service.createProductReview(userId, {
                orderId,
                productId: product.id,
                rating,
                comment,
              })
            ).rejects.toThrow(BadRequestException)

            jest.clearAllMocks()

            // Setup: Order status changes to DELIVERED
            const orderAfterDelivery = {
              ...orderBeforeDelivery,
              status: OrderStatus.DELIVERED,
            }

            mockOrderRepository.findOne.mockResolvedValue(orderAfterDelivery)
            mockProductReviewRepository.findOne.mockResolvedValue(null)

            const createdReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId,
              productId: product.id,
              rating,
              comment,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValue(createdReview)
            mockProductReviewRepository.save.mockResolvedValue(createdReview)
            mockProductReviewRepository.find.mockResolvedValue([createdReview])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            // Property: Review should be allowed after delivery
            const result = await service.createProductReview(userId, {
              orderId,
              productId: product.id,
              rating,
              comment,
            })

            expect(result).toBeDefined()
            expect(result.orderId).toBe(orderId)
            expect(mockProductReviewRepository.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 53: Tek Ürün Değerlendirme Kısıtı (Single Product Review Constraint)**
   *
   * **Validates: Requirement 19.8**
   *
   * For any user-order-product combination, a user can only review a product once per order.
   * Attempting to create a second review for the same product in the same order must be
   * rejected with a BadRequestException.
   *
   * This property ensures that users cannot spam reviews or manipulate ratings by
   * submitting multiple reviews for the same purchase.
   */
  describe('Property 53: Single Product Review Constraint - One Review Per Order', () => {
    it('should allow first review but reject second review for same product in same order', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          productGen,
          ratingGen,
          commentGen,
          ratingGen,
          commentGen,
          async (userId, orderId, product, rating1, comment1, rating2, comment2) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Setup: Order with DELIVERED status
            const order = {
              id: orderId,
              userId,
              status: OrderStatus.DELIVERED,
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  productId: product.id,
                  productName: product.name,
                  quantity: 1,
                  price: product.price,
                },
              ],
            }

            mockOrderRepository.findOne.mockResolvedValue(order)

            // First review attempt - should succeed
            mockProductReviewRepository.findOne.mockResolvedValueOnce(null)

            const firstReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId,
              productId: product.id,
              rating: rating1,
              comment: comment1,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValue(firstReview)
            mockProductReviewRepository.save.mockResolvedValue(firstReview)
            mockProductReviewRepository.find.mockResolvedValue([firstReview])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            // Property: First review should succeed
            const result1 = await service.createProductReview(userId, {
              orderId,
              productId: product.id,
              rating: rating1,
              comment: comment1,
            })

            expect(result1).toBeDefined()
            expect(result1.orderId).toBe(orderId)
            expect(result1.userId).toBe(userId)
            expect(result1.productId).toBe(product.id)
            expect(result1.rating).toBe(rating1)
            expect(result1.comment).toBe(comment1)

            // Verify first review was created
            expect(mockProductReviewRepository.create).toHaveBeenCalledTimes(1)
            expect(mockProductReviewRepository.save).toHaveBeenCalledTimes(1)

            jest.clearAllMocks()

            // Second review attempt - should fail
            mockOrderRepository.findOne.mockResolvedValue(order)
            mockProductReviewRepository.findOne.mockResolvedValue(firstReview)

            // Property: Second review should be rejected
            await expect(
              service.createProductReview(userId, {
                orderId,
                productId: product.id,
                rating: rating2,
                comment: comment2,
              })
            ).rejects.toThrow(BadRequestException)

            await expect(
              service.createProductReview(userId, {
                orderId,
                productId: product.id,
                rating: rating2,
                comment: comment2,
              })
            ).rejects.toThrow(/already reviewed this product/)

            // Verify second review was NOT created
            expect(mockProductReviewRepository.create).not.toHaveBeenCalled()
            expect(mockProductReviewRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject multiple review attempts consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          productGen,
          ratingGen,
          commentGen,
          fc.integer({ min: 2, max: 5 }),
          async (userId, orderId, product, rating, comment, attemptCount) => {
            jest.clearAllMocks()

            // Setup: Order with DELIVERED status
            const order = {
              id: orderId,
              userId,
              status: OrderStatus.DELIVERED,
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  productId: product.id,
                  productName: product.name,
                  quantity: 1,
                  price: product.price,
                },
              ],
            }

            mockOrderRepository.findOne.mockResolvedValue(order)

            // First review - should succeed
            mockProductReviewRepository.findOne.mockResolvedValueOnce(null)

            const existingReview = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId,
              productId: product.id,
              rating,
              comment,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValue(existingReview)
            mockProductReviewRepository.save.mockResolvedValue(existingReview)
            mockProductReviewRepository.find.mockResolvedValue([existingReview])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            await service.createProductReview(userId, {
              orderId,
              productId: product.id,
              rating,
              comment,
            })

            jest.clearAllMocks()

            // Setup for subsequent attempts
            mockOrderRepository.findOne.mockResolvedValue(order)
            mockProductReviewRepository.findOne.mockResolvedValue(existingReview)

            // Property: All subsequent attempts should fail consistently
            for (let i = 0; i < attemptCount; i++) {
              await expect(
                service.createProductReview(userId, {
                  orderId,
                  productId: product.id,
                  rating: rating + 1, // Different rating
                  comment: comment + ' updated', // Different comment
                })
              ).rejects.toThrow(BadRequestException)

              await expect(
                service.createProductReview(userId, {
                  orderId,
                  productId: product.id,
                  rating: rating + 1,
                  comment: comment + ' updated',
                })
              ).rejects.toThrow(/already reviewed/)
            }

            // Property: No additional reviews should have been created
            expect(mockProductReviewRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should allow separate reviews for same product in different orders', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          productGen,
          ratingGen,
          commentGen,
          ratingGen,
          commentGen,
          async (userId, orderId1, orderId2, product, rating1, comment1, rating2, comment2) => {
            // Ensure different order IDs
            if (orderId1 === orderId2) return

            jest.clearAllMocks()

            // Setup: First order with DELIVERED status
            const order1 = {
              id: orderId1,
              userId,
              status: OrderStatus.DELIVERED,
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  productId: product.id,
                  productName: product.name,
                  quantity: 1,
                  price: product.price,
                },
              ],
            }

            mockOrderRepository.findOne.mockResolvedValueOnce(order1)
            mockProductReviewRepository.findOne.mockResolvedValueOnce(null)

            const review1 = {
              id: fc.sample(uuidGen, 1)[0],
              orderId: orderId1,
              userId,
              productId: product.id,
              rating: rating1,
              comment: comment1,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValueOnce(review1)
            mockProductReviewRepository.save.mockResolvedValueOnce(review1)
            mockProductReviewRepository.find.mockResolvedValue([review1])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            // Property: First review for first order should succeed
            const result1 = await service.createProductReview(userId, {
              orderId: orderId1,
              productId: product.id,
              rating: rating1,
              comment: comment1,
            })

            expect(result1).toBeDefined()
            expect(result1.orderId).toBe(orderId1)

            jest.clearAllMocks()

            // Setup: Second order with DELIVERED status (same product)
            const order2 = {
              id: orderId2,
              userId,
              status: OrderStatus.DELIVERED,
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  productId: product.id,
                  productName: product.name,
                  quantity: 1,
                  price: product.price,
                },
              ],
            }

            mockOrderRepository.findOne.mockResolvedValue(order2)
            // Check for review in THIS order (should be null)
            mockProductReviewRepository.findOne.mockResolvedValue(null)

            const review2 = {
              id: fc.sample(uuidGen, 1)[0],
              orderId: orderId2,
              userId,
              productId: product.id,
              rating: rating2,
              comment: comment2,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValue(review2)
            mockProductReviewRepository.save.mockResolvedValue(review2)
            mockProductReviewRepository.find.mockResolvedValue([review1, review2])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            // Property: Second review for different order should also succeed
            const result2 = await service.createProductReview(userId, {
              orderId: orderId2,
              productId: product.id,
              rating: rating2,
              comment: comment2,
            })

            expect(result2).toBeDefined()
            expect(result2.orderId).toBe(orderId2)
            expect(mockProductReviewRepository.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow different users to review same product in same order', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          productGen,
          ratingGen,
          commentGen,
          ratingGen,
          commentGen,
          async (userId1, userId2, orderId, product, rating1, comment1, rating2, comment2) => {
            // Ensure different user IDs
            if (userId1 === userId2) return

            jest.clearAllMocks()

            // Setup: Order with DELIVERED status (shared order scenario)
            const order = {
              id: orderId,
              userId: userId1, // Order belongs to first user
              status: OrderStatus.DELIVERED,
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  productId: product.id,
                  productName: product.name,
                  quantity: 1,
                  price: product.price,
                },
              ],
            }

            // First user reviews
            mockOrderRepository.findOne.mockResolvedValueOnce(order)
            mockProductReviewRepository.findOne.mockResolvedValueOnce(null)

            const review1 = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId: userId1,
              productId: product.id,
              rating: rating1,
              comment: comment1,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValueOnce(review1)
            mockProductReviewRepository.save.mockResolvedValueOnce(review1)
            mockProductReviewRepository.find.mockResolvedValue([review1])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            // Property: First user's review should succeed
            const result1 = await service.createProductReview(userId1, {
              orderId,
              productId: product.id,
              rating: rating1,
              comment: comment1,
            })

            expect(result1).toBeDefined()
            expect(result1.userId).toBe(userId1)

            jest.clearAllMocks()

            // Second user attempts to review (different user, same order)
            const order2 = { ...order, userId: userId2 }
            mockOrderRepository.findOne.mockResolvedValue(order2)
            // Check for review by THIS user in this order (should be null)
            mockProductReviewRepository.findOne.mockResolvedValue(null)

            const review2 = {
              id: fc.sample(uuidGen, 1)[0],
              orderId,
              userId: userId2,
              productId: product.id,
              rating: rating2,
              comment: comment2,
              images: [],
              isVerifiedPurchase: true,
              helpfulCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockProductReviewRepository.create.mockReturnValue(review2)
            mockProductReviewRepository.save.mockResolvedValue(review2)
            mockProductReviewRepository.find.mockResolvedValue([review1, review2])
            mockProductRepository.update.mockResolvedValue({ affected: 1 })

            // Property: Second user's review should also succeed (different user)
            const result2 = await service.createProductReview(userId2, {
              orderId,
              productId: product.id,
              rating: rating2,
              comment: comment2,
            })

            expect(result2).toBeDefined()
            expect(result2.userId).toBe(userId2)
            expect(mockProductReviewRepository.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
