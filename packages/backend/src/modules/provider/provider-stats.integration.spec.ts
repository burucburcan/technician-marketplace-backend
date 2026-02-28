import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../../app.module'
import { DataSource } from 'typeorm'
import { User } from '../../entities/user.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Booking } from '../../entities/booking.entity'
import { ServiceRating } from '../../entities/service-rating.entity'
import { UserRole, ProfessionalType, BookingStatus, PaymentStatus } from '../../common/enums'

describe('Provider Stats (Integration)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let authToken: string
  let providerId: string
  let professionalId1: string
  let professionalId2: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    // Clean up database
    await dataSource.query('DELETE FROM service_ratings')
    await dataSource.query('DELETE FROM bookings')
    await dataSource.query('DELETE FROM professional_profiles')
    await dataSource.query('DELETE FROM user_profiles')
    await dataSource.query('DELETE FROM users')

    // Create provider user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'provider@test.com',
        password: 'Password123!',
        role: UserRole.PROVIDER,
      })
      .expect(201)

    providerId = registerResponse.body.user.id
    authToken = registerResponse.body.accessToken

    // Create two professionals
    const professional1Response = await request(app.getHttpServer())
      .post(`/providers/${providerId}/professionals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        professionalType: ProfessionalType.HANDYMAN,
        businessName: 'Test Handyman',
        specializationIds: [],
        experienceYears: 5,
        hourlyRate: 50,
        serviceRadius: 10,
        workingHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [],
          sunday: [],
        },
      })
      .expect(201)

    professionalId1 = professional1Response.body.id

    const professional2Response = await request(app.getHttpServer())
      .post(`/providers/${providerId}/professionals`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        professionalType: ProfessionalType.ARTIST,
        businessName: 'Test Artist',
        specializationIds: [],
        experienceYears: 3,
        hourlyRate: 75,
        serviceRadius: 15,
        workingHours: {
          monday: [{ start: '10:00', end: '18:00' }],
          tuesday: [{ start: '10:00', end: '18:00' }],
          wednesday: [{ start: '10:00', end: '18:00' }],
          thursday: [{ start: '10:00', end: '18:00' }],
          friday: [{ start: '10:00', end: '18:00' }],
          saturday: [],
          sunday: [],
        },
      })
      .expect(201)

    professionalId2 = professional2Response.body.id
  })

  describe('GET /providers/:id/stats', () => {
    it('should return provider statistics with no bookings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/providers/${providerId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        providerId,
        totalProfessionals: 2,
        professionalsByType: {
          handyman: 1,
          artist: 1,
        },
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        inProgressBookings: 0,
        completionRate: 0,
        averageRating: 0,
        totalRatings: 0,
        totalRevenue: 0,
      })

      expect(response.body.professionals).toHaveLength(2)
      expect(response.body.professionals[0]).toMatchObject({
        professionalId: expect.any(String),
        professionalType: expect.any(String),
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        averageRating: 0,
        totalRatings: 0,
        completionRate: 0,
        totalRevenue: 0,
      })
    })

    it('should filter statistics by professional type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/providers/${providerId}/stats`)
        .query({ professionalType: ProfessionalType.HANDYMAN })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.totalProfessionals).toBe(1)
      expect(response.body.professionals).toHaveLength(1)
      expect(response.body.professionals[0].professionalType).toBe(ProfessionalType.HANDYMAN)
    })

    it('should calculate statistics with bookings and ratings', async () => {
      // Create a customer user
      const customerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'customer@test.com',
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(201)

      const customerId = customerResponse.body.user.id

      // Create bookings directly in database for testing
      const bookingRepo = dataSource.getRepository(Booking)
      const ratingRepo = dataSource.getRepository(ServiceRating)

      // Create completed booking for professional 1
      const booking1 = await bookingRepo.save({
        userId: customerId,
        professionalId: professionalId1,
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'Plumbing',
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
        actualPrice: 100,
        paymentStatus: PaymentStatus.CAPTURED,
      })

      // Create rating for booking 1
      await ratingRepo.save({
        bookingId: booking1.id,
        userId: customerId,
        professionalId: professionalId1,
        score: 5,
        comment: 'Great service',
        categoryRatings: [
          { category: 'quality', score: 5 },
          { category: 'punctuality', score: 5 },
        ],
        isVerified: true,
        moderationStatus: 'approved',
      })

      // Create cancelled booking for professional 2
      await bookingRepo.save({
        userId: customerId,
        professionalId: professionalId2,
        professionalType: ProfessionalType.ARTIST,
        serviceCategory: 'Painting',
        status: BookingStatus.CANCELLED,
        scheduledDate: new Date(),
        estimatedDuration: 180,
        serviceAddress: {
          address: '456 Test Ave',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          postalCode: '12345',
          coordinates: { latitude: 0, longitude: 0 },
        },
        description: 'Test booking 2',
        estimatedPrice: 200,
        paymentStatus: PaymentStatus.PENDING,
      })

      const response = await request(app.getHttpServer())
        .get(`/providers/${providerId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        providerId,
        totalProfessionals: 2,
        totalBookings: 2,
        completedBookings: 1,
        cancelledBookings: 1,
        pendingBookings: 0,
        inProgressBookings: 0,
        completionRate: 50,
        averageRating: 5,
        totalRatings: 1,
        totalRevenue: 100,
      })

      // Check individual professional stats
      const prof1Stats = response.body.professionals.find(
        (p: any) => p.professionalId === professionalId1
      )
      expect(prof1Stats).toMatchObject({
        totalBookings: 1,
        completedBookings: 1,
        cancelledBookings: 0,
        averageRating: 5,
        totalRatings: 1,
        completionRate: 100,
        totalRevenue: 100,
      })

      const prof2Stats = response.body.professionals.find(
        (p: any) => p.professionalId === professionalId2
      )
      expect(prof2Stats).toMatchObject({
        totalBookings: 1,
        completedBookings: 0,
        cancelledBookings: 1,
        averageRating: 0,
        totalRatings: 0,
        completionRate: 0,
        totalRevenue: 0,
      })
    })

    it('should deny access to non-provider users', async () => {
      // Create a regular user
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user@test.com',
          password: 'Password123!',
          role: UserRole.USER,
        })
        .expect(201)

      const userToken = userResponse.body.accessToken

      await request(app.getHttpServer())
        .get(`/providers/${providerId}/stats`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('should deny access to other providers', async () => {
      // Create another provider
      const otherProviderResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'otherprovider@test.com',
          password: 'Password123!',
          role: UserRole.PROVIDER,
        })
        .expect(201)

      const otherProviderToken = otherProviderResponse.body.accessToken

      await request(app.getHttpServer())
        .get(`/providers/${providerId}/stats`)
        .set('Authorization', `Bearer ${otherProviderToken}`)
        .expect(403)
    })
  })
})
