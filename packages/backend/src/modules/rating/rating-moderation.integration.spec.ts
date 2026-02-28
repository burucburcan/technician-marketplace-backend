import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { RatingModule } from './rating.module'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { BookingModule } from '../booking/booking.module'
import { NotificationModule } from '../notification/notification.module'
import { ServiceRating } from '../../entities/service-rating.entity'
import { User } from '../../entities/user.entity'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { UserRole } from '../../common/enums/user-role.enum'
import { BookingStatus, PaymentStatus, ProfessionalType } from '../../common/enums'
import { DataSource } from 'typeorm'

describe('Rating Moderation Integration Tests', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userToken: string
  let adminToken: string
  let userId: string
  let professionalId: string
  let bookingId: string
  let ratingId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'technician_platform_test',
          entities: [__dirname + '/../../entities/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        UserModule,
        BookingModule,
        RatingModule,
        NotificationModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe())
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    // Clean up database
    await dataSource.getRepository(ServiceRating).delete({})
    await dataSource.getRepository(Booking).delete({})
    await dataSource.getRepository(ProfessionalProfile).delete({})
    await dataSource.getRepository(User).delete({})

    // Create regular user
    const userResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'user@test.com',
      password: 'Password123!',
      role: UserRole.USER,
    })

    userToken = userResponse.body.accessToken
    userId = userResponse.body.user.id

    // Create admin user
    const adminResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'admin@test.com',
      password: 'Password123!',
      role: UserRole.ADMIN,
    })

    adminToken = adminResponse.body.accessToken

    // Create professional user
    const professionalResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'professional@test.com',
      password: 'Password123!',
      role: UserRole.PROFESSIONAL,
    })

    const professionalToken = professionalResponse.body.accessToken

    // Create professional profile
    const profileResponse = await request(app.getHttpServer())
      .post('/professionals/profile')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        professionalType: 'handyman',
        specializations: ['plumbing'],
        experienceYears: 5,
        hourlyRate: 50,
        serviceRadius: 20,
      })

    professionalId = profileResponse.body.id

    // Create a completed booking
    const booking = await dataSource.getRepository(Booking).save({
      userId,
      professionalId,
      professionalType: ProfessionalType.HANDYMAN,
      serviceCategory: 'plumbing',
      status: BookingStatus.COMPLETED,
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
      paymentStatus: PaymentStatus.CAPTURED,
    })

    bookingId = booking.id
  })

  describe('POST /ratings/:id/report', () => {
    it('should allow users to report inappropriate ratings', async () => {
      // Create a rating first
      const ratingResponse = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 1,
          comment: 'This is a test rating',
          categoryRatings: [
            { category: 'quality', score: 1 },
            { category: 'punctuality', score: 1 },
          ],
        })

      expect(ratingResponse.status).toBe(201)
      ratingId = ratingResponse.body.id

      // Report the rating
      const reportResponse = await request(app.getHttpServer())
        .post(`/ratings/${ratingId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Contains inappropriate content',
        })

      expect(reportResponse.status).toBe(200)
      expect(reportResponse.body.moderationStatus).toBe('flagged')
    })

    it('should return 404 for non-existent rating', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app.getHttpServer())
        .post(`/ratings/${fakeId}/report`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Test reason',
        })

      expect(response.status).toBe(404)
    })

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer()).post(`/ratings/some-id/report`).send({
        reason: 'Test reason',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /ratings/:id/moderate', () => {
    beforeEach(async () => {
      // Create a rating to moderate
      const ratingResponse = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 3,
          comment: 'Test rating for moderation',
          categoryRatings: [
            { category: 'quality', score: 3 },
            { category: 'punctuality', score: 3 },
          ],
        })

      ratingId = ratingResponse.body.id
    })

    it('should allow admin to approve a rating', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ratings/${ratingId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approved',
          reason: 'Content is appropriate',
        })

      expect(response.status).toBe(200)
      expect(response.body.moderationStatus).toBe('approved')
    })

    it('should allow admin to reject a rating', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ratings/${ratingId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'rejected',
          reason: 'Inappropriate content',
        })

      expect(response.status).toBe(200)
      expect(response.body.moderationStatus).toBe('rejected')
    })

    it('should allow admin to flag a rating', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ratings/${ratingId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'flagged',
          reason: 'Needs review',
        })

      expect(response.status).toBe(200)
      expect(response.body.moderationStatus).toBe('flagged')
    })

    it('should deny access to non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ratings/${ratingId}/moderate`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          action: 'approved',
        })

      expect(response.status).toBe(403)
    })

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ratings/${ratingId}/moderate`)
        .send({
          action: 'approved',
        })

      expect(response.status).toBe(401)
    })

    it('should return 404 for non-existent rating', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app.getHttpServer())
        .put(`/ratings/${fakeId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'approved',
        })

      expect(response.status).toBe(404)
    })

    it('should validate moderation action', async () => {
      const response = await request(app.getHttpServer())
        .put(`/ratings/${ratingId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'invalid_action',
        })

      expect(response.status).toBe(400)
    })
  })

  describe('Inappropriate Content Filtering', () => {
    it('should automatically flag ratings with inappropriate content', async () => {
      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 1,
          comment: 'This is shit work', // Contains inappropriate word
          categoryRatings: [{ category: 'quality', score: 1 }],
        })

      expect(response.status).toBe(201)
      expect(response.body.moderationStatus).toBe('flagged')
    })

    it('should approve ratings without inappropriate content', async () => {
      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 5,
          comment: 'Excellent work, very professional',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })

      expect(response.status).toBe(201)
      expect(response.body.moderationStatus).toBe('approved')
    })

    it('should flag ratings with Spanish profanity', async () => {
      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 1,
          comment: 'Este trabajo es una mierda', // Contains Spanish profanity
          categoryRatings: [{ category: 'quality', score: 1 }],
        })

      expect(response.status).toBe(201)
      expect(response.body.moderationStatus).toBe('flagged')
    })

    it('should flag ratings with excessive capitalization', async () => {
      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 1,
          comment: 'THIS IS TERRIBLE WORK AND I AM VERY ANGRY ABOUT IT',
          categoryRatings: [{ category: 'quality', score: 1 }],
        })

      expect(response.status).toBe(201)
      expect(response.body.moderationStatus).toBe('flagged')
    })
  })

  describe('Average Rating Calculation with Moderation', () => {
    it('should only include approved ratings in average calculation', async () => {
      // Create multiple ratings with different moderation statuses
      // Rating 1: Approved (score 5)
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 5,
          comment: 'Great work',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })

      // Create another booking for second rating
      const booking2 = await dataSource.getRepository(Booking).save({
        userId,
        professionalId,
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'plumbing',
        status: BookingStatus.COMPLETED,
        scheduledDate: new Date(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '456 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          postalCode: '12345',
          coordinates: { latitude: 0, longitude: 0 },
        },
        description: 'Test booking 2',
        estimatedPrice: 100,
        paymentStatus: PaymentStatus.CAPTURED,
      })

      // Rating 2: Flagged (score 1) - should not count
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: booking2.id,
          score: 1,
          comment: 'This is shit', // Will be flagged
          categoryRatings: [{ category: 'quality', score: 1 }],
        })

      // Get professional stats
      const statsResponse = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(statsResponse.status).toBe(200)
      // Average should be 5.0 (only approved rating counts)
      expect(statsResponse.body.averageRating).toBe(5.0)
      expect(statsResponse.body.totalRatings).toBe(2) // Both ratings exist
    })

    it('should recalculate average when rating is moderated', async () => {
      // Create a rating
      const ratingResponse = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId,
          score: 5,
          comment: 'Excellent work',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })

      const createdRatingId = ratingResponse.body.id

      // Check initial average
      let statsResponse = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(statsResponse.body.averageRating).toBe(5.0)

      // Admin rejects the rating
      await request(app.getHttpServer())
        .put(`/ratings/${createdRatingId}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'rejected',
          reason: 'Test rejection',
        })

      // Check average after rejection - should be 0 (no approved ratings)
      statsResponse = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(statsResponse.body.averageRating).toBe(0)
    })
  })
})
