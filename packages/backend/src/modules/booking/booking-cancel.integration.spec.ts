import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BookingModule } from './booking.module'
import { AuthModule } from '../auth/auth.module'
import { User } from '../../entities/user.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Booking } from '../../entities/booking.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { BookingStatus, PaymentStatus, UserRole, ProfessionalType } from '../../common/enums'
import { Repository } from 'typeorm'

/**
 * Integration tests for booking cancellation system
 * Task 8.7: Implement booking cancellation system
 * Requirement 6.6: Platform SHALL record cancellation reason and notify professional
 */
describe('Booking Cancellation (Integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let professionalRepository: Repository<ProfessionalProfile>
  let bookingRepository: Repository<Booking>
  let categoryRepository: Repository<ServiceCategory>
  let authToken: string
  let userId: string
  let professionalId: string
  let categoryId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
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
        BookingModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    userRepository = moduleFixture.get('UserRepository')
    professionalRepository = moduleFixture.get('ProfessionalProfileRepository')
    bookingRepository = moduleFixture.get('BookingRepository')
    categoryRepository = moduleFixture.get('ServiceCategoryRepository')
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clean up database
    await bookingRepository.delete({})
    await professionalRepository.delete({})
    await categoryRepository.delete({})
    await userRepository.delete({})

    // Create test category
    const category = await categoryRepository.save(
      categoryRepository.create({
        name: 'Plumbing',
        nameTranslations: {
          es: 'Plomería',
          en: 'Plumbing',
        },
        description: 'Plumbing services',
      })
    )
    categoryId = category.id

    // Register and login user
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'testuser@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      language: 'en',
    })

    userId = registerResponse.body.user.id

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'testuser@example.com',
      password: 'Password123!',
    })

    authToken = loginResponse.body.accessToken

    // Create professional user and profile
    const professionalUser = await userRepository.save(
      userRepository.create({
        email: 'professional@example.com',
        passwordHash: 'hashedpassword',
        role: UserRole.PROFESSIONAL,
        isEmailVerified: true,
      })
    )

    const professional = await professionalRepository.save(
      professionalRepository.create({
        userId: professionalUser.id,
        professionalType: ProfessionalType.HANDYMAN,
        experienceYears: 5,
        hourlyRate: 50,
        serviceRadius: 25,
        workingHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
          saturday: [],
          sunday: [],
        },
        isAvailable: true,
        rating: 4.5,
        totalJobs: 10,
        completionRate: 95,
      })
    )
    professionalId = professional.id
  })

  describe('PUT /bookings/:id/cancel', () => {
    it('should cancel a PENDING booking with reason', async () => {
      // Create a pending booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        })
      )

      // Cancel the booking
      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Customer changed their mind',
        })
        .expect(200)

      expect(response.body).toMatchObject({
        id: booking.id,
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Customer changed their mind',
      })
      expect(response.body.cancelledAt).toBeDefined()
      expect(new Date(response.body.cancelledAt)).toBeInstanceOf(Date)
    })

    it('should cancel a CONFIRMED booking with reason', async () => {
      // Create a confirmed booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() + 86400000),
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
        })
      )

      // Cancel the booking
      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Emergency came up',
        })
        .expect(200)

      expect(response.body).toMatchObject({
        id: booking.id,
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Emergency came up',
      })
      expect(response.body.cancelledAt).toBeDefined()
    })

    it('should reject cancellation of IN_PROGRESS booking', async () => {
      // Create an in-progress booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() - 3600000), // 1 hour ago
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.IN_PROGRESS,
          paymentStatus: PaymentStatus.AUTHORIZED,
          startedAt: new Date(),
        })
      )

      // Attempt to cancel the booking
      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Want to cancel',
        })
        .expect(400)

      expect(response.body.message).toContain('Cannot cancel booking with status in_progress')
    })

    it('should reject cancellation of COMPLETED booking', async () => {
      // Create a completed booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() - 86400000), // Yesterday
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.COMPLETED,
          paymentStatus: PaymentStatus.CAPTURED,
          startedAt: new Date(Date.now() - 86400000),
          completedAt: new Date(Date.now() - 82800000),
        })
      )

      // Attempt to cancel the booking
      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Want to cancel',
        })
        .expect(400)

      expect(response.body.message).toContain('Cannot cancel booking with status completed')
    })

    it('should reject cancellation without reason', async () => {
      // Create a pending booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() + 86400000),
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        })
      )

      // Attempt to cancel without reason
      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)

      expect(response.body.message).toContain('reason')
    })

    it('should reject cancellation with empty reason', async () => {
      // Create a pending booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() + 86400000),
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        })
      )

      // Attempt to cancel with empty reason
      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: '',
        })
        .expect(400)

      expect(response.body.message).toContain('reason')
    })

    it('should reject cancellation with reason exceeding max length', async () => {
      // Create a pending booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() + 86400000),
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        })
      )

      // Attempt to cancel with very long reason (> 500 chars)
      const longReason = 'a'.repeat(501)
      const response = await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: longReason,
        })
        .expect(400)

      expect(response.body.message).toBeDefined()
    })

    it('should return 404 for non-existent booking', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      const response = await request(app.getHttpServer())
        .put(`/bookings/${fakeId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Test reason',
        })
        .expect(404)

      expect(response.body.message).toContain('not found')
    })

    it('should persist cancellation data correctly', async () => {
      // Create a pending booking
      const booking = await bookingRepository.save(
        bookingRepository.create({
          userId,
          professionalId,
          professionalType: ProfessionalType.HANDYMAN,
          serviceCategory: categoryId,
          scheduledDate: new Date(Date.now() + 86400000),
          estimatedDuration: 120,
          serviceAddress: {
            address: '123 Main St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: { latitude: 40.7128, longitude: -74.006 },
          },
          description: 'Test booking',
          estimatedPrice: 100,
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        })
      )

      // Cancel the booking
      await request(app.getHttpServer())
        .put(`/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Need to reschedule',
        })
        .expect(200)

      // Verify data persisted in database
      const cancelledBooking = await bookingRepository.findOne({
        where: { id: booking.id },
      })

      expect(cancelledBooking).toBeDefined()
      expect(cancelledBooking!.status).toBe(BookingStatus.CANCELLED)
      expect(cancelledBooking!.cancellationReason).toBe('Need to reschedule')
      expect(cancelledBooking!.cancelledAt).toBeInstanceOf(Date)
      expect(cancelledBooking!.cancelledAt!.getTime()).toBeLessThanOrEqual(Date.now())
    })
  })
})
