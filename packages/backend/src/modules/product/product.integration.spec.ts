import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'
import { ProductModule } from './product.module'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { User } from '../../entities/user.entity'
import { getDatabaseConfig } from '../../config/database.config'

// Test response type interfaces
interface ProductResponse {
  id: string
  price: number
  category: string
  brand: string
  name: string
  description: string
  supplierId: string
}

interface OrderResponse {
  id: string
  userId: string
  supplierId: string
  orderNumber: string
  total: number
  status: string
}

describe('ProductController (Integration)', () => {
  let app: INestApplication
  let createdProductId: string
  let createdSupplierId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          useFactory: getDatabaseConfig,
        }),
        TypeOrmModule.forFeature([Product, ProductImage, SupplierProfile, User]),
        ProductModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    // Create test supplier and product
    const userRepo = app.get('UserRepository')
    const supplierRepo = app.get('SupplierProfileRepository')
    const productRepo = app.get('ProductRepository')

    const user = await userRepo.save({
      email: 'supplier@test.com',
      passwordHash: 'hash',
      role: 'supplier',
      isEmailVerified: true,
    })

    const supplier = await supplierRepo.save({
      userId: user.id,
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
      verificationStatus: 'verified',
    })

    createdSupplierId = supplier.id

    const product = await productRepo.save({
      supplierId: supplier.id,
      name: 'Test Product',
      description: 'Test Description',
      category: 'electronics',
      price: 100,
      currency: 'MXN',
      stockQuantity: 10,
      isAvailable: true,
      brand: 'TestBrand',
      model: 'TestModel',
      rating: 4.5,
      totalReviews: 10,
    })

    createdProductId = product.id
  })

  afterAll(async () => {
    // Clean up test data
    const productRepo = app.get('ProductRepository')
    const supplierRepo = app.get('SupplierProfileRepository')
    const userRepo = app.get('UserRepository')

    if (createdProductId) {
      await productRepo.delete(createdProductId)
    }
    if (createdSupplierId) {
      const supplier = await supplierRepo.findOne({ where: { id: createdSupplierId } })
      if (supplier) {
        await supplierRepo.delete(createdSupplierId)
        await userRepo.delete(supplier.userId)
      }
    }

    await app.close()
  })

  describe('POST /products/search', () => {
    it('should search products successfully', () => {
      return request(app.getHttpServer())
        .post('/products/search')
        .send({
          category: 'electronics',
          page: 1,
          pageSize: 20,
        })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('products')
          expect(res.body).toHaveProperty('total')
          expect(res.body).toHaveProperty('page', 1)
          expect(res.body).toHaveProperty('pageSize', 20)
          expect(Array.isArray(res.body.products)).toBe(true)
        })
    })

    it('should filter by price range', () => {
      return request(app.getHttpServer())
        .post('/products/search')
        .send({
          minPrice: 50,
          maxPrice: 150,
          page: 1,
          pageSize: 20,
        })
        .expect(201)
        .expect(res => {
          expect(
            res.body.products.every((p: ProductResponse) => p.price >= 50 && p.price <= 150)
          ).toBe(true)
        })
    })

    it('should sort by price', () => {
      return request(app.getHttpServer())
        .post('/products/search')
        .send({
          sortBy: 'price',
          page: 1,
          pageSize: 20,
        })
        .expect(201)
        .expect(res => {
          const prices = res.body.products.map((p: ProductResponse) => p.price)
          const sortedPrices = [...prices].sort((a, b) => a - b)
          expect(prices).toEqual(sortedPrices)
        })
    })

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/products/search')
        .send({
          page: -1, // Invalid page number
        })
        .expect(400)
    })
  })

  describe('GET /products/category/:category', () => {
    it('should get products by category', () => {
      return request(app.getHttpServer())
        .get('/products/category/electronics')
        .query({ page: 1, pageSize: 20 })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('products')
          expect(res.body).toHaveProperty('total')
          expect(
            res.body.products.every((p: ProductResponse) => p.category === 'electronics')
          ).toBe(true)
        })
    })

    it('should apply filters', () => {
      return request(app.getHttpServer())
        .get('/products/category/electronics')
        .query({
          brand: 'TestBrand',
          inStock: true,
          page: 1,
          pageSize: 20,
        })
        .expect(200)
        .expect(res => {
          expect(res.body.products.every((p: ProductResponse) => p.brand === 'TestBrand')).toBe(
            true
          )
        })
    })
  })

  describe('GET /products/:id', () => {
    it('should get product details', () => {
      return request(app.getHttpServer())
        .get(`/products/${createdProductId}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('id', createdProductId)
          expect(res.body).toHaveProperty('name', 'Test Product')
          expect(res.body).toHaveProperty('category', 'electronics')
          expect(res.body).toHaveProperty('images')
          expect(res.body).toHaveProperty('supplier')
        })
    })

    it('should return 404 for non-existent product', () => {
      return request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(404)
    })
  })

  describe('Order Authorization', () => {
    let user1Token: string
    let user2Token: string
    let supplierToken: string
    let user1Id: string
    let user2Id: string
    let authSupplierId: string
    let order1Id: string
    let order2Id: string

    beforeAll(async () => {
      const userRepo = app.get('UserRepository')
      const supplierRepo = app.get('SupplierProfileRepository')
      const orderRepo = app.get('OrderRepository')
      const authService = app.get('AuthService')

      // Create user 1
      const user1 = await userRepo.save({
        email: 'user1@test.com',
        passwordHash: 'hash',
        role: 'user',
        isEmailVerified: true,
      })
      user1Id = user1.id
      user1Token = await authService.generateToken(user1)

      // Create user 2
      const user2 = await userRepo.save({
        email: 'user2@test.com',
        passwordHash: 'hash',
        role: 'user',
        isEmailVerified: true,
      })
      user2Id = user2.id
      user2Token = await authService.generateToken(user2)

      // Create supplier
      const supplierUser = await userRepo.save({
        email: 'supplier2@test.com',
        passwordHash: 'hash',
        role: 'supplier',
        isEmailVerified: true,
      })

      const supplier = await supplierRepo.save({
        userId: supplierUser.id,
        companyName: 'Test Supplier 2',
        taxId: 'TAX456',
        businessAddress: {
          address: '456 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '54321',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        contactPhone: '0987654321',
        contactEmail: 'supplier2@test.com',
        verificationStatus: 'verified',
      })
      authSupplierId = supplier.id
      supplierToken = await authService.generateToken({ ...supplierUser, supplierId: supplier.id })

      // Create order for user 1
      const order1 = await orderRepo.save({
        orderNumber: 'TEST-ORDER-1',
        userId: user1Id,
        supplierId: authSupplierId,
        subtotal: 100,
        shippingCost: 10,
        tax: 5,
        total: 115,
        currency: 'MXN',
        status: 'pending',
        shippingAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
        },
        billingAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
        },
        paymentMethod: 'credit_card',
        paymentStatus: 'pending',
      })
      order1Id = order1.id

      // Create order for user 2
      const order2 = await orderRepo.save({
        orderNumber: 'TEST-ORDER-2',
        userId: user2Id,
        supplierId: authSupplierId,
        subtotal: 200,
        shippingCost: 20,
        tax: 10,
        total: 230,
        currency: 'MXN',
        status: 'pending',
        shippingAddress: {
          address: '456 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '54321',
        },
        billingAddress: {
          address: '456 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '54321',
        },
        paymentMethod: 'credit_card',
        paymentStatus: 'pending',
      })
      order2Id = order2.id
    })

    afterAll(async () => {
      const orderRepo = app.get('OrderRepository')
      const supplierRepo = app.get('SupplierProfileRepository')
      const userRepo = app.get('UserRepository')

      // Clean up orders
      if (order1Id) await orderRepo.delete(order1Id)
      if (order2Id) await orderRepo.delete(order2Id)

      // Clean up supplier
      if (authSupplierId) {
        const supplier = await supplierRepo.findOne({ where: { id: authSupplierId } })
        if (supplier) {
          await supplierRepo.delete(authSupplierId)
          await userRepo.delete(supplier.userId)
        }
      }

      // Clean up users
      if (user1Id) await userRepo.delete(user1Id)
      if (user2Id) await userRepo.delete(user2Id)
    })

    describe('GET /products/orders/:id', () => {
      it('should allow users to view their own orders', () => {
        return request(app.getHttpServer())
          .get(`/products/orders/${order1Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect(res => {
            expect(res.body).toHaveProperty('id', order1Id)
            expect(res.body).toHaveProperty('userId', user1Id)
          })
      })

      it('should not allow users to view other users orders', () => {
        return request(app.getHttpServer())
          .get(`/products/orders/${order1Id}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(403)
          .expect(res => {
            expect(res.body.message).toContain('permission')
          })
      })

      it('should allow suppliers to view their orders', () => {
        return request(app.getHttpServer())
          .get(`/products/orders/${order1Id}`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .expect(200)
          .expect(res => {
            expect(res.body).toHaveProperty('id', order1Id)
            expect(res.body).toHaveProperty('supplierId', authSupplierId)
          })
      })
    })

    describe('GET /users/:id/orders', () => {
      it('should allow users to view their own orders list', () => {
        return request(app.getHttpServer())
          .get(`/users/${user1Id}/orders`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect(res => {
            expect(res.body).toHaveProperty('orders')
            expect(Array.isArray(res.body.orders)).toBe(true)
            expect(res.body.orders.every((o: OrderResponse) => o.userId === user1Id)).toBe(true)
          })
      })

      it('should not allow users to view other users orders list', () => {
        return request(app.getHttpServer())
          .get(`/users/${user1Id}/orders`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(403)
          .expect(res => {
            expect(res.body.message).toContain('permission')
          })
      })
    })

    describe('GET /suppliers/:id/orders', () => {
      it('should allow suppliers to view their own orders list', () => {
        return request(app.getHttpServer())
          .get(`/suppliers/${authSupplierId}/orders`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .expect(200)
          .expect(res => {
            expect(res.body).toHaveProperty('orders')
            expect(Array.isArray(res.body.orders)).toBe(true)
            expect(
              res.body.orders.every((o: OrderResponse) => o.supplierId === authSupplierId)
            ).toBe(true)
          })
      })

      it('should not allow non-suppliers to view supplier orders', () => {
        return request(app.getHttpServer())
          .get(`/suppliers/${authSupplierId}/orders`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(403)
          .expect(res => {
            expect(res.body.message).toContain('suppliers')
          })
      })
    })
  })

  describe('Order Status Management', () => {
    let userToken: string
    let supplierToken: string
    let userId: string
    let supplierId: string
    let orderId: string

    beforeAll(async () => {
      const userRepo = app.get('UserRepository')
      const supplierRepo = app.get('SupplierProfileRepository')
      const orderRepo = app.get('OrderRepository')
      const authService = app.get('AuthService')

      // Create user
      const user = await userRepo.save({
        email: 'statususer@test.com',
        passwordHash: 'hash',
        role: 'user',
        isEmailVerified: true,
      })
      userId = user.id
      userToken = await authService.generateToken(user)

      // Create supplier
      const supplierUser = await userRepo.save({
        email: 'statussupplier@test.com',
        passwordHash: 'hash',
        role: 'supplier',
        isEmailVerified: true,
      })

      const supplier = await supplierRepo.save({
        userId: supplierUser.id,
        companyName: 'Status Test Supplier',
        taxId: 'TAX789',
        businessAddress: {
          address: '789 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '78901',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        contactPhone: '1112223333',
        contactEmail: 'statussupplier@test.com',
        verificationStatus: 'verified',
      })
      supplierId = supplier.id
      supplierToken = await authService.generateToken({ ...supplierUser, supplierId: supplier.id })

      // Create order
      const order = await orderRepo.save({
        orderNumber: 'TEST-STATUS-ORDER',
        userId: userId,
        supplierId: supplierId,
        subtotal: 100,
        shippingCost: 10,
        tax: 5,
        total: 115,
        currency: 'MXN',
        status: 'pending',
        shippingAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
        },
        billingAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
        },
        paymentMethod: 'credit_card',
        paymentStatus: 'pending',
      })
      orderId = order.id
    })

    afterAll(async () => {
      const orderRepo = app.get('OrderRepository')
      const supplierRepo = app.get('SupplierProfileRepository')
      const userRepo = app.get('UserRepository')

      // Clean up order
      if (orderId) await orderRepo.delete(orderId)

      // Clean up supplier
      if (supplierId) {
        const supplier = await supplierRepo.findOne({ where: { id: supplierId } })
        if (supplier) {
          await supplierRepo.delete(supplierId)
          await userRepo.delete(supplier.userId)
        }
      }

      // Clean up user
      if (userId) await userRepo.delete(userId)
    })

    describe('PUT /products/orders/:id/status', () => {
      it('should allow supplier to update order from PENDING to CONFIRMED', async () => {
        const response = await request(app.getHttpServer())
          .put(`/products/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'confirmed' })
          .expect(200)

        expect(response.body).toHaveProperty('status', 'confirmed')
        expect(response.body).toHaveProperty('confirmedAt')
        expect(response.body.confirmedAt).not.toBeNull()
      })

      it('should allow supplier to update order from CONFIRMED to PREPARING', async () => {
        const response = await request(app.getHttpServer())
          .put(`/products/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'preparing' })
          .expect(200)

        expect(response.body).toHaveProperty('status', 'preparing')
      })

      it('should allow supplier to update order from PREPARING to SHIPPED with tracking', async () => {
        const response = await request(app.getHttpServer())
          .put(`/products/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({
            status: 'shipped',
            trackingNumber: 'TRACK123456',
            carrier: 'DHL',
          })
          .expect(200)

        expect(response.body).toHaveProperty('status', 'shipped')
        expect(response.body).toHaveProperty('shippedAt')
        expect(response.body.shippedAt).not.toBeNull()
        expect(response.body).toHaveProperty('trackingNumber', 'TRACK123456')
        expect(response.body).toHaveProperty('carrier', 'DHL')
      })

      it('should allow supplier to update order from SHIPPED to DELIVERED', async () => {
        const response = await request(app.getHttpServer())
          .put(`/products/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'delivered' })
          .expect(200)

        expect(response.body).toHaveProperty('status', 'delivered')
        expect(response.body).toHaveProperty('deliveredAt')
        expect(response.body.deliveredAt).not.toBeNull()
      })

      it('should not allow user to update order status', async () => {
        // Create a new order for this test
        const orderRepo = app.get('OrderRepository')
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-USER-UPDATE',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'pending',
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ status: 'confirmed' })
          .expect(403)
          .expect(res => {
            expect(res.body.message).toContain('supplier')
          })

        // Clean up
        await orderRepo.delete(testOrder.id)
      })

      it('should reject invalid status transitions', async () => {
        // Create a new order in PENDING state
        const orderRepo = app.get('OrderRepository')
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-INVALID-TRANSITION',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'pending',
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        // Try to jump from PENDING to SHIPPED (invalid)
        await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'shipped' })
          .expect(400)
          .expect(res => {
            expect(res.body.message).toContain('Invalid status transition')
          })

        // Clean up
        await orderRepo.delete(testOrder.id)
      })

      it('should reject updates to terminal states', async () => {
        // Create a new order in DELIVERED state
        const orderRepo = app.get('OrderRepository')
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-TERMINAL-STATE',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'delivered',
          deliveredAt: new Date(),
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        // Try to change from DELIVERED to CONFIRMED (invalid)
        await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'confirmed' })
          .expect(400)
          .expect(res => {
            expect(res.body.message).toContain('Invalid status transition')
          })

        // Clean up
        await orderRepo.delete(testOrder.id)
      })

      it('should allow cancellation from PENDING state', async () => {
        // Create a new order for cancellation test
        const orderRepo = app.get('OrderRepository')
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-CANCEL-PENDING',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'pending',
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        const response = await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'cancelled' })
          .expect(200)

        expect(response.body).toHaveProperty('status', 'cancelled')
        expect(response.body).toHaveProperty('cancelledAt')
        expect(response.body.cancelledAt).not.toBeNull()

        // Clean up
        await orderRepo.delete(testOrder.id)
      })

      it('should allow cancellation from CONFIRMED state', async () => {
        // Create a new order in CONFIRMED state
        const orderRepo = app.get('OrderRepository')
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-CANCEL-CONFIRMED',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'confirmed',
          confirmedAt: new Date(),
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        const response = await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'cancelled' })
          .expect(200)

        expect(response.body).toHaveProperty('status', 'cancelled')
        expect(response.body).toHaveProperty('cancelledAt')

        // Clean up
        await orderRepo.delete(testOrder.id)
      })

      it('should allow cancellation from PREPARING state', async () => {
        // Create a new order in PREPARING state
        const orderRepo = app.get('OrderRepository')
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-CANCEL-PREPARING',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'preparing',
          confirmedAt: new Date(),
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        const response = await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'cancelled' })
          .expect(200)

        expect(response.body).toHaveProperty('status', 'cancelled')

        // Clean up
        await orderRepo.delete(testOrder.id)
      })

      it('should not allow cancellation from SHIPPED state', async () => {
        // Create a new order in SHIPPED state
        const orderRepo = app.get('OrderRepository')
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-CANCEL-SHIPPED',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'shipped',
          confirmedAt: new Date(),
          shippedAt: new Date(),
          trackingNumber: 'TRACK999',
          carrier: 'FedEx',
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'cancelled' })
          .expect(400)
          .expect(res => {
            expect(res.body.message).toContain('Invalid status transition')
          })

        // Clean up
        await orderRepo.delete(testOrder.id)
      })

      it('should send notification when order status is updated', async () => {
        // Create a new order for this test
        const orderRepo = app.get('OrderRepository')
        const notificationRepo = app.get('NotificationRepository')
        
        const testOrder = await orderRepo.save({
          orderNumber: 'TEST-NOTIFICATION',
          userId: userId,
          supplierId: supplierId,
          subtotal: 50,
          shippingCost: 5,
          tax: 2.5,
          total: 57.5,
          currency: 'MXN',
          status: 'pending',
          shippingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          billingAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
          },
          paymentMethod: 'credit_card',
          paymentStatus: 'pending',
        })

        // Update order status to confirmed
        await request(app.getHttpServer())
          .put(`/products/orders/${testOrder.id}/status`)
          .set('Authorization', `Bearer ${supplierToken}`)
          .send({ status: 'confirmed' })
          .expect(200)

        // Check that notification was created
        const notifications = await notificationRepo.find({
          where: { userId: userId },
          order: { createdAt: 'DESC' },
        })

        const orderNotification = notifications.find(
          (n: any) => n.type === 'order_confirmed' && n.data?.orderId === testOrder.id
        )

        expect(orderNotification).toBeDefined()
        expect(orderNotification?.title).toContain('Order')
        expect(orderNotification?.title).toContain('Status Updated')

        // Clean up
        if (orderNotification) await notificationRepo.delete(orderNotification.id)
        await orderRepo.delete(testOrder.id)
      })
    })
  })
})
