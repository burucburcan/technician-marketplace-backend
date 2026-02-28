import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'
import { DataSource } from 'typeorm'
import { NotificationModule } from './notification.module'
import { AuthModule } from '../auth/auth.module'
import {
  User,
  UserProfile,
  Notification,
  NotificationType,
  NotificationChannel,
} from '../../entities'

describe('Notification Preferences (Integration)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let authToken: string
  let userId: string
  let userProfileId: string

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
          entities: [User, UserProfile, Notification],
          synchronize: true,
          dropSchema: true,
        }),
        AuthModule,
        NotificationModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    dataSource = moduleFixture.get<DataSource>(DataSource)
  })

  afterAll(async () => {
    await dataSource.destroy()
    await app.close()
  })

  beforeEach(async () => {
    // Clean up database
    await dataSource.getRepository(Notification).delete({})
    await dataSource.getRepository(UserProfile).delete({})
    await dataSource.getRepository(User).delete({})

    // Create test user
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      email: 'test@example.com',
      password: 'Password123!',
      role: 'user',
    })

    authToken = registerResponse.body.accessToken
    userId = registerResponse.body.user.id

    // Create user profile with default preferences
    const userProfile = dataSource.getRepository(UserProfile).create({
      userId,
      firstName: 'Test',
      lastName: 'User',
      phone: '+1234567890',
      language: 'es',
      location: {
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        currency: 'MXN',
      },
    })

    const savedProfile = await dataSource.getRepository(UserProfile).save(userProfile)
    userProfileId = savedProfile.id
  })

  describe('PUT /notifications/preferences', () => {
    it('should update email notification preference', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
        })
        .expect(200)

      expect(response.body.preferences.emailNotifications).toBe(false)
      expect(response.body.preferences.smsNotifications).toBe(true)
      expect(response.body.preferences.pushNotifications).toBe(true)
    })

    it('should update SMS notification preference', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          smsNotifications: false,
        })
        .expect(200)

      expect(response.body.preferences.emailNotifications).toBe(true)
      expect(response.body.preferences.smsNotifications).toBe(false)
      expect(response.body.preferences.pushNotifications).toBe(true)
    })

    it('should update push notification preference', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pushNotifications: false,
        })
        .expect(200)

      expect(response.body.preferences.emailNotifications).toBe(true)
      expect(response.body.preferences.smsNotifications).toBe(true)
      expect(response.body.preferences.pushNotifications).toBe(false)
    })

    it('should update multiple channel preferences at once', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
          smsNotifications: false,
          pushNotifications: false,
        })
        .expect(200)

      expect(response.body.preferences.emailNotifications).toBe(false)
      expect(response.body.preferences.smsNotifications).toBe(false)
      expect(response.body.preferences.pushNotifications).toBe(false)
    })

    it('should update notification type preferences', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notificationTypes: {
            [NotificationType.BOOKING_CREATED]: false,
            [NotificationType.BOOKING_CONFIRMED]: true,
            [NotificationType.NEW_MESSAGE]: false,
          },
        })
        .expect(200)

      expect(response.body.preferences.notificationTypes).toBeDefined()
      expect(response.body.preferences.notificationTypes[NotificationType.BOOKING_CREATED]).toBe(
        false
      )
      expect(response.body.preferences.notificationTypes[NotificationType.BOOKING_CONFIRMED]).toBe(
        true
      )
      expect(response.body.preferences.notificationTypes[NotificationType.NEW_MESSAGE]).toBe(false)
    })

    it('should update both channel and type preferences', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
          notificationTypes: {
            [NotificationType.BOOKING_CREATED]: false,
          },
        })
        .expect(200)

      expect(response.body.preferences.emailNotifications).toBe(false)
      expect(response.body.preferences.notificationTypes[NotificationType.BOOKING_CREATED]).toBe(
        false
      )
    })

    it('should preserve existing notification type preferences when updating', async () => {
      // First update
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notificationTypes: {
            [NotificationType.BOOKING_CREATED]: false,
          },
        })
        .expect(200)

      // Second update
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notificationTypes: {
            [NotificationType.NEW_MESSAGE]: false,
          },
        })
        .expect(200)

      expect(response.body.preferences.notificationTypes[NotificationType.BOOKING_CREATED]).toBe(
        false
      )
      expect(response.body.preferences.notificationTypes[NotificationType.NEW_MESSAGE]).toBe(false)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .send({
          emailNotifications: false,
        })
        .expect(401)
    })

    it('should validate boolean values for channel preferences', async () => {
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: 'invalid',
        })
        .expect(400)
    })

    it('should return 404 if user profile does not exist', async () => {
      // Delete user profile
      await dataSource.getRepository(UserProfile).delete({ id: userProfileId })

      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
        })
        .expect(404)
    })
  })

  describe('GET /notifications/preferences', () => {
    it('should get current notification preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.emailNotifications).toBe(true)
      expect(response.body.smsNotifications).toBe(true)
      expect(response.body.pushNotifications).toBe(true)
      expect(response.body.currency).toBe('MXN')
    })

    it('should get updated preferences after modification', async () => {
      // Update preferences
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
          notificationTypes: {
            [NotificationType.BOOKING_CREATED]: false,
          },
        })
        .expect(200)

      // Get preferences
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.emailNotifications).toBe(false)
      expect(response.body.notificationTypes[NotificationType.BOOKING_CREATED]).toBe(false)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/notifications/preferences').expect(401)
    })

    it('should return 404 if user profile does not exist', async () => {
      // Delete user profile
      await dataSource.getRepository(UserProfile).delete({ id: userProfileId })

      await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })
  })

  describe('Requirement 10.6: Notification Preference Management', () => {
    it('should allow users to manage notification preferences', async () => {
      // Update preferences
      const updateResponse = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          emailNotifications: false,
          smsNotifications: true,
          pushNotifications: false,
          notificationTypes: {
            [NotificationType.BOOKING_CREATED]: true,
            [NotificationType.BOOKING_CONFIRMED]: false,
            [NotificationType.NEW_MESSAGE]: true,
          },
        })
        .expect(200)

      expect(updateResponse.body.preferences.emailNotifications).toBe(false)
      expect(updateResponse.body.preferences.smsNotifications).toBe(true)
      expect(updateResponse.body.preferences.pushNotifications).toBe(false)
      expect(
        updateResponse.body.preferences.notificationTypes[NotificationType.BOOKING_CREATED]
      ).toBe(true)
      expect(
        updateResponse.body.preferences.notificationTypes[NotificationType.BOOKING_CONFIRMED]
      ).toBe(false)
      expect(updateResponse.body.preferences.notificationTypes[NotificationType.NEW_MESSAGE]).toBe(
        true
      )

      // Verify preferences are persisted
      const getResponse = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(getResponse.body.emailNotifications).toBe(false)
      expect(getResponse.body.smsNotifications).toBe(true)
      expect(getResponse.body.pushNotifications).toBe(false)
      expect(getResponse.body.notificationTypes[NotificationType.BOOKING_CREATED]).toBe(true)
      expect(getResponse.body.notificationTypes[NotificationType.BOOKING_CONFIRMED]).toBe(false)
      expect(getResponse.body.notificationTypes[NotificationType.NEW_MESSAGE]).toBe(true)
    })

    it('should respect notification type preferences when sending notifications', async () => {
      // Disable BOOKING_CREATED notifications
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notificationTypes: {
            [NotificationType.BOOKING_CREATED]: false,
          },
        })
        .expect(200)

      // Send a BOOKING_CREATED notification
      const notificationService = app.get('NotificationService')
      await notificationService.sendNotification({
        userId,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: 'test-booking', serviceName: 'Test Service' },
        channels: [NotificationChannel.IN_APP],
      })

      // Verify notification was not saved to database
      const notifications = await dataSource.getRepository(Notification).find({
        where: { userId, type: NotificationType.BOOKING_CREATED },
      })

      expect(notifications.length).toBe(0)
    })

    it('should allow notifications when type preference is enabled', async () => {
      // Enable BOOKING_CREATED notifications explicitly
      await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notificationTypes: {
            [NotificationType.BOOKING_CREATED]: true,
          },
        })
        .expect(200)

      // Send a BOOKING_CREATED notification
      const notificationService = app.get('NotificationService')
      await notificationService.sendNotification({
        userId,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: 'test-booking', serviceName: 'Test Service' },
        channels: [NotificationChannel.IN_APP],
      })

      // Verify notification was saved to database
      const notifications = await dataSource.getRepository(Notification).find({
        where: { userId, type: NotificationType.BOOKING_CREATED },
      })

      expect(notifications.length).toBe(1)
      expect(notifications[0].type).toBe(NotificationType.BOOKING_CREATED)
    })

    it('should allow notifications when type preference is not set (default behavior)', async () => {
      // Don't set any notification type preferences (default is to allow all)

      // Send a BOOKING_CREATED notification
      const notificationService = app.get('NotificationService')
      await notificationService.sendNotification({
        userId,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: 'test-booking', serviceName: 'Test Service' },
        channels: [NotificationChannel.IN_APP],
      })

      // Verify notification was saved to database
      const notifications = await dataSource.getRepository(Notification).find({
        where: { userId, type: NotificationType.BOOKING_CREATED },
      })

      expect(notifications.length).toBe(1)
      expect(notifications[0].type).toBe(NotificationType.BOOKING_CREATED)
    })
  })
})
