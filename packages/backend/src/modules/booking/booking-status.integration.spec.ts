import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import * as request from 'supertest'
import { BookingModule } from './booking.module'
import { AuthModule } from '../auth/auth.module'
import { UserModule } from '../user/user.module'
import { BookingStatus, ProfessionalType } from '../../common/enums'
import { getDatabaseConfig } from '../../config/database.config'

describe('Booking Status Management (Integration)', () => {
  let app: INestApplication
  let authToken: string
  let userId: string
  let professionalId: string
  let bookingId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          useFactory: getDatabaseConfig,
        }),
        BookingModule,
        AuthModule,
        UserModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    // Create test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `test-booking-status-${Date.now()}@example.com`,
        password: 'Test123!@#',
        role: 'user',
      })

    authToken = registerResponse.body.accessToken
    userId = registerResponse.body.user.id

    // Create professional profile
    const professionalResponse = await request(app.getHttpServer())
      .post('/professionals/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        professionalType: ProfessionalType.ARTIST,
        specializations: ['duvar resmi', 'mozaik'],
        experienceYears: 5,
        hourlyRate: 50,
        serviceRadius: 25,
        workingHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
        },
        artStyle: ['modern', 'abstract'],
        materials: ['acrylic', 'oil'],
        techniques: ['brush', 'spray'],
      })

    professionalId = professionalResponse.body.id

    // Create a booking
    const bookingResponse = await request(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        professionalId,
        professionalType: ProfessionalType.ARTIST,
        serviceCategory: 'duvar resmi',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        estimatedDuration: 240,
        serviceAddress: {
          address: '123 Test St',
          city: 'Mexico City',
          state: 'CDMX',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: { latitude: 19.4326, longitude: -99.1332 },
        },
        description: 'Wall mural project',
        estimatedPrice: 500,
        projectDetails: {
          projectType: 'Wall Mural',
          estimatedDuration: '2 days',
          priceRange: { min: 400, max: 600, currency: 'MXN' },
        },
      })

    bookingId = bookingResponse.body.id
  })

  afterAll(async () => {
    await app.close()
  })

  describe('PUT /bookings/:id/status', () => {
    it('should update booking status from PENDING to CONFIRMED', async () => {
      const response = await request(app.getHttpServer())
        .put(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.CONFIRMED,
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.CONFIRMED)
      expect(response.body.id).toBe(bookingId)
    })

    it('should update booking status from CONFIRMED to IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .put(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.IN_PROGRESS,
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.IN_PROGRESS)
      expect(response.body.startedAt).toBeDefined()
    })

    it('should allow progress photos when updating to IN_PROGRESS for artist bookings', async () => {
      // Create another booking for this test
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.ARTIST,
          serviceCategory: 'duvar resmi',
          scheduledDate: new Date(Date.now() + 172800000).toISOString(),
          estimatedDuration: 240,
          serviceAddress: {
            address: '456 Test Ave',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'Another wall mural',
          estimatedPrice: 600,
          projectDetails: {
            projectType: 'Wall Mural',
            estimatedDuration: '3 days',
            priceRange: { min: 500, max: 700, currency: 'MXN' },
          },
        })

      const newBookingId = bookingResponse.body.id

      // Confirm the booking first
      await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.CONFIRMED,
        })

      // Update to IN_PROGRESS with progress photos
      const response = await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.IN_PROGRESS,
          progressPhotos: [
            {
              url: 'https://example.com/photo1.jpg',
              caption: 'Initial sketch',
            },
          ],
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.IN_PROGRESS)
      expect(response.body.progressPhotos).toBeDefined()
      expect(response.body.progressPhotos.length).toBeGreaterThan(0)
      expect(response.body.progressPhotos[0].url).toBe('https://example.com/photo1.jpg')
      expect(response.body.progressPhotos[0].caption).toBe('Initial sketch')
    })

    it('should update booking status from IN_PROGRESS to COMPLETED', async () => {
      const response = await request(app.getHttpServer())
        .put(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.COMPLETED,
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.COMPLETED)
      expect(response.body.completedAt).toBeDefined()
    })

    it('should reject invalid status transition', async () => {
      // Create a new booking in PENDING status
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.ARTIST,
          serviceCategory: 'mozaik',
          scheduledDate: new Date(Date.now() + 259200000).toISOString(),
          estimatedDuration: 180,
          serviceAddress: {
            address: '789 Test Blvd',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'Mosaic project',
          estimatedPrice: 400,
          projectDetails: {
            projectType: 'Mosaic',
            estimatedDuration: '1 day',
            priceRange: { min: 350, max: 450, currency: 'MXN' },
          },
        })

      const newBookingId = bookingResponse.body.id

      // Try to transition directly from PENDING to COMPLETED (invalid)
      await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.COMPLETED,
        })
        .expect(400)
    })

    it('should handle cancellation with reason', async () => {
      // Create a new booking
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.ARTIST,
          serviceCategory: 'duvar resmi',
          scheduledDate: new Date(Date.now() + 345600000).toISOString(),
          estimatedDuration: 120,
          serviceAddress: {
            address: '321 Cancel St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'To be cancelled',
          estimatedPrice: 300,
          projectDetails: {
            projectType: 'Small Mural',
            estimatedDuration: '1 day',
            priceRange: { min: 250, max: 350, currency: 'MXN' },
          },
        })

      const cancelBookingId = bookingResponse.body.id

      const response = await request(app.getHttpServer())
        .put(`/bookings/${cancelBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.CANCELLED,
          notes: 'Client requested cancellation',
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.CANCELLED)
      expect(response.body.cancelledAt).toBeDefined()
      expect(response.body.cancellationReason).toBe('Client requested cancellation')
    })

    it('should reject transition from COMPLETED status', async () => {
      // Try to change status of already completed booking
      await request(app.getHttpServer())
        .put(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.IN_PROGRESS,
        })
        .expect(400)
    })
  })

  describe('State Machine Validation', () => {
    it('should allow PENDING -> REJECTED transition', async () => {
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.ARTIST,
          serviceCategory: 'duvar resmi',
          scheduledDate: new Date(Date.now() + 432000000).toISOString(),
          estimatedDuration: 120,
          serviceAddress: {
            address: '555 Reject St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'To be rejected',
          estimatedPrice: 300,
          projectDetails: {
            projectType: 'Small Mural',
            estimatedDuration: '1 day',
            priceRange: { min: 250, max: 350, currency: 'MXN' },
          },
        })

      const response = await request(app.getHttpServer())
        .put(`/bookings/${bookingResponse.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.REJECTED,
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.REJECTED)
    })

    it('should allow CONFIRMED -> CANCELLED transition', async () => {
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.ARTIST,
          serviceCategory: 'mozaik',
          scheduledDate: new Date(Date.now() + 518400000).toISOString(),
          estimatedDuration: 180,
          serviceAddress: {
            address: '666 Cancel Ave',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'To be cancelled after confirmation',
          estimatedPrice: 400,
          projectDetails: {
            projectType: 'Mosaic',
            estimatedDuration: '2 days',
            priceRange: { min: 350, max: 450, currency: 'MXN' },
          },
        })

      const newBookingId = bookingResponse.body.id

      // First confirm
      await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.CONFIRMED,
        })

      // Then cancel
      const response = await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.CANCELLED,
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.CANCELLED)
    })

    it('should allow IN_PROGRESS -> DISPUTED transition', async () => {
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalId,
          professionalType: ProfessionalType.ARTIST,
          serviceCategory: 'duvar resmi',
          scheduledDate: new Date(Date.now() + 604800000).toISOString(),
          estimatedDuration: 240,
          serviceAddress: {
            address: '777 Dispute St',
            city: 'Mexico City',
            state: 'CDMX',
            country: 'Mexico',
            postalCode: '12345',
            coordinates: { latitude: 19.4326, longitude: -99.1332 },
          },
          description: 'To be disputed',
          estimatedPrice: 500,
          projectDetails: {
            projectType: 'Wall Mural',
            estimatedDuration: '2 days',
            priceRange: { min: 450, max: 550, currency: 'MXN' },
          },
        })

      const newBookingId = bookingResponse.body.id

      // Confirm
      await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.CONFIRMED,
        })

      // Start
      await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.IN_PROGRESS,
        })

      // Dispute
      const response = await request(app.getHttpServer())
        .put(`/bookings/${newBookingId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: BookingStatus.DISPUTED,
        })
        .expect(200)

      expect(response.body.status).toBe(BookingStatus.DISPUTED)
    })
  })
})
