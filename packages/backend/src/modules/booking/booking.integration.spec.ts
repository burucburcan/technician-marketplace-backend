import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'
import { BookingModule } from './booking.module'
import { AuthModule } from '../auth/auth.module'
import { getDatabaseConfig } from '../../config/database.config'
import { BookingStatus, ProfessionalType } from '../../common/enums'

describe('BookingController (Integration)', () => {
  let app: INestApplication
  let authToken: string
  let professionalId: string

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
        BookingModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    // Initialize test data
    authToken = 'mock-auth-token'
    professionalId = 'mock-professional-id'
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /bookings', () => {
    it('should create a handyman booking successfully', async () => {
      const createBookingDto = {
        professionalId: professionalId,
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'plumbing',
        scheduledDate: new Date('2024-12-20T10:00:00Z').toISOString(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '123 Main St',
          city: 'Mexico City',
          state: 'CDMX',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: {
            latitude: 19.4326,
            longitude: -99.1332,
          },
        },
        description: 'Fix leaking pipe in kitchen',
        estimatedPrice: 500,
      }

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBookingDto)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.status).toBe(BookingStatus.PENDING)
      expect(response.body.professionalId).toBe(professionalId)
      expect(response.body.serviceCategory).toBe('plumbing')
      expect(response.body.description).toBe('Fix leaking pipe in kitchen')
    })

    it('should create an artist booking with project details', async () => {
      const createBookingDto = {
        professionalId: professionalId,
        professionalType: ProfessionalType.ARTIST,
        serviceCategory: 'mural',
        scheduledDate: new Date('2024-12-25T09:00:00Z').toISOString(),
        estimatedDuration: 480,
        serviceAddress: {
          address: '456 Art Street',
          city: 'Mexico City',
          state: 'CDMX',
          country: 'Mexico',
          postalCode: '54321',
          coordinates: {
            latitude: 19.4326,
            longitude: -99.1332,
          },
        },
        description: 'Create a mural on exterior wall',
        estimatedPrice: 8000,
        projectDetails: {
          projectType: 'Exterior Mural',
          estimatedDuration: '2 weeks',
          priceRange: {
            min: 5000,
            max: 10000,
            currency: 'MXN',
          },
          specialRequirements: 'Weather-resistant paint required',
          materials: ['acrylic paint', 'spray paint', 'sealant'],
        },
        referenceImages: [
          'https://example.com/reference1.jpg',
          'https://example.com/reference2.jpg',
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBookingDto)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.status).toBe(BookingStatus.PENDING)
      expect(response.body.projectDetails).toBeDefined()
      expect(response.body.projectDetails.projectType).toBe('Exterior Mural')
      expect(response.body.referenceImages).toHaveLength(2)
    })

    it('should reject booking with conflicting schedule', async () => {
      const createBookingDto = {
        professionalId: professionalId,
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'plumbing',
        scheduledDate: new Date('2024-12-20T10:30:00Z').toISOString(), // Overlaps with first booking
        estimatedDuration: 120,
        serviceAddress: {
          address: '789 Conflict St',
          city: 'Mexico City',
          state: 'CDMX',
          country: 'Mexico',
          postalCode: '11111',
          coordinates: {
            latitude: 19.4326,
            longitude: -99.1332,
          },
        },
        description: 'Another plumbing job',
        estimatedPrice: 600,
      }

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBookingDto)
        .expect(409)

      expect(response.body.message).toContain('conflicting booking')
    })

    it('should reject artist booking without project details', async () => {
      const createBookingDto = {
        professionalId: professionalId,
        professionalType: ProfessionalType.ARTIST,
        serviceCategory: 'mural',
        scheduledDate: new Date('2024-12-26T09:00:00Z').toISOString(),
        estimatedDuration: 480,
        serviceAddress: {
          address: '456 Art Street',
          city: 'Mexico City',
          state: 'CDMX',
          country: 'Mexico',
          postalCode: '54321',
          coordinates: {
            latitude: 19.4326,
            longitude: -99.1332,
          },
        },
        description: 'Create a mural',
        estimatedPrice: 8000,
        // Missing projectDetails
      }

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBookingDto)
        .expect(400)

      expect(response.body.message).toContain('Project details are required')
    })

    it('should validate required fields', async () => {
      const invalidDto = {
        professionalId: professionalId,
        // Missing required fields
      }

      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(400)
    })

    it('should reject booking for unavailable professional', async () => {
      // Assuming there's an unavailable professional in test data
      const createBookingDto = {
        professionalId: 'unavailable-prof-id',
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'plumbing',
        scheduledDate: new Date('2024-12-27T10:00:00Z').toISOString(),
        estimatedDuration: 120,
        serviceAddress: {
          address: '123 Main St',
          city: 'Mexico City',
          state: 'CDMX',
          country: 'Mexico',
          postalCode: '12345',
          coordinates: {
            latitude: 19.4326,
            longitude: -99.1332,
          },
        },
        description: 'Fix leaking pipe',
        estimatedPrice: 500,
      }

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBookingDto)
        .expect(400)

      expect(response.body.message).toContain('not available')
    })
  })

  describe('GET /bookings/:id', () => {
    it('should retrieve a booking by id', async () => {
      // First create a booking
      const createBookingDto = {
        professionalId: professionalId,
        professionalType: ProfessionalType.HANDYMAN,
        serviceCategory: 'electrical',
        scheduledDate: new Date('2024-12-28T14:00:00Z').toISOString(),
        estimatedDuration: 90,
        serviceAddress: {
          address: '999 Electric Ave',
          city: 'Mexico City',
          state: 'CDMX',
          country: 'Mexico',
          postalCode: '99999',
          coordinates: {
            latitude: 19.4326,
            longitude: -99.1332,
          },
        },
        description: 'Install new light fixtures',
        estimatedPrice: 750,
      }

      const createResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createBookingDto)
        .expect(201)

      const bookingId = createResponse.body.id

      // Then retrieve it
      const getResponse = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(getResponse.body.id).toBe(bookingId)
      expect(getResponse.body.serviceCategory).toBe('electrical')
      expect(getResponse.body.description).toBe('Install new light fixtures')
    })

    it('should return 404 for non-existent booking', async () => {
      await request(app.getHttpServer())
        .get('/bookings/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })
})
