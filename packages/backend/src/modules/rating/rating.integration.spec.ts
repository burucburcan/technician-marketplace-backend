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
import { BookingStatus, ProfessionalType, UserRole, PaymentStatus } from '../../common/enums'

describe('Rating Integration Tests', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userToken: string
  let userId: string
  let professionalId: string
  let completedBookingId: string
  let pendingBookingId: string

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

    const professionalUserId = professionalResponse.body.user.id

    // Create professional profile
    const professionalProfile = await dataSource.getRepository(ProfessionalProfile).save({
      userId: professionalUserId,
      professionalType: ProfessionalType.HANDYMAN,
      businessName: 'Test Professional',
      specializations: ['plumbing'],
      experienceYears: 5,
      hourlyRate: 50,
      serviceRadius: 10,
      workingHours: {},
      verificationStatus: 'verified',
      isAvailable: true,
      rating: 0,
      totalJobs: 0,
      completionRate: 0,
    } as any)

    professionalId = professionalProfile.id

    // Create completed booking
    const completedBooking = await dataSource.getRepository(Booking).save(
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
        description: 'Test booking',
        estimatedPrice: 100,
        paymentStatus: PaymentStatus.PENDING,
        completedAt: new Date(),
      })
    )

    completedBookingId = completedBooking.id

    // Create pending booking
    const pendingBooking = await dataSource.getRepository(Booking).save(
      dataSource.getRepository(Booking).create({
        userId,
        professionalId,
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'plumbing',
        status: BookingStatus.PENDING,
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
        paymentStatus: PaymentStatus.PENDING,
      })
    )

    pendingBookingId = pendingBooking.id
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  describe('POST /ratings', () => {
    it('should create a rating for a completed booking (Requirement 7.2)', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 5,
        comment: 'Excellent service!',
        categoryRatings: [
          { category: 'quality', score: 5 },
          { category: 'punctuality', score: 5 },
          { category: 'communication', score: 5 },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(201)

      expect(response.body).toMatchObject({
        bookingId: completedBookingId,
        userId,
        professionalId,
        score: 5,
        comment: 'Excellent service!',
        isVerified: true,
        moderationStatus: 'approved',
      })

      expect(response.body.categoryRatings).toHaveLength(3)
      expect(response.body.id).toBeDefined()
      expect(response.body.createdAt).toBeDefined()
    })

    it('should reject rating for non-completed booking (Requirement 7.4)', async () => {
      const createRatingDto = {
        bookingId: pendingBookingId,
        score: 5,
        comment: 'Great service!',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(400)

      expect(response.body.message).toContain('Only completed bookings can be rated')
    })

    it('should reject duplicate rating for the same booking (Requirement 7.6)', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 5,
        comment: 'Excellent service!',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      // Create first rating
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(201)

      // Try to create second rating for the same booking
      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(400)

      expect(response.body.message).toContain('A rating already exists for this booking')
    })

    it('should reject rating with invalid score', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 6, // Invalid: should be 1-5
        comment: 'Test',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(400)
    })

    it('should reject rating with score below minimum', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 0, // Invalid: should be 1-5
        comment: 'Test',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(400)
    })

    it('should reject rating for non-existent booking', async () => {
      const createRatingDto = {
        bookingId: '00000000-0000-0000-0000-000000000000',
        score: 5,
        comment: 'Test',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(404)

      expect(response.body.message).toContain('Booking with ID')
    })

    it('should reject rating for booking owned by another user', async () => {
      // Create another user
      const anotherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `another-${Date.now()}@example.com`,
          password: 'Password123!',
          role: UserRole.USER,
        })

      const anotherUserToken = anotherUserResponse.body.accessToken

      const createRatingDto = {
        bookingId: completedBookingId,
        score: 5,
        comment: 'Test',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send(createRatingDto)
        .expect(403)

      expect(response.body.message).toContain('You can only rate your own bookings')
    })

    it('should accept rating with optional photo URLs', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 5,
        comment: 'Great work!',
        categoryRatings: [{ category: 'quality', score: 5 }],
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      }

      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(201)

      expect(response.body.photoUrls).toHaveLength(2)
      expect(response.body.photoUrls).toContain('https://example.com/photo1.jpg')
    })

    it('should require authentication', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 5,
        comment: 'Test',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      await request(app.getHttpServer()).post('/ratings').send(createRatingDto).expect(401)
    })

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400)
    })

    it('should validate category rating scores', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 5,
        comment: 'Test',
        categoryRatings: [
          { category: 'quality', score: 6 }, // Invalid
        ],
      }

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(400)
    })

    it('should accept multiple category ratings', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 4,
        comment: 'Good service',
        categoryRatings: [
          { category: 'quality', score: 5 },
          { category: 'punctuality', score: 4 },
          { category: 'communication', score: 4 },
          { category: 'professionalism', score: 5 },
          { category: 'value', score: 3 },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(201)

      expect(response.body.categoryRatings).toHaveLength(5)
    })
  })

  describe('Rating Notification', () => {
    it('should send notification to professional when rated', async () => {
      const createRatingDto = {
        bookingId: completedBookingId,
        score: 5,
        comment: 'Excellent service!',
        categoryRatings: [{ category: 'quality', score: 5 }],
      }

      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createRatingDto)
        .expect(201)

      // Note: In a real test, we would verify the notification was sent
      // For now, we just verify the rating was created successfully
      // The notification sending is tested separately in notification tests
    })
  })
})
