import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProductModule } from './product.module'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { SupplierModule } from '../supplier/supplier.module'
import { DataSource } from 'typeorm'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { Order } from '../../entities/order.entity'
import { OrderItem } from '../../entities/order-item.entity'
import { Payment } from '../../entities/payment.entity'
import { UserRole } from '../../common/enums'
import { VerificationStatus } from '../../common/enums/verification-status.enum'

describe('Order Creation Integration Tests', () => {
  let app: INestApplication
  let dataSource: DataSource
  let authToken: string
  let userId: string
  let supplierId: string
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
          database: process.env.DB_NAME || 'technician_marketplace_test',
          entities: [
            User,
            UserProfile,
            SupplierProfile,
            Product,
            ProductImage,
            Cart,
            CartItem,
            Order,
            OrderItem,
            Payment,
          ],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        UserModule,
        SupplierModule,
        ProductModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    // Clean up database
    await dataSource.query('TRUNCATE TABLE orders CASCADE')
    await dataSource.query('TRUNCATE TABLE carts CASCADE')
    await dataSource.query('TRUNCATE TABLE products CASCADE')
    await dataSource.query('TRUNCATE TABLE supplier_profiles CASCADE')
    await dataSource.query('TRUNCATE TABLE user_profiles CASCADE')
    await dataSource.query('TRUNCATE TABLE users CASCADE')

    // Create test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'Test123!@#',
        role: UserRole.USER,
      })
      .expect(201)

    userId = registerResponse.body.user.id

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'Test123!@#',
      })
      .expect(200)

    authToken = loginResponse.body.accessToken

    // Create supplier
    const supplierUser = await dataSource.getRepository(User).save({
      email: 'supplier@example.com',
      passwordHash: 'hashed',
      role: UserRole.USER,
      isEmailVerified: true,
    })

    const supplier = await dataSource.getRepository(SupplierProfile).save({
      userId: supplierUser.id,
      companyName: 'Test Supplier',
      taxId: 'TAX123',
      businessAddress: {
        address: '123 Supplier St',
        city: 'Mexico City',
        state: 'CDMX',
        country: 'Mexico',
        postalCode: '12345',
        coordinates: { latitude: 19.4326, longitude: -99.1332 },
      },
      contactPhone: '+525512345678',
      contactEmail: 'supplier@example.com',
      verificationStatus: VerificationStatus.VERIFIED,
      rating: 4.5,
      totalOrders: 0,
      responseRate: 100,
    })

    supplierId = supplier.id

    // Create product
    const product = await dataSource.getRepository(Product).save({
      supplierId,
      name: 'Test Product',
      description: 'Test product description',
      category: 'electronics',
      price: 100,
      currency: 'MXN',
      stockQuantity: 10,
      isAvailable: true,
      rating: 4.5,
      totalReviews: 0,
    })

    productId = product.id

    // Add product image
    await dataSource.getRepository(ProductImage).save({
      productId,
      imageUrl: 'https://example.com/image.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      displayOrder: 0,
    })
  })

  describe('POST /products/orders', () => {
    it('should create an order from cart items', async () => {
      // Add product to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        })
        .expect(201)

      // Create order
      const response = await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: {
              latitude: 19.4326,
              longitude: -99.1332,
            },
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      // Verify order was created
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('orderNumber')
      expect(response.body.userId).toBe(userId)
      expect(response.body.supplierId).toBe(supplierId)
      expect(response.body.status).toBe('pending')
      expect(response.body.paymentStatus).toBe('pending')
      expect(response.body.subtotal).toBe('200.00') // 2 * 100
      expect(response.body.total).toBe('200.00')
      expect(response.body.items).toHaveLength(1)
      expect(response.body.items[0].productId).toBe(productId)
      expect(response.body.items[0].quantity).toBe(2)
      expect(response.body.items[0].price).toBe('100.00')

      // Verify cart was cleared
      const cartResponse = await request(app.getHttpServer())
        .get('/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(cartResponse.body.items).toHaveLength(0)

      // Verify stock was decremented
      const productResponse = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200)

      expect(productResponse.body.stockQuantity).toBe(8) // 10 - 2
    })

    it('should fail if cart is empty', async () => {
      await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(400)
    })

    it('should fail if product is out of stock', async () => {
      // Add more items than available stock
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 15, // More than available (10)
        })
        .expect(400)
    })

    it('should mark product as unavailable when stock reaches zero', async () => {
      // Add all available stock to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 10,
        })
        .expect(201)

      // Create order
      await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      // Verify product is marked as unavailable
      const productResponse = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200)

      expect(productResponse.body.stockQuantity).toBe(0)
      expect(productResponse.body.isAvailable).toBe(false)
    })

    it('should generate unique order numbers', async () => {
      // Add product to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 1,
        })
        .expect(201)

      // Create first order
      const response1 = await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      // Add product to cart again
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 1,
        })
        .expect(201)

      // Create second order
      const response2 = await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      // Verify order numbers are different
      expect(response1.body.orderNumber).not.toBe(response2.body.orderNumber)
    })

    it('should set estimated delivery date', async () => {
      // Add product to cart
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 1,
        })
        .expect(201)

      // Create order
      const response = await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      // Verify estimated delivery is set (should be ~7 days from now)
      expect(response.body.estimatedDelivery).toBeDefined()
      const estimatedDate = new Date(response.body.estimatedDelivery)
      const now = new Date()
      const daysDiff = Math.floor((estimatedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBeGreaterThanOrEqual(6)
      expect(daysDiff).toBeLessThanOrEqual(8)
    })
  })

  describe('GET /products/orders/:id', () => {
    it('should retrieve an order by ID', async () => {
      // Add product to cart and create order
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId, quantity: 2 })
        .expect(201)

      const createResponse = await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      const orderId = createResponse.body.id

      // Retrieve order
      const response = await request(app.getHttpServer())
        .get(`/products/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.id).toBe(orderId)
      expect(response.body.userId).toBe(userId)
      expect(response.body.supplierId).toBe(supplierId)
      expect(response.body.items).toHaveLength(1)
      expect(response.body.supplier).toBeDefined()
      expect(response.body.user).toBeDefined()
    })

    it('should return 404 for non-existent order', async () => {
      const fakeOrderId = '00000000-0000-0000-0000-000000000000'
      await request(app.getHttpServer())
        .get(`/products/orders/${fakeOrderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('GET /users/:id/orders', () => {
    it('should retrieve all orders for a user', async () => {
      // Create multiple orders
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ productId, quantity: 1 })
          .expect(201)

        await request(app.getHttpServer())
          .post('/products/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            shippingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
              coordinates: { latitude: 19.4326, longitude: -99.1332 },
            },
            billingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
            },
            paymentMethod: 'credit_card',
          })
          .expect(201)
      }

      // Retrieve user orders
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.orders).toHaveLength(3)
      expect(response.body.total).toBe(3)
      expect(response.body.page).toBe(1)
      expect(response.body.orders[0].userId).toBe(userId)
    })

    it('should filter orders by status', async () => {
      // Create order
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId, quantity: 1 })
        .expect(201)

      await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      // Retrieve pending orders
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/orders?status=pending`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.orders).toHaveLength(1)
      expect(response.body.orders[0].status).toBe('pending')
    })

    it('should support pagination', async () => {
      // Create 5 orders
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ productId, quantity: 1 })
          .expect(201)

        await request(app.getHttpServer())
          .post('/products/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            shippingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
              coordinates: { latitude: 19.4326, longitude: -99.1332 },
            },
            billingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
            },
            paymentMethod: 'credit_card',
          })
          .expect(201)
      }

      // Get first page
      const page1 = await request(app.getHttpServer())
        .get(`/users/${userId}/orders?page=1&pageSize=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(page1.body.orders).toHaveLength(2)
      expect(page1.body.total).toBe(5)
      expect(page1.body.page).toBe(1)
      expect(page1.body.pageSize).toBe(2)

      // Get second page
      const page2 = await request(app.getHttpServer())
        .get(`/users/${userId}/orders?page=2&pageSize=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(page2.body.orders).toHaveLength(2)
      expect(page2.body.page).toBe(2)
    })

    it('should return orders in descending order by creation date', async () => {
      // Create multiple orders with delays
      const orderIds: string[] = []
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ productId, quantity: 1 })
          .expect(201)

        const response = await request(app.getHttpServer())
          .post('/products/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            shippingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
              coordinates: { latitude: 19.4326, longitude: -99.1332 },
            },
            billingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
            },
            paymentMethod: 'credit_card',
          })
          .expect(201)

        orderIds.push(response.body.id)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Retrieve orders
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify orders are in descending order (newest first)
      expect(response.body.orders[0].id).toBe(orderIds[2])
      expect(response.body.orders[1].id).toBe(orderIds[1])
      expect(response.body.orders[2].id).toBe(orderIds[0])
    })
  })

  describe('GET /suppliers/:id/orders', () => {
    it('should retrieve all orders for a supplier', async () => {
      // Create multiple orders
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ productId, quantity: 1 })
          .expect(201)

        await request(app.getHttpServer())
          .post('/products/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            shippingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
              coordinates: { latitude: 19.4326, longitude: -99.1332 },
            },
            billingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
            },
            paymentMethod: 'credit_card',
          })
          .expect(201)
      }

      // Retrieve supplier orders
      const response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}/orders`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.orders).toHaveLength(3)
      expect(response.body.total).toBe(3)
      expect(response.body.orders[0].supplierId).toBe(supplierId)
    })

    it('should filter supplier orders by status', async () => {
      // Create order
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId, quantity: 1 })
        .expect(201)

      await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      // Retrieve pending orders
      const response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}/orders?status=pending`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.orders).toHaveLength(1)
      expect(response.body.orders[0].status).toBe('pending')
    })

    it('should support pagination for supplier orders', async () => {
      // Create 5 orders
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/cart/items')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ productId, quantity: 1 })
          .expect(201)

        await request(app.getHttpServer())
          .post('/products/orders')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            shippingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
              coordinates: { latitude: 19.4326, longitude: -99.1332 },
            },
            billingAddress: {
              address: '123 Test St',
              city: 'Mexico City',
              state: 'CDMX',
              country: 'Mexico',
              postalCode: '12345',
            },
            paymentMethod: 'credit_card',
          })
          .expect(201)
      }

      // Get first page
      const page1 = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}/orders?page=1&pageSize=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(page1.body.orders).toHaveLength(2)
      expect(page1.body.total).toBe(5)
      expect(page1.body.page).toBe(1)
      expect(page1.body.pageSize).toBe(2)
    })
  })

  describe('PUT /products/orders/:id/status', () => {
    let orderId: string

    beforeEach(async () => {
      // Create an order for testing status updates
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId, quantity: 1 })
        .expect(201)

      const createResponse = await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      orderId = createResponse.body.id
    })

    it('should update order status from PENDING to CONFIRMED', async () => {
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      expect(response.body.status).toBe('confirmed')
      expect(response.body.confirmedAt).toBeDefined()
      expect(new Date(response.body.confirmedAt)).toBeInstanceOf(Date)
    })

    it('should update order status from CONFIRMED to PREPARING', async () => {
      // First confirm the order
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      // Then move to preparing
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      expect(response.body.status).toBe('preparing')
    })

    it('should update order status from PREPARING to SHIPPED with tracking info', async () => {
      // Move order to preparing state
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      // Ship the order with tracking
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'shipped',
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        })
        .expect(200)

      expect(response.body.status).toBe('shipped')
      expect(response.body.shippedAt).toBeDefined()
      expect(response.body.trackingNumber).toBe('1Z999AA10123456784')
      expect(response.body.carrier).toBe('UPS')
    })

    it('should update order status from SHIPPED to DELIVERED', async () => {
      // Move order through states to shipped
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' })
        .expect(200)

      // Deliver the order
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'delivered' })
        .expect(200)

      expect(response.body.status).toBe('delivered')
      expect(response.body.deliveredAt).toBeDefined()
    })

    it('should allow cancellation from PENDING status', async () => {
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'cancelled' })
        .expect(200)

      expect(response.body.status).toBe('cancelled')
      expect(response.body.cancelledAt).toBeDefined()
    })

    it('should allow cancellation from CONFIRMED status', async () => {
      // Confirm the order first
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      // Cancel it
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'cancelled' })
        .expect(200)

      expect(response.body.status).toBe('cancelled')
      expect(response.body.cancelledAt).toBeDefined()
    })

    it('should allow cancellation from PREPARING status', async () => {
      // Move to preparing
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      // Cancel it
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'cancelled' })
        .expect(200)

      expect(response.body.status).toBe('cancelled')
    })

    it('should reject invalid status transition from PENDING to PREPARING', async () => {
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(400)
    })

    it('should reject invalid status transition from PENDING to SHIPPED', async () => {
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' })
        .expect(400)
    })

    it('should reject invalid status transition from SHIPPED to CANCELLED', async () => {
      // Move order to shipped state
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' })
        .expect(200)

      // Try to cancel (should fail)
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'cancelled' })
        .expect(400)
    })

    it('should reject status changes from DELIVERED (terminal state)', async () => {
      // Move order to delivered state
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'delivered' })
        .expect(200)

      // Try to change status (should fail)
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'cancelled' })
        .expect(400)
    })

    it('should reject status changes from CANCELLED (terminal state)', async () => {
      // Cancel the order
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'cancelled' })
        .expect(200)

      // Try to change status (should fail)
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(400)
    })

    it('should return 404 for non-existent order', async () => {
      const fakeOrderId = '00000000-0000-0000-0000-000000000000'
      await request(app.getHttpServer())
        .put(`/products/orders/${fakeOrderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(404)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .send({ status: 'confirmed' })
        .expect(401)
    })
  })

  describe('PUT /products/orders/:id/cancel', () => {
    let orderId: string

    beforeEach(async () => {
      // Create an order for testing cancellation
      await request(app.getHttpServer())
        .post('/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId, quantity: 2 })
        .expect(201)

      const createResponse = await request(app.getHttpServer())
        .post('/products/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
        })
        .expect(201)

      orderId = createResponse.body.id
    })

    it('should cancel a PENDING order with reason', async () => {
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Customer changed mind' })
        .expect(200)

      expect(response.body.status).toBe('cancelled')
      expect(response.body.cancelledAt).toBeDefined()
      expect(response.body.cancellationReason).toBe('Customer changed mind')
    })

    it('should cancel a CONFIRMED order with reason', async () => {
      // Confirm the order first
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      // Cancel it
      const response = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Delivery address changed' })
        .expect(200)

      expect(response.body.status).toBe('cancelled')
      expect(response.body.cancelledAt).toBeDefined()
      expect(response.body.cancellationReason).toBe('Delivery address changed')
    })

    it('should restore product stock when order is cancelled', async () => {
      // Get initial stock
      const productBefore = await dataSource.getRepository(Product).findOne({
        where: { id: productId },
      })
      const initialStock = productBefore!.stockQuantity

      // Cancel the order
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test cancellation' })
        .expect(200)

      // Check stock was restored
      const productAfter = await dataSource.getRepository(Product).findOne({
        where: { id: productId },
      })
      expect(productAfter!.stockQuantity).toBe(initialStock + 2) // 2 items were in the order
    })

    it('should reject cancellation of PREPARING order', async () => {
      // Move order to preparing
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      // Try to cancel
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test reason' })
        .expect(400)
    })

    it('should reject cancellation of SHIPPED order', async () => {
      // Move order to shipped
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'preparing' })
        .expect(200)

      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'shipped' })
        .expect(200)

      // Try to cancel
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test reason' })
        .expect(400)
    })

    it('should reject cancellation without reason', async () => {
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)
    })

    it('should reject cancellation with empty reason', async () => {
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: '' })
        .expect(400)
    })

    it('should reject cancellation with reason exceeding max length', async () => {
      const longReason = 'A'.repeat(1001)
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: longReason })
        .expect(400)
    })

    it('should return 404 for non-existent order', async () => {
      const fakeOrderId = '00000000-0000-0000-0000-000000000000'
      await request(app.getHttpServer())
        .put(`/products/orders/${fakeOrderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Test reason' })
        .expect(404)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/cancel`)
        .send({ reason: 'Test reason' })
        .expect(401)
    })
  })
})
