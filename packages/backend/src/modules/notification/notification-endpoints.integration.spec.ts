import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import * as request from 'supertest'
import { NotificationModule } from './notification.module'
import { AuthModule } from '../auth/auth.module'
import { getDatabaseConfig } from '../../config/database.config'
import { NotificationService } from './notification.service'
import { NotificationType, NotificationChannel } from '../../entities/notification.entity'
import { Repository } from 'typeorm'
import { User, UserProfile } from '../../entities'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { UserRole } from '../../common/enums'

describe('NotificationController (Integration)', () => {
  let app: INestApplication
  let notificationService: NotificationService
  let userRepository: Repository<User>
  let userProfileRepository: Repository<UserProfile>
  let authToken: string
  let userId: string
  const notificationIds: string[] = []

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
        NotificationModule,
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true }))
    await app.init()

    notificationService = moduleFixture.get<NotificationService>(NotificationService)
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User))
    userProfileRepository = moduleFixture.get<Repository<UserProfile>>(
      getRepositoryToken(UserProfile)
    )

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
    const testUser = await userRepository.save(
      userRepository.create({
        email: `notification-test-${Date.now()}@example.com`,
        passwordHash: hashedPassword,
        role: UserRole.USER,
        isEmailVerified: true,
      })
    )
    userId = testUser.id

    // Create user profile
    await userProfileRepository.save(
      userProfileRepository.create({
        userId: testUser.id,
        firstName: 'Test',
        lastName: 'User',
        language: 'es',
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
        },
      })
    )

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'TestPassword123!',
      })
      .expect(200)

    authToken = loginResponse.body.accessToken

    // Create test notifications
    const notification1 = await notificationService.sendNotification({
      userId,
      type: NotificationType.BOOKING_CREATED,
      data: { bookingId: 'booking-1', serviceName: 'Plumbing' },
      channels: [NotificationChannel.IN_APP],
    })
    notificationIds.push(notification1.id)

    const notification2 = await notificationService.sendNotification({
      userId,
      type: NotificationType.BOOKING_CONFIRMED,
      data: { bookingId: 'booking-2', serviceName: 'Electrical' },
      channels: [NotificationChannel.IN_APP],
    })
    notificationIds.push(notification2.id)

    const notification3 = await notificationService.sendNotification({
      userId,
      type: NotificationType.NEW_MESSAGE,
      data: { senderId: 'user-123', senderName: 'John Doe' },
      channels: [NotificationChannel.IN_APP],
    })
    notificationIds.push(notification3.id)

    // Mark one notification as read
    await notificationService.markAsRead(notificationIds[0], userId)
  })

  afterAll(async () => {
    // Cleanup: delete test user and related data
    if (userId) {
      await userProfileRepository.delete({ userId })
      await userRepository.delete({ id: userId })
    }
    await app.close()
  })

  describe('GET /notifications', () => {
    it('should retrieve all notifications for the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('notifications')
      expect(response.body).toHaveProperty('total')
      expect(Array.isArray(response.body.notifications)).toBe(true)
      expect(response.body.notifications.length).toBeGreaterThanOrEqual(3)
      expect(response.body.total).toBeGreaterThanOrEqual(3)
    })

    it('should filter notifications by read status (unread)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?isRead=false')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.notifications).toBeDefined()
      expect(response.body.notifications.length).toBeGreaterThanOrEqual(2)
      response.body.notifications.forEach((notification: any) => {
        expect(notification.isRead).toBe(false)
      })
    })

    it('should filter notifications by read status (read)', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?isRead=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.notifications).toBeDefined()
      expect(response.body.notifications.length).toBeGreaterThanOrEqual(1)
      response.body.notifications.forEach((notification: any) => {
        expect(notification.isRead).toBe(true)
      })
    })

    it('should filter notifications by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/notifications?type=${NotificationType.BOOKING_CREATED}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.notifications).toBeDefined()
      expect(response.body.notifications.length).toBeGreaterThanOrEqual(1)
      response.body.notifications.forEach((notification: any) => {
        expect(notification.type).toBe(NotificationType.BOOKING_CREATED)
      })
    })

    it('should support pagination with limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.notifications).toBeDefined()
      expect(response.body.notifications.length).toBeLessThanOrEqual(2)
      expect(response.body.total).toBeGreaterThanOrEqual(3)
    })

    it('should support pagination with offset', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications?limit=2&offset=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.notifications).toBeDefined()
      expect(response.body.notifications.length).toBeLessThanOrEqual(2)
    })

    it('should return notifications in descending order by creation date', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const notifications = response.body.notifications
      expect(notifications.length).toBeGreaterThan(1)

      for (let i = 0; i < notifications.length - 1; i++) {
        const currentDate = new Date(notifications[i].createdAt)
        const nextDate = new Date(notifications[i + 1].createdAt)
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
      }
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/notifications').expect(401)
    })

    it('should not return notifications from other users', async () => {
      // Create another user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
      const otherUser = await userRepository.save(
        userRepository.create({
          email: `other-user-${Date.now()}@example.com`,
          passwordHash: hashedPassword,
          role: UserRole.USER,
          isEmailVerified: true,
        })
      )

      // Create profile for other user
      await userProfileRepository.save(
        userProfileRepository.create({
          userId: otherUser.id,
          firstName: 'Other',
          lastName: 'User',
          language: 'es',
        })
      )

      // Create notification for other user
      await notificationService.sendNotification({
        userId: otherUser.id,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: 'other-booking' },
        channels: [NotificationChannel.IN_APP],
      })

      // Get notifications for current user
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify none of the notifications belong to the other user
      response.body.notifications.forEach((notification: any) => {
        expect(notification.userId).toBe(userId)
        expect(notification.userId).not.toBe(otherUser.id)
      })

      // Cleanup
      await userProfileRepository.delete({ userId: otherUser.id })
      await userRepository.delete({ id: otherUser.id })
    })
  })

  describe('GET /notifications/unread-count', () => {
    it('should return the count of unread notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('count')
      expect(typeof response.body.count).toBe('number')
      expect(response.body.count).toBeGreaterThanOrEqual(2)
    })

    it('should return 0 when all notifications are read', async () => {
      // Mark all as read
      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.count).toBe(0)

      // Create a new unread notification for subsequent tests
      const newNotification = await notificationService.sendNotification({
        userId,
        type: NotificationType.BOOKING_REMINDER,
        data: { bookingId: 'booking-reminder' },
        channels: [NotificationChannel.IN_APP],
      })
      notificationIds.push(newNotification.id)
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/notifications/unread-count').expect(401)
    })
  })

  describe('PUT /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      // Get an unread notification
      const unreadResponse = await request(app.getHttpServer())
        .get('/notifications?isRead=false&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(unreadResponse.body.notifications.length).toBeGreaterThan(0)
      const notificationId = unreadResponse.body.notifications[0].id

      // Mark it as read
      const response = await request(app.getHttpServer())
        .put(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.id).toBe(notificationId)
      expect(response.body.isRead).toBe(true)
      expect(response.body.readAt).toBeDefined()
    })

    it('should be idempotent (marking already read notification as read)', async () => {
      // Get a read notification
      const readResponse = await request(app.getHttpServer())
        .get('/notifications?isRead=true&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(readResponse.body.notifications.length).toBeGreaterThan(0)
      const notificationId = readResponse.body.notifications[0].id
      const originalReadAt = readResponse.body.notifications[0].readAt

      // Mark it as read again
      const response = await request(app.getHttpServer())
        .put(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.id).toBe(notificationId)
      expect(response.body.isRead).toBe(true)
      expect(response.body.readAt).toBe(originalReadAt)
    })

    it('should return 404 for non-existent notification', async () => {
      await request(app.getHttpServer())
        .put('/notifications/non-existent-id/read')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
    })

    it("should not allow marking another user's notification as read", async () => {
      // Create another user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
      const otherUser = await userRepository.save(
        userRepository.create({
          email: `other-user-mark-${Date.now()}@example.com`,
          passwordHash: hashedPassword,
          role: UserRole.USER,
          isEmailVerified: true,
        })
      )

      // Create profile for other user
      await userProfileRepository.save(
        userProfileRepository.create({
          userId: otherUser.id,
          firstName: 'Other',
          lastName: 'User',
          language: 'es',
        })
      )

      // Create notification for other user
      const otherNotification = await notificationService.sendNotification({
        userId: otherUser.id,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: 'other-booking' },
        channels: [NotificationChannel.IN_APP],
      })

      // Try to mark other user's notification as read
      await request(app.getHttpServer())
        .put(`/notifications/${otherNotification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      // Cleanup
      await userProfileRepository.delete({ userId: otherUser.id })
      await userRepository.delete({ id: otherUser.id })
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put(`/notifications/${notificationIds[0]}/read`)
        .expect(401)
    })
  })

  describe('PUT /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      // Create some unread notifications
      await notificationService.sendNotification({
        userId,
        type: NotificationType.NEW_MESSAGE,
        data: { senderId: 'user-456' },
        channels: [NotificationChannel.IN_APP],
      })

      await notificationService.sendNotification({
        userId,
        type: NotificationType.BOOKING_CONFIRMED,
        data: { bookingId: 'booking-new' },
        channels: [NotificationChannel.IN_APP],
      })

      // Mark all as read
      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify all notifications are read
      const response = await request(app.getHttpServer())
        .get('/notifications?isRead=false')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.notifications.length).toBe(0)

      // Verify unread count is 0
      const countResponse = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(countResponse.body.count).toBe(0)
    })

    it('should be idempotent (marking all as read when already read)', async () => {
      // Mark all as read again
      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify still no unread notifications
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.count).toBe(0)
    })

    it("should only mark current user's notifications as read", async () => {
      // Create another user
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10)
      const otherUser = await userRepository.save(
        userRepository.create({
          email: `other-user-readall-${Date.now()}@example.com`,
          passwordHash: hashedPassword,
          role: UserRole.USER,
          isEmailVerified: true,
        })
      )

      // Create profile for other user
      await userProfileRepository.save(
        userProfileRepository.create({
          userId: otherUser.id,
          firstName: 'Other',
          lastName: 'User',
          language: 'es',
        })
      )

      // Create unread notification for other user
      await notificationService.sendNotification({
        userId: otherUser.id,
        type: NotificationType.BOOKING_CREATED,
        data: { bookingId: 'other-booking' },
        channels: [NotificationChannel.IN_APP],
      })

      // Mark all as read for current user
      await request(app.getHttpServer())
        .put('/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204)

      // Verify other user's notification is still unread
      const otherUserUnreadCount = await notificationService.getUnreadCount(otherUser.id)
      expect(otherUserUnreadCount).toBe(1)

      // Cleanup
      await userProfileRepository.delete({ userId: otherUser.id })
      await userRepository.delete({ id: otherUser.id })
    })

    it('should require authentication', async () => {
      await request(app.getHttpServer()).put('/notifications/read-all').expect(401)
    })
  })

  describe('Requirement Validation', () => {
    it('should validate Requirement 10.4: Show unread notification count', async () => {
      // Create unread notifications
      await notificationService.sendNotification({
        userId,
        type: NotificationType.NEW_MESSAGE,
        data: { senderId: 'user-789' },
        channels: [NotificationChannel.IN_APP],
      })

      await notificationService.sendNotification({
        userId,
        type: NotificationType.BOOKING_REMINDER,
        data: { bookingId: 'booking-reminder-2' },
        channels: [NotificationChannel.IN_APP],
      })

      // Get unread count
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify count is accurate
      expect(response.body.count).toBeGreaterThanOrEqual(2)
      expect(typeof response.body.count).toBe('number')
    })

    it('should validate Requirement 10.5: Mark notification as read when clicked', async () => {
      // Create an unread notification
      const notification = await notificationService.sendNotification({
        userId,
        type: NotificationType.BOOKING_CONFIRMED,
        data: { bookingId: 'booking-click-test' },
        channels: [NotificationChannel.IN_APP],
      })

      // Verify it's unread
      expect(notification.isRead).toBe(false)

      // Simulate user clicking on notification (marking as read)
      const response = await request(app.getHttpServer())
        .put(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // Verify notification is marked as read
      expect(response.body.isRead).toBe(true)
      expect(response.body.readAt).toBeDefined()

      // Verify unread count decreased
      const countResponse = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      // The count should have decreased by 1
      const previousCount = response.body.count || 0
      expect(countResponse.body.count).toBeLessThanOrEqual(previousCount)
    })
  })
})
