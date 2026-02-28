import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as request from 'supertest'
import { ProductModule } from './product.module'
import { AuthModule } from '../auth/auth.module'
import { Order } from '../../entities/order.entity'
import { OrderItem } from '../../entities/order-item.entity'
import { User } from '../../entities/user.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { Product } from '../../entities/product.entity'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { OrderStatus, UserRole, VerificationStatus } from '../../common/enums'
import { DataSource } from 'typeorm'

describe('Order Tracking Integration Tests', () => {
  let app: INestApplication
  let dataSource: DataSource
  let authToken: string
  let userId: string
  let supplierId: string
  let orderId: string

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
          entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
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
    await dataSource.getRepository(CartItem).delete({})
    await dataSource.getRepository(Cart).delete({})
    await dataSource.getRepository(OrderItem).delete({})
    await dataSource.getRepository(Order).delete({})
    await dataSource.getRepository(Product).delete({})
    await dataSource.getRepository(SupplierProfile).delete({})
    await dataSource.getRepository(User).delete({})

    // Create test user
    const userRepo = dataSource.getRepository(User)
    const user = await userRepo.save({
      email: 'tracking-test@example.com',
      passwordHash: 'hashed_password',
      role: UserRole.USER,
      isEmailVerified: true,
    })
    userId = user.id

    // Create test supplier
    const supplierUser = await userRepo.save({
      email: 'supplier-tracking@example.com',
      passwordHash: 'hashed_password',
      role: UserRole.SUPPLIER,
      isEmailVerified: true,
    })

    const supplierRepo = dataSource.getRepository(SupplierProfile)
    const supplier = await supplierRepo.save({
      userId: supplierUser.id,
      companyName: 'Test Supplier',
      taxId: 'TAX123',
      businessAddress: {
        address: '123 Supplier St',
        city: 'Mexico City',
        state: 'CDMX',
        country: 'Mexico',
        postalCode: '12345',
      },
      contactPhone: '+525512345678',
      contactEmail: 'supplier@example.com',
      verificationStatus: VerificationStatus.VERIFIED,
    })
    supplierId = supplier.id

    // Create test product
    const productRepo = dataSource.getRepository(Product)
    const product = await productRepo.save({
      supplierId: supplier.id,
      name: 'Test Product',
      description: 'Test Description',
      category: 'electronics',
      price: 100,
      currency: 'MXN',
      stockQuantity: 10,
      isAvailable: true,
    })

    // Create test order
    const orderRepo = dataSource.getRepository(Order)
    const order = await orderRepo.save({
      orderNumber: 'ORD-TEST-123',
      userId: user.id,
      supplierId: supplier.id,
      subtotal: 100,
      shippingCost: 0,
      tax: 0,
      total: 100,
      currency: 'MXN',
      status: OrderStatus.CONFIRMED,
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
      estimatedDelivery: new Date('2024-03-01'),
    })
    orderId = order.id

    // Create order item
    const orderItemRepo = dataSource.getRepository(OrderItem)
    await orderItemRepo.save({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      productImage: '',
      quantity: 1,
      price: product.price,
      subtotal: product.price,
    })

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'tracking-test@example.com',
      password: 'hashed_password',
    })

    authToken = loginResponse.body.accessToken
  })

  describe('POST /products/orders/:id/tracking', () => {
    it('should add tracking information and update status to SHIPPED', async () => {
      const trackingData = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      }

      const response = await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(trackingData)
        .expect(201)

      expect(response.body).toMatchObject({
        id: orderId,
        trackingNumber: trackingData.trackingNumber,
        carrier: trackingData.carrier,
        status: OrderStatus.SHIPPED,
      })
      expect(response.body.shippedAt).toBeDefined()
      expect(new Date(response.body.shippedAt)).toBeInstanceOf(Date)
    })

    it('should return 400 if order is already shipped', async () => {
      // First, add tracking
      await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        })
        .expect(201)

      // Try to add tracking again
      const response = await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'NEW-TRACKING',
          carrier: 'FedEx',
        })
        .expect(400)

      expect(response.body.message).toContain('Cannot add tracking info')
    })

    it('should return 404 if order does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/products/orders/00000000-0000-0000-0000-000000000000/tracking')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        })
        .expect(404)

      expect(response.body.message).toContain('not found')
    })

    it('should return 400 if tracking number is missing', async () => {
      await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          carrier: 'UPS',
        })
        .expect(400)
    })

    it('should return 400 if carrier is missing', async () => {
      await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: '1Z999AA10123456784',
        })
        .expect(400)
    })

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .send({
          trackingNumber: '1Z999AA10123456784',
          carrier: 'UPS',
        })
        .expect(401)
    })
  })

  describe('GET /products/orders/:id/tracking', () => {
    it('should return tracking information for an order with tracking', async () => {
      // Add tracking first
      const trackingData = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      }

      await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(trackingData)

      // Get tracking info
      const response = await request(app.getHttpServer())
        .get(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        orderId,
        orderNumber: 'ORD-TEST-123',
        trackingNumber: trackingData.trackingNumber,
        carrier: trackingData.carrier,
        status: OrderStatus.SHIPPED,
      })
      expect(response.body.shippedAt).toBeDefined()
      expect(response.body.estimatedDelivery).toBeDefined()
    })

    it('should return null tracking info for order without tracking', async () => {
      const response = await request(app.getHttpServer())
        .get(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        orderId,
        orderNumber: 'ORD-TEST-123',
        trackingNumber: null,
        carrier: null,
        status: OrderStatus.CONFIRMED,
        shippedAt: null,
        deliveredAt: null,
      })
      expect(response.body.estimatedDelivery).toBeDefined()
    })

    it('should return 404 if order does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/orders/00000000-0000-0000-0000-000000000000/tracking')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.message).toContain('not found')
    })

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer()).get(`/products/orders/${orderId}/tracking`).expect(401)
    })
  })

  describe('Tracking workflow', () => {
    it('should complete full tracking workflow from confirmed to delivered', async () => {
      // 1. Add tracking (should update to SHIPPED)
      const trackingData = {
        trackingNumber: '1Z999AA10123456784',
        carrier: 'UPS',
      }

      const addTrackingResponse = await request(app.getHttpServer())
        .post(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(trackingData)
        .expect(201)

      expect(addTrackingResponse.body.status).toBe(OrderStatus.SHIPPED)

      // 2. Get tracking info
      const trackingResponse = await request(app.getHttpServer())
        .get(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(trackingResponse.body.trackingNumber).toBe(trackingData.trackingNumber)
      expect(trackingResponse.body.carrier).toBe(trackingData.carrier)
      expect(trackingResponse.body.status).toBe(OrderStatus.SHIPPED)

      // 3. Update to delivered
      const deliveredResponse = await request(app.getHttpServer())
        .put(`/products/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: OrderStatus.DELIVERED })
        .expect(200)

      expect(deliveredResponse.body.status).toBe(OrderStatus.DELIVERED)
      expect(deliveredResponse.body.deliveredAt).toBeDefined()

      // 4. Verify tracking info includes delivery date
      const finalTrackingResponse = await request(app.getHttpServer())
        .get(`/products/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(finalTrackingResponse.body.status).toBe(OrderStatus.DELIVERED)
      expect(finalTrackingResponse.body.deliveredAt).toBeDefined()
    })
  })
})
