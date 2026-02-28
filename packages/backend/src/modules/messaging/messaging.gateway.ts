import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { MessagingService } from './messaging.service'
import { SendMessageDTO } from './dto'

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MessagingGateway.name)

  @WebSocketServer()
  server: Server

  private userSockets: Map<string, string> = new Map() // userId -> socketId

  constructor(private messagingService: MessagingService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string
    if (userId) {
      this.userSockets.set(userId, client.id)
      this.logger.debug(`User ${userId} connected with socket ${client.id}`)
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.userSockets.entries()).find(
      ([, socketId]) => socketId === client.id
    )?.[0]

    if (userId) {
      this.userSockets.delete(userId)
      this.logger.debug(`User ${userId} disconnected`)
    }
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string }
  ) {
    try {
      // Verify user can access this conversation
      await this.messagingService.getConversation(data.conversationId, data.userId)

      client.join(data.conversationId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    client.leave(data.conversationId)
    return { success: true }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; message: SendMessageDTO }
  ) {
    try {
      const message = await this.messagingService.sendMessage(data.userId, data.message)

      // Emit message to all users in the conversation room
      this.server.to(data.message.conversationId).emit('newMessage', message)

      return { success: true, message }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string
      messageId: string
      userId: string
    }
  ) {
    try {
      await this.messagingService.markMessageAsRead(
        data.conversationId,
        data.messageId,
        data.userId
      )

      // Notify other participants
      this.server.to(data.conversationId).emit('messageRead', {
        messageId: data.messageId,
        userId: data.userId,
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Emit new message notification to specific user
   */
  emitToUser<T = unknown>(userId: string, event: string, data: T): void {
    const socketId = this.userSockets.get(userId)
    if (socketId) {
      this.server.to(socketId).emit(event, data)
    }
  }
}
