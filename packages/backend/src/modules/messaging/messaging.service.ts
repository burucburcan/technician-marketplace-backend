import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Model } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { Conversation, Message } from '../../schemas/conversation.schema'
import { Booking } from '../../entities/booking.entity'
import { BookingStatus } from '../../common/enums'
import { SendMessageDTO } from './dto'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../../entities/notification.entity'
import {
  filterMessageContent,
  sanitizeContent,
  shouldFlagForModeration,
} from './utils/content-filter.util'

@Injectable()
export class MessagingService {
  constructor(
    @Inject('CONVERSATION_MODEL')
    private conversationModel: Model<Conversation>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private notificationService: NotificationService
  ) {}

  /**
   * Create a conversation for a booking
   * Validates: Requirement 11.1
   */
  async createConversation(bookingId: string): Promise<Conversation> {
    // Check if conversation already exists
    const existing = await this.conversationModel.findOne({ bookingId })
    if (existing) {
      return existing
    }

    // Get booking to extract participants
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    // Create conversation with user and professional as participants
    const conversation = await this.conversationModel.create({
      bookingId,
      participants: [booking.userId, booking.professionalId],
      messages: [],
      unreadCount: new Map([
        [booking.userId, 0],
        [booking.professionalId, 0],
      ]),
      isActive: true,
    })

    return conversation
  }

  /**
   * Send a message in a conversation
   * Validates: Requirement 11.2, 11.6
   */
  async sendMessage(userId: string, dto: SendMessageDTO): Promise<Message> {
    const conversation = await this.conversationModel.findById(dto.conversationId)

    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    // Check if user is a participant
    if (!conversation.participants.includes(userId)) {
      throw new ForbiddenException('You are not a participant in this conversation')
    }

    // Check if conversation is active (Requirement 11.5)
    if (!conversation.isActive) {
      throw new ForbiddenException('This conversation is read-only')
    }

    // Sanitize and filter content (Requirement 11.6)
    let messageContent = sanitizeContent(dto.content)

    // Validate content is not empty after sanitization
    if (!messageContent || messageContent.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty')
    }

    const filterResult = filterMessageContent(messageContent)

    if (!filterResult.isClean) {
      throw new BadRequestException(filterResult.reason || 'Message contains inappropriate content')
    }

    // Use filtered content if available
    if (filterResult.filteredContent) {
      messageContent = filterResult.filteredContent
    }

    // Check if message should be flagged for moderation
    const flagged = shouldFlagForModeration(messageContent)
    if (flagged) {
      // Log for moderation review
      console.warn(`Message flagged for moderation: ${dto.conversationId}`)
    }

    // Create message
    const message: Message = {
      id: uuidv4(),
      senderId: userId,
      content: messageContent,
      type: dto.type || 'text',
      fileUrl: dto.fileUrl,
      isRead: false,
      createdAt: new Date(),
    }

    // Add message to conversation
    conversation.messages.push(message)
    conversation.lastMessage = message

    // Update unread count for recipient
    const recipientId = conversation.participants.find((p: string) => p !== userId)
    if (recipientId) {
      const currentCount = conversation.unreadCount.get(recipientId) || 0
      conversation.unreadCount.set(recipientId, currentCount + 1)
    }

    await conversation.save()

    // Send notification to recipient (Requirement 11.2)
    if (recipientId) {
      await this.notificationService.sendNotification({
        userId: recipientId,
        type: NotificationType.NEW_MESSAGE,
        data: {
          conversationId: conversation.id,
          messageId: message.id,
        },
      })
    }

    return message
  }

  /**
   * Get conversation by ID
   * Validates: Requirement 11.3
   */
  async getConversation(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId)

    if (!conversation) {
      throw new NotFoundException('Conversation not found')
    }

    // Check if user is a participant
    if (!conversation.participants.includes(userId)) {
      throw new ForbiddenException('You are not a participant in this conversation')
    }

    return conversation
  }

  /**
   * Get messages for a conversation
   * Validates: Requirement 11.3
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<Message[]> {
    const conversation = await this.getConversation(conversationId, userId)

    // Return messages in reverse chronological order (newest first)
    return conversation.messages
      .slice()
      .reverse()
      .slice(skip, skip + limit)
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationModel.find({ participants: userId }).sort({ updatedAt: -1 }).exec()
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(
    conversationId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId, userId)

    const message = conversation.messages.find(m => m.id === messageId)
    if (!message) {
      throw new NotFoundException('Message not found')
    }

    // Only recipient can mark as read
    if (message.senderId === userId) {
      throw new BadRequestException('Cannot mark your own message as read')
    }

    message.isRead = true

    // Decrease unread count
    const currentCount = conversation.unreadCount.get(userId) || 0
    conversation.unreadCount.set(userId, Math.max(0, currentCount - 1))

    await conversation.save()
  }

  /**
   * Set conversation to read-only when booking is completed
   * Validates: Requirement 11.5
   */
  async setConversationReadOnly(bookingId: string): Promise<void> {
    const conversation = await this.conversationModel.findOne({ bookingId })

    if (conversation) {
      conversation.isActive = false
      await conversation.save()
    }
  }

  /**
   * Check if user has active booking for messaging
   * Validates: Requirement 11.4
   */
  async canUserMessage(userId: string, conversationId: string): Promise<boolean> {
    const conversation = await this.conversationModel.findById(conversationId)

    if (!conversation) {
      return false
    }

    // Check if user is participant
    if (!conversation.participants.includes(userId)) {
      return false
    }

    // Check if booking is active
    const booking = await this.bookingRepository.findOne({
      where: { id: conversation.bookingId },
    })

    if (!booking) {
      return false
    }

    // Active statuses for messaging
    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS,
    ]

    return activeStatuses.includes(booking.status)
  }
}
