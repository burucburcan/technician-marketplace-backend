import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import * as request from 'supertest'
import { AdminModule } from './admin.module'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { BookingModule } from '../booking/booking.module'
import { getDatabaseConfig } from '../../config/database.config'
import { User } from '../../entities/user.entity'
import { Booking } from '../../entities/booking.entity'
import { Dispute } from '../../entities/dispute.entity'
import {
  UserRole,
  BookingStatus,
  IssueType,
  DisputeStatus,
  ProfessionalType,
} from '../../common/enums'
import { Repository } from 'typeorm'
import { getRepositoryToken } from '@nestjs/typeorm'

describe('Admin Dispute Management (Integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let bookingRepository: Repository<Booking>
  let disputeRepository: Repository<Dispute>
  let adminToken: string
  let adminUser: User
  let regularUser: User
  let professionalUser: User
  let testBooking: Booking
  let testDispute: Dispute

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: getDatabaseConfig,
          inject: [ConfigService],
        }),
        AuthModule,
        UserModule,
        BookingModule,
        AdminModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User))
    bookingRepository = moduleFixture.get<Repository<Booking>>(getRepositoryToken(Booking))
    disputeRepository = moduleFixture.get<Repository<Dispute>>(getRepositoryToken(Dispute))

    // Create test users
    adminUser = await userRepository.save({
      email: 'admin@test.com',
      passwordHash: '$2b$10$test',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    })

    regularUser = await userRepository.save({
      email: 'user@test.com',
      passwordHash: '$2b$10$test',
      role: UserRole.USER,
      isEmailVerified: true,
    })

    professionalUser = await userRepository.save({
      email: 'professional@test.com',
      passwordHash: '$2b$10$test',
      role: UserRole.PROFESSIONAL,
      isEmailVerified: true,
    })

    // Get admin token
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin@test.com',
      password: 'test',
    })

    adminToken = loginResponse.body.accessToken

    // Create test booking
    testBooking = await bookingRepository.save({
      userId: regularUser.id,
      professionalId: professionalUser.id,
      professionalType: ProfessionalType.HANDYMAN,
      serviceCategory: 'plumbing',
      status: BookingStatus.DISPUTED,
      scheduledDate: new Date(),
      estimatedDuration: 120,
      serviceAddress: {
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
        coordinates: { latitude: 0, longitude: 0 },
      },
      description: 'Test booking',
      estimatedPrice: 100,
    })

    // Create test dispute
    testDispute = await disputeRepository.save({
      bookingId: testBooking.id,
      reporterId: regularUser.id,
      reportedUserId: professionalUser.id,
      issueType: IssueType.POOR_QUALITY,
      description: 'Poor quality work',
      status: DisputeStatus.OPEN,
    })
  })

  afterAll(async () => {
    // Clean up
    await disputeRepository.delete({})
    await bookingRepository.delete({})
    await userRepository.delete({})
    await app.close()
  })

  describe('GET /admin/disputes', () => {
    it('should list all disputes', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('data')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('page')
      expect(response.body).toHaveProperty('limit')
      expect(Array.isArray(response.body.data)).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('should filter disputes by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/disputes')
        .query({ status: DisputeStatus.OPEN })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.every((d: any) => d.status === DisputeStatus.OPEN)).toBe(true)
    })

    it('should filter disputes by issue type', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/disputes')
        .query({ issueType: IssueType.POOR_QUALITY })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.every((d: any) => d.issueType === IssueType.POOR_QUALITY)).toBe(
        true
      )
    })

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/disputes')
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.page).toBe(1)
      expect(response.body.limit).toBe(5)
      expect(response.body.data.length).toBeLessThanOrEqual(5)
    })

    it('should require admin role', async () => {
      // Try with regular user token
      const userLoginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'user@test.com',
        password: 'test',
      })

      await request(app.getHttpServer())
        .get('/admin/disputes')
        .set('Authorization', `Bearer ${userLoginResponse.body.accessToken}`)
        .expect(403)
    })
  })

  describe('GET /admin/disputes/:id', () => {
    it('should get dispute details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/disputes/${testDispute.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', testDispute.id)
      expect(response.body).toHaveProperty('bookingId', testBooking.id)
      expect(response.body).toHaveProperty('issueType', IssueType.POOR_QUALITY)
      expect(response.body).toHaveProperty('status', DisputeStatus.OPEN)
      expect(response.body).toHaveProperty('booking')
      expect(response.body).toHaveProperty('reporter')
      expect(response.body).toHaveProperty('reportedUser')
    })

    it('should return 404 for non-existent dispute', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      await request(app.getHttpServer())
        .get(`/admin/disputes/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })
  })

  describe('PUT /admin/disputes/:id/resolve', () => {
    it('should resolve a dispute', async () => {
      const response = await request(app.getHttpServer())
        .put(`/admin/disputes/${testDispute.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolutionNotes: 'Issue resolved after investigation',
          adminAction: 'Refund issued to customer',
        })
        .expect(200)

      expect(response.body).toHaveProperty('status', DisputeStatus.RESOLVED)
      expect(response.body).toHaveProperty('resolutionNotes', 'Issue resolved after investigation')
      expect(response.body).toHaveProperty('adminAction', 'Refund issued to customer')
      expect(response.body).toHaveProperty('resolvedBy', adminUser.id)
      expect(response.body).toHaveProperty('resolvedAt')

      // Verify booking status was updated
      const updatedBooking = await bookingRepository.findOne({
        where: { id: testBooking.id },
      })
      expect(updatedBooking?.status).toBe(BookingStatus.RESOLVED)
    })

    it('should not resolve already resolved dispute', async () => {
      // Create a resolved dispute
      const resolvedDispute = await disputeRepository.save({
        bookingId: testBooking.id,
        reporterId: regularUser.id,
        reportedUserId: professionalUser.id,
        issueType: IssueType.NO_SHOW,
        description: 'Already resolved',
        status: DisputeStatus.RESOLVED,
        resolvedBy: adminUser.id,
        resolvedAt: new Date(),
      })

      await request(app.getHttpServer())
        .put(`/admin/disputes/${resolvedDispute.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolutionNotes: 'Trying to resolve again',
        })
        .expect(400)

      // Clean up
      await disputeRepository.delete(resolvedDispute.id)
    })

    it('should validate resolution notes', async () => {
      // Create a new dispute for this test
      const newDispute = await disputeRepository.save({
        bookingId: testBooking.id,
        reporterId: regularUser.id,
        reportedUserId: professionalUser.id,
        issueType: IssueType.DAMAGE,
        description: 'Test dispute',
        status: DisputeStatus.OPEN,
      })

      await request(app.getHttpServer())
        .put(`/admin/disputes/${newDispute.id}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing resolutionNotes
          adminAction: 'Some action',
        })
        .expect(400)

      // Clean up
      await disputeRepository.delete(newDispute.id)
    })
  })

  describe('Dispute Filtering', () => {
    beforeAll(async () => {
      // Create multiple disputes with different statuses and types
      await disputeRepository.save([
        {
          bookingId: testBooking.id,
          reporterId: regularUser.id,
          reportedUserId: professionalUser.id,
          issueType: IssueType.NO_SHOW,
          description: 'Professional did not show up',
          status: DisputeStatus.IN_REVIEW,
        },
        {
          bookingId: testBooking.id,
          reporterId: regularUser.id,
          reportedUserId: professionalUser.id,
          issueType: IssueType.PRICING_DISPUTE,
          description: 'Price was higher than agreed',
          status: DisputeStatus.OPEN,
        },
      ])
    })

    it('should filter by date range', async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const response = await request(app.getHttpServer())
        .get('/admin/disputes')
        .query({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('should combine multiple filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/disputes')
        .query({
          status: DisputeStatus.OPEN,
          issueType: IssueType.PRICING_DISPUTE,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(
        response.body.data.every(
          (d: any) => d.status === DisputeStatus.OPEN && d.issueType === IssueType.PRICING_DISPUTE
        )
      ).toBe(true)
    })
  })
})
