import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../../app.module'
import { DataSource } from 'typeorm'
import { BookingStatus } from '../../common/enums'
import { Booking } from '../../entities/booking.entity'

/**
 * Integration tests for booking query endpoints
 * Tests requirements 6.5 and 6.8
 */
describe('Booking Query Endpoints (Integration)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let authToken: string
  let userId: string
  let professionalId: string
  let professionalUserId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clean up database
    await dataSource.query('DELETE FROM bookings')
    await dataSource.query('DELETE FROM professional_profiles')
    await dataSource.query('DELETE FROM user_profiles')
    await dataSource.query('DELETE FROM users')

    // Create test user
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'testuser@example.com',
      password: 'Test123!@#',
      role: 'user',
    })

    userId = registerResponse.body.user.id

    // Login to get token
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'testuser@example.com',
      password: 'Test123!@#',
    })

    authToken = loginResponse.body.accessToken

    // Create professional user
    const professionalRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'professional@example.com',
        password: 'Test123!@#',
        role: 'handyman',
      })

    professionalUserId = professionalRegisterResponse.body.user.id

    // Create professional profile
    const professionalResponse = await request(app.getHttpServer())
      .post('/professionals/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: professionalUserId,
        professionalType: 'handyman',
        specializations: ['plumbing'],
        experienceYears: 5,
        hourlyRate: 50,
        serviceRadius: 10,
      })

    professionalId = professionalResponse.body.id
  })

  describe('GET /bookings/users/:userId', () => {
    it('should return all bookings for a user when filter is "all"', async () => {
      // Create bookings with different statuses
      const bookingData = {
        professionalId,
        professionalType: 'handyman',
        serviceCategory: 'plumbing',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        description: 'Test booking',
        estimatedPrice: 100,
      }

      // Create pending booking
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)

      // Create confirmed booking
      const booking2Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        })

      await request(app.getHttpServer())
        .put(`/bookings/${booking2Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.CONFIRMED })

      // Create completed booking
      const booking3Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 259200000).toISOString(),
        })

      await request(app.getHttpServer())
        .put(`/bookings/${booking3Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.CONFIRMED })

      await request(app.getHttpServer())
        .put(`/bookings/${booking3Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.IN_PROGRESS })

      await request(app.getHttpServer())
        .put(`/bookings/${booking3Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.COMPLETED })

      // Query all bookings
      const response = await request(app.getHttpServer())
        .get(`/bookings/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ filter: 'all' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(3)
    })

    it('should return only active bookings when filter is "active"', async () => {
      // Create bookings with different statuses
      const bookingData = {
        professionalId,
        professionalType: 'handyman',
        serviceCategory: 'plumbing',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        description: 'Test booking',
        estimatedPrice: 100,
      }

      // Create pending booking (active)
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)

      // Create confirmed booking (active)
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        })

      // Create completed booking (past)
      const booking3Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 259200000).toISOString(),
        })

      await request(app.getHttpServer())
        .put(`/bookings/${booking3Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.CONFIRMED })

      await request(app.getHttpServer())
        .put(`/bookings/${booking3Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.IN_PROGRESS })

      await request(app.getHttpServer())
        .put(`/bookings/${booking3Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.COMPLETED })

      // Query active bookings
      const response = await request(app.getHttpServer())
        .get(`/bookings/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ filter: 'active' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(
        response.body.every(
          (b: Booking) =>
            b.status === BookingStatus.PENDING ||
            b.status === BookingStatus.CONFIRMED ||
            b.status === BookingStatus.IN_PROGRESS
        )
      ).toBe(true)
    })

    it('should return only past bookings when filter is "past"', async () => {
      // Create bookings with different statuses
      const bookingData = {
        professionalId,
        professionalType: 'handyman',
        serviceCategory: 'plumbing',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        description: 'Test booking',
        estimatedPrice: 100,
      }

      // Create pending booking (active)
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)

      // Create completed booking (past)
      const booking2Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        })

      await request(app.getHttpServer())
        .put(`/bookings/${booking2Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.CONFIRMED })

      await request(app.getHttpServer())
        .put(`/bookings/${booking2Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.IN_PROGRESS })

      await request(app.getHttpServer())
        .put(`/bookings/${booking2Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.COMPLETED })

      // Create cancelled booking (past)
      const booking3Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 259200000).toISOString(),
        })

      await request(app.getHttpServer())
        .put(`/bookings/${booking3Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.CANCELLED,
          notes: 'User cancelled',
        })

      // Query past bookings
      const response = await request(app.getHttpServer())
        .get(`/bookings/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ filter: 'past' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(
        response.body.every(
          (b: Booking) =>
            b.status === BookingStatus.COMPLETED ||
            b.status === BookingStatus.CANCELLED ||
            b.status === BookingStatus.REJECTED ||
            b.status === BookingStatus.DISPUTED ||
            b.status === BookingStatus.RESOLVED
        )
      ).toBe(true)
    })
  })

  describe('GET /bookings/professionals/:professionalId', () => {
    it('should return all bookings for a professional', async () => {
      // Create bookings
      const bookingData = {
        professionalId,
        professionalType: 'handyman',
        serviceCategory: 'plumbing',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        description: 'Test booking',
        estimatedPrice: 100,
      }

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        })

      // Query professional bookings
      const response = await request(app.getHttpServer())
        .get(`/bookings/professionals/${professionalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ filter: 'all' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(2)
      expect(response.body[0].professionalId).toBe(professionalId)
    })

    it('should filter active bookings for professional', async () => {
      // Create bookings
      const bookingData = {
        professionalId,
        professionalType: 'handyman',
        serviceCategory: 'plumbing',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        description: 'Test booking',
        estimatedPrice: 100,
      }

      // Create active booking
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)

      // Create and complete booking
      const booking2Response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...bookingData,
          scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        })

      await request(app.getHttpServer())
        .put(`/bookings/${booking2Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.CONFIRMED })

      await request(app.getHttpServer())
        .put(`/bookings/${booking2Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.IN_PROGRESS })

      await request(app.getHttpServer())
        .put(`/bookings/${booking2Response.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.COMPLETED })

      // Query active bookings
      const response = await request(app.getHttpServer())
        .get(`/bookings/professionals/${professionalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ filter: 'active' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0].status).toBe(BookingStatus.PENDING)
    })
  })

  describe('GET /bookings/:id - Progress Photos', () => {
    it('should include progress photos for artistic projects', async () => {
      // Create artist professional
      const artistRegisterResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'artist@example.com',
          password: 'Test123!@#',
          role: 'handyman',
        })

      const artistUserId = artistRegisterResponse.body.user.id

      const artistResponse = await request(app.getHttpServer())
        .post('/professionals/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: artistUserId,
          professionalType: 'artist',
          specializations: ['mural'],
          experienceYears: 5,
          hourlyRate: 75,
          serviceRadius: 15,
        })

      const artistId = artistResponse.body.id

      // Create artistic booking
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId: artistId,
          professionalType: 'artist',
          serviceCategory: 'mural',
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          estimatedDuration: 480,
          serviceAddress: {
            address: '123 Art St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'Mural painting',
          estimatedPrice: 500,
          projectDetails: {
            projectType: 'Wall Mural',
            estimatedDuration: '3 days',
            priceRange: { min: 400, max: 600, currency: 'MXN' },
          },
          referenceImages: ['https://example.com/ref1.jpg'],
        })

      const bookingId = bookingResponse.body.id

      // Update to in progress and add progress photos
      await request(app.getHttpServer())
        .put(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BookingStatus.CONFIRMED })

      await request(app.getHttpServer())
        .put(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.IN_PROGRESS,
          progressPhotos: [
            {
              url: 'https://example.com/progress1.jpg',
              caption: 'Initial sketch',
            },
            {
              url: 'https://example.com/progress2.jpg',
              caption: 'Base colors applied',
            },
          ],
        })

      // Get booking and verify progress photos are included
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.progressPhotos).toBeDefined()
      expect(response.body.progressPhotos).toHaveLength(2)
      expect(response.body.progressPhotos[0].url).toBe('https://example.com/progress1.jpg')
      expect(response.body.progressPhotos[0].caption).toBe('Initial sketch')
      expect(response.body.progressPhotos[1].url).toBe('https://example.com/progress2.jpg')
      expect(response.body.progressPhotos[1].caption).toBe('Base colors applied')
    })

    it('should return empty progress photos for non-artistic bookings', async () => {
      // Create regular booking
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: 'handyman',
          serviceCategory: 'plumbing',
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'Fix leak',
          estimatedPrice: 100,
        })

      const bookingId = bookingResponse.body.id

      // Get booking
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.progressPhotos).toEqual([])
    })
  })
})
