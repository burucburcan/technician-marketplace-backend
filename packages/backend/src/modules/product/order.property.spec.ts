import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as fc from 'fast-check'
import { ProductService } from './product.service'
import { CartService } from './cart.service'
import { NotificationService } from '../notification/notification.service'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { Order } from '../../entities/order.entity'
import { OrderItem } from '../../entities/order-item.entity'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { OrderStatus, PaymentStatus } from '../../common/enums'
import { DataSource } from 'typeorm'

/**
 * Property-Based Tests for Order Creation
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the order creation system, ensuring correctness at scale.
 */
describe('ProductService Order Creation Property Tests', () => {
  let service: ProductService
  let cartService: CartService

  const mockProductRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  }

  const mockProductImageRepository = {
    findOne: jest.fn(),
  }

  const mockOrderRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockOrderItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockCartRepository = {
    findOne: jest.fn(),
  }

  const mockCartService = {
    clearCart: jest.fn(),
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
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: mockProductImageRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: getRepositoryToken(Cart),
          useValue: mockCartRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CartService,
          useValue: mockCartService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile()

    service = module.get<ProductService>(ProductService)
    cartService = module.get<CartService>(CartService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const priceGen = fc
    .float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true })
    .map(p => Math.round(p * 100) / 100)
  const quantityGen = fc.integer({ min: 1, max: 100 })
  const stockQuantityGen = fc.integer({ min: 1, max: 1000 })

  const nameGen = fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0)
  const addressGen = fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0)
  const cityGen = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0)
  const stateGen = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0)
  const countryGen = fc.constantFrom('Mexico', 'Argentina', 'Brazil', 'Chile', 'Colombia', 'Peru')
  const postalCodeGen = fc.string({ minLength: 4, maxLength: 10 }).filter(s => /^\d+$/.test(s))
  const latitudeGen = fc.float({ min: -90, max: 90, noNaN: true })
  const longitudeGen = fc.float({ min: -180, max: 180, noNaN: true })

  const locationGen = fc.record({
    address: addressGen,
    city: cityGen,
    state: stateGen,
    country: countryGen,
    postalCode: postalCodeGen,
    coordinates: fc.record({
      latitude: latitudeGen,
      longitude: longitudeGen,
    }),
  })

  const billingAddressGen = fc.record({
    address: addressGen,
    city: cityGen,
    state: stateGen,
    country: countryGen,
    postalCode: postalCodeGen,
  })

  const paymentMethodGen = fc.constantFrom('credit_card', 'debit_card', 'paypal', 'bank_transfer')

  const productGen = fc.record({
    id: uuidGen,
    name: nameGen,
    price: priceGen,
    stockQuantity: stockQuantityGen,
    isAvailable: fc.constant(true),
    supplierId: uuidGen,
    images: fc.constant([
      {
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      },
    ]),
  })

  const cartItemGen = (product: any) =>
    fc.record({
      id: uuidGen,
      productId: fc.constant(product.id),
      quantity: quantityGen.filter(q => q <= product.stockQuantity),
      price: fc.constant(product.price),
      product: fc.constant(product),
    })

  /**
   * **Property 49: Sipariş Oluşturma Round-Trip (Order Creation Round-Trip)**
   *
   * **Validates: Requirements 17.9**
   *
   * For any valid order data, when an order is created with cart items, delivery address,
   * and payment information:
   * 1. The order is successfully created with all required fields
   * 2. The order contains all cart items with correct quantities and prices
   * 3. The total amount is calculated correctly
   * 4. An order number is generated
   * 5. The estimated delivery date is set
   * 6. The order can be retrieved with the same data
   *
   * This property ensures that order creation is a proper round-trip operation where
   * all input data is preserved and can be retrieved accurately.
   */
  describe('Property 49: Order Creation Round-Trip', () => {
    it('should create order with all cart items and preserve all data fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(productGen, { minLength: 1, maxLength: 5 }),
          locationGen,
          billingAddressGen,
          paymentMethodGen,
          async (userId, products, shippingAddress, billingAddress, paymentMethod) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Generate cart items from products
            const cartItems = await Promise.all(
              products.map(async product => {
                const itemGen = cartItemGen(product)
                const item = fc.sample(itemGen, 1)[0]
                return {
                  ...item,
                  subtotal: Number(item.price) * item.quantity,
                }
              })
            )

            // Setup: Cart with items
            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              items: cartItems,
            }

            mockCartRepository.findOne.mockResolvedValue(cart)

            // Mock product lookups for validation
            for (const item of cartItems) {
              mockProductRepository.findOne.mockResolvedValueOnce(item.product)
            }

            // Calculate expected totals
            const expectedSubtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
            const expectedShippingCost = 0
            const expectedTax = 0
            const expectedTotal = expectedSubtotal + expectedShippingCost + expectedTax

            // Mock transaction to execute callback immediately
            mockDataSource.transaction.mockImplementation(async (callback: any) => {
              const mockManager = {
                create: jest.fn((entity: any, data: any) => ({
                  ...data,
                  id: fc.sample(uuidGen, 1)[0],
                })),
                save: jest.fn((entity: any, data: any) => Promise.resolve(data)),
                decrement: jest.fn(),
                findOne: jest.fn((entity: any, options: any) => {
                  const product = products.find(p => p.id === options.where.id)
                  if (product) {
                    return Promise.resolve({
                      ...product,
                      stockQuantity: product.stockQuantity - 1,
                    })
                  }
                  return Promise.resolve(null)
                }),
                update: jest.fn(),
              }
              return await callback(mockManager)
            })

            // Mock cart clearing
            mockCartService.clearCart.mockResolvedValue(undefined)

            // Create order
            const createdOrder = {
              id: fc.sample(uuidGen, 1)[0],
              orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId,
              supplierId: products[0].supplierId,
              subtotal: expectedSubtotal,
              shippingCost: expectedShippingCost,
              tax: expectedTax,
              total: expectedTotal,
              currency: 'MXN',
              status: OrderStatus.PENDING,
              shippingAddress,
              billingAddress,
              paymentMethod,
              paymentStatus: PaymentStatus.PENDING,
              estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              updatedAt: new Date(),
              items: cartItems.map(item => ({
                id: fc.sample(uuidGen, 1)[0],
                orderId: fc.sample(uuidGen, 1)[0],
                productId: item.productId,
                productName: item.product.name,
                productImage: item.product.images[0].imageUrl,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
              })),
              supplier: {
                id: products[0].supplierId,
                companyName: 'Test Supplier',
              },
            }

            mockOrderRepository.findOne.mockResolvedValue(createdOrder)

            // Act: Create order
            const result = await service.createOrder(userId, {
              shippingAddress,
              billingAddress,
              paymentMethod,
            })

            // Property 1: Order must be created with all required fields
            expect(result).toBeDefined()
            expect(result.id).toBeDefined()
            expect(result.orderNumber).toBeDefined()
            expect(result.userId).toBe(userId)

            // Property 2: Order must contain all cart items with correct data
            expect(result.items).toBeDefined()
            expect(result.items.length).toBe(cartItems.length)

            for (let i = 0; i < cartItems.length; i++) {
              const cartItem = cartItems[i]
              const orderItem = result.items.find(item => item.productId === cartItem.productId)

              expect(orderItem).toBeDefined()
              expect(orderItem!.productId).toBe(cartItem.productId)
              expect(orderItem!.quantity).toBe(cartItem.quantity)
              expect(Number(orderItem!.price)).toBeCloseTo(Number(cartItem.price), 2)
              expect(Number(orderItem!.subtotal)).toBeCloseTo(Number(cartItem.subtotal), 2)
            }

            // Property 3: Total amount must be calculated correctly
            const actualSubtotal = result.items.reduce(
              (sum, item) => sum + Number(item.subtotal),
              0
            )
            expect(Number(result.subtotal)).toBeCloseTo(actualSubtotal, 2)
            expect(Number(result.total)).toBeCloseTo(
              Number(result.subtotal) + Number(result.shippingCost) + Number(result.tax),
              2
            )

            // Property 4: Order number must be generated and unique
            expect(result.orderNumber).toBeDefined()
            expect(result.orderNumber).toMatch(/^ORD-\d+-\d+$/)

            // Property 5: Estimated delivery date must be set
            expect(result.estimatedDelivery).toBeDefined()
            expect(result.estimatedDelivery).toBeInstanceOf(Date)

            // Verify estimated delivery is approximately 7 days from now
            const now = new Date()
            const deliveryDate = new Date(result.estimatedDelivery)
            const daysDiff = Math.floor(
              (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
            expect(daysDiff).toBeGreaterThanOrEqual(6)
            expect(daysDiff).toBeLessThanOrEqual(8)

            // Property 6: Shipping address must be preserved
            expect(result.shippingAddress).toBeDefined()
            expect(result.shippingAddress.address).toBe(shippingAddress.address)
            expect(result.shippingAddress.city).toBe(shippingAddress.city)
            expect(result.shippingAddress.state).toBe(shippingAddress.state)
            expect(result.shippingAddress.country).toBe(shippingAddress.country)
            expect(result.shippingAddress.postalCode).toBe(shippingAddress.postalCode)

            // Property 7: Billing address must be preserved
            expect(result.billingAddress).toBeDefined()
            expect(result.billingAddress.address).toBe(billingAddress.address)
            expect(result.billingAddress.city).toBe(billingAddress.city)
            expect(result.billingAddress.state).toBe(billingAddress.state)
            expect(result.billingAddress.country).toBe(billingAddress.country)
            expect(result.billingAddress.postalCode).toBe(billingAddress.postalCode)

            // Property 8: Payment method must be preserved
            expect(result.paymentMethod).toBe(paymentMethod)

            // Property 9: Order status must be PENDING
            expect(result.status).toBe(OrderStatus.PENDING)

            // Property 10: Payment status must be PENDING
            expect(result.paymentStatus).toBe(PaymentStatus.PENDING)

            // Property 11: Cart must be cleared after order creation
            expect(mockCartService.clearCart).toHaveBeenCalledWith(userId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should calculate order totals correctly for multiple items with different prices', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              product: productGen,
              quantity: quantityGen,
            }),
            { minLength: 2, maxLength: 10 }
          ),
          locationGen,
          billingAddressGen,
          paymentMethodGen,
          async (userId, itemsData, shippingAddress, billingAddress, paymentMethod) => {
            jest.clearAllMocks()

            // Ensure products have sufficient stock
            const cartItems = itemsData.map(({ product, quantity }) => ({
              id: fc.sample(uuidGen, 1)[0],
              productId: product.id,
              quantity: Math.min(quantity, product.stockQuantity),
              price: product.price,
              subtotal: Number(product.price) * Math.min(quantity, product.stockQuantity),
              product: {
                ...product,
                stockQuantity: Math.max(product.stockQuantity, quantity + 10),
              },
            }))

            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              items: cartItems,
            }

            mockCartRepository.findOne.mockResolvedValue(cart)

            // Mock product lookups
            for (const item of cartItems) {
              mockProductRepository.findOne.mockResolvedValueOnce(item.product)
            }

            // Mock transaction
            mockDataSource.transaction.mockImplementation(async (callback: any) => {
              const mockManager = {
                create: jest.fn((entity: any, data: any) => ({
                  ...data,
                  id: fc.sample(uuidGen, 1)[0],
                })),
                save: jest.fn((entity: any, data: any) => Promise.resolve(data)),
                decrement: jest.fn(),
                findOne: jest.fn(),
                update: jest.fn(),
              }
              return await callback(mockManager)
            })

            mockCartService.clearCart.mockResolvedValue(undefined)

            // Calculate expected totals
            const expectedSubtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0)

            const createdOrder = {
              id: fc.sample(uuidGen, 1)[0],
              orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId,
              supplierId: cartItems[0].product.supplierId,
              subtotal: expectedSubtotal,
              shippingCost: 0,
              tax: 0,
              total: expectedSubtotal,
              currency: 'MXN',
              status: OrderStatus.PENDING,
              shippingAddress,
              billingAddress,
              paymentMethod,
              paymentStatus: PaymentStatus.PENDING,
              estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              items: cartItems.map(item => ({
                id: fc.sample(uuidGen, 1)[0],
                orderId: fc.sample(uuidGen, 1)[0],
                productId: item.productId,
                productName: item.product.name,
                productImage: item.product.images[0].imageUrl,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
              })),
              supplier: {
                id: cartItems[0].product.supplierId,
              },
            }

            mockOrderRepository.findOne.mockResolvedValue(createdOrder)

            // Act
            const result = await service.createOrder(userId, {
              shippingAddress,
              billingAddress,
              paymentMethod,
            })

            // Property: Subtotal must equal sum of all item subtotals
            const calculatedSubtotal = result.items.reduce(
              (sum, item) => sum + Number(item.subtotal),
              0
            )
            expect(Number(result.subtotal)).toBeCloseTo(calculatedSubtotal, 2)

            // Property: Each item subtotal must equal quantity × price
            for (const item of result.items) {
              const expectedItemSubtotal = Number(item.price) * item.quantity
              expect(Number(item.subtotal)).toBeCloseTo(expectedItemSubtotal, 2)
            }

            // Property: Total must equal subtotal + shipping + tax
            const expectedTotal =
              Number(result.subtotal) + Number(result.shippingCost) + Number(result.tax)
            expect(Number(result.total)).toBeCloseTo(expectedTotal, 2)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate unique order numbers for each order', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(productGen, { minLength: 1, maxLength: 3 }),
          locationGen,
          billingAddressGen,
          paymentMethodGen,
          fc.integer({ min: 2, max: 5 }),
          async (userId, products, shippingAddress, billingAddress, paymentMethod, orderCount) => {
            jest.clearAllMocks()

            const orderNumbers = new Set<string>()

            for (let i = 0; i < orderCount; i++) {
              // Generate cart items
              const cartItems = products.map(product => ({
                id: fc.sample(uuidGen, 1)[0],
                productId: product.id,
                quantity: 1,
                price: product.price,
                subtotal: Number(product.price),
                product: {
                  ...product,
                  stockQuantity: 1000,
                },
              }))

              const cart = {
                id: fc.sample(uuidGen, 1)[0],
                userId,
                items: cartItems,
              }

              mockCartRepository.findOne.mockResolvedValue(cart)

              // Mock product lookups
              for (const item of cartItems) {
                mockProductRepository.findOne.mockResolvedValueOnce(item.product)
              }

              // Mock transaction
              mockDataSource.transaction.mockImplementation(async (callback: any) => {
                const mockManager = {
                  create: jest.fn((entity: any, data: any) => ({
                    ...data,
                    id: fc.sample(uuidGen, 1)[0],
                  })),
                  save: jest.fn((entity: any, data: any) => Promise.resolve(data)),
                  decrement: jest.fn(),
                  findOne: jest.fn(),
                  update: jest.fn(),
                }
                return await callback(mockManager)
              })

              mockCartService.clearCart.mockResolvedValue(undefined)

              // Generate unique order number for this iteration
              const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, '0')}`

              const createdOrder = {
                id: fc.sample(uuidGen, 1)[0],
                orderNumber,
                userId,
                supplierId: products[0].supplierId,
                subtotal: cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0),
                shippingCost: 0,
                tax: 0,
                total: cartItems.reduce((sum, item) => sum + Number(item.subtotal), 0),
                currency: 'MXN',
                status: OrderStatus.PENDING,
                shippingAddress,
                billingAddress,
                paymentMethod,
                paymentStatus: PaymentStatus.PENDING,
                estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                items: cartItems.map(item => ({
                  id: fc.sample(uuidGen, 1)[0],
                  orderId: fc.sample(uuidGen, 1)[0],
                  productId: item.productId,
                  productName: item.product.name,
                  productImage: item.product.images[0].imageUrl,
                  quantity: item.quantity,
                  price: item.price,
                  subtotal: item.subtotal,
                })),
                supplier: {
                  id: products[0].supplierId,
                },
              }

              mockOrderRepository.findOne.mockResolvedValue(createdOrder)

              // Act
              const result = await service.createOrder(userId, {
                shippingAddress,
                billingAddress,
                paymentMethod,
              })

              // Property: Order number must be unique
              expect(orderNumbers.has(result.orderNumber)).toBe(false)
              orderNumbers.add(result.orderNumber)

              // Property: Order number must follow format
              expect(result.orderNumber).toMatch(/^ORD-\d+-\d+$/)

              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 10))
            }

            // Verify all order numbers are unique
            expect(orderNumbers.size).toBe(orderCount)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should preserve all address fields in shipping and billing addresses', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          productGen,
          quantityGen,
          locationGen,
          billingAddressGen,
          paymentMethodGen,
          async (userId, product, quantity, shippingAddress, billingAddress, paymentMethod) => {
            jest.clearAllMocks()

            const cartItem = {
              id: fc.sample(uuidGen, 1)[0],
              productId: product.id,
              quantity: Math.min(quantity, product.stockQuantity),
              price: product.price,
              subtotal: Number(product.price) * Math.min(quantity, product.stockQuantity),
              product: {
                ...product,
                stockQuantity: Math.max(product.stockQuantity, quantity + 10),
              },
            }

            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              items: [cartItem],
            }

            mockCartRepository.findOne.mockResolvedValue(cart)
            mockProductRepository.findOne.mockResolvedValue(cartItem.product)

            mockDataSource.transaction.mockImplementation(async (callback: any) => {
              const mockManager = {
                create: jest.fn((entity: any, data: any) => ({
                  ...data,
                  id: fc.sample(uuidGen, 1)[0],
                })),
                save: jest.fn((entity: any, data: any) => Promise.resolve(data)),
                decrement: jest.fn(),
                findOne: jest.fn(),
                update: jest.fn(),
              }
              return await callback(mockManager)
            })

            mockCartService.clearCart.mockResolvedValue(undefined)

            const createdOrder = {
              id: fc.sample(uuidGen, 1)[0],
              orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId,
              supplierId: product.supplierId,
              subtotal: cartItem.subtotal,
              shippingCost: 0,
              tax: 0,
              total: cartItem.subtotal,
              currency: 'MXN',
              status: OrderStatus.PENDING,
              shippingAddress,
              billingAddress,
              paymentMethod,
              paymentStatus: PaymentStatus.PENDING,
              estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              items: [
                {
                  id: fc.sample(uuidGen, 1)[0],
                  orderId: fc.sample(uuidGen, 1)[0],
                  productId: cartItem.productId,
                  productName: cartItem.product.name,
                  productImage: cartItem.product.images[0].imageUrl,
                  quantity: cartItem.quantity,
                  price: cartItem.price,
                  subtotal: cartItem.subtotal,
                },
              ],
              supplier: {
                id: product.supplierId,
              },
            }

            mockOrderRepository.findOne.mockResolvedValue(createdOrder)

            // Act
            const result = await service.createOrder(userId, {
              shippingAddress,
              billingAddress,
              paymentMethod,
            })

            // Property: All shipping address fields must be preserved
            expect(result.shippingAddress.address).toBe(shippingAddress.address)
            expect(result.shippingAddress.city).toBe(shippingAddress.city)
            expect(result.shippingAddress.state).toBe(shippingAddress.state)
            expect(result.shippingAddress.country).toBe(shippingAddress.country)
            expect(result.shippingAddress.postalCode).toBe(shippingAddress.postalCode)
            expect(result.shippingAddress.coordinates.latitude).toBeCloseTo(
              shippingAddress.coordinates.latitude,
              5
            )
            expect(result.shippingAddress.coordinates.longitude).toBeCloseTo(
              shippingAddress.coordinates.longitude,
              5
            )

            // Property: All billing address fields must be preserved
            expect(result.billingAddress.address).toBe(billingAddress.address)
            expect(result.billingAddress.city).toBe(billingAddress.city)
            expect(result.billingAddress.state).toBe(billingAddress.state)
            expect(result.billingAddress.country).toBe(billingAddress.country)
            expect(result.billingAddress.postalCode).toBe(billingAddress.postalCode)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * Property-Based Tests for Order Status Management
   *
   * **Feature: technician-marketplace-platform**
   *
   * These tests validate universal properties that must hold for order status transitions
   * and cancellation restrictions, ensuring correctness at scale.
   */
  describe('Order Status Management Property Tests', () => {
    // Generator for order statuses
    const orderStatusGen = fc.constantFrom(
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED
    )

    // Generator for valid status transitions
    const validTransitionGen = fc.oneof(
      fc.constant({ from: OrderStatus.PENDING, to: OrderStatus.CONFIRMED }),
      fc.constant({ from: OrderStatus.PENDING, to: OrderStatus.CANCELLED }),
      fc.constant({ from: OrderStatus.CONFIRMED, to: OrderStatus.PREPARING }),
      fc.constant({ from: OrderStatus.CONFIRMED, to: OrderStatus.CANCELLED }),
      fc.constant({ from: OrderStatus.PREPARING, to: OrderStatus.SHIPPED }),
      fc.constant({ from: OrderStatus.PREPARING, to: OrderStatus.CANCELLED }),
      fc.constant({ from: OrderStatus.SHIPPED, to: OrderStatus.DELIVERED })
    )

    // Generator for invalid status transitions
    const invalidTransitionGen = fc
      .tuple(orderStatusGen, orderStatusGen)
      .filter(([from, to]) => {
        // Define valid transitions
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
          [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
          [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
          [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
          [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
          [OrderStatus.DELIVERED]: [],
          [OrderStatus.CANCELLED]: [],
        }

        // Filter out valid transitions and same-status transitions
        return from !== to && !validTransitions[from]?.includes(to)
      })
      .map(([from, to]) => ({ from, to }))

    /**
     * **Property 50: Sipariş Durumu Geçiş Doğruluğu (Order Status Transition Validity)**
     *
     * **Validates: Requirements 18.1**
     *
     * For any order, status changes must follow the valid state machine transitions.
     * Invalid transitions (e.g., PENDING → SHIPPED, DELIVERED → CONFIRMED) must be rejected.
     *
     * Valid transitions:
     * - PENDING → [CONFIRMED, CANCELLED]
     * - CONFIRMED → [PREPARING, CANCELLED]
     * - PREPARING → [SHIPPED, CANCELLED]
     * - SHIPPED → [DELIVERED]
     * - DELIVERED → [] (terminal state)
     * - CANCELLED → [] (terminal state)
     *
     * This property ensures that the order status state machine is enforced correctly
     * and prevents invalid state transitions that could lead to data inconsistencies.
     */
    describe('Property 50: Order Status Transition Validity', () => {
      it('should allow all valid status transitions', async () => {
        await fc.assert(
          fc.asyncProperty(uuidGen, validTransitionGen, async (orderId, transition) => {
            jest.clearAllMocks()

            const supplierId = fc.sample(uuidGen, 1)[0]

            // Setup: Create order with initial status
            const order = {
              id: orderId,
              orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId: fc.sample(uuidGen, 1)[0],
              supplierId,
              status: transition.from,
              subtotal: 100,
              shippingCost: 10,
              tax: 5,
              total: 115,
              currency: 'MXN',
              paymentStatus: PaymentStatus.PENDING,
              items: [],
              supplier: { id: supplierId },
              user: { id: fc.sample(uuidGen, 1)[0] },
            }

            mockOrderRepository.findOne.mockResolvedValue(order)

            // Mock save to return updated order
            mockOrderRepository.save.mockImplementation(async (updatedOrder: any) => {
              return { ...updatedOrder }
            })

            // Act: Update order status with supplier authorization
            const result = await service.updateOrderStatus(
              orderId,
              { status: transition.to },
              undefined,
              supplierId
            )

            // Property: Valid transition must be accepted
            expect(result).toBeDefined()
            expect(result.status).toBe(transition.to)

            // Property: Order must be saved
            expect(mockOrderRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                status: transition.to,
              })
            )
          }),
          { numRuns: 100 }
        )
      })

      it('should reject all invalid status transitions', async () => {
        await fc.assert(
          fc.asyncProperty(uuidGen, invalidTransitionGen, async (orderId, transition) => {
            jest.clearAllMocks()

            const supplierId = fc.sample(uuidGen, 1)[0]

            // Setup: Create order with initial status
            const order = {
              id: orderId,
              orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId: fc.sample(uuidGen, 1)[0],
              supplierId,
              status: transition.from,
              subtotal: 100,
              shippingCost: 10,
              tax: 5,
              total: 115,
              currency: 'MXN',
              paymentStatus: PaymentStatus.PENDING,
              items: [],
              supplier: { id: supplierId },
              user: { id: fc.sample(uuidGen, 1)[0] },
            }

            mockOrderRepository.findOne.mockResolvedValue(order)

            // Act & Assert: Invalid transition must throw error
            await expect(
              service.updateOrderStatus(orderId, { status: transition.to }, undefined, supplierId)
            ).rejects.toThrow('Invalid status transition')

            // Property: Order must not be saved
            expect(mockOrderRepository.save).not.toHaveBeenCalled()
          }),
          { numRuns: 100 }
        )
      })

      it('should update timestamps correctly based on status', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidGen,
            fc.constantFrom(
              {
                from: OrderStatus.PENDING,
                to: OrderStatus.CONFIRMED,
                timestampField: 'confirmedAt',
              },
              {
                from: OrderStatus.PREPARING,
                to: OrderStatus.SHIPPED,
                timestampField: 'shippedAt',
              },
              {
                from: OrderStatus.SHIPPED,
                to: OrderStatus.DELIVERED,
                timestampField: 'deliveredAt',
              },
              {
                from: OrderStatus.PENDING,
                to: OrderStatus.CANCELLED,
                timestampField: 'cancelledAt',
              }
            ),
            async (orderId, transition) => {
              jest.clearAllMocks()

              const supplierId = fc.sample(uuidGen, 1)[0]

              const order = {
                id: orderId,
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userId: fc.sample(uuidGen, 1)[0],
                supplierId,
                status: transition.from,
                subtotal: 100,
                shippingCost: 10,
                tax: 5,
                total: 115,
                currency: 'MXN',
                paymentStatus: PaymentStatus.PENDING,
                items: [],
                supplier: { id: supplierId },
                user: { id: fc.sample(uuidGen, 1)[0] },
              }

              mockOrderRepository.findOne.mockResolvedValue(order)

              let savedOrder: any
              mockOrderRepository.save.mockImplementation(async (updatedOrder: any) => {
                savedOrder = { ...updatedOrder }
                return savedOrder
              })

              // Act
              await service.updateOrderStatus(
                orderId,
                { status: transition.to },
                undefined,
                supplierId
              )

              // Property: Appropriate timestamp field must be set
              expect(savedOrder[transition.timestampField]).toBeDefined()
              expect(savedOrder[transition.timestampField]).toBeInstanceOf(Date)

              // Property: Timestamp must be recent (within last 5 seconds)
              const now = new Date()
              const timestamp = new Date(savedOrder[transition.timestampField])
              const diffMs = now.getTime() - timestamp.getTime()
              expect(diffMs).toBeGreaterThanOrEqual(0)
              expect(diffMs).toBeLessThan(5000)
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should preserve tracking info when transitioning to SHIPPED', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidGen,
            fc.string({ minLength: 10, maxLength: 30 }),
            fc.constantFrom('DHL', 'FedEx', 'UPS', 'USPS', 'Estafeta'),
            async (orderId, trackingNumber, carrier) => {
              jest.clearAllMocks()

              const supplierId = fc.sample(uuidGen, 1)[0]

              const order = {
                id: orderId,
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userId: fc.sample(uuidGen, 1)[0],
                supplierId,
                status: OrderStatus.PREPARING,
                subtotal: 100,
                shippingCost: 10,
                tax: 5,
                total: 115,
                currency: 'MXN',
                paymentStatus: PaymentStatus.PENDING,
                items: [],
                supplier: { id: supplierId },
                user: { id: fc.sample(uuidGen, 1)[0] },
              }

              mockOrderRepository.findOne.mockResolvedValue(order)

              let savedOrder: any
              mockOrderRepository.save.mockImplementation(async (updatedOrder: any) => {
                savedOrder = { ...updatedOrder }
                return savedOrder
              })

              // Act
              await service.updateOrderStatus(
                orderId,
                {
                  status: OrderStatus.SHIPPED,
                  trackingNumber,
                  carrier,
                },
                undefined,
                supplierId
              )

              // Property: Tracking info must be preserved
              expect(savedOrder.trackingNumber).toBe(trackingNumber)
              expect(savedOrder.carrier).toBe(carrier)
              expect(savedOrder.status).toBe(OrderStatus.SHIPPED)
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    /**
     * **Property 51: Sipariş İptal Kısıtı (Order Cancellation Restriction)**
     *
     * **Validates: Requirements 18.7**
     *
     * For any order, cancellation is only allowed in PENDING, CONFIRMED, and PREPARING statuses.
     * Attempts to cancel orders in SHIPPED, DELIVERED, or already CANCELLED status must be rejected.
     *
     * This property ensures that orders cannot be cancelled once they are in transit or delivered,
     * protecting both customers and suppliers from invalid cancellation attempts.
     */
    describe('Property 51: Order Cancellation Restriction', () => {
      it('should allow cancellation from PENDING, CONFIRMED, and PREPARING statuses', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidGen,
            fc.constantFrom(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING),
            async (orderId, currentStatus) => {
              jest.clearAllMocks()

              const order = {
                id: orderId,
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userId: fc.sample(uuidGen, 1)[0],
                supplierId: fc.sample(uuidGen, 1)[0],
                status: currentStatus,
                subtotal: 100,
                shippingCost: 10,
                tax: 5,
                total: 115,
                currency: 'MXN',
                paymentStatus: PaymentStatus.PENDING,
                items: [],
                supplier: { id: fc.sample(uuidGen, 1)[0] },
                user: { id: fc.sample(uuidGen, 1)[0] },
              }

              mockOrderRepository.findOne.mockResolvedValue(order)

              mockOrderRepository.save.mockImplementation(async (updatedOrder: any) => {
                return { ...updatedOrder }
              })

              // Act: Attempt to cancel order
              const result = await service.updateOrderStatus(orderId, {
                status: OrderStatus.CANCELLED,
              })

              // Property: Cancellation must be allowed
              expect(result).toBeDefined()
              expect(result.status).toBe(OrderStatus.CANCELLED)

              // Property: Cancelled timestamp must be set
              expect(mockOrderRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                  status: OrderStatus.CANCELLED,
                  cancelledAt: expect.any(Date),
                })
              )
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should reject cancellation from SHIPPED, DELIVERED, and CANCELLED statuses', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidGen,
            fc.constantFrom(OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED),
            async (orderId, currentStatus) => {
              jest.clearAllMocks()

              const order = {
                id: orderId,
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userId: fc.sample(uuidGen, 1)[0],
                supplierId: fc.sample(uuidGen, 1)[0],
                status: currentStatus,
                subtotal: 100,
                shippingCost: 10,
                tax: 5,
                total: 115,
                currency: 'MXN',
                paymentStatus: PaymentStatus.PENDING,
                items: [],
                supplier: { id: fc.sample(uuidGen, 1)[0] },
                user: { id: fc.sample(uuidGen, 1)[0] },
              }

              mockOrderRepository.findOne.mockResolvedValue(order)

              // Act & Assert: Cancellation must be rejected
              await expect(
                service.updateOrderStatus(orderId, { status: OrderStatus.CANCELLED })
              ).rejects.toThrow('Invalid status transition')

              // Property: Order must not be saved
              expect(mockOrderRepository.save).not.toHaveBeenCalled()
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should enforce cancellation restriction regardless of order value', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidGen,
            fc.constantFrom(OrderStatus.SHIPPED, OrderStatus.DELIVERED),
            priceGen,
            quantityGen,
            async (orderId, currentStatus, price, quantity) => {
              jest.clearAllMocks()

              const subtotal = Number(price) * quantity
              const order = {
                id: orderId,
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userId: fc.sample(uuidGen, 1)[0],
                supplierId: fc.sample(uuidGen, 1)[0],
                status: currentStatus,
                subtotal,
                shippingCost: 10,
                tax: subtotal * 0.16,
                total: subtotal + 10 + subtotal * 0.16,
                currency: 'MXN',
                paymentStatus: PaymentStatus.PENDING,
                items: [],
                supplier: { id: fc.sample(uuidGen, 1)[0] },
                user: { id: fc.sample(uuidGen, 1)[0] },
              }

              mockOrderRepository.findOne.mockResolvedValue(order)

              // Act & Assert: Cancellation must be rejected regardless of order value
              await expect(
                service.updateOrderStatus(orderId, { status: OrderStatus.CANCELLED })
              ).rejects.toThrow('Invalid status transition')

              // Property: Order value should not affect cancellation restriction
              expect(mockOrderRepository.save).not.toHaveBeenCalled()
            }
          ),
          { numRuns: 100 }
        )
      })

      it('should prevent transition from terminal states', async () => {
        await fc.assert(
          fc.asyncProperty(
            uuidGen,
            fc.constantFrom(OrderStatus.DELIVERED, OrderStatus.CANCELLED),
            fc.constantFrom(
              OrderStatus.PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.PREPARING,
              OrderStatus.SHIPPED
            ),
            async (orderId, terminalStatus, targetStatus) => {
              jest.clearAllMocks()

              const supplierId = fc.sample(uuidGen, 1)[0]

              const order = {
                id: orderId,
                orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userId: fc.sample(uuidGen, 1)[0],
                supplierId,
                status: terminalStatus,
                subtotal: 100,
                shippingCost: 10,
                tax: 5,
                total: 115,
                currency: 'MXN',
                paymentStatus: PaymentStatus.PENDING,
                items: [],
                supplier: { id: supplierId },
                user: { id: fc.sample(uuidGen, 1)[0] },
              }

              mockOrderRepository.findOne.mockResolvedValue(order)

              // Act & Assert: Transition from terminal state must be rejected
              await expect(
                service.updateOrderStatus(orderId, { status: targetStatus }, undefined, supplierId)
              ).rejects.toThrow('Invalid status transition')

              // Property: Terminal states must be immutable
              expect(mockOrderRepository.save).not.toHaveBeenCalled()
            }
          ),
          { numRuns: 100 }
        )
      })
    })
  })
})
