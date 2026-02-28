import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { getDatabaseConfig } from '../../config/database.config'
import { RatingModule } from './rating.module'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { BookingModule } from '../booking/booking.module'
import { NotificationModule } from '../notification/notification.module'
import { DataSource } from 'typeorm'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Booking } from '../../entities/booking.entity'
import { ServiceRating } from '../../entities/service-rating.entity'
import {
  BookingStatus,
  ProfessionalType,
  UserRole,
  PaymentStatus,
  VerificationStatus,
} from '../../common/enums'

describe('Rating Average Calculation Integration Tests (Task 11.3)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userToken: string
  let userId: string
  let professionalId: string
  let professionalUserId: string
  let completedBookingIds: string[] = []

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
        AuthModule,
        UserModule,
        BookingModule,
        NotificationModule,
        RatingModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  beforeEach(async () => {
    // Clean up database
    await dataSource.getRepository(ServiceRating).delete({})
    await dataSource.getRepository(Booking).delete({})
    await dataSource.getRepository(ProfessionalProfile).delete({})
    await dataSource.getRepository(UserProfile).delete({})
    await dataSource.getRepository(User).delete({})

    completedBookingIds = []

    // Create test user
    const userResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: UserRole.USER,
      })

    userToken = userResponse.body.accessToken
    userId = userResponse.body.user.id

    // Create user profile
    await dataSource.getRepository(UserProfile).save({
      userId,
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      language: 'es',
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: false,
      },
    })

    // Create professional user
    const professionalResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `professional-${Date.now()}@example.com`,
        password: 'Password123!',
        role: UserRole.PROFESSIONAL,
      })

    professionalUserId = professionalResponse.body.user.id

    // Create professional profile
    const professionalProfile = await dataSource.getRepository(ProfessionalProfile).save(
      dataSource.getRepository(ProfessionalProfile).create({
        userId: professionalUserId,
        professionalType: ProfessionalType.HANDYMAN,
        businessName: 'Test Professional',
        experienceYears: 5,
        hourlyRate: 50,
        serviceRadius: 10,
        workingHours: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: [],
        },
        verificationStatus: VerificationStatus.VERIFIED,
        isAvailable: true,
        rating: 0,
        totalJobs: 0,
        completionRate: 0,
      })
    )

    professionalId = professionalProfile.id

    // Create multiple completed bookings for testing
    for (let i = 0; i < 5; i++) {
      const booking = await dataSource.getRepository(Booking).save(
        dataSource.getRepository(Booking).create({
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
          description: `Test booking ${i + 1}`,
          estimatedPrice: 100,
          paymentStatus: PaymentStatus.PENDING,
          completedAt: new Date(),
        })
      )
      completedBookingIds.push(booking.id)
    }
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  describe('Average Rating Calculation (Requirement 7.3)', () => {
    it('should calculate and update professional average rating after first rating', async () => {
      // Create first rating with score 5
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Excellent!',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })
        .expect(201)

      // Check professional profile was updated
      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      expect(professional).toBeDefined()
      expect(professional?.rating).toBe(5)
    })

    it('should calculate correct average rating with multiple ratings', async () => {
      // Create ratings with scores: 5, 4, 3
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Excellent!',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 4,
          comment: 'Good',
          categoryRatings: [{ category: 'quality', score: 4 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[2],
          score: 3,
          comment: 'Average',
          categoryRatings: [{ category: 'quality', score: 3 }],
        })
        .expect(201)

      // Check professional profile has correct average: (5 + 4 + 3) / 3 = 4
      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      expect(professional?.rating).toBe(4)
    })

    it('should calculate average rating with decimal precision', async () => {
      // Create ratings with scores: 5, 4, 4
      // Expected average: (5 + 4 + 4) / 3 = 4.33
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Great!',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 4,
          comment: 'Good',
          categoryRatings: [{ category: 'quality', score: 4 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[2],
          score: 4,
          comment: 'Good',
          categoryRatings: [{ category: 'quality', score: 4 }],
        })
        .expect(201)

      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      expect(professional?.rating).toBe(4.33)
    })

    it('should update average rating incrementally as new ratings are added', async () => {
      // First rating: score 5, average should be 5
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Excellent!',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })
        .expect(201)

      let professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })
      expect(professional?.rating).toBe(5)

      // Second rating: score 3, average should be (5 + 3) / 2 = 4
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 3,
          comment: 'Average',
          categoryRatings: [{ category: 'quality', score: 3 }],
        })
        .expect(201)

      professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })
      expect(professional?.rating).toBe(4)

      // Third rating: score 4, average should be (5 + 3 + 4) / 3 = 4
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[2],
          score: 4,
          comment: 'Good',
          categoryRatings: [{ category: 'quality', score: 4 }],
        })
        .expect(201)

      professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })
      expect(professional?.rating).toBe(4)
    })

    it('should handle all perfect ratings correctly', async () => {
      // Create 5 ratings all with score 5
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/ratings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            bookingId: completedBookingIds[i],
            score: 5,
            comment: 'Perfect!',
            categoryRatings: [{ category: 'quality', score: 5 }],
          })
          .expect(201)
      }

      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      expect(professional?.rating).toBe(5)
    })

    it('should handle all minimum ratings correctly', async () => {
      // Create 3 ratings all with score 1
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/ratings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            bookingId: completedBookingIds[i],
            score: 1,
            comment: 'Poor',
            categoryRatings: [{ category: 'quality', score: 1 }],
          })
          .expect(201)
      }

      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      expect(professional?.rating).toBe(1)
    })
  })

  describe('Category-Based Average Calculation', () => {
    it('should calculate category averages correctly', async () => {
      // Create ratings with different category scores
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Great!',
          categoryRatings: [
            { category: 'quality', score: 5 },
            { category: 'punctuality', score: 4 },
            { category: 'communication', score: 5 },
          ],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 4,
          comment: 'Good',
          categoryRatings: [
            { category: 'quality', score: 4 },
            { category: 'punctuality', score: 5 },
            { category: 'communication', score: 3 },
          ],
        })
        .expect(201)

      // Get stats
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.categoryAverages).toEqual({
        quality: 4.5, // (5 + 4) / 2
        punctuality: 4.5, // (4 + 5) / 2
        communication: 4, // (5 + 3) / 2
      })
    })

    it('should handle different categories across ratings', async () => {
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Great!',
          categoryRatings: [
            { category: 'quality', score: 5 },
            { category: 'punctuality', score: 5 },
          ],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 4,
          comment: 'Good',
          categoryRatings: [
            { category: 'quality', score: 4 },
            { category: 'professionalism', score: 5 },
          ],
        })
        .expect(201)

      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.categoryAverages).toEqual({
        quality: 4.5, // (5 + 4) / 2
        punctuality: 5, // Only one rating
        professionalism: 5, // Only one rating
      })
    })

    it('should handle all five standard categories', async () => {
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Perfect!',
          categoryRatings: [
            { category: 'quality', score: 5 },
            { category: 'punctuality', score: 5 },
            { category: 'communication', score: 5 },
            { category: 'professionalism', score: 5 },
            { category: 'value', score: 5 },
          ],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 4,
          comment: 'Good',
          categoryRatings: [
            { category: 'quality', score: 4 },
            { category: 'punctuality', score: 4 },
            { category: 'communication', score: 4 },
            { category: 'professionalism', score: 4 },
            { category: 'value', score: 4 },
          ],
        })
        .expect(201)

      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body.categoryAverages).toEqual({
        quality: 4.5,
        punctuality: 4.5,
        communication: 4.5,
        professionalism: 4.5,
        value: 4.5,
      })
    })
  })

  describe('Professional Rating Stats Endpoint', () => {
    it('should return correct stats with no ratings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body).toEqual({
        averageRating: 0,
        totalRatings: 0,
        categoryAverages: {},
      })
    })

    it('should return correct stats with multiple ratings', async () => {
      // Create 3 ratings
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Excellent!',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 4,
          comment: 'Good',
          categoryRatings: [{ category: 'quality', score: 4 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[2],
          score: 3,
          comment: 'Average',
          categoryRatings: [{ category: 'quality', score: 3 }],
        })
        .expect(201)

      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(response.body).toEqual({
        averageRating: 4,
        totalRatings: 3,
        categoryAverages: {
          quality: 4,
        },
      })
    })

    it('should display average rating on professional profile (Requirement 7.3)', async () => {
      // Create a rating
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 4,
          comment: 'Good service',
          categoryRatings: [{ category: 'quality', score: 4 }],
        })
        .expect(201)

      // Get professional profile
      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      // Verify rating is displayed on profile
      expect(professional?.rating).toBe(4)
      expect(professional?.rating).toBeGreaterThan(0)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .expect(401)
    })
  })

  describe('Edge Cases', () => {
    it('should handle professional with no ratings', async () => {
      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      expect(professional?.rating).toBe(0)
    })

    it('should round average to 2 decimal places', async () => {
      // Create ratings that result in repeating decimal
      // Scores: 5, 4, 4, 3 = 16 / 4 = 4.00
      // Scores: 5, 4, 3 = 12 / 3 = 4.00
      // Scores: 5, 3, 3 = 11 / 3 = 3.67 (rounded)
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[0],
          score: 5,
          comment: 'Great!',
          categoryRatings: [{ category: 'quality', score: 5 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[1],
          score: 3,
          comment: 'OK',
          categoryRatings: [{ category: 'quality', score: 3 }],
        })
        .expect(201)

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          bookingId: completedBookingIds[2],
          score: 3,
          comment: 'OK',
          categoryRatings: [{ category: 'quality', score: 3 }],
        })
        .expect(201)

      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      // (5 + 3 + 3) / 3 = 3.666... should round to 3.67
      expect(professional?.rating).toBe(3.67)
    })

    it('should handle large number of ratings efficiently', async () => {
      // Create 5 ratings (limited by our test setup)
      const scores = [5, 4, 5, 3, 4]
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/ratings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            bookingId: completedBookingIds[i],
            score: scores[i],
            comment: `Rating ${i + 1}`,
            categoryRatings: [{ category: 'quality', score: scores[i] }],
          })
          .expect(201)
      }

      const professional = await dataSource
        .getRepository(ProfessionalProfile)
        .findOne({ where: { id: professionalId } })

      // (5 + 4 + 5 + 3 + 4) / 5 = 21 / 5 = 4.2
      expect(professional?.rating).toBe(4.2)
    })
  })
})
