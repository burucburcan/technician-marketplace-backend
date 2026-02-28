import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ProductReview } from '../../entities/product-review.entity'
import { SupplierReview } from '../../entities/supplier-review.entity'
import { ReviewReply } from '../../entities/review-reply.entity'
import { Order } from '../../entities/order.entity'
import { Product } from '../../entities/product.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { User } from '../../entities/user.entity'
import { OrderStatus } from '../../common/enums'
import { CreateProductReviewDto } from './dto/create-product-review.dto'
import { UpdateProductReviewDto } from './dto/update-product-review.dto'
import { CreateSupplierReviewDto } from './dto/create-supplier-review.dto'
import { ReplyToReviewDto } from './dto/reply-to-review.dto'
import { NotificationService } from '../notification/notification.service'
import { NotificationType, NotificationChannel } from '../../entities/notification.entity'

@Injectable()
export class ProductRatingService {
  private readonly logger = new Logger(ProductRatingService.name)

  constructor(
    @InjectRepository(ProductReview)
    private readonly productReviewRepository: Repository<ProductReview>,
    @InjectRepository(SupplierReview)
    private readonly supplierReviewRepository: Repository<SupplierReview>,
    @InjectRepository(ReviewReply)
    private readonly reviewReplyRepository: Repository<ReviewReply>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepository: Repository<SupplierProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService
  ) {}

