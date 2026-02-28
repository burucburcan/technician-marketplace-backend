import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotFoundException } from '@nestjs/common'
import { NotificationService } from './notification.service'
import {
  Notification,
  NotificationType,
  NotificationChannel,
} from '../../entities/notification.entity'
import { User, UserProfile } from '../../entities'
import { EmailService } from './services/email.service'
import { SmsService } from './services/sms.service'

describe('NotificationService', () => {
  let service: NotificationService
  let notificationRepository: Repository<Notification>
  let userRepository: Repository<User>
  let userProfileRepository: Repository<UserProfile>
  let emailService: EmailService
  let smsService: SmsService

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    role: 'user' as any,
    isEmailVerified: true,
    isSuspended: false,
    twoFactorEnabled: false,
    twoFactorSecret: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: null as any,
    professionalProfile: null as any,
    supplierProfile: null as any,
    bookings: [],
    orders: [],
    cart: null as any,
    serviceRatings: [],
    productReviews: [],
    supplierReviews: [],
  }

  const mockUserProfile: UserProfile = {
    id: 'profile-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    language: 'es',
    preferences: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      currency: 'MXN',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any

  const mockNotification: Notification = {
    id: 'notification-1',
    userId: 'user-1',
    type: NotificationType.BOOKING_CONFIRMED,
    title: 'Reservación Confirmada',
    message: 'Tu reservación ha sido confirmada',
    data: {},
    isRead: false,
    channels: [NotificationChannel.IN_APP],
    createdAt: new Date(),
    readAt: null,
  } as any

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendSms: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<NotificationService>(NotificationService)
    notificationRepository = module.get<Repository<Notification>>(getRepositoryToken(Notification))
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    userProfileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile))
    emailService = module.get<EmailService>(EmailService)
    smsService = module.get<SmsService>(SmsService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('sendNotification', () => {
    it('should create and save a notification', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile)
      jest.spyOn(notificationRepository, 'create').mockReturnValue(mockNotification)
      jest.spyOn(notificationRepository, 'save').mockResolvedValue(mockNotification)

      const result = await service.sendNotification({
        userId: 'user-1',
        type: NotificationType.BOOKING_CONFIRMED,
        data: {
          userName: 'John Doe',
          professionalName: 'Jane Smith',
          serviceCategory: 'Plumbing',
          scheduledDate: '2024-01-15',
          address: '123 Main St',
        },
      })

      expect(result).toBeDefined()
      expect(notificationRepository.create).toHaveBeenCalled()
      expect(notificationRepository.save).toHaveBeenCalled()
    })

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null)

      await expect(
        service.sendNotification({
          userId: 'non-existent',
          type: NotificationType.BOOKING_CONFIRMED,
        })
      ).rejects.toThrow(NotFoundException)
    })

    it('should send email if email channel is enabled', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile)
      jest.spyOn(notificationRepository, 'create').mockReturnValue(mockNotification)
      jest.spyOn(notificationRepository, 'save').mockResolvedValue(mockNotification)
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue()

      await service.sendNotification({
        userId: 'user-1',
        type: NotificationType.BOOKING_CONFIRMED,
        data: {
          userName: 'John Doe',
          professionalName: 'Jane Smith',
          serviceCategory: 'Plumbing',
          scheduledDate: '2024-01-15',
          address: '123 Main St',
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })

      expect(emailService.sendEmail).toHaveBeenCalled()
    })

    it('should send SMS if SMS channel is enabled', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser)
      jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(mockUserProfile)
      jest.spyOn(notificationRepository, 'create').mockReturnValue(mockNotification)
      jest.spyOn(notificationRepository, 'save').mockResolvedValue(mockNotification)
      jest.spyOn(smsService, 'sendSms').mockResolvedValue()

      await service.sendNotification({
        userId: 'user-1',
        type: NotificationType.BOOKING_CONFIRMED,
        data: {
          userName: 'John Doe',
          professionalName: 'Jane Smith',
          serviceCategory: 'Plumbing',
          scheduledDate: '2024-01-15',
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
      })

      expect(smsService.sendSms).toHaveBeenCalled()
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      jest.spyOn(notificationRepository, 'count').mockResolvedValue(5)

      const count = await service.getUnreadCount('user-1')

      expect(count).toBe(5)
      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      })
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const unreadNotification = { ...mockNotification, isRead: false }
      jest.spyOn(notificationRepository, 'findOne').mockResolvedValue(unreadNotification)
      jest.spyOn(notificationRepository, 'save').mockResolvedValue({
        ...unreadNotification,
        isRead: true,
        readAt: new Date(),
      })

      const result = await service.markAsRead('notification-1', 'user-1')

      expect(result.isRead).toBe(true)
      expect(result.readAt).toBeDefined()
    })

    it('should throw NotFoundException if notification not found', async () => {
      jest.spyOn(notificationRepository, 'findOne').mockResolvedValue(null)

      await expect(service.markAsRead('non-existent', 'user-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      jest.spyOn(notificationRepository, 'delete').mockResolvedValue({ affected: 1 } as any)

      await service.deleteNotification('notification-1', 'user-1')

      expect(notificationRepository.delete).toHaveBeenCalledWith({
        id: 'notification-1',
        userId: 'user-1',
      })
    })

    it('should throw NotFoundException if notification not found', async () => {
      jest.spyOn(notificationRepository, 'delete').mockResolvedValue({ affected: 0 } as any)

      await expect(service.deleteNotification('non-existent', 'user-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
