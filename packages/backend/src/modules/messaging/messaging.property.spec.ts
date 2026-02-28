import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Model } from 'mongoose'
import { ForbiddenException } from '@nestjs/common'
import * as fc from 'fast-check'
import { MessagingService } from './messaging.service'
import { Booking } from '../../entities/booking.entity'
import { Conversation, Message } from '../../schemas/conversation.schema'
import { SendMessageDTO } from './dto'
import { BookingStatus, ProfessionalType, MessageType } from '../../common/enums'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../../entities/notification.entity'
import { sanitizeContent } from './utils/content-filter.util'

/**
 * Property-Based Tests for Messaging Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the messaging system, ensuring correctness at scale.
 */
describe('MessagingService Property Tests', () => {
  let service: MessagingService
  let conversationModel: Model<Conversation>
  let bookingRepository: Repository<Booking>
  let notificationService: NotificationService

  const mockConversationModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockBookingRepository = {
    findOne: jest.fn(),
  }

  const mockNotificationService = {
    sendNotification: jest.fn().mockResolvedValue({
      id: 'notification-id',
      userId: 'recipient-id',
      type: NotificationType.NEW_MESSAGE,
      title: 'New Message',
      message: 'You have a new message',
      isRead: false,
      createdAt: new Date(),
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        {
          provide: 'CONVERSATION_MODEL',
          useValue: mockConversationModel,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile()

    service = module.get<MessagingService>(MessagingService)
    conversationModel = module.get<Model<Conversation>>('CONVERSATION_MODEL')
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking))
    notificationService = module.get<NotificationService>(NotificationService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const messageContentGen = fc.string({ minLength: 1, maxLength: 1000 }).filter(s => {
    const sanitized = sanitizeContent(s)
    return sanitized.trim().length > 0
  })
  const messageTypeGen = fc.constantFrom(MessageType.TEXT, MessageType.IMAGE, MessageType.FILE)
  const fileUrlGen = fc.webUrl()

  /**
   * **Property 31: Rezervasyon Mesajlaşma Kanalı (Booking Messaging Channel)**
   *
   * **Validates: Requirements 11.1**
   *
   * For any booking created, a messaging channel (conversation) must be opened
   * between the user and professional.
   */
  describe('Property 31: Booking Messaging Channel', () => {
    it('should create conversation for any valid booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          async (bookingId: string, userId: string, professionalId: string) => {
            // Setup mock booking
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.PENDING,
              scheduledDate: new Date(),
              estimatedDuration: 120,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              createdAt: new Date(),
            }

            // Mock conversation creation
            const mockConversation = {
              bookingId,
              participants: [userId, professionalId],
              messages: [],
              unreadCount: new Map([
                [userId, 0],
                [professionalId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue({
                id: fc.sample(uuidGen, 1)[0],
                bookingId,
                participants: [userId, professionalId],
                messages: [],
                unreadCount: new Map([
                  [userId, 0],
                  [professionalId, 0],
                ]),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            }

            mockConversationModel.findOne.mockResolvedValue(null) // No existing conversation
            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockConversationModel.create = jest.fn().mockReturnValue(mockConversation)

            // Property: Conversation must be created for booking
            const result = await service.createConversation(bookingId)

            expect(result).toBeDefined()
            expect(result.bookingId).toBe(bookingId)
            expect(result.participants).toContain(userId)
            expect(result.participants).toContain(professionalId)
            expect(result.participants).toHaveLength(2)
            expect(result.isActive).toBe(true)
            expect(result.messages).toEqual([])

            // Verify conversation was created with correct participants
            expect(mockConversationModel.create).toHaveBeenCalledWith(
              expect.objectContaining({
                bookingId,
                participants: [userId, professionalId],
                isActive: true,
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return existing conversation if already created for booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          async (bookingId: string, userId: string, professionalId: string) => {
            // Setup existing conversation
            const existingConversation = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              participants: [userId, professionalId],
              messages: [],
              unreadCount: new Map([
                [userId, 0],
                [professionalId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findOne.mockResolvedValue(existingConversation)

            // Property: Existing conversation must be returned, not create new one
            const result = await service.createConversation(bookingId)

            expect(result).toBe(existingConversation)
            expect(result.bookingId).toBe(bookingId)

            // Verify no new conversation was created
            expect(mockConversationModel.create).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should initialize conversation with empty messages and zero unread counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          async (bookingId: string, userId: string, professionalId: string) => {
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: BookingStatus.PENDING,
              scheduledDate: new Date(),
              estimatedDuration: 120,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              createdAt: new Date(),
            }

            const mockConversation = {
              bookingId,
              participants: [userId, professionalId],
              messages: [],
              unreadCount: new Map([
                [userId, 0],
                [professionalId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue({
                id: fc.sample(uuidGen, 1)[0],
                bookingId,
                participants: [userId, professionalId],
                messages: [],
                unreadCount: new Map([
                  [userId, 0],
                  [professionalId, 0],
                ]),
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
            }

            mockConversationModel.findOne.mockResolvedValue(null)
            mockBookingRepository.findOne.mockResolvedValue(mockBooking)
            mockConversationModel.create = jest.fn().mockReturnValue(mockConversation)

            // Property: New conversation must have empty messages and zero unread counts
            const result = await service.createConversation(bookingId)

            expect(result.messages).toEqual([])
            expect(result.unreadCount.get(userId)).toBe(0)
            expect(result.unreadCount.get(professionalId)).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 32: Mesaj Gönderme ve Bildirim (Message Sending and Notification)**
   *
   * **Validates: Requirements 11.2**
   *
   * For any message sent, the message must be saved to the conversation
   * and a notification must be sent to the recipient.
   */
  describe('Property 32: Message Sending and Notification', () => {
    it('should save message and send notification for any valid message', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          messageTypeGen,
          async (
            conversationId: string,
            senderId: string,
            recipientId: string,
            bookingId: string,
            content: string,
            type: MessageType
          ) => {
            // Reset mocks for this test run
            mockNotificationService.sendNotification.mockClear()

            // Setup mock conversation
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [senderId, recipientId],
              messages: [],
              unreadCount: new Map([
                [senderId, 0],
                [recipientId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type,
            }

            // Property: Message must be saved and notification sent
            const result = await service.sendMessage(senderId, sendMessageDto)

            expect(result).toBeDefined()
            expect(result.senderId).toBe(senderId)
            // Content should be sanitized
            expect(result.content).toBe(sanitizeContent(content))
            expect(result.type).toBe(type)
            expect(result.isRead).toBe(false)
            expect(result.createdAt).toBeInstanceOf(Date)

            // Verify message was added to conversation
            expect(mockConversation.messages).toHaveLength(1)
            expect(mockConversation.messages[0]).toMatchObject({
              senderId,
              content,
              type,
              isRead: false,
            })

            // Verify conversation was saved
            expect(mockConversation.save).toHaveBeenCalled()

            // Verify notification was sent to recipient
            expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(1)
            expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: recipientId,
                type: NotificationType.NEW_MESSAGE,
                data: expect.objectContaining({
                  conversationId,
                  messageId: result.id,
                }),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should increment unread count for recipient when message is sent', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          fc.integer({ min: 0, max: 10 }),
          async (
            conversationId: string,
            senderId: string,
            recipientId: string,
            bookingId: string,
            content: string,
            initialUnreadCount: number
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [senderId, recipientId],
              messages: [],
              unreadCount: new Map([
                [senderId, 0],
                [recipientId, initialUnreadCount],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type: MessageType.TEXT,
            }

            // Property: Recipient's unread count must be incremented
            await service.sendMessage(senderId, sendMessageDto)

            expect(mockConversation.unreadCount.get(recipientId)).toBe(initialUnreadCount + 1)
            expect(mockConversation.unreadCount.get(senderId)).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should update lastMessage in conversation when message is sent', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          async (
            conversationId: string,
            senderId: string,
            recipientId: string,
            bookingId: string,
            content: string
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [senderId, recipientId],
              messages: [] as Message[],
              lastMessage: undefined as Message | undefined,
              unreadCount: new Map([
                [senderId, 0],
                [recipientId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type: MessageType.TEXT,
            }

            // Property: lastMessage must be updated to the sent message
            const result = await service.sendMessage(senderId, sendMessageDto)

            expect(mockConversation.lastMessage).toBeDefined()
            expect(mockConversation.lastMessage).toEqual(result)
            expect(mockConversation.lastMessage?.content).toBe(sanitizeContent(content))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject message from non-participant', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            nonParticipant: string,
            bookingId: string,
            content: string
          ) => {
            // Ensure non-participant is different from participants
            fc.pre(nonParticipant !== participant1 && nonParticipant !== participant2)

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages: [],
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type: MessageType.TEXT,
            }

            // Property: Non-participants must be rejected
            await expect(service.sendMessage(nonParticipant, sendMessageDto)).rejects.toThrow(
              ForbiddenException
            )

            await expect(service.sendMessage(nonParticipant, sendMessageDto)).rejects.toThrow(
              'You are not a participant in this conversation'
            )

            // Verify no message was added
            expect(mockConversation.messages).toHaveLength(0)
            expect(mockConversation.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle file messages with fileUrl', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          fileUrlGen,
          fc.constantFrom(MessageType.IMAGE, MessageType.FILE),
          async (
            conversationId: string,
            senderId: string,
            recipientId: string,
            bookingId: string,
            content: string,
            fileUrl: string,
            type: MessageType
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [senderId, recipientId],
              messages: [] as Message[],
              unreadCount: new Map([
                [senderId, 0],
                [recipientId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type,
              fileUrl,
            }

            // Property: File messages must include fileUrl
            const result = await service.sendMessage(senderId, sendMessageDto)

            expect(result.fileUrl).toBe(fileUrl)
            expect(result.type).toBe(type)
            expect(mockConversation.messages[0].fileUrl).toBe(fileUrl)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 33: Mesaj Geçmişi Erişimi (Message History Access)**
   *
   * **Validates: Requirements 11.3**
   *
   * For any conversation, both participants must be able to access
   * the complete message history.
   */
  describe('Property 33: Message History Access', () => {
    it('should allow both participants to access message history', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              senderId: fc.oneof(uuidGen, uuidGen),
              content: messageContentGen,
              type: messageTypeGen,
              isRead: fc.boolean(),
              createdAt: fc.date(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            bookingId: string,
            messages: any[]
          ) => {
            // Setup messages with participants as senders
            const mockMessages = messages.map((m, index) => ({
              ...m,
              senderId: index % 2 === 0 ? participant1 : participant2,
            }))

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages: mockMessages,
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            // Property: Both participants must access same message history
            const result1 = await service.getMessages(conversationId, participant1)
            const result2 = await service.getMessages(conversationId, participant2)

            expect(result1).toHaveLength(mockMessages.length)
            expect(result2).toHaveLength(mockMessages.length)

            // Both should see the same messages (in reverse order)
            expect(result1).toEqual(result2)

            // Verify all messages are accessible
            mockMessages.forEach(msg => {
              const found = result1.find(m => m.id === msg.id)
              expect(found).toBeDefined()
              expect(found?.content).toBe(msg.content)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject message history access from non-participant', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            nonParticipant: string,
            bookingId: string
          ) => {
            // Ensure non-participant is different
            fc.pre(nonParticipant !== participant1 && nonParticipant !== participant2)

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages: [],
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            // Property: Non-participants must be denied access
            await expect(service.getMessages(conversationId, nonParticipant)).rejects.toThrow(
              ForbiddenException
            )

            await expect(service.getMessages(conversationId, nonParticipant)).rejects.toThrow(
              'You are not a participant in this conversation'
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should return messages in reverse chronological order', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              senderId: uuidGen,
              content: messageContentGen,
              type: messageTypeGen,
              isRead: fc.boolean(),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            bookingId: string,
            messages: any[]
          ) => {
            // Create messages with sequential timestamps
            const mockMessages = messages.map((m, index) => ({
              ...m,
              senderId: index % 2 === 0 ? participant1 : participant2,
              createdAt: new Date(Date.now() + index * 1000),
            }))

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages: mockMessages,
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            // Property: Messages must be in reverse chronological order (newest first)
            const result = await service.getMessages(conversationId, participant1)

            for (let i = 0; i < result.length - 1; i++) {
              expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
                result[i + 1].createdAt.getTime()
              )
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should respect pagination limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              senderId: uuidGen,
              content: messageContentGen,
              type: messageTypeGen,
              isRead: fc.boolean(),
              createdAt: fc.date(),
            }),
            { minLength: 10, maxLength: 100 }
          ),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 10 }),
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            bookingId: string,
            messages: any[],
            limit: number,
            skip: number
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages,
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            // Property: Pagination must respect limit and skip parameters
            const result = await service.getMessages(conversationId, participant1, limit, skip)

            expect(result.length).toBeLessThanOrEqual(limit)
            expect(result.length).toBeLessThanOrEqual(Math.max(0, messages.length - skip))
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve message content and metadata in history', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              senderId: uuidGen,
              content: messageContentGen,
              type: messageTypeGen,
              fileUrl: fc.option(fileUrlGen),
              isRead: fc.boolean(),
              createdAt: fc.date(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            bookingId: string,
            messages: any[]
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages,
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            // Property: All message data must be preserved in history
            const result = await service.getMessages(conversationId, participant1)

            messages.forEach(originalMsg => {
              const retrievedMsg = result.find(m => m.id === originalMsg.id)
              expect(retrievedMsg).toBeDefined()
              expect(retrievedMsg?.senderId).toBe(originalMsg.senderId)
              expect(retrievedMsg?.content).toBe(originalMsg.content)
              expect(retrievedMsg?.type).toBe(originalMsg.type)
              expect(retrievedMsg?.fileUrl).toBe(originalMsg.fileUrl)
              expect(retrievedMsg?.isRead).toBe(originalMsg.isRead)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 34: Aktif Rezervasyon Mesajlaşma Kısıtı (Active Booking Messaging Restriction)**
   *
   * **Validates: Requirements 11.4**
   *
   * For any messaging attempt, only users with active bookings can send messages;
   * users without active bookings must be rejected.
   */
  describe('Property 34: Active Booking Messaging Restriction', () => {
    const activeBookingStatusGen = fc.constantFrom(
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.IN_PROGRESS
    )

    const inactiveBookingStatusGen = fc.constantFrom(
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.REJECTED
    )

    it('should allow messaging for users with active booking status', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          activeBookingStatusGen,
          async (
            conversationId: string,
            senderId: string,
            recipientId: string,
            bookingId: string,
            content: string,
            bookingStatus: BookingStatus
          ) => {
            // Setup mock booking with active status
            const mockBooking = {
              id: bookingId,
              userId: senderId,
              professionalId: recipientId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: bookingStatus,
              scheduledDate: new Date(),
              estimatedDuration: 120,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              createdAt: new Date(),
            }

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [senderId, recipientId],
              messages: [],
              unreadCount: new Map([
                [senderId, 0],
                [recipientId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)
            mockBookingRepository.findOne.mockResolvedValue(mockBooking)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type: MessageType.TEXT,
            }

            // Property: Users with active booking must be able to send messages
            const result = await service.sendMessage(senderId, sendMessageDto)

            expect(result).toBeDefined()
            expect(result.senderId).toBe(senderId)
            // Content should be sanitized
            expect(result.content).toBe(sanitizeContent(content))
            expect(mockConversation.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify canUserMessage returns true for active booking statuses', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          activeBookingStatusGen,
          async (
            conversationId: string,
            userId: string,
            professionalId: string,
            bookingId: string,
            bookingStatus: BookingStatus
          ) => {
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: bookingStatus,
              scheduledDate: new Date(),
              estimatedDuration: 120,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              createdAt: new Date(),
            }

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [userId, professionalId],
              messages: [],
              unreadCount: new Map([
                [userId, 0],
                [professionalId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)
            mockBookingRepository.findOne.mockResolvedValue(mockBooking)

            // Property: canUserMessage must return true for active booking statuses
            const canMessage = await service.canUserMessage(userId, conversationId)

            expect(canMessage).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify canUserMessage returns false for inactive booking statuses', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          inactiveBookingStatusGen,
          async (
            conversationId: string,
            userId: string,
            professionalId: string,
            bookingId: string,
            bookingStatus: BookingStatus
          ) => {
            const mockBooking = {
              id: bookingId,
              userId,
              professionalId,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: bookingStatus,
              scheduledDate: new Date(),
              estimatedDuration: 120,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              createdAt: new Date(),
            }

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [userId, professionalId],
              messages: [],
              unreadCount: new Map([
                [userId, 0],
                [professionalId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)
            mockBookingRepository.findOne.mockResolvedValue(mockBooking)

            // Property: canUserMessage must return false for inactive booking statuses
            const canMessage = await service.canUserMessage(userId, conversationId)

            expect(canMessage).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify canUserMessage returns false for non-participants', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          activeBookingStatusGen,
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            nonParticipant: string,
            bookingId: string,
            bookingStatus: BookingStatus
          ) => {
            // Ensure non-participant is different
            fc.pre(nonParticipant !== participant1 && nonParticipant !== participant2)

            const mockBooking = {
              id: bookingId,
              userId: participant1,
              professionalId: participant2,
              professionalType: ProfessionalType.HANDYMAN,
              serviceCategory: 'plumbing',
              status: bookingStatus,
              scheduledDate: new Date(),
              estimatedDuration: 120,
              serviceAddress: {
                address: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                country: 'Mexico',
                postalCode: '12345',
                coordinates: { latitude: 19.4326, longitude: -99.1332 },
              },
              description: 'Test booking',
              estimatedPrice: 500,
              createdAt: new Date(),
            }

            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages: [],
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)
            mockBookingRepository.findOne.mockResolvedValue(mockBooking)

            // Property: Non-participants must not be able to message
            const canMessage = await service.canUserMessage(nonParticipant, conversationId)

            expect(canMessage).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should verify canUserMessage returns false for non-existent conversation', async () => {
      await fc.assert(
        fc.asyncProperty(uuidGen, uuidGen, async (conversationId: string, userId: string) => {
          mockConversationModel.findById.mockResolvedValue(null)

          // Property: Non-existent conversation must return false
          const canMessage = await service.canUserMessage(userId, conversationId)

          expect(canMessage).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should verify canUserMessage returns false for non-existent booking', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          async (
            conversationId: string,
            userId: string,
            professionalId: string,
            bookingId: string
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [userId, professionalId],
              messages: [],
              unreadCount: new Map([
                [userId, 0],
                [professionalId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)
            mockBookingRepository.findOne.mockResolvedValue(null)

            // Property: Non-existent booking must return false
            const canMessage = await service.canUserMessage(userId, conversationId)

            expect(canMessage).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 35: Tamamlanan Rezervasyon Salt Okunur Mesajlaşma (Completed Booking Read-Only Messaging)**
   *
   * **Validates: Requirements 11.5**
   *
   * For any booking in Completed status, the messaging channel must be read-only
   * and attempts to send new messages must be rejected.
   */
  describe('Property 35: Completed Booking Read-Only Messaging', () => {
    it('should reject message sending when conversation is read-only', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          async (
            conversationId: string,
            senderId: string,
            recipientId: string,
            bookingId: string,
            content: string
          ) => {
            // Setup mock conversation with isActive = false (read-only)
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [senderId, recipientId],
              messages: [],
              unreadCount: new Map([
                [senderId, 0],
                [recipientId, 0],
              ]),
              isActive: false, // Read-only
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type: MessageType.TEXT,
            }

            // Property: Read-only conversations must reject new messages
            await expect(service.sendMessage(senderId, sendMessageDto)).rejects.toThrow(
              ForbiddenException
            )

            await expect(service.sendMessage(senderId, sendMessageDto)).rejects.toThrow(
              'This conversation is read-only'
            )

            // Verify no message was added
            expect(mockConversation.messages).toHaveLength(0)
            expect(mockConversation.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set conversation to read-only when booking is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          async (bookingId: string, userId: string, professionalId: string) => {
            // Setup mock conversation that is initially active
            const mockConversation = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              participants: [userId, professionalId],
              messages: [],
              unreadCount: new Map([
                [userId, 0],
                [professionalId, 0],
              ]),
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findOne.mockResolvedValue(mockConversation)

            // Property: setConversationReadOnly must set isActive to false
            await service.setConversationReadOnly(bookingId)

            expect(mockConversation.isActive).toBe(false)
            expect(mockConversation.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow reading messages from read-only conversation', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              senderId: uuidGen,
              content: messageContentGen,
              type: messageTypeGen,
              isRead: fc.boolean(),
              createdAt: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            bookingId: string,
            messages: any[]
          ) => {
            // Setup read-only conversation with existing messages
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages,
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: false, // Read-only
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            // Property: Read-only conversations must still allow reading messages
            const result = await service.getMessages(conversationId, participant1)

            expect(result).toBeDefined()
            expect(result.length).toBeGreaterThan(0)
            expect(result.length).toBe(messages.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle setConversationReadOnly gracefully when conversation does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(uuidGen, async (bookingId: string) => {
          mockConversationModel.findOne.mockResolvedValue(null)

          // Property: setConversationReadOnly must not throw when conversation doesn't exist
          await expect(service.setConversationReadOnly(bookingId)).resolves.not.toThrow()
        }),
        { numRuns: 100 }
      )
    })

    it('should verify read-only status persists across multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          messageContentGen,
          async (
            conversationId: string,
            senderId: string,
            recipientId: string,
            bookingId: string,
            content: string
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [senderId, recipientId],
              messages: [],
              unreadCount: new Map([
                [senderId, 0],
                [recipientId, 0],
              ]),
              isActive: false, // Read-only
              createdAt: new Date(),
              updatedAt: new Date(),
              save: jest.fn().mockResolvedValue(true),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            const sendMessageDto: SendMessageDTO = {
              conversationId,
              content,
              type: MessageType.TEXT,
            }

            // Property: Multiple attempts to send messages must all be rejected
            await expect(service.sendMessage(senderId, sendMessageDto)).rejects.toThrow(
              ForbiddenException
            )

            await expect(service.sendMessage(senderId, sendMessageDto)).rejects.toThrow(
              ForbiddenException
            )

            // Verify conversation remains read-only
            expect(mockConversation.isActive).toBe(false)
            expect(mockConversation.messages).toHaveLength(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow both participants to read from read-only conversation', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              senderId: uuidGen,
              content: messageContentGen,
              type: messageTypeGen,
              isRead: fc.boolean(),
              createdAt: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (
            conversationId: string,
            participant1: string,
            participant2: string,
            bookingId: string,
            messages: any[]
          ) => {
            const mockConversation = {
              id: conversationId,
              bookingId,
              participants: [participant1, participant2],
              messages,
              unreadCount: new Map([
                [participant1, 0],
                [participant2, 0],
              ]),
              isActive: false, // Read-only
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockConversationModel.findById.mockResolvedValue(mockConversation)

            // Property: Both participants must be able to read from read-only conversation
            const result1 = await service.getMessages(conversationId, participant1)
            const result2 = await service.getMessages(conversationId, participant2)

            expect(result1).toHaveLength(messages.length)
            expect(result2).toHaveLength(messages.length)
            expect(result1).toEqual(result2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
