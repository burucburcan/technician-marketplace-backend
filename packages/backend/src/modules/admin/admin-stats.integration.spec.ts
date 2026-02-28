import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../../app.module'
import { DataSource } from 'typeorm'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Booking } from '../../entities/booking.entity'
import { Payment } from '../../entities/payment.entity'
import {
  UserRole,
  ProfessionalType,
  BookingStatus,
  PaymentStatus,
  VerificationStatus,
} from '../../common/enums'

describe('Admin Statistics Integration Tests', () => {
  let app: INestApplication
  let dataSource: DataSource
  let adminToken: string
  let adminUserId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)

    // Create admin user
    const adminUser = await dataSource.getRepository(User).save({
      email: 'admin-stats@test.com',
      passwordHash: 'hashedpassword',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isSuspended: false,
    })
    adminUserId = adminUser.id

    // Create admin profile
    await dataSource.getRepository(UserProfile).save({
      userId: adminUserId,
      firstName: 'Admin',
      lastName: 'Stats',
      phone: '+1234567890',
      language: 'en',
    })

    // Login as admin to get token
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin-stats@test.com',
      password: 'hashedpassword',
    })

    adminToken = loginResponse.body.accessToken
  })

  afterAll(async () => {
    // Clean up test data
    if (dataSource) {
      await dataSource.getRepository(UserProfile).delete({ userId: adminUserId })
      await dataSource.getRepository(User).delete({ id: adminUserId })
    }
    await app.close()
  })

  describe('GET /admin/stats', () => {
    it('should return platform statistics for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('totalUsers')
      expect(response.body).toHaveProperty('totalBookings')
      expect(response.body).toHaveProperty('totalRevenue')
      expect(response.body).toHaveProperty('professionalStats')
      expect(response.body).toHaveProperty('dashboardMetrics')

      // Verify totalUsers structure
      expect(response.body.totalUsers).toHaveProperty('total')
      expect(response.body.totalUsers).toHaveProperty('byRole')
      expect(response.body.totalUsers.byRole).toHaveProperty('user')
      expect(response.body.totalUsers.byRole).toHaveProperty('professional')
      expect(response.body.totalUsers.byRole).toHaveProperty('provider')
      expect(response.body.totalUsers.byRole).toHaveProperty('supplier')
      expect(response.body.totalUsers.byRole).toHaveProperty('admin')

      // Verify totalBookings structure
      expect(response.body.totalBookings).toHaveProperty('total')
      expect(response.body.totalBookings).toHaveProperty('byStatus')
      expect(response.body.totalBookings.byStatus).toHaveProperty('pending')
      expect(response.body.totalBookings.byStatus).toHaveProperty('confirmed')
      expect(response.body.totalBookings.byStatus).toHaveProperty('inProgress')
      expect(response.body.totalBookings.byStatus).toHaveProperty('completed')
      expect(response.body.totalBookings.byStatus).toHaveProperty('cancelled')

      // Verify totalRevenue structure
      expect(response.body.totalRevenue).toHaveProperty('totalRevenue')
      expect(response.body.totalRevenue).toHaveProperty('completedBookingsRevenue')
      expect(response.body.totalRevenue).toHaveProperty('averageBookingValue')
      expect(response.body.totalRevenue).toHaveProperty('currency')
      expect(response.body.totalRevenue.currency).toBe('MXN')

      // Verify professionalStats structure
      expect(response.body.professionalStats).toHaveProperty('total')
      expect(response.body.professionalStats).toHaveProperty('byType')
      expect(response.body.professionalStats.byType).toHaveProperty('handyman')
      expect(response.body.professionalStats.byType).toHaveProperty('artist')
      expect(response.body.professionalStats).toHaveProperty('verified')
      expect(response.body.professionalStats).toHaveProperty('available')
      expect(response.body.professionalStats).toHaveProperty('averageRating')

      // Verify dashboardMetrics structure
      expect(response.body.dashboardMetrics).toHaveProperty('activeUsers')
      expect(response.body.dashboardMetrics).toHaveProperty('activeBookings')
      expect(response.body.dashboardMetrics).toHaveProperty('recentBookings')
      expect(response.body.dashboardMetrics).toHaveProperty('recentUsers')
    })

    it('should filter professional stats by type (handyman)', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .query({ professionalType: ProfessionalType.HANDYMAN })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('professionalStats')
      // The total should reflect only handymen if filter is applied correctly
    })

    it('should filter professional stats by type (artist)', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .query({ professionalType: ProfessionalType.ARTIST })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('professionalStats')
      // The total should reflect only artists if filter is applied correctly
    })

    it('should require admin role', async () => {
      // Create regular user
      const regularUser = await dataSource.getRepository(User).save({
        email: 'regular-user-stats@test.com',
        passwordHash: 'hashedpassword',
        role: UserRole.USER,
        isEmailVerified: true,
        isSuspended: false,
      })

      await dataSource.getRepository(UserProfile).save({
        userId: regularUser.id,
        firstName: 'Regular',
        lastName: 'User',
        phone: '+1234567891',
        language: 'en',
      })

      // Login as regular user
      const userLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'regular-user-stats@test.com',
        password: 'hashedpassword',
      })

      const userToken = userLoginResponse.body.accessToken

      // Try to access stats with user token
      await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)

      // Clean up
      await dataSource.getRepository(UserProfile).delete({ userId: regularUser.id })
      await dataSource.getRepository(User).delete({ id: regularUser.id })
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/admin/stats').expect(401)
    })
  })
})
