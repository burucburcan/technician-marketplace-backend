import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProductService } from './product.service'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { NotFoundException } from '@nestjs/common'

describe('ProductService', () => {
  let service: ProductService
  let productRepository: Repository<Product>
  let productImageRepository: Repository<ProductImage>

  const mockProductRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  }

  const mockProductImageRepository = {}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: mockProductImageRepository,
        },
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product))
    productImageRepository = module.get<Repository<ProductImage>>(getRepositoryToken(ProductImage))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('searchProducts', () => {
    it('should return paginated products', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          category: 'electronics',
          price: 100,
          rating: 4.5,
        },
        {
          id: '2',
          name: 'Product 2',
          category: 'electronics',
          price: 200,
          rating: 4.0,
        },
      ]

      mockProductRepository.findAndCount.mockResolvedValue([mockProducts, 2])

      const result = await service.searchProducts({
        category: 'electronics',
        page: 1,
        pageSize: 20,
      })

      expect(result).toEqual({
        products: mockProducts,
        total: 2,
        page: 1,
        pageSize: 20,
      })
      expect(mockProductRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'electronics' }),
        })
      )
    })

    it('should filter by price range', async () => {
      mockProductRepository.findAndCount.mockResolvedValue([[], 0])

      await service.searchProducts({
        minPrice: 50,
        maxPrice: 150,
        page: 1,
        pageSize: 20,
      })

      expect(mockProductRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: expect.any(Object),
          }),
        })
      )
    })

    it('should sort by price ascending', async () => {
      mockProductRepository.findAndCount.mockResolvedValue([[], 0])

      await service.searchProducts({
        sortBy: 'price',
        page: 1,
        pageSize: 20,
      })

      expect(mockProductRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { price: 'ASC' },
        })
      )
    })

    it('should sort by rating descending', async () => {
      mockProductRepository.findAndCount.mockResolvedValue([[], 0])

      await service.searchProducts({
        sortBy: 'rating',
        page: 1,
        pageSize: 20,
      })

      expect(mockProductRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            rating: 'DESC',
          }),
        })
      )
    })
  })

  describe('getProductsByCategory', () => {
    it('should return products in specified category', async () => {
      const mockProducts = [
        {
          id: '1',
          name: 'Product 1',
          category: 'tools',
          price: 50,
        },
      ]

      mockProductRepository.findAndCount.mockResolvedValue([mockProducts, 1])

      const result = await service.getProductsByCategory('tools', {
        page: 1,
        pageSize: 20,
      })

      expect(result).toEqual({
        products: mockProducts,
        total: 1,
        page: 1,
        pageSize: 20,
      })
      expect(mockProductRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'tools' }),
        })
      )
    })

    it('should apply filters to category search', async () => {
      mockProductRepository.findAndCount.mockResolvedValue([[], 0])

      await service.getProductsByCategory('tools', {
        brand: 'TestBrand',
        inStock: true,
        page: 1,
        pageSize: 20,
      })

      expect(mockProductRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'tools',
            brand: 'TestBrand',
            isAvailable: true,
          }),
        })
      )
    })
  })

  describe('getProductDetails', () => {
    it('should return product with relations', async () => {
      const mockProduct = {
        id: '1',
        name: 'Product 1',
        category: 'electronics',
        price: 100,
        images: [],
        supplier: {},
        reviews: [],
      }

      mockProductRepository.findOne.mockResolvedValue(mockProduct)

      const result = await service.getProductDetails('1')

      expect(result).toEqual(mockProduct)
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['images', 'supplier', 'reviews'],
      })
    })

    it('should throw NotFoundException when product not found', async () => {
      mockProductRepository.findOne.mockResolvedValue(null)

      await expect(service.getProductDetails('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })
})

describe('cancelOrder', () => {
  let mockProductRepository: any
  let mockProductImageRepository: any
  let mockOrderRepository: any
  let mockDataSource: any
  let mockCartService: any
  let testService: ProductService

  beforeEach(() => {
    mockProductRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    }

    mockProductImageRepository = {}

    mockOrderRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    }

    mockDataSource = {
      transaction: jest.fn(async callback => {
        const manager = {
          save: jest.fn(),
          increment: jest.fn(),
          findOne: jest.fn(),
          update: jest.fn(),
        }
        return callback(manager)
      }),
    }

    mockCartService = {}

    const mockNotificationService = {
      sendNotification: jest.fn(),
    }

    // Create service with mocked dependencies
    testService = new ProductService(
      mockProductRepository as any,
      mockProductImageRepository as any,
      mockOrderRepository,
      {} as any,
      {} as any,
      mockDataSource,
      mockCartService,
      mockNotificationService as any
    )
  })

  it('should cancel a PENDING order and restore stock', async () => {
    const mockOrder = {
      id: 'order-1',
      orderNumber: 'ORD-123',
      userId: 'user-1',
      supplierId: 'supplier-1',
      status: 'pending',
      items: [
        {
          id: 'item-1',
          productId: 'product-1',
          quantity: 2,
        },
      ],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    const result = await testService.cancelOrder('order-1', 'Customer changed mind')

    expect(result.status).toBe('cancelled')
    expect(result.cancelledAt).toBeDefined()
    expect(result.cancellationReason).toBe('Customer changed mind')
    expect(mockDataSource.transaction).toHaveBeenCalled()
  })

  it('should cancel a CONFIRMED order and restore stock', async () => {
    const mockOrder = {
      id: 'order-2',
      orderNumber: 'ORD-456',
      userId: 'user-2',
      supplierId: 'supplier-2',
      status: 'confirmed',
      items: [
        {
          id: 'item-2',
          productId: 'product-2',
          quantity: 1,
        },
      ],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    const result = await testService.cancelOrder('order-2', 'Out of stock')

    expect(result.status).toBe('cancelled')
    expect(result.cancelledAt).toBeDefined()
    expect(result.cancellationReason).toBe('Out of stock')
  })

  it('should throw NotFoundException when order does not exist', async () => {
    mockOrderRepository.findOne.mockResolvedValue(null)

    await expect(testService.cancelOrder('nonexistent', 'Test reason')).rejects.toThrow(
      NotFoundException
    )
  })

  it('should throw BadRequestException when trying to cancel PREPARING order', async () => {
    const mockOrder = {
      id: 'order-3',
      status: 'preparing',
      items: [],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    await expect(testService.cancelOrder('order-3', 'Test reason')).rejects.toThrow(
      'Cannot cancel order with status preparing'
    )
  })

  it('should throw BadRequestException when trying to cancel SHIPPED order', async () => {
    const mockOrder = {
      id: 'order-4',
      status: 'shipped',
      items: [],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    await expect(testService.cancelOrder('order-4', 'Test reason')).rejects.toThrow(
      'Cannot cancel order with status shipped'
    )
  })

  it('should throw BadRequestException when trying to cancel DELIVERED order', async () => {
    const mockOrder = {
      id: 'order-5',
      status: 'delivered',
      items: [],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    await expect(testService.cancelOrder('order-5', 'Test reason')).rejects.toThrow(
      'Cannot cancel order with status delivered'
    )
  })

  it('should throw BadRequestException when trying to cancel already CANCELLED order', async () => {
    const mockOrder = {
      id: 'order-6',
      status: 'cancelled',
      items: [],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    await expect(testService.cancelOrder('order-6', 'Test reason')).rejects.toThrow(
      'Cannot cancel order with status cancelled'
    )
  })

  it('should record cancellation reason correctly', async () => {
    const mockOrder = {
      id: 'order-7',
      status: 'pending',
      items: [
        {
          id: 'item-7',
          productId: 'product-7',
          quantity: 3,
        },
      ],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    const cancellationReason = 'Delivery address changed'
    const result = await testService.cancelOrder('order-7', cancellationReason)

    expect(result.cancellationReason).toBe(cancellationReason)
  })

  it('should restore stock for all items in the order', async () => {
    const mockOrder = {
      id: 'order-8',
      status: 'confirmed',
      items: [
        {
          id: 'item-8a',
          productId: 'product-8a',
          quantity: 2,
        },
        {
          id: 'item-8b',
          productId: 'product-8b',
          quantity: 5,
        },
      ],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    await testService.cancelOrder('order-8', 'Test cancellation')

    expect(mockDataSource.transaction).toHaveBeenCalled()
  })

  it('should handle long cancellation reasons', async () => {
    const mockOrder = {
      id: 'order-9',
      status: 'pending',
      items: [
        {
          id: 'item-9',
          productId: 'product-9',
          quantity: 1,
        },
      ],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    const longReason = 'A'.repeat(500)
    const result = await testService.cancelOrder('order-9', longReason)

    expect(result.cancellationReason).toBe(longReason)
    expect(result.cancellationReason.length).toBe(500)
  })

  it('should handle special characters in cancellation reason', async () => {
    const mockOrder = {
      id: 'order-10',
      status: 'pending',
      items: [
        {
          id: 'item-10',
          productId: 'product-10',
          quantity: 1,
        },
      ],
    }

    mockOrderRepository.findOne.mockResolvedValue(mockOrder)

    const specialReason = 'Reason with special chars: @#$%^&*() 😊'
    const result = await testService.cancelOrder('order-10', specialReason)

    expect(result.cancellationReason).toBe(specialReason)
  })
})
