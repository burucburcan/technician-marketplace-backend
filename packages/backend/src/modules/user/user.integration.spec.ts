import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'
import { UserModule } from './user.module'
import { AuthModule } from '../auth/auth.module'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { UserRole } from '../../common/enums'

describe('UserController (Integration)', () => {
  let app: INestApplication
  let authToken: string
  let userId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, UserProfile],
          synchronize: true,
        }),
        AuthModule,
        UserModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()

    // Register a test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.USER,
      })
      .expect(201)

    authToken = registerResponse.body.accessToken
    userId = registerResponse.body.user.id
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /users/:id/profile', () => {
    it('should create user profile', async () => {
      const profileData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        location: {
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
      }

      const response = await request(app.getHttpServer())
        .post(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(201)

      expect(response.body).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        language: 'es',
        userId,
      })
      expect(response.body.preferences).toMatchObject({
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        currency: 'MXN',
      })
    })

    it('should return 400 when profile already exists', async () => {
      const profileData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+0987654321',
        location: {
          address: '456 Oak Ave',
          city: 'Guadalajara',
          state: 'Jalisco',
          country: 'Mexico',
          postalCode: '54321',
          coordinates: {
            latitude: 20.6597,
            longitude: -103.3496,
          },
        },
      }

      await request(app.getHttpServer())
        .post(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400)
    })
  })

  describe('GET /users/:id/profile', () => {
    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        language: 'es',
        userId,
      })
    })

    it('should return 404 for non-existent profile', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000'

      await request(app.getHttpServer())
        .get(`/users/${nonExistentUserId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('PUT /users/:id/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        preferences: {
          emailNotifications: false,
          currency: 'USD',
        },
      }

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toMatchObject({
        firstName: 'Jane',
        lastName: 'Smith',
        userId,
      })
      expect(response.body.preferences).toMatchObject({
        emailNotifications: false,
        smsNotifications: true, // Should remain unchanged
        pushNotifications: true, // Should remain unchanged
        currency: 'USD',
      })
    })

    it('should return 403 when trying to update another user profile', async () => {
      const otherUserId = '11111111-1111-1111-1111-111111111111'

      await request(app.getHttpServer())
        .put(`/users/${otherUserId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'Hacker' })
        .expect(403)
    })
  })

  describe('PUT /users/:id/preferences', () => {
    it('should update user language preference', async () => {
      const updateData = {
        language: 'en',
      }

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toMatchObject({
        language: 'en',
        userId,
      })
    })

    it('should update user notification preferences', async () => {
      const updateData = {
        emailNotifications: false,
        smsNotifications: false,
      }

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.preferences).toMatchObject({
        emailNotifications: false,
        smsNotifications: false,
        pushNotifications: true, // Should remain unchanged
      })
    })

    it('should update both language and preferences', async () => {
      const updateData = {
        language: 'es',
        emailNotifications: true,
        currency: 'MXN',
      }

      const response = await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body).toMatchObject({
        language: 'es',
        userId,
      })
      expect(response.body.preferences).toMatchObject({
        emailNotifications: true,
        currency: 'MXN',
      })
    })

    it('should return 400 for invalid language', async () => {
      const updateData = {
        language: 'fr', // Invalid language
      }

      await request(app.getHttpServer())
        .put(`/users/${userId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400)
    })

    it('should return 403 when trying to update another user preferences', async () => {
      const otherUserId = '11111111-1111-1111-1111-111111111111'

      await request(app.getHttpServer())
        .put(`/users/${otherUserId}/preferences`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ language: 'en' })
        .expect(403)
    })
  })

  describe('GET /users/:id/export', () => {
    it('should export user data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${userId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('exportDate')
      expect(response.body).toHaveProperty('userData')
      expect(response.body.userData).toHaveProperty('email', 'test@example.com')
      expect(response.body.userData).not.toHaveProperty('passwordHash')
      expect(response.body.userData).not.toHaveProperty('twoFactorSecret')
    })

    it('should return 403 when trying to export another user data', async () => {
      const otherUserId = '11111111-1111-1111-1111-111111111111'

      await request(app.getHttpServer())
        .get(`/users/${otherUserId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403)
    })
  })

  describe('DELETE /users/:id', () => {
    it('should delete user account', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toEqual({
        message: 'Account deleted successfully',
      })

      // Verify profile is also deleted
      await request(app.getHttpServer())
        .get(`/users/${userId}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it('should return 403 when trying to delete another user account', async () => {
      // Create another user for this test
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'password123',
          role: UserRole.USER,
        })
        .expect(201)

      const newAuthToken = registerResponse.body.accessToken
      const otherUserId = '11111111-1111-1111-1111-111111111111'

      await request(app.getHttpServer())
        .delete(`/users/${otherUserId}`)
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(403)
    })
  })

  describe('Authentication', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer()).get(`/users/${userId}/profile`).expect(401)
    })

    it('should return 401 with invalid auth token', async () => {
      await request(app.getHttpServer())
        .get(`/users/${userId}/profile`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
    })
  })
})
