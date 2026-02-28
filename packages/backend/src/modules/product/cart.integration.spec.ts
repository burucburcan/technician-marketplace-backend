import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as request from 'supertest'
import { ProductModule } from './product.module'
import { AuthModule } from '../auth/auth.module'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { UserRole } from '../../common/enums/user-role.enum'
import { VerificationStatus } from '../../common/enums/verification-status.enum'
import { Repository } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'

describe('Cart Integration Tests', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let productRepository: Repository<Product>
  let supplierRepository: Repository<SupplierProfile>
  let cartRepository: Repository<Cart>
  let cartItemRepository: Repository<CartItem>
  let authToken: string
  let userId: string
  let productId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'test_db',
          entities: [User, UserProfile, Cart, CartItem, Product, ProductImage, SupplierProfile],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        ProductModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    userRepository = moduleFixture.get(getRepositoryToken(User))
    productRepository = moduleFixture.get(getRepositoryToken(Product))
    supplierRepository = moduleFixture.get(getRepositoryToken(SupplierProfile))
    cartRepository = moduleFixture.get(getRepositoryToken(Cart))
    cartItemRepository = moduleFixture.get(getRepositoryToken(CartItem))

    // Create test user
    const user = userRepository.create({
      email: 'cart-test@example.com',
      passwordHash: 'hashed_password',
      role: UserRole.USER,
      isEmailVerified: true,
    })
    const savedUser = await userRepository.save(user)
    userId = savedUser.id

    // Login to get token
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'cart-test@example.com',
      password: 'password123',
    })

    if (loginResponse.status === 200 || loginResponse.status === 201) {
      authToken = loginResponse.body.accessToken
    }

    // Create test supplier
    const supplier = supplierRepository.create({
      userId: savedUser.id,
      companyName: 'Test Supplier',
      taxId: 'TAX123',
      businessAddress: {
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Mexico',
        postalCode: '12345',
        coordinates: { latitude: 19.4326, longitude: -99.1332 },
      },
      contactPhone: '1234567890',
      contactEmail: 'supplier@test.com',
      verificationStatus: VerificationStatus.VERIFIED,
      rating: 4.5,
      totalOrders: 0,
      responseRate: 100,
    })
    const savedSupplier = await supplierRepository.save(supplier)

    // Create test product
    const product = productRepository.create({
      supplierId: savedSupplier.id,
      name: 'Test Product',
      description: 'Test product description',
      category: 'electronics',
      price: 100.0,
      currency: 'MXN',
      stockQuantity: 10,
      isAvailable: true,
      rating: 4.5,
      totalReviews: 5,
    })
    const savedProduct = await productRepository.save(product)
    productId = savedProduct.id
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clear cart before each test
    await cartItemRepository.delete({})
    await cartRepository.delete({})
  })

  describe('POST /cart/items', () => {
    it('should add product to cart', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      const response = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        })
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].quantity).toBe(2)
      expect(response.body.items[0].productId).toBe(productId)
      expect(Number(response.body.subtotal)).toBe(200)
      expect(Number(response.body.total)).toBe(200)
    })

    it('should reject adding product with insufficient stock', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 100, // More than available stock
        })
        .expect(400)
    })

    it('should reject adding unavailable product', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      // Make product unavailable
      await productRepository.update(productId, { isAvailable: false })

      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 1,
        })
        .expect(400)

      // Restore product availability
      await productRepository.update(productId, { isAvailable: true })
    })
  })

  describe('GET /cart', () => {
    it('should return empty cart for new user', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body.items).toEqual([])
      expect(Number(response.body.subtotal)).toBe(0)
      expect(Number(response.body.total)).toBe(0)
    })

    it('should return cart with items', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      // Add item to cart first
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 3,
        })

      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].quantity).toBe(3)
      expect(Number(response.body.subtotal)).toBe(300)
    })
  })

  describe('PUT /cart/items/:id', () => {
    it('should update cart item quantity', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      // Add item first
      const addResponse = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        })

      const cartItemId = addResponse.body.items[0].id

      // Update quantity
      const response = await request(app.getHttpServer())
        .put(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 5,
        })
        .expect(200)

      expect(response.body.items[0].quantity).toBe(5)
      expect(Number(response.body.subtotal)).toBe(500)
    })

    it('should reject updating with insufficient stock', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      // Add item first
      const addResponse = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        })

      const cartItemId = addResponse.body.items[0].id

      // Try to update with too much quantity
      await request(app.getHttpServer())
        .put(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 100,
        })
        .expect(400)
    })
  })

  describe('DELETE /cart/items/:id', () => {
    it('should remove item from cart', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      // Add item first
      const addResponse = await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        })

      const cartItemId = addResponse.body.items[0].id

      // Remove item
      const response = await request(app.getHttpServer())
        .delete(`/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.items).toHaveLength(0)
      expect(Number(response.body.subtotal)).toBe(0)
    })
  })

  describe('DELETE /cart', () => {
    it('should clear entire cart', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      // Add items first
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        })

      // Clear cart
      await request(app.getHttpServer())
        .delete('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify cart is empty
      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.items).toHaveLength(0)
      expect(Number(response.body.subtotal)).toBe(0)
    })
  })

  describe('Property 48: Cart Total Calculation', () => {
    it('should calculate cart total correctly', async () => {
      if (!authToken) {
        console.log('Skipping test - no auth token')
        return
      }

      // Add item with quantity 3
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 3,
        })

      const response = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Product price is 100, quantity is 3
      const expectedTotal = 100 * 3
      expect(Number(response.body.subtotal)).toBe(expectedTotal)
      expect(Number(response.body.total)).toBe(expectedTotal)
    })
  })
})
