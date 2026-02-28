import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from '../src/entities/user.entity'
import { UserProfile } from '../src/entities/user-profile.entity'
import { Repository } from 'typeorm'

describe('User Preferences (e2e)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let userProfileRepository: Repository<UserProfile>
  let authToken: string
  let userId: string
  let profileId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User))
    userProfileRepository = moduleFixture.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile)
    )
  })

  afterAll(async () => {
    // Cleanup
    if (profileId) {
      await userProfileRepository.delete(profileId)
    }
    if (userId) {
      await userRepository.delete(userId)
    }
    await app.close()
  })

  describe('PUT /users/:id/preferences', () => {
    beforeAll(async () => {
      // Register a test user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `test-preferences-${Date.now()}@example.com`,
          password: 'Test123!@#',
        })
        .expect(201)

      userId = registerResponse.body.user.id
      authToken = registerResponse.body.accessToken

      // Create user profile
      const profileResponse = await request(app.getHttpServer())
        .post(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          phone: '+1234567890',
          location: {
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            country: 'Test Country',
            postalCode: '12345',
            coordinates: {
              latitude: 19.4326,
              longitude: -99.1332,
            },
          },
        })
        .expect(201)

      profileId = profileResponse.body.id
    })

    it('should update language preference to English', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'en',
        })
        .expect(200)

      expect(response.body.language).toBe('en')
      expect(response.body.preferences).toBeDefined()
    })

    it('should update language preference to Spanish', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'es',
        })
        .expect(200)

      expect(response.body.language).toBe('es')
    })

    it('should update notification preferences', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
          smsNotifications: false,
          pushNotifications: true,
        })
        .expect(200)

      expect(response.body.preferences.emailNotifications).toBe(false)
      expect(response.body.preferences.smsNotifications).toBe(false)
      expect(response.body.preferences.pushNotifications).toBe(true)
    })

    it('should update both language and preferences together', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'en',
          emailNotifications: true,
          currency: 'USD',
        })
        .expect(200)

      expect(response.body.language).toBe('en')
      expect(response.body.preferences.emailNotifications).toBe(true)
      expect(response.body.preferences.currency).toBe('USD')
    })

    it('should reject invalid language', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'fr', // French not supported
        })
        .expect(400)
    })

    it('should reject invalid currency', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currency: 'EUR', // Euro not supported
        })
        .expect(400)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .send({
          language: 'en',
        })
        .expect(401)
    })

    it('should prevent updating another user preferences', async () => {
      // Create another user
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `other-user-${Date.now()}@example.com`,
          password: 'Test123!@#',
        })
        .expect(201)

      const otherUserId = otherUserResponse.body.user.id

      // Try to update other user's preferences
      await request(app.getHttpServer())
        .put(`/users/${otherUserId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'en',
        })
        .expect(403)

      // Cleanup
      await userRepository.delete(otherUserId)
    })

    it('should persist language preference across requests', async () => {
      // Update language to English
      await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          language: 'en',
        })
        .expect(200)

      // Get profile and verify language is persisted
      const profileResponse = await request(app.getHttpServer())
        .get(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(profileResponse.body.language).toBe('en')
    })
  })
})
