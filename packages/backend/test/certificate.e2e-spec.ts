import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('Certificate Management (e2e)', () => {
  let app: INestApplication
  let authToken: string
  let professionalId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    // Register and login a user
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'professional@test.com',
      password: 'Test123!@#',
      role: 'professional',
    })

    authToken = registerResponse.body.accessToken

    // Create professional profile
    const profileResponse = await request(app.getHttpServer())
      .post('/users/professionals/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        professionalType: 'handyman',
        businessName: 'Test Professional Services',
        specializationIds: [],
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
      })

    professionalId = profileResponse.body.id
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /users/professionals/:id/certificates', () => {
    it('should upload a certificate successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/professionals/${professionalId}/certificates`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('name', 'AWS Certified Solutions Architect')
        .field('issuer', 'Amazon Web Services')
        .field('issueDate', '2023-01-15')
        .field('expiryDate', '2026-01-15')
        .attach('file', Buffer.from('test certificate content'), {
          filename: 'certificate.pdf',
          contentType: 'application/pdf',
        })

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe('AWS Certified Solutions Architect')
      expect(response.body.issuer).toBe('Amazon Web Services')
      expect(response.body.fileUrl).toBeDefined()
      expect(response.body.verifiedByAdmin).toBe(false)
    })

    it('should reject invalid file type', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/professionals/${professionalId}/certificates`)
        .set('Authorization', `Bearer ${authToken}`)
        .field('name', 'Test Certificate')
        .field('issuer', 'Test Issuer')
        .field('issueDate', '2023-01-15')
        .attach('file', Buffer.from('test'), {
          filename: 'certificate.txt',
          contentType: 'text/plain',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('Invalid file type')
    })

    it('should reject unauthorized access', async () => {
      const response = await request(app.getHttpServer())
        .post(`/users/professionals/${professionalId}/certificates`)
        .field('name', 'Test Certificate')
        .field('issuer', 'Test Issuer')
        .field('issueDate', '2023-01-15')
        .attach('file', Buffer.from('test'), {
          filename: 'certificate.pdf',
          contentType: 'application/pdf',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /users/professionals/:id/certificates', () => {
    it('should return all certificates for a professional', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/professionals/${professionalId}/certificates`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('name')
      expect(response.body[0]).toHaveProperty('issuer')
      expect(response.body[0]).toHaveProperty('fileUrl')
    })

    it('should return empty array if no certificates', async () => {
      // Create a new professional without certificates
      const newProfileResponse = await request(app.getHttpServer())
        .post('/users/professionals/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalType: 'artist',
          businessName: 'New Professional',
          specializationIds: [],
          experienceYears: 2,
          hourlyRate: 40,
          serviceRadius: 20,
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

      const newProfessionalId = newProfileResponse.body.id

      const response = await request(app.getHttpServer())
        .get(`/users/professionals/${newProfessionalId}/certificates`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBe(0)
    })

    it('should return 404 for non-existent professional', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/professionals/00000000-0000-0000-0000-000000000000/certificates')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
    })
  })
})
