import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository, DataSource } from 'typeorm'
import { ProductService } from './product.service'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { Order } from '../../entities/order.entity'
import { OrderItem } from '../../entities/order-item.entity'
import { Cart } from '../../entities/cart.entity'
import { CartService } from './cart.service'
import { OrderStatus } from '../../common/enums'
import { NotFoundException, BadRequestException } from '@nestjs/common'

describe('ProductService - Order Tracking', () => {
  let service: ProductService
  let orderRepository: Repository<Order>

  const mockOrder = {
    id: 'order-123',
    orderNumber: 'ORD-1234567890-123',
    userId: 'user-123',
    supplierId: 'supplier-123',
    status: OrderStatus.CONFIRMED,
    trackingNumber: null,
    carrier: null,
    shippedAt: null,
    deliveredAt: null,
    estimatedDelivery: new Date('2024-03-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOrderRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockDataSource = {
    transaction: jest.fn(),
  }

  const mockCartService = {
    getCart: jest.fn(),
    clearCart: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Cart),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('addTrackingInfo', () => {
    it('should add tracking info and update status to SHIPPED', async () => {
      const trackingNumber = '1Z999AA10123456784'
      const carrier = 'UPS'

      mockOrderRepository.findOne.mockResolvedValue(mockOrder)
      mockOrderRepository.save.mockResolvedValue({
        ...mockOrder,
        trackingNumber,
        carrier,
        status: OrderStatus.SHIPPED,
        shippedAt: expect.any(Date),
      })

      const result = await service.addTrackingInfo(mockOrder.id, trackingNumber, carrier)

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrder.id },
        relations: ['items', 'supplier', 'user'],
      })

      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingNumber,
          carrier,
          status: OrderStatus.SHIPPED,
          shippedAt: expect.any(Date),
        })
      )

      expect(result.trackingNumber).toBe(trackingNumber)
      expect(result.carrier).toBe(carrier)
      expect(result.status).toBe(OrderStatus.SHIPPED)
    })

    it('should throw NotFoundException if order does not exist', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null)

      await expect(service.addTrackingInfo('non-existent-id', '123456', 'FedEx')).rejects.toThrow(
        NotFoundException
      )

      expect(mockOrderRepository.save).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException if order status is not CONFIRMED or PREPARING', async () => {
      const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED }
      mockOrderRepository.findOne.mockResolvedValue(shippedOrder)

      await expect(service.addTrackingInfo(mockOrder.id, '123456', 'FedEx')).rejects.toThrow(
        BadRequestException
      )

      expect(mockOrderRepository.save).not.toHaveBeenCalled()
    })

    it('should allow adding tracking info when order is PREPARING', async () => {
      const preparingOrder = { ...mockOrder, status: OrderStatus.PREPARING }
      const trackingNumber = 'TRACK123'
      const carrier = 'DHL'

      mockOrderRepository.findOne.mockResolvedValue(preparingOrder)
      mockOrderRepository.save.mockResolvedValue({
        ...preparingOrder,
        trackingNumber,
        carrier,
        status: OrderStatus.SHIPPED,
        shippedAt: expect.any(Date),
      })

      const result = await service.addTrackingInfo(mockOrder.id, trackingNumber, carrier)

      expect(result.status).toBe(OrderStatus.SHIPPED)
      expect(result.trackingNumber).toBe(trackingNumber)
      expect(result.carrier).toBe(carrier)
    })
  })

  describe('getTrackingInfo', () => {
    it('should return tracking information for an order', async () => {
      const orderWithTracking = {
        ...mockOrder,
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        status: OrderStatus.SHIPPED,
        shippedAt: new Date('2024-02-25'),
      }

      mockOrderRepository.findOne.mockResolvedValue(orderWithTracking)

      const result = await service.getTrackingInfo(mockOrder.id)

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrder.id },
      })

      expect(result).toEqual({
        orderId: orderWithTracking.id,
        orderNumber: orderWithTracking.orderNumber,
        trackingNumber: orderWithTracking.trackingNumber,
        carrier: orderWithTracking.carrier,
        status: orderWithTracking.status,
        shippedAt: orderWithTracking.shippedAt,
        deliveredAt: orderWithTracking.deliveredAt,
        estimatedDelivery: orderWithTracking.estimatedDelivery,
      })
    })

    it('should return null tracking info for order without tracking', async () => {
      const orderWithoutTracking = {
        ...mockOrder,
        trackingNumber: null,
        carrier: null,
        shippedAt: null,
      }
      mockOrderRepository.findOne.mockResolvedValue(orderWithoutTracking)

      const result = await service.getTrackingInfo(mockOrder.id)

      expect(result.trackingNumber).toBeNull()
      expect(result.carrier).toBeNull()
      expect(result.shippedAt).toBeNull()
    })

    it('should throw NotFoundException if order does not exist', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null)

      await expect(service.getTrackingInfo('non-existent-id')).rejects.toThrow(NotFoundException)
    })

    it('should include delivery information when order is delivered', async () => {
      const deliveredOrder = {
        ...mockOrder,
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
        status: OrderStatus.DELIVERED,
        shippedAt: new Date('2024-02-25'),
        deliveredAt: new Date('2024-02-28'),
      }

      mockOrderRepository.findOne.mockResolvedValue(deliveredOrder)

      const result = await service.getTrackingInfo(mockOrder.id)

      expect(result.status).toBe(OrderStatus.DELIVERED)
      expect(result.deliveredAt).toEqual(deliveredOrder.deliveredAt)
    })
  })
})