  // Product Reviews
  async createProductReview(userId: string, dto: CreateProductReviewDto): Promise<ProductReview> {
    // Validate order exists and belongs to user
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
      relations: ['items'],
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`)
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only review your own orders')
    }

    // Validate order is delivered (Property 52)
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Only delivered orders can be reviewed. Current status: ' + order.status
      )
    }

    // Validate product is in the order
    const orderItem = order.items.find(item => item.productId === dto.productId)
    if (!orderItem) {
      throw new BadRequestException('Product not found in this order')
    }

    // Check if user already reviewed this product for this order (Property 53)
    const existingReview = await this.productReviewRepository.findOne({
      where: {
        orderId: dto.orderId,
        userId,
        productId: dto.productId,
      },
    })

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product for this order')
    }

    // Create review
    const review = this.productReviewRepository.create({
      orderId: dto.orderId,
      userId,
      productId: dto.productId,
      rating: dto.rating,
      comment: dto.comment,
      images: dto.images || [],
      isVerifiedPurchase: true,
    })

    const savedReview = await this.productReviewRepository.save(review)

    // Update product average rating
    await this.updateProductAverageRating(dto.productId)

    // Send notification to supplier (Requirement 19.9)
    try {
      const product = await this.productRepository.findOne({
        where: { id: dto.productId },
        relations: ['supplier', 'supplier.user'],
      })

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      })

      if (product?.supplier?.userId && user) {
        await this.notificationService.sendNotification({
          userId: product.supplier.userId,
          type: NotificationType.NEW_PRODUCT_REVIEW,
          data: {
            userName: user.profile?.firstName
              ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
              : user.email,
            productName: product.name,
            rating: dto.rating,
            comment: dto.comment || 'Sin comentario',
            reviewId: savedReview.id,
            productId: product.id,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })

        this.logger.log(
          `Notification sent to supplier ${product.supplier.userId} for new product review`
        )
      }
    } catch (error) {
      this.logger.error(`Failed to send product review notification: ${error.message}`)
      // Don't fail the review creation if notification fails
    }

    this.logger.log(`Product review created: ${savedReview.id} for product ${dto.productId}`)

    return savedReview
  }

  async getProductReviews(
    productId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    reviews: ProductReview[]
    total: number
    page: number
    pageSize: number
  }> {
    const skip = (page - 1) * pageSize

    const [reviews, total] = await this.productReviewRepository.findAndCount({
      where: { productId },
      relations: ['user', 'user.profile'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    })

    // Load replies for each review
    for (const review of reviews) {
      const reply = await this.reviewReplyRepository.findOne({
        where: { reviewId: review.id },
        relations: ['supplier'],
      })
      if (reply) {
        ;(review as any).supplierReply = reply
      }
    }

    return {
      reviews,
      total,
      page,
      pageSize,
    }
  }

  async updateProductReview(
    reviewId: string,
    userId: string,
    dto: UpdateProductReviewDto
  ): Promise<ProductReview> {
    const review = await this.productReviewRepository.findOne({
      where: { id: reviewId },
    })

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`)
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews')
    }

    // Update fields
    if (dto.rating !== undefined) {
      review.rating = dto.rating
    }
    if (dto.comment !== undefined) {
      review.comment = dto.comment
    }
    if (dto.images !== undefined) {
      review.images = dto.images
    }

    const updatedReview = await this.productReviewRepository.save(review)

    // Recalculate product average rating
    await this.updateProductAverageRating(review.productId)

    this.logger.log(`Product review updated: ${reviewId}`)

    return updatedReview
  }

  async deleteProductReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.productReviewRepository.findOne({
      where: { id: reviewId },
    })

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`)
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews')
    }

    const productId = review.productId

    // Delete review and any replies
    await this.dataSource.transaction(async manager => {
      // Delete replies first
      await manager.delete(ReviewReply, { reviewId })
      // Delete review
      await manager.delete(ProductReview, { id: reviewId })
    })

    // Recalculate product average rating
    await this.updateProductAverageRating(productId)

    this.logger.log(`Product review deleted: ${reviewId}`)
  }

  private async updateProductAverageRating(productId: string): Promise<void> {
    const reviews = await this.productReviewRepository.find({
      where: { productId },
    })

    const totalReviews = reviews.length
    const averageRating =
      totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0

    await this.productRepository.update(
      { id: productId },
      {
        rating: averageRating,
        totalReviews,
      }
    )

    this.logger.log(
      `Product ${productId} rating updated: ${averageRating.toFixed(2)} (${totalReviews} reviews)`
    )
  }

  // Supplier Reviews
  async createSupplierReview(
    userId: string,
    dto: CreateSupplierReviewDto
  ): Promise<SupplierReview> {
    // Validate order exists and belongs to user
    const order = await this.orderRepository.findOne({
      where: { id: dto.orderId },
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`)
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only review your own orders')
    }

    // Validate order is delivered
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Only delivered orders can be reviewed. Current status: ' + order.status
      )
    }

    // Validate supplier matches order
    if (order.supplierId !== dto.supplierId) {
      throw new BadRequestException('Supplier does not match the order')
    }

    // Check if user already reviewed this supplier for this order
    const existingReview = await this.supplierReviewRepository.findOne({
      where: {
        orderId: dto.orderId,
        userId,
        supplierId: dto.supplierId,
      },
    })

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this supplier for this order')
    }

    // Calculate overall rating
    const overallRating = Math.round(
      (dto.productQualityRating + dto.deliverySpeedRating + dto.communicationRating) / 3
    )

    // Create review
    const review = this.supplierReviewRepository.create({
      orderId: dto.orderId,
      userId,
      supplierId: dto.supplierId,
      productQualityRating: dto.productQualityRating,
      deliverySpeedRating: dto.deliverySpeedRating,
      communicationRating: dto.communicationRating,
      overallRating,
      comment: dto.comment,
    })

    const savedReview = await this.supplierReviewRepository.save(review)

    // Update supplier average rating
    await this.updateSupplierAverageRating(dto.supplierId)

    // Send notification to supplier (Requirement 19.9)
    try {
      const supplier = await this.supplierProfileRepository.findOne({
        where: { id: dto.supplierId },
      })

      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['profile'],
      })

      if (supplier?.userId && user) {
        await this.notificationService.sendNotification({
          userId: supplier.userId,
          type: NotificationType.NEW_SUPPLIER_REVIEW,
          data: {
            userName: user.profile?.firstName
              ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
              : user.email,
            overallRating: overallRating,
            productQualityRating: dto.productQualityRating,
            deliverySpeedRating: dto.deliverySpeedRating,
            communicationRating: dto.communicationRating,
            comment: dto.comment || 'Sin comentario',
            reviewId: savedReview.id,
            supplierId: supplier.id,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })

        this.logger.log(
          `Notification sent to supplier ${supplier.userId} for new supplier review`
        )
      }
    } catch (error) {
      this.logger.error(`Failed to send supplier review notification: ${error.message}`)
      // Don't fail the review creation if notification fails
    }

    this.logger.log(`Supplier review created: ${savedReview.id} for supplier ${dto.supplierId}`)

    return savedReview
  }

  async getSupplierReviews(
    supplierId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    reviews: SupplierReview[]
    total: number
    page: number
    pageSize: number
  }> {
    const skip = (page - 1) * pageSize

    const [reviews, total] = await this.supplierReviewRepository.findAndCount({
      where: { supplierId },
      relations: ['user', 'user.profile'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    })

    return {
      reviews,
      total,
      page,
      pageSize,
    }
  }

  private async updateSupplierAverageRating(supplierId: string): Promise<void> {
    const reviews = await this.supplierReviewRepository.find({
      where: { supplierId },
    })

    const totalReviews = reviews.length
    const averageRating =
      totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews : 0

    await this.supplierProfileRepository.update(
      { id: supplierId },
      {
        rating: averageRating,
      }
    )

    this.logger.log(
      `Supplier ${supplierId} rating updated: ${averageRating.toFixed(2)} (${totalReviews} reviews)`
    )
  }

  // Review Replies
  async replyToReview(
    reviewId: string,
    supplierId: string,
    dto: ReplyToReviewDto
  ): Promise<ReviewReply> {
    // Validate review exists
    const review = await this.productReviewRepository.findOne({
      where: { id: reviewId },
      relations: ['product'],
    })

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`)
    }

    // Validate supplier owns the product
    const product = await this.productRepository.findOne({
      where: { id: review.productId },
    })

    if (!product || product.supplierId !== supplierId) {
      throw new ForbiddenException('You can only reply to reviews of your own products')
    }

    // Check if reply already exists
    const existingReply = await this.reviewReplyRepository.findOne({
      where: { reviewId },
    })

    if (existingReply) {
      // Update existing reply
      existingReply.reply = dto.reply
      const updatedReply = await this.reviewReplyRepository.save(existingReply)

      // Send notification to user who wrote the review (Requirement 19.9)
      try {
        const product = await this.productRepository.findOne({
          where: { id: review.productId },
        })

        const supplier = await this.supplierProfileRepository.findOne({
          where: { id: supplierId },
          relations: ['user', 'user.profile'],
        })

        const reviewUser = await this.userRepository.findOne({
          where: { id: review.userId },
        })

        if (reviewUser && supplier && product) {
          const supplierName =
            supplier.user?.profile?.firstName
              ? `${supplier.user.profile.firstName} ${supplier.user.profile.lastName || ''}`.trim()
              : supplier.companyName || 'El proveedor'

          await this.notificationService.sendNotification({
            userId: reviewUser.id,
            type: NotificationType.SUPPLIER_REPLY,
            data: {
              userName: reviewUser.email,
              supplierName,
              productName: product.name,
              comment: review.comment || 'Tu reseña',
              reply: dto.reply,
              reviewId: review.id,
              replyId: updatedReply.id,
            },
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          })

          this.logger.log(`Notification sent to user ${reviewUser.id} for updated supplier reply`)
        }
      } catch (error) {
        this.logger.error(`Failed to send supplier reply notification: ${error.message}`)
        // Don't fail the reply update if notification fails
      }

      this.logger.log(`Review reply updated: ${updatedReply.id}`)
      return updatedReply
    }

    // Create new reply
    const reply = this.reviewReplyRepository.create({
      reviewId,
      supplierId,
      reply: dto.reply,
    })

    const savedReply = await this.reviewReplyRepository.save(reply)

    // Send notification to user who wrote the review (Requirement 19.9)
    try {
      const product = await this.productRepository.findOne({
        where: { id: review.productId },
      })

      const supplier = await this.supplierProfileRepository.findOne({
        where: { id: supplierId },
        relations: ['user', 'user.profile'],
      })

      const reviewUser = await this.userRepository.findOne({
        where: { id: review.userId },
      })

      if (reviewUser && supplier && product) {
        const supplierName =
          supplier.user?.profile?.firstName
            ? `${supplier.user.profile.firstName} ${supplier.user.profile.lastName || ''}`.trim()
            : supplier.companyName || 'El proveedor'

        await this.notificationService.sendNotification({
          userId: reviewUser.id,
          type: NotificationType.SUPPLIER_REPLY,
          data: {
            userName: reviewUser.email,
            supplierName,
            productName: product.name,
            comment: review.comment || 'Tu reseña',
            reply: dto.reply,
            reviewId: review.id,
            replyId: savedReply.id,
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        })

        this.logger.log(`Notification sent to user ${reviewUser.id} for supplier reply`)
      }
    } catch (error) {
      this.logger.error(`Failed to send supplier reply notification: ${error.message}`)
      // Don't fail the reply creation if notification fails
    }

    this.logger.log(`Review reply created: ${savedReply.id} for review ${reviewId}`)

    return savedReply
  }

  // Statistics
  async getProductRatingStats(productId: string): Promise<{
    productId: string
    averageRating: number
    totalReviews: number
    ratingDistribution: Record<number, number>
    verifiedPurchasePercentage: number
  }> {
    const reviews = await this.productReviewRepository.find({
      where: { productId },
    })

    const totalReviews = reviews.length
    const averageRating =
      totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0

    // Calculate rating distribution
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    reviews.forEach(review => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1
    })

    // Calculate verified purchase percentage
    const verifiedCount = reviews.filter(r => r.isVerifiedPurchase).length
    const verifiedPurchasePercentage = totalReviews > 0 ? (verifiedCount / totalReviews) * 100 : 0

    return {
      productId,
      averageRating,
      totalReviews,
      ratingDistribution,
      verifiedPurchasePercentage,
    }
  }

  async getSupplierRatingStats(supplierId: string): Promise<{
    supplierId: string
    averageRating: number
    totalReviews: number
    productQualityAverage: number
    deliverySpeedAverage: number
    communicationAverage: number
  }> {
    const reviews = await this.supplierReviewRepository.find({
      where: { supplierId },
    })

    const totalReviews = reviews.length

    if (totalReviews === 0) {
      return {
        supplierId,
        averageRating: 0,
        totalReviews: 0,
        productQualityAverage: 0,
        deliverySpeedAverage: 0,
        communicationAverage: 0,
      }
    }

    const averageRating = reviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews
    const productQualityAverage =
      reviews.reduce((sum, r) => sum + r.productQualityRating, 0) / totalReviews
    const deliverySpeedAverage =
      reviews.reduce((sum, r) => sum + r.deliverySpeedRating, 0) / totalReviews
    const communicationAverage =
      reviews.reduce((sum, r) => sum + r.communicationRating, 0) / totalReviews

    return {
      supplierId,
      averageRating,
      totalReviews,
      productQualityAverage,
      deliverySpeedAverage,
      communicationAverage,
    }
  }
}
