import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  Repository,
  FindOptionsWhere,
  ILike,
  Between,
  LessThanOrEqual,
  MoreThanOrEqual,
  DataSource,
} from 'typeorm'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { Order } from '../../entities/order.entity'
import { OrderItem } from '../../entities/order-item.entity'
import { Cart } from '../../entities/cart.entity'
import { ProductSearchQueryDto } from './dto/product-search-query.dto'
import { ProductFiltersDto } from './dto/product-filters.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { OrderStatus, PaymentStatus } from '../../common/enums'
import { CartService } from './cart.service'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../../entities/notification.entity'

export interface ProductSearchResult {
  products: Product[]
  total: number
  page: number
  pageSize: number
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name)

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly dataSource: DataSource,
    private readonly cartService: CartService,
    private readonly notificationService: NotificationService
  ) {}

  async searchProducts(dto: ProductSearchQueryDto): Promise<ProductSearchResult> {
    const { page = 1, pageSize = 20, sortBy = 'rating' } = dto
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: FindOptionsWhere<Product> = {}

    // Keyword search (searches in name and description)
    if (dto.keyword) {
      // Note: For production, consider using full-text search or ElasticSearch
      where.name = ILike(`%${dto.keyword}%`)
    }

    // Category filter
    if (dto.category) {
      where.category = dto.category
    }

    // Brand filter
    if (dto.brand) {
      where.brand = dto.brand
    }

    // Supplier filter
    if (dto.supplierId) {
      where.supplierId = dto.supplierId
    }

    // Stock filter
    if (dto.inStock) {
      where.isAvailable = true
    }

    // Price range filter
    if (dto.minPrice !== undefined && dto.maxPrice !== undefined) {
      where.price = Between(dto.minPrice, dto.maxPrice)
    } else if (dto.minPrice !== undefined) {
      where.price = MoreThanOrEqual(dto.minPrice)
    } else if (dto.maxPrice !== undefined) {
      where.price = LessThanOrEqual(dto.maxPrice)
    }

    // Build order clause
    const order: Record<string, 'ASC' | 'DESC'> = {}
    switch (sortBy) {
      case 'price':
        order.price = 'ASC'
        break
      case 'rating':
        order.rating = 'DESC'
        order.totalReviews = 'DESC'
        break
      case 'popularity':
        order.totalReviews = 'DESC'
        order.rating = 'DESC'
        break
      case 'newest':
        order.createdAt = 'DESC'
        break
      default:
        order.rating = 'DESC'
    }

    // Execute query
    const [products, total] = await this.productRepository.findAndCount({
      where,
      relations: ['images', 'supplier'],
      order,
      skip,
      take: pageSize,
    })

    this.logger.log(`Found ${total} products matching search criteria`)

    return {
      products,
      total,
      page,
      pageSize,
    }
  }

  async getProductsByCategory(
    category: string,
    filters: ProductFiltersDto
  ): Promise<ProductSearchResult> {
    const { page = 1, pageSize = 20, sortBy = 'rating' } = filters
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: FindOptionsWhere<Product> = {
      category,
    }

    // Brand filter
    if (filters.brand) {
      where.brand = filters.brand
    }

    // Supplier filter
    if (filters.supplierId) {
      where.supplierId = filters.supplierId
    }

    // Stock filter
    if (filters.inStock) {
      where.isAvailable = true
    }

    // Price range filter
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      where.price = Between(filters.minPrice, filters.maxPrice)
    } else if (filters.minPrice !== undefined) {
      where.price = MoreThanOrEqual(filters.minPrice)
    } else if (filters.maxPrice !== undefined) {
      where.price = LessThanOrEqual(filters.maxPrice)
    }

    // Build order clause
    const order: Record<string, 'ASC' | 'DESC'> = {}
    switch (sortBy) {
      case 'price':
        order.price = 'ASC'
        break
      case 'rating':
        order.rating = 'DESC'
        order.totalReviews = 'DESC'
        break
      case 'popularity':
        order.totalReviews = 'DESC'
        order.rating = 'DESC'
        break
      case 'newest':
        order.createdAt = 'DESC'
        break
      default:
        order.rating = 'DESC'
    }

    // Execute query
    const [products, total] = await this.productRepository.findAndCount({
      where,
      relations: ['images', 'supplier'],
      order,
      skip,
      take: pageSize,
    })

    this.logger.log(`Found ${total} products in category ${category}`)

    return {
      products,
      total,
      page,
      pageSize,
    }
  }

  async getProductDetails(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images', 'supplier', 'reviews'],
    })

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`)
    }

    return product
  }

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    // Get user's cart
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.supplier'],
    })

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty')
    }

    // Validate all items and check stock
    for (const item of cart.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      })

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`)
      }

      if (!product.isAvailable) {
        throw new BadRequestException(`Product ${product.name} is not available`)
      }

      if (product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
        )
      }
    }

    // Group items by supplier
    const itemsBySupplier = new Map<string, typeof cart.items>()
    for (const item of cart.items) {
      const supplierId = item.product.supplierId
      if (!itemsBySupplier.has(supplierId)) {
        itemsBySupplier.set(supplierId, [])
      }
      itemsBySupplier.get(supplierId)!.push(item)
    }

    // Create orders (one per supplier)
    const orders: Order[] = []

    await this.dataSource.transaction(async manager => {
      for (const [supplierId, items] of itemsBySupplier.entries()) {
        // Calculate totals
        const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0)
        const shippingCost = 0 // TODO: Calculate shipping cost based on location
        const tax = 0 // TODO: Calculate tax based on location and regulations
        const total = subtotal + shippingCost + tax

        // Generate unique order number
        const orderNumber = await this.generateOrderNumber()

        // Calculate estimated delivery (7 days from now)
        const estimatedDelivery = new Date()
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7)

        // Create order
        const order = manager.create(Order, {
          orderNumber,
          userId,
          supplierId,
          subtotal,
          shippingCost,
          tax,
          total,
          currency: 'MXN',
          status: OrderStatus.PENDING,
          shippingAddress: dto.shippingAddress,
          billingAddress: dto.billingAddress,
          paymentMethod: dto.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          estimatedDelivery,
        })

        const savedOrder = await manager.save(Order, order)

        // Create order items
        for (const cartItem of items) {
          const orderItem = manager.create(OrderItem, {
            orderId: savedOrder.id,
            productId: cartItem.productId,
            productName: cartItem.product.name,
            productImage: cartItem.product.images?.[0]?.imageUrl || '',
            quantity: cartItem.quantity,
            price: cartItem.price,
            subtotal: cartItem.subtotal,
          })

          await manager.save(OrderItem, orderItem)

          // Update product stock
          await manager.decrement(
            Product,
            { id: cartItem.productId },
            'stockQuantity',
            cartItem.quantity
          )

          // Check if product is out of stock
          const updatedProduct = await manager.findOne(Product, {
            where: { id: cartItem.productId },
          })
          if (updatedProduct && updatedProduct.stockQuantity === 0) {
            await manager.update(Product, { id: cartItem.productId }, { isAvailable: false })
          }
        }

        orders.push(savedOrder)
      }

      // Clear cart after successful order creation
      await this.cartService.clearCart(userId)
    })

    this.logger.log(`Created ${orders.length} order(s) for user ${userId}`)

    // Return the first order (or all orders if multiple suppliers)
    // For now, return the first one
    const order = await this.orderRepository.findOne({
      where: { id: orders[0].id },
      relations: ['items', 'supplier'],
    })

    if (!order) {
      throw new NotFoundException('Order not found after creation')
    }

    return order
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    return `ORD-${timestamp}-${random}`
  }

  async getOrder(orderId: string, requestingUserId?: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'supplier', 'user'],
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`)
    }

    // Authorization check: user must own the order OR be the supplier
    if (requestingUserId) {
      const isOwner = order.userId === requestingUserId
      const isSupplier = order.supplierId === requestingUserId

      if (!isOwner && !isSupplier) {
        throw new ForbiddenException('You do not have permission to view this order')
      }
    }

    return order
  }

  async getUserOrders(
    userId: string,
    requestingUserId: string,
    status?: OrderStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ orders: Order[]; total: number; page: number; pageSize: number }> {
    // Authorization check: user can only view their own orders
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You do not have permission to view these orders')
    }

    const skip = (page - 1) * pageSize

    const where: FindOptionsWhere<Order> = { userId }
    if (status) {
      where.status = status
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['items', 'supplier'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    })

    this.logger.log(`Found ${total} orders for user ${userId}`)

    return {
      orders,
      total,
      page,
      pageSize,
    }
  }

  async getSupplierOrders(
    supplierId: string,
    requestingSupplierId: string,
    status?: OrderStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ orders: Order[]; total: number; page: number; pageSize: number }> {
    // Authorization check: supplier can only view their own orders
    if (supplierId !== requestingSupplierId) {
      throw new ForbiddenException('You do not have permission to view these orders')
    }

    const skip = (page - 1) * pageSize

    const where: FindOptionsWhere<Order> = { supplierId }
    if (status) {
      where.status = status
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['items', 'user'],
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    })

    this.logger.log(`Found ${total} orders for supplier ${supplierId}`)

    return {
      orders,
      total,
      page,
      pageSize,
    }
  }

  /**
   * Validates if a status transition is allowed based on the state machine
   * Valid transitions:
   * - PENDING → CONFIRMED, CANCELLED
   * - CONFIRMED → PREPARING, CANCELLED
   * - PREPARING → SHIPPED, CANCELLED
   * - SHIPPED → DELIVERED
   * - DELIVERED → (terminal state)
   * - CANCELLED → (terminal state)
   */
  private isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [], // Terminal state
      [OrderStatus.CANCELLED]: [], // Terminal state
    }

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    requestingUserId?: string,
    requestingSupplierId?: string
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'supplier', 'user'],
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`)
    }

    // Authorization check: Only suppliers can update order status (except cancellation)
    // Cancellation is handled by the cancelOrder method
    if (dto.status !== OrderStatus.CANCELLED) {
      if (!requestingSupplierId || order.supplierId !== requestingSupplierId) {
        throw new ForbiddenException(
          'Only the supplier can update order status. Users can cancel orders using the cancel endpoint.'
        )
      }
    }

    // Validate status transition
    if (!this.isValidStatusTransition(order.status, dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${dto.status}`
      )
    }

    // Update status
    order.status = dto.status

    // Update timestamps based on status
    const now = new Date()
    switch (dto.status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = now
        break
      case OrderStatus.PREPARING:
        // No specific timestamp for preparing, but we could add one if needed
        break
      case OrderStatus.SHIPPED:
        order.shippedAt = now
        // Update tracking info if provided
        if (dto.trackingNumber) {
          order.trackingNumber = dto.trackingNumber
        }
        if (dto.carrier) {
          order.carrier = dto.carrier
        }
        break
      case OrderStatus.DELIVERED:
        order.deliveredAt = now
        break
      case OrderStatus.CANCELLED:
        order.cancelledAt = now
        break
    }

    await this.orderRepository.save(order)

    this.logger.log(`Order ${orderId} status updated to ${dto.status}`)

    // Send notification to user about status change
    try {
      await this.notificationService.sendNotification({
        userId: order.userId,
        type: this.getNotificationTypeForStatus(dto.status),
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: dto.status,
        },
      })
    } catch (error) {
      this.logger.error(`Failed to send order status notification: ${error.message}`)
      // Don't fail the status update if notification fails
    }

    return order
  }

  async addTrackingInfo(orderId: string, trackingNumber: string, carrier: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'supplier', 'user'],
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`)
    }

    // Validate that order is in a state where tracking can be added
    // Typically, tracking is added when order is being prepared or ready to ship
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PREPARING) {
      throw new BadRequestException(
        `Cannot add tracking info to order with status ${order.status}. Order must be confirmed or preparing.`
      )
    }

    // Update tracking information
    order.trackingNumber = trackingNumber
    order.carrier = carrier
    order.status = OrderStatus.SHIPPED
    order.shippedAt = new Date()

    await this.orderRepository.save(order)

    this.logger.log(`Tracking info added to order ${orderId}: ${carrier} - ${trackingNumber}`)

    return order
  }

  async getTrackingInfo(orderId: string): Promise<{
    orderId: string
    orderNumber: string
    trackingNumber: string | null
    carrier: string | null
    status: OrderStatus
    shippedAt: Date | null
    deliveredAt: Date | null
    estimatedDelivery: Date | null
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`)
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      status: order.status,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      estimatedDelivery: order.estimatedDelivery,
    }
  }

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'supplier', 'user'],
    })

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`)
    }

    // Validate that order can be cancelled (only PENDING and CONFIRMED orders)
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}. Only PENDING and CONFIRMED orders can be cancelled.`
      )
    }

    // Update order status to CANCELLED
    order.status = OrderStatus.CANCELLED
    order.cancelledAt = new Date()
    order.cancellationReason = reason

    // Restore product stock for cancelled orders
    await this.dataSource.transaction(async manager => {
      // Save the cancelled order
      await manager.save(Order, order)

      // Restore stock for each item
      for (const item of order.items) {
        await manager.increment(Product, { id: item.productId }, 'stockQuantity', item.quantity)

        // Check if product should be marked as available again
        const updatedProduct = await manager.findOne(Product, {
          where: { id: item.productId },
        })
        if (updatedProduct && updatedProduct.stockQuantity > 0 && !updatedProduct.isAvailable) {
          await manager.update(Product, { id: item.productId }, { isAvailable: true })
        }
      }
    })

    this.logger.log(`Order ${orderId} cancelled. Reason: ${reason}`)

    // TODO: Trigger payment refund (integration with payment service)
    // await this.paymentService.refundPayment(order.id, order.total, reason)

    // Send notification to supplier
    try {
      await this.notificationService.sendNotification({
        userId: order.supplierId,
        type: NotificationType.ORDER_CANCELLED,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          reason,
        },
      })
    } catch (error) {
      this.logger.error(`Failed to send order cancellation notification: ${error.message}`)
      // Don't fail the cancellation if notification fails
    }

    return order
  }

  /**
   * Maps order status to notification type
   */
  private getNotificationTypeForStatus(status: OrderStatus): NotificationType {
    switch (status) {
      case OrderStatus.CONFIRMED:
        return NotificationType.ORDER_CONFIRMED
      case OrderStatus.PREPARING:
        return NotificationType.ORDER_PREPARING
      case OrderStatus.SHIPPED:
        return NotificationType.ORDER_SHIPPED
      case OrderStatus.DELIVERED:
        return NotificationType.ORDER_DELIVERED
      case OrderStatus.CANCELLED:
        return NotificationType.ORDER_CANCELLED
      default:
        return NotificationType.ORDER_CONFIRMED
    }
  }
}
