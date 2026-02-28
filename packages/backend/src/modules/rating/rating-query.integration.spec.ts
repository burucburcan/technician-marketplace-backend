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
import { Booking } from '../../entities/booking.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Notification } from '../../entities/notification.entity'
import { BookingStatus, UserRole, ProfessionalType } from '../../common/enums'

describe('Rating Query Endpoints (Integration)', () => {
  let app: INestApplication
  let authToken: string
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
          database: process.env.DB_NAME || 'technician_test',
          entities: [User, UserProfile, ProfessionalProfile, Booking, ServiceRating, Notification],
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
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Setup test data', () => {
    it('should create a user and authenticate', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(201)

      userId = registerResponse.body.user.id

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!',
        })
        .expect(200)

      authToken = loginResponse.body.accessToken
      expect(authToken).toBeDefined()
    })

    it('should create a professional profile', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'professional@example.com',
          password: 'Password123!',
          role: UserRole.PROFESSIONAL,
        })
        .expect(201)

      const professionalLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'professional@example.com',
          password: 'Password123!',
        })
        .expect(200)

      const professionalToken = professionalLoginResponse.body.accessToken

      const profileResponse = await request(app.getHttpServer())
        .post('/professionals/profile')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({
          businessName: 'Test Professional',
          professionalType: ProfessionalType.HANDYMAN,
          specializations: ['plumbing'],
          experienceYears: 5,
          hourlyRate: 50,
          serviceRadius: 10,
          workingHours: {
            monday: [{ start: '09:00', end: '17:00' }],
          },
        })
        .expect(201)

      professionalId = profileResponse.body.id
    })

    it('should create multiple completed bookings and ratings', async () => {
      // Create first booking
      const booking1Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: 'plumbing',
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking 1',
          estimatedPrice: 100,
        })
        .expect(201)

      const booking1Id = booking1Response.body.id

      // Update booking to completed
      await request(app.getHttpServer())
        .put(`/bookings/${booking1Id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.COMPLETED })
        .expect(200)

      // Create first rating
      const rating1Response = await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: booking1Id,
          score: 5,
          comment: 'Excellent service!',
          categoryRatings: [
            { category: 'quality', score: 5 },
            { category: 'punctuality', score: 5 },
          ],
        })
        .expect(201)

      ratingId = rating1Response.body.id

      // Create second booking
      const booking2Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: 'plumbing',
          scheduledDate: new Date(Date.now() + 172800000).toISOString(),
          estimatedDuration: 120,
          serviceAddress: {
            address: '456 Test Ave',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking 2',
          estimatedPrice: 150,
        })
        .expect(201)

      const booking2Id = booking2Response.body.id

      // Update second booking to completed
      await request(app.getHttpServer())
        .put(`/bookings/${booking2Id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.COMPLETED })
        .expect(200)

      // Create second rating
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId: booking2Id,
          score: 4,
          comment: 'Good service',
          categoryRatings: [
            { category: 'quality', score: 4 },
            { category: 'punctuality', score: 4 },
          ],
        })
        .expect(201)

      // Create third booking
      const booking3Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: 'plumbing',
          scheduledDate: new Date(Date.now() + 259200000).toISOString(),
          estimatedDuration: 120,
          serviceAddress: {
            address: '789 Test Blvd',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking 3',
          estimatedPrice: 200,
        })
        .expect(201)

      bookingId = booking3Response.body.id

      // Update third booking to completed
      await request(app.getHttpServer())
        .put(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.COMPLETED })
        .expect(200)

      // Create third rating
      await request(app.getHttpServer())
        .post('/ratings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookingId,
          score: 3,
          comment: 'Average service',
          categoryRatings: [
            { category: 'quality', score: 3 },
            { category: 'punctuality', score: 3 },
          ],
        })
        .expect(201)
    })
  })

  describe('GET /professionals/:professionalId/ratings', () => {
    it('should get all ratings for a professional with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('ratings')
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('page')
      expect(response.body).toHaveProperty('pageSize')
      expect(response.body).toHaveProperty('totalPages')

      expect(response.body.ratings).toBeInstanceOf(Array)
      expect(response.body.ratings.length).toBe(3)
      expect(response.body.total).toBe(3)
      expect(response.body.page).toBe(1)
      expect(response.body.pageSize).toBe(10)
      expect(response.body.totalPages).toBe(1)
    })

    it('should get ratings with custom pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/ratings?page=1&limit=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.ratings.length).toBe(2)
      expect(response.body.total).toBe(3)
      expect(response.body.page).toBe(1)
      expect(response.body.pageSize).toBe(2)
      expect(response.body.totalPages).toBe(2)
    })

    it('should get second page of ratings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/ratings?page=2&limit=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.ratings.length).toBe(1)
      expect(response.body.total).toBe(3)
      expect(response.body.page).toBe(2)
      expect(response.body.pageSize).toBe(2)
      expect(response.body.totalPages).toBe(2)
    })

    it('should return ratings in descending order by creation date', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const ratings = response.body.ratings
      expect(ratings.length).toBeGreaterThan(1)

      // Check that ratings are sorted by createdAt in descending order
      for (let i = 0; i < ratings.length - 1; i++) {
        const currentDate = new Date(ratings[i].createdAt)
        const nextDate = new Date(ratings[i + 1].createdAt)
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
      }
    })

    it('should include user information in ratings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const rating = response.body.ratings[0]
      expect(rating).toHaveProperty('user')
      expect(rating.user).toHaveProperty('id')
      expect(rating.user).toHaveProperty('email')
    })

    it('should return empty array for professional with no ratings', async () => {
      // Create a new professional without ratings
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newprofessional@example.com',
          password: 'Password123!',
          role: UserRole.PROFESSIONAL,
        })
        .expect(201)

      const newProfessionalLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'newprofessional@example.com',
          password: 'Password123!',
        })
        .expect(200)

      const newProfessionalToken = newProfessionalLoginResponse.body.accessToken

      const newProfileResponse = await request(app.getHttpServer())
        .post('/professionals/profile')
        .set('Authorization', `Bearer ${newProfessionalToken}`)
        .send({
          businessName: 'New Professional',
          professionalType: ProfessionalType.HANDYMAN,
          specializations: ['electrical'],
          experienceYears: 3,
          hourlyRate: 40,
          serviceRadius: 15,
          workingHours: {
            monday: [{ start: '09:00', end: '17:00' }],
          },
        })
        .expect(201)

      const newProfessionalId = newProfileResponse.body.id

      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${newProfessionalId}/ratings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.ratings).toEqual([])
      expect(response.body.total).toBe(0)
      expect(response.body.totalPages).toBe(0)
    })
  })

  describe('GET /ratings/:id', () => {
    it('should get a specific rating by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/${ratingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('id', ratingId)
      expect(response.body).toHaveProperty('score')
      expect(response.body).toHaveProperty('comment')
      expect(response.body).toHaveProperty('categoryRatings')
      expect(response.body).toHaveProperty('professionalId', professionalId)
      expect(response.body).toHaveProperty('userId', userId)
    })

    it('should include user and professional relations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/${ratingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('user')
      expect(response.body.user).toHaveProperty('id')
      expect(response.body.user).toHaveProperty('email')

      expect(response.body).toHaveProperty('professional')
      expect(response.body.professional).toHaveProperty('id')
    })

    it('should return 404 for non-existent rating', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      await request(app.getHttpServer())
        .get(`/ratings/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should return 404 for invalid rating ID format', async () => {
      await request(app.getHttpServer())
        .get('/ratings/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('GET /professionals/:professionalId/stats', () => {
    it('should get professional rating statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('averageRating')
      expect(response.body).toHaveProperty('totalRatings')
      expect(response.body).toHaveProperty('categoryAverages')

      expect(response.body.totalRatings).toBe(3)
      expect(response.body.averageRating).toBeCloseTo(4, 1) // (5 + 4 + 3) / 3 = 4
    })

    it('should calculate correct category averages', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const categoryAverages = response.body.categoryAverages
      expect(categoryAverages).toHaveProperty('quality')
      expect(categoryAverages).toHaveProperty('punctuality')

      // Quality: (5 + 4 + 3) / 3 = 4
      expect(categoryAverages.quality).toBeCloseTo(4, 1)
      // Punctuality: (5 + 4 + 3) / 3 = 4
      expect(categoryAverages.punctuality).toBeCloseTo(4, 1)
    })

    it('should return zero stats for professional with no ratings', async () => {
      // Create a new professional without ratings
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'anotherprofessional@example.com',
          password: 'Password123!',
          role: UserRole.PROFESSIONAL,
        })
        .expect(201)

      const newProfessionalLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'anotherprofessional@example.com',
          password: 'Password123!',
        })
        .expect(200)

      const newProfessionalToken = newProfessionalLoginResponse.body.accessToken

      const newProfileResponse = await request(app.getHttpServer())
        .post('/professionals/profile')
        .set('Authorization', `Bearer ${newProfessionalToken}`)
        .send({
          businessName: 'Another Professional',
          professionalType: ProfessionalType.HANDYMAN,
          specializations: ['carpentry'],
          experienceYears: 2,
          hourlyRate: 35,
          serviceRadius: 20,
          workingHours: {
            monday: [{ start: '09:00', end: '17:00' }],
          },
        })
        .expect(201)

      const newProfessionalId = newProfileResponse.body.id

      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${newProfessionalId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.averageRating).toBe(0)
      expect(response.body.totalRatings).toBe(0)
      expect(response.body.categoryAverages).toEqual({})
    })
  })

  describe('Requirement 7.3 - Display average rating on professional profile', () => {
    it('should display average rating on professional profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ratings/professionals/${professionalId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('averageRating')
      expect(response.body.averageRating).toBeGreaterThan(0)
      expect(response.body.averageRating).toBeLessThanOrEqual(5)
    })
  })
})
