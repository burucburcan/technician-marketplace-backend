import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ProductRatingService } from './product-rating.service'
import { NotificationService } from '../notification/notification.service'
import { ProductReview } from '../../entities/product-review.entity'
import { SupplierReview } from '../../entities/supplier-review.entity'
import { ReviewReply } from '../../entities/review-reply.entity'
import { Order } from '../../entities/order.entity'
import { Product } from '../../entities/product.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { User } from '../../entities/user.entity'
import { OrderStatus } from '../../common/enums'
import { NotificationType, NotificationChannel } from '../../entities/notification.entity'

describe('ProductRatingService - Notification Integration', () => {
  let service: ProductRatingService
  let notificationService: NotificationService
  let productReviewRepository: Repository<ProductReview>
  let supplierReviewRepository: Repository<SupplierReview>
  let reviewReplyRepository: Repository<ReviewReply>
  let orderRepository: Repository<Order>
  let productRepository: Repository<Product>
  let supplierProfileRepository: Repository<SupplierProfile>
  let userRepository: Repository<User>

  const mockDataSource = {
    transaction: jest.fn((callback) => callback({
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    })),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRatingService,
        {
          provide: getRepositoryToken(ProductReview),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupplierReview),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReviewReply),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupplierProfile),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile()

    service = module.get<ProductRatingService>(ProductRatingService)
    notificationService = module.get<NotificationService>(NotificationService)
    productReviewRepository = module.get<Repository<ProductReview>>(
      getRepositoryToken(ProductReview)
    )
    supplierReviewRepository = module.get<Repository<SupplierReview>>(
      getRepositoryToken(SupplierReview)
    )
    reviewReplyRepository = module.get<Repository<ReviewReply>>(getRepositoryToken(ReviewReply))
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order))
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product))
    supplierProfileRepository = module.get<Repository<SupplierProfile>>(
      getRepositoryToken(SupplierProfile)
    )
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createProductReview - Notification Integration', () => {
    it('should send NEW_PRODUCT_REVIEW notification to supplier when review is created', async () => {
      // Arrange
      const userId = 'user-123'
      const productId = 'product-123'
      const orderId = 'order-123'
      const supplierId = 'supplier-123'
      const supplierUserId = 'supplier-user-123'

      const dto = {
        orderId,
        productId,
        rating: 5,
        comment: 'Great product!',
      }

      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.DELIVERED,
        items: [{ productId }],
      }

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      }

      const mockProduct = {
        id: productId,
        name: 'Test Product',
        supplierId,
        supplier: {
          id: supplierId,
          userId: supplierUserId,
          user: {
            id: supplierUserId,
          },
        },
      }

      const mockReview = {
        id: 'review-123',
        orderId,
        userId,
        productId,
        rating: 5,
        comment: 'Great product!',
        isVerifiedPurchase: true,
      }

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder as any)
      jest.spyOn(productReviewRepository, 'findOne').mockResolvedValue(null)
      jest.spyOn(productReviewRepository, 'create').mockReturnValue(mockReview as any)
      jest.spyOn(productReviewRepository, 'save').mockResolvedValue(mockReview as any)
      jest.spyOn(productReviewRepository, 'find').mockResolvedValue([mockReview] as any)
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any)
      jest.spyOn(productRepository, 'update').mockResolvedValue({ affected: 1 } as any)
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

      // Act
      await service.createProductReview(userId, dto)

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId: supplierUserId,
        type: NotificationType.NEW_PRODUCT_REVIEW,
        data: {
          userName: 'John Doe',
          productName: 'Test Product',
          rating: 5,
          comment: 'Great product!',
          reviewId: 'review-123',
          productId,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    })

    it('should not fail review creation if notification fails', async () => {
      // Arrange
      const userId = 'user-123'
      const productId = 'product-123'
      const orderId = 'order-123'

      const dto = {
        orderId,
        productId,
        rating: 5,
        comment: 'Great product!',
      }

      const mockOrder = {
        id: orderId,
        userId,
        status: OrderStatus.DELIVERED,
        items: [{ productId }],
      }

      const mockReview = {
        id: 'review-123',
        orderId,
        userId,
        productId,
        rating: 5,
        comment: 'Great product!',
        isVerifiedPurchase: true,
      }

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder as any)
      jest.spyOn(productReviewRepository, 'findOne').mockResolvedValue(null)
      jest.spyOn(productReviewRepository, 'create').mockReturnValue(mockReview as any)
      jest.spyOn(productReviewRepository, 'save').mockResolvedValue(mockReview as any)
      jest.spyOn(productReviewRepository, 'find').mockResolvedValue([mockReview] as any)
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(null) // Simulate product not found
      jest.spyOn(productRepository, 'update').mockResolvedValue({ affected: 1 } as any)
      jest.spyOn(notificationService, 'sendNotification').mockRejectedValue(new Error('Notification failed'))

      // Act & Assert - should not throw
      const result = await service.createProductReview(userId, dto)
      expect(result).toEqual(mockReview)
    })
  })

  describe('createSupplierReview - Notification Integration', () => {
    it('should send NEW_SUPPLIER_REVIEW notification to supplier when review is created', async () => {
      // Arrange
      const userId = 'user-123'
      const supplierId = 'supplier-123'
      const supplierUserId = 'supplier-user-123'
      const orderId = 'order-123'

      const dto = {
        orderId,
        supplierId,
        productQualityRating: 5,
        deliverySpeedRating: 4,
        communicationRating: 5,
        comment: 'Excellent service!',
      }

      const mockOrder = {
        id: orderId,
        userId,
        supplierId,
        status: OrderStatus.DELIVERED,
      }

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      }

      const mockSupplier = {
        id: supplierId,
        userId: supplierUserId,
        companyName: 'Test Supplier',
      }

      const mockReview = {
        id: 'review-123',
        orderId,
        userId,
        supplierId,
        productQualityRating: 5,
        deliverySpeedRating: 4,
        communicationRating: 5,
        overallRating: 5,
        comment: 'Excellent service!',
      }

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder as any)
      jest.spyOn(supplierReviewRepository, 'findOne').mockResolvedValue(null)
      jest.spyOn(supplierReviewRepository, 'create').mockReturnValue(mockReview as any)
      jest.spyOn(supplierReviewRepository, 'save').mockResolvedValue(mockReview as any)
      jest.spyOn(supplierReviewRepository, 'find').mockResolvedValue([mockReview] as any)
      jest.spyOn(supplierProfileRepository, 'findOne').mockResolvedValue(mockSupplier as any)
      jest.spyOn(supplierProfileRepository, 'update').mockResolvedValue({ affected: 1 } as any)
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

      // Act
      await service.createSupplierReview(userId, dto)

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId: supplierUserId,
        type: NotificationType.NEW_SUPPLIER_REVIEW,
        data: {
          userName: 'Jane Smith',
          overallRating: 5,
          productQualityRating: 5,
          deliverySpeedRating: 4,
          communicationRating: 5,
          comment: 'Excellent service!',
          reviewId: 'review-123',
          supplierId,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    })
  })

  describe('replyToReview - Notification Integration', () => {
    it('should send SUPPLIER_REPLY notification to user when supplier replies', async () => {
      // Arrange
      const reviewId = 'review-123'
      const supplierId = 'supplier-123'
      const supplierUserId = 'supplier-user-123'
      const userId = 'user-123'
      const productId = 'product-123'

      const dto = {
        reply: 'Thank you for your feedback!',
      }

      const mockReview = {
        id: reviewId,
        userId,
        productId,
        rating: 5,
        comment: 'Great product!',
        product: {
          id: productId,
          name: 'Test Product',
        },
      }

      const mockProduct = {
        id: productId,
        name: 'Test Product',
        supplierId,
      }

      const mockSupplier = {
        id: supplierId,
        userId: supplierUserId,
        companyName: 'Test Supplier',
        user: {
          id: supplierUserId,
          profile: {
            firstName: 'Supplier',
            lastName: 'Name',
          },
        },
      }

      const mockUser = {
        id: userId,
        email: 'user@example.com',
      }

      const mockReply = {
        id: 'reply-123',
        reviewId,
        supplierId,
        reply: 'Thank you for your feedback!',
      }

      jest.spyOn(productReviewRepository, 'findOne').mockResolvedValue(mockReview as any)
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any)
      jest.spyOn(reviewReplyRepository, 'findOne').mockResolvedValue(null)
      jest.spyOn(reviewReplyRepository, 'create').mockReturnValue(mockReply as any)
      jest.spyOn(reviewReplyRepository, 'save').mockResolvedValue(mockReply as any)
      jest.spyOn(supplierProfileRepository, 'findOne').mockResolvedValue(mockSupplier as any)
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

      // Act
      await service.replyToReview(reviewId, supplierId, dto)

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId,
        type: NotificationType.SUPPLIER_REPLY,
        data: {
          userName: 'user@example.com',
          supplierName: 'Supplier Name',
          productName: 'Test Product',
          comment: 'Great product!',
          reply: 'Thank you for your feedback!',
          reviewId,
          replyId: 'reply-123',
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    })

    it('should send notification when updating existing reply', async () => {
      // Arrange
      const reviewId = 'review-123'
      const supplierId = 'supplier-123'
      const supplierUserId = 'supplier-user-123'
      const userId = 'user-123'
      const productId = 'product-123'

      const dto = {
        reply: 'Updated reply text',
      }

      const mockReview = {
        id: reviewId,
        userId,
        productId,
        rating: 5,
        comment: 'Great product!',
      }

      const mockProduct = {
        id: productId,
        name: 'Test Product',
        supplierId,
      }

      const mockSupplier = {
        id: supplierId,
        userId: supplierUserId,
        companyName: 'Test Supplier',
        user: {
          id: supplierUserId,
          profile: null,
        },
      }

      const mockUser = {
        id: userId,
        email: 'user@example.com',
      }

      const existingReply = {
        id: 'reply-123',
        reviewId,
        supplierId,
        reply: 'Old reply',
      }

      jest.spyOn(productReviewRepository, 'findOne').mockResolvedValue(mockReview as any)
      jest.spyOn(productRepository, 'findOne').mockResolvedValue(mockProduct as any)
      jest.spyOn(reviewReplyRepository, 'findOne').mockResolvedValue(existingReply as any)
      jest.spyOn(reviewReplyRepository, 'save').mockResolvedValue({ ...existingReply, reply: dto.reply } as any)
      jest.spyOn(supplierProfileRepository, 'findOne').mockResolvedValue(mockSupplier as any)
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

      // Act
      await service.replyToReview(reviewId, supplierId, dto)

      // Assert
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        userId,
        type: NotificationType.SUPPLIER_REPLY,
        data: {
          userName: 'user@example.com',
          supplierName: 'Test Supplier',
          productName: 'Test Product',
          comment: 'Great product!',
          reply: 'Updated reply text',
          reviewId,
          replyId: 'reply-123',
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    })
  })
})
