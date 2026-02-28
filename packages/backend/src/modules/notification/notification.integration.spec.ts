import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'
import { NotificationModule } from './notification.module'
import { AuthModule } from '../auth/auth.module'
import { getDatabaseConfig } from '../../config/database.config'

describe('NotificationController (Integration)', () => {
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
          ...getDatabaseConfig({
            get: (key: string) => {
              const config: Record<string, string | number> = {
                DB_HOST: process.env.DB_HOST || 'localhost',
                DB_PORT: process.env.DB_PORT || 5432,
                DB_USERNAME: process.env.DB_USERNAME || 'postgres',
                DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
                DB_NAME: process.env.DB_NAME || 'technician_marketplace_test',
              }
              return config[key]
            },
          } as any),
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        NotificationModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()

    // Register and login a test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'notification-test@example.com',
        password: 'Test123!@#',
        role: 'user',
      })
      .expect(201)

    userId = registerResponse.body.user.id

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'notification-test@example.com',
        password: 'Test123!@#',
      })
      .expect(200)

    authToken = loginResponse.body.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /notifications', () => {
    it('should return empty notifications list initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.notifications).toEqual([])
      expect(response.body.total).toBe(0)
    })

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401)
    })
  })

  describe('GET /notifications/unread-count', () => {
    it('should return unread count', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.count).toBe(0)
    })
  })

  describe('PUT /notifications/:id/read', () => {
    it('should return 404 for non-existent notification', async () => {
      await request(app.getHttpServer())
        .put('/notifications/non-existent-id/read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('PUT /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)
    })
  })

  describe('DELETE /notifications/:id', () => {
    it('should return 404 for non-existent notification', async () => {
      await request(app.getHttpServer())
        .delete('/notifications/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })
})
