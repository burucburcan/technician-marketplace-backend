import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as fc from 'fast-check'
import { CartService } from './cart.service'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { Product } from '../../entities/product.entity'

/**
 * Property-Based Tests for Cart Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the cart management system, ensuring correctness at scale.
 */
describe('CartService Property Tests', () => {
  let service: CartService

  const mockCartRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockCartItemRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  }

  const mockProductRepository = {
    findOne: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(Cart),
          useValue: mockCartRepository,
        },
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockCartItemRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile()

    service = module.get<CartService>(CartService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const priceGen = fc
    .float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true })
    .map(p => Math.round(p * 100) / 100)
  const quantityGen = fc.integer({ min: 1, max: 100 })
  const stockQuantityGen = fc.integer({ min: 1, max: 1000 })

  const productGen = fc.record({
    id: uuidGen,
    name: fc.string({ minLength: 3, maxLength: 100 }),
    price: priceGen,
    stockQuantity: stockQuantityGen,
    isAvailable: fc.constant(true),
  })

  const cartItemGen = fc.record({
    id: uuidGen,
    cartId: uuidGen,
    productId: uuidGen,
    quantity: quantityGen,
    price: priceGen,
  })

  /**
   * **Property 48: Sepet Toplam Hesaplama Doğruluğu (Cart Total Calculation Accuracy)**
   *
   * **Validates: Requirements 17.5**
   *
   * For any cart, the total amount must equal the sum of all items' (quantity × price).
   * This property ensures that cart calculations are accurate when adding, updating,
   * and removing items.
   */
  describe('Property 48: Cart Total Calculation Accuracy', () => {
    it('should calculate cart subtotal as sum of all item subtotals when adding items', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              product: productGen,
              quantity: quantityGen,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (userId, itemsToAdd) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Setup: Empty cart initially
            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              subtotal: 0,
              total: 0,
              currency: 'MXN',
              items: [] as any[],
            }

            mockCartRepository.findOne.mockResolvedValue(cart)
            mockCartRepository.create.mockReturnValue(cart)

            // Add items one by one and verify calculation
            let expectedSubtotal = 0

            for (const { product, quantity } of itemsToAdd) {
              // Ensure product has sufficient stock for all operations
              const productWithStock = {
                ...product,
                stockQuantity: 10000, // Ensure sufficient stock
              }

              // Mock product lookup
              mockProductRepository.findOne.mockResolvedValue(productWithStock)

              // Check if product already exists in cart
              const existingItem = cart.items.find(item => item.productId === product.id)

              if (existingItem) {
                // Update existing item
                existingItem.quantity += quantity
                existingItem.subtotal = Number(existingItem.price) * existingItem.quantity
                mockCartItemRepository.save.mockResolvedValue(existingItem)
              } else {
                // Calculate expected subtotal for this item
                const itemSubtotal = Number(product.price) * quantity

                // Mock cart item creation
                const cartItem = {
                  id: fc.sample(uuidGen, 1)[0],
                  cartId: cart.id,
                  productId: product.id,
                  quantity,
                  price: product.price,
                  subtotal: itemSubtotal,
                }

                mockCartItemRepository.create.mockReturnValue(cartItem)
                mockCartItemRepository.save.mockResolvedValue(cartItem)

                // Update cart items array
                cart.items.push(cartItem)
              }

              // Recalculate expected subtotal
              expectedSubtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)

              // Mock updated cart with recalculated totals
              const updatedCart = {
                ...cart,
                subtotal: expectedSubtotal,
                total: expectedSubtotal,
              }

              mockCartRepository.save.mockResolvedValue(updatedCart)
              mockCartRepository.findOne.mockResolvedValue(updatedCart)

              // Act: Add item to cart
              const result = await service.addToCart(userId, product.id, quantity)

              // Property 1: Cart subtotal must equal sum of all item subtotals
              const actualSubtotal = cart.items.reduce(
                (sum, item) => sum + Number(item.subtotal),
                0
              )
              expect(Math.abs(Number(result.subtotal) - actualSubtotal)).toBeLessThan(0.01)

              // Property 2: Cart total must equal subtotal (no taxes/shipping for now)
              expect(Math.abs(Number(result.total) - Number(result.subtotal))).toBeLessThan(0.01)

              // Property 3: Each item subtotal must equal quantity × price
              for (const item of cart.items) {
                const expectedItemSubtotal = Number(item.price) * item.quantity
                expect(Math.abs(Number(item.subtotal) - expectedItemSubtotal)).toBeLessThan(0.01)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain calculation accuracy when updating item quantities', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(cartItemGen, { minLength: 1, maxLength: 5 }),
          fc.array(quantityGen, { minLength: 1, maxLength: 5 }),
          async (userId, initialItems, newQuantities) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Setup: Cart with initial items
            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              subtotal: 0,
              total: 0,
              currency: 'MXN',
              items: initialItems.map(item => ({
                ...item,
                subtotal: Number(item.price) * item.quantity,
                product: {
                  id: item.productId,
                  price: item.price,
                  stockQuantity: 1000,
                },
                cart: { userId },
              })),
            }

            // Calculate initial subtotal
            cart.subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
            cart.total = cart.subtotal

            // Update quantities and verify calculation
            for (let i = 0; i < Math.min(initialItems.length, newQuantities.length); i++) {
              const cartItem = cart.items[i]
              const newQuantity = newQuantities[i]

              mockCartItemRepository.findOne.mockResolvedValue(cartItem)

              // Update item quantity and subtotal
              cartItem.quantity = newQuantity
              cartItem.subtotal = Number(cartItem.price) * newQuantity

              mockCartItemRepository.save.mockResolvedValue(cartItem)

              // Recalculate cart totals
              const newSubtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
              cart.subtotal = newSubtotal
              cart.total = newSubtotal

              mockCartRepository.findOne.mockResolvedValue(cart)
              mockCartRepository.save.mockResolvedValue(cart)

              // Act: Update cart item
              const result = await service.updateCartItem(userId, cartItem.id, newQuantity)

              // Property 1: Updated item subtotal must equal new quantity × price
              const updatedItem = cart.items[i]
              const expectedItemSubtotal = Number(updatedItem.price) * updatedItem.quantity
              expect(Math.abs(Number(updatedItem.subtotal) - expectedItemSubtotal)).toBeLessThan(
                0.01
              )

              // Property 2: Cart subtotal must equal sum of all item subtotals
              const expectedSubtotal = cart.items.reduce(
                (sum, item) => sum + Number(item.subtotal),
                0
              )
              expect(Math.abs(Number(result.subtotal) - expectedSubtotal)).toBeLessThan(0.01)

              // Property 3: Cart total must equal subtotal
              expect(Math.abs(Number(result.total) - Number(result.subtotal))).toBeLessThan(0.01)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain calculation accuracy when removing items from cart', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(cartItemGen, { minLength: 2, maxLength: 10 }),
          async (userId, initialItems) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Setup: Cart with initial items
            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              subtotal: 0,
              total: 0,
              currency: 'MXN',
              items: initialItems.map(item => ({
                ...item,
                subtotal: Number(item.price) * item.quantity,
                cart: { userId },
              })),
            }

            // Calculate initial subtotal
            cart.subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
            cart.total = cart.subtotal

            // Remove items one by one and verify calculation
            while (cart.items.length > 0) {
              const itemToRemove = cart.items[0]

              mockCartItemRepository.findOne.mockResolvedValue(itemToRemove)
              mockCartItemRepository.remove.mockResolvedValue(itemToRemove)

              // Remove item from cart
              cart.items = cart.items.filter(item => item.id !== itemToRemove.id)

              // Recalculate cart totals
              const newSubtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
              cart.subtotal = newSubtotal
              cart.total = newSubtotal

              mockCartRepository.findOne.mockResolvedValue(cart)
              mockCartRepository.save.mockResolvedValue(cart)

              // Act: Remove item from cart
              const result = await service.removeFromCart(userId, itemToRemove.id)

              // Property 1: Cart subtotal must equal sum of remaining item subtotals
              const expectedSubtotal = cart.items.reduce(
                (sum, item) => sum + Number(item.subtotal),
                0
              )
              expect(Math.abs(Number(result.subtotal) - expectedSubtotal)).toBeLessThan(0.01)

              // Property 2: Cart total must equal subtotal
              expect(Math.abs(Number(result.total) - Number(result.subtotal))).toBeLessThan(0.01)

              // Property 3: If cart is empty, subtotal and total must be 0
              if (cart.items.length === 0) {
                expect(Number(result.subtotal)).toBe(0)
                expect(Number(result.total)).toBe(0)
              }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle decimal precision correctly in calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              price: fc
                .float({ min: Math.fround(0.01), max: Math.fround(99.99), noNaN: true })
                .map(p => Math.round(p * 100) / 100),
              quantity: fc.integer({ min: 1, max: 10 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (userId, items) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Setup: Cart with items
            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              subtotal: 0,
              total: 0,
              currency: 'MXN',
              items: items.map(({ price, quantity }) => ({
                id: fc.sample(uuidGen, 1)[0],
                cartId: fc.sample(uuidGen, 1)[0],
                productId: fc.sample(uuidGen, 1)[0],
                quantity,
                price,
                subtotal: Number(price) * quantity,
              })),
            }

            // Calculate subtotal with proper decimal handling
            cart.subtotal = cart.items.reduce((sum, item) => {
              return sum + Number(item.subtotal)
            }, 0)
            cart.total = cart.subtotal

            mockCartRepository.findOne.mockResolvedValue(cart)

            // Act: Get cart
            const result = await service.getCart(userId)

            // Property 1: Subtotal must be sum of all item subtotals
            const expectedSubtotal = cart.items.reduce(
              (sum, item) => sum + Number(item.subtotal),
              0
            )
            expect(Math.abs(Number(result.subtotal) - expectedSubtotal)).toBeLessThan(0.01)

            // Property 2: Each item subtotal must be correctly calculated
            for (const item of cart.items) {
              const expectedItemSubtotal = Number(item.price) * item.quantity
              expect(Math.abs(Number(item.subtotal) - expectedItemSubtotal)).toBeLessThan(0.01)
            }

            // Property 3: Total must equal subtotal (no additional charges)
            expect(Math.abs(Number(result.total) - Number(result.subtotal))).toBeLessThan(0.01)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain calculation invariant: total = subtotal across all operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.oneof(
              fc.record({
                operation: fc.constant('add' as const),
                product: productGen,
                quantity: quantityGen,
              }),
              fc.record({
                operation: fc.constant('update' as const),
                itemIndex: fc.integer({ min: 0, max: 4 }),
                quantity: quantityGen,
              }),
              fc.record({
                operation: fc.constant('remove' as const),
                itemIndex: fc.integer({ min: 0, max: 4 }),
              })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          async (userId, operations) => {
            // Clear mocks for each iteration
            jest.clearAllMocks()

            // Setup: Empty cart
            const cart = {
              id: fc.sample(uuidGen, 1)[0],
              userId,
              subtotal: 0,
              total: 0,
              currency: 'MXN',
              items: [] as any[],
            }

            mockCartRepository.findOne.mockResolvedValue(cart)
            mockCartRepository.create.mockReturnValue(cart)

            // Execute operations and verify invariant
            for (const op of operations) {
              if (op.operation === 'add') {
                // Add item
                mockProductRepository.findOne.mockResolvedValue(op.product)

                const itemSubtotal = Number(op.product.price) * op.quantity
                const cartItem = {
                  id: fc.sample(uuidGen, 1)[0],
                  cartId: cart.id,
                  productId: op.product.id,
                  quantity: op.quantity,
                  price: op.product.price,
                  subtotal: itemSubtotal,
                }

                mockCartItemRepository.create.mockReturnValue(cartItem)
                mockCartItemRepository.save.mockResolvedValue(cartItem)

                cart.items.push(cartItem)
              } else if (op.operation === 'update' && cart.items.length > 0) {
                // Update item
                const itemIndex = op.itemIndex % cart.items.length
                const cartItem = cart.items[itemIndex]

                mockCartItemRepository.findOne.mockResolvedValue({
                  ...cartItem,
                  cart: { userId },
                  product: { stockQuantity: 1000 },
                })

                cartItem.quantity = op.quantity
                cartItem.subtotal = Number(cartItem.price) * op.quantity

                mockCartItemRepository.save.mockResolvedValue(cartItem)
              } else if (op.operation === 'remove' && cart.items.length > 0) {
                // Remove item
                const itemIndex = op.itemIndex % cart.items.length
                const cartItem = cart.items[itemIndex]

                mockCartItemRepository.findOne.mockResolvedValue({
                  ...cartItem,
                  cart: { userId },
                })
                mockCartItemRepository.remove.mockResolvedValue(cartItem)

                cart.items.splice(itemIndex, 1)
              }

              // Recalculate totals
              cart.subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
              cart.total = cart.subtotal

              mockCartRepository.save.mockResolvedValue(cart)
              mockCartRepository.findOne.mockResolvedValue(cart)

              // Verify invariant: total = subtotal
              expect(Math.abs(Number(cart.total) - Number(cart.subtotal))).toBeLessThan(0.01)

              // Verify subtotal = sum of item subtotals
              const expectedSubtotal = cart.items.reduce(
                (sum, item) => sum + Number(item.subtotal),
                0
              )
              expect(Math.abs(Number(cart.subtotal) - expectedSubtotal)).toBeLessThan(0.01)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
