import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  Notification,
  NotificationType,
  NotificationChannel,
} from '../../entities/notification.entity'
import { User, UserProfile } from '../../entities'
import { EmailService } from './services/email.service'
import { SmsService } from './services/sms.service'
import { notificationTemplates, renderTemplate } from './templates/notification-templates'

export interface SendNotificationDto {
  userId: string
  type: NotificationType
  data?: Record<string, any>
  channels?: NotificationChannel[]
}

export interface NotificationFilters {
  isRead?: boolean
  type?: NotificationType
  limit?: number
  offset?: number
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private emailService: EmailService,
    private smsService: SmsService
  ) {}

  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    const { userId, type, data = {}, channels = [NotificationChannel.IN_APP] } = dto

    // Get user and profile
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`)
    }

    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    })

    // Get user language preference
    const language: 'es' | 'en' = (profile?.language as 'es' | 'en') || 'es'

    // Check if user has disabled this notification type
    if (profile?.preferences?.notificationTypes) {
      const typePreference = profile.preferences.notificationTypes[type]
      if (typePreference === false) {
        this.logger.log(`Notification type ${type} is disabled for user ${userId}, skipping`)
        // Return a placeholder notification (not saved to DB)
        return this.notificationRepository.create({
          userId,
          type,
          title: '',
          message: '',
          data,
          channels: [],
          isRead: true,
        })
      }
    }

    // Get template
    const template = notificationTemplates[type][language]
    if (!template) {
      this.logger.error(`Template not found for type: ${type}, language: ${language}`)
      throw new Error(`Notification template not found`)
    }

    // Render templates
    const title = renderTemplate(template.title, data)
    const message = renderTemplate(template.message, data)

    // Create in-app notification
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      data,
      channels,
      isRead: false,
    })

    await this.notificationRepository.save(notification)

    // Send through other channels based on user preferences
    if (profile?.preferences) {
      // Email notification
      if (channels.includes(NotificationChannel.EMAIL) && profile.preferences.emailNotifications) {
        try {
          const emailHtml = template.emailTemplate
            ? renderTemplate(template.emailTemplate, data)
            : message
          await this.emailService.sendEmail({
            to: user.email,
            subject: renderTemplate(template.subject, data),
            html: emailHtml,
            text: message,
          })
        } catch (error) {
          this.logger.error(`Failed to send email notification: ${error.message}`)
        }
      }

      // SMS notification
      if (
        channels.includes(NotificationChannel.SMS) &&
        profile.preferences.smsNotifications &&
        profile.phone
      ) {
        try {
          const smsText = template.smsTemplate
            ? renderTemplate(template.smsTemplate, data)
            : message
          await this.smsService.sendSms({
            to: profile.phone,
            message: smsText,
          })
        } catch (error) {
          this.logger.error(`Failed to send SMS notification: ${error.message}`)
        }
      }

      // Push notification (placeholder for future implementation)
      if (channels.includes(NotificationChannel.PUSH) && profile.preferences.pushNotifications) {
        this.logger.log(`Push notification would be sent to user ${userId}`)
        // TODO: Implement push notification with Firebase Cloud Messaging
      }
    }

    return notification
  }

  async sendBulkNotifications(notifications: SendNotificationDto[]): Promise<Notification[]> {
    const results: Notification[] = []

    for (const notificationDto of notifications) {
      try {
        const notification = await this.sendNotification(notificationDto)
        results.push(notification)
      } catch (error) {
        this.logger.error(
          `Failed to send notification to user ${notificationDto.userId}: ${error.message}`
        )
      }
    }

    return results
  }

  async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { isRead, type, limit = 50, offset = 0 } = filters

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })

    if (isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead })
    }

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type })
    }

    queryBuilder.orderBy('notification.createdAt', 'DESC').skip(offset).take(limit)

    const [notifications, total] = await queryBuilder.getManyAndCount()

    return { notifications, total }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    })
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    })

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`)
    }

    if (!notification.isRead) {
      notification.isRead = true
      notification.readAt = new Date()
      await this.notificationRepository.save(notification)
    }

    return notification
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = false', { userId })
      .execute()
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      userId,
    })

    if (result.affected === 0) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`)
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<{
      emailNotifications: boolean
      smsNotifications: boolean
      pushNotifications: boolean
      notificationTypes: Record<string, boolean>
    }>
  ): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    })

    if (!profile) {
      throw new NotFoundException(`User profile for user ${userId} not found`)
    }

    // Update channel preferences
    if (preferences.emailNotifications !== undefined) {
      profile.preferences.emailNotifications = preferences.emailNotifications
    }
    if (preferences.smsNotifications !== undefined) {
      profile.preferences.smsNotifications = preferences.smsNotifications
    }
    if (preferences.pushNotifications !== undefined) {
      profile.preferences.pushNotifications = preferences.pushNotifications
    }

    // Update notification type preferences
    if (preferences.notificationTypes) {
      if (!profile.preferences.notificationTypes) {
        profile.preferences.notificationTypes = {}
      }
      profile.preferences.notificationTypes = {
        ...profile.preferences.notificationTypes,
        ...preferences.notificationTypes,
      }
    }

    await this.userProfileRepository.save(profile)

    return profile
  }

  async getNotificationPreferences(userId: string): Promise<UserProfile['preferences']> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    })

    if (!profile) {
      throw new NotFoundException(`User profile for user ${userId} not found`)
    }

    return profile.preferences
  }
}
