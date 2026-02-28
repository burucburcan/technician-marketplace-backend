import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { MessagingService } from './messaging.service'
import { SendMessageDTO } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { MessagingAccessGuard } from './guards/messaging-access.guard'
import { S3Service } from '../s3/s3.service'
import { RequestWithUser } from '../../common/types/request.types'

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private s3Service: S3Service
  ) {}

  /**
   * POST /conversations/:id/messages
   * Send a message in a conversation
   * Validates: Requirement 11.2, 11.4
   */
  @Post(':id/messages')
  @UseGuards(MessagingAccessGuard)
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: Omit<SendMessageDTO, 'conversationId'>,
    @Request() req: RequestWithUser
  ) {
    const message = await this.messagingService.sendMessage(req.user.userId, {
      ...dto,
      conversationId,
    })

    return {
      success: true,
      data: message,
    }
  }

  /**
   * POST /conversations/:id/messages/file
   * Send a file/image in a conversation
   * Validates: Requirement 11.7, 11.8, 11.4
   */
  @Post(':id/messages/file')
  @UseGuards(MessagingAccessGuard)
  @UseInterceptors(FileInterceptor('file'))
  async sendFileMessage(
    @Param('id') conversationId: string,
    @Body('content') content: string,
    @Body('type') type: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser
  ) {
    if (!file) {
      throw new BadRequestException('File is required')
    }

    // Validate type
    if (type !== 'image' && type !== 'file') {
      throw new BadRequestException('Type must be either "image" or "file"')
    }

    // Upload file to S3
    let fileUrl: string

    if (type === 'image') {
      // For now, use uploadFile - uploadImage can be added later
      fileUrl = await this.s3Service.uploadFile(file, 'messages')
    } else {
      // Upload regular file
      fileUrl = await this.s3Service.uploadFile(file, 'messages')
    }

    // Send message with file URL
    const message = await this.messagingService.sendMessage(req.user.userId, {
      conversationId,
      content: content || file.originalname,
      type: type as any,
      fileUrl,
    })

    return {
      success: true,
      data: message,
    }
  }

  /**
   * GET /conversations/:id/messages
   * Get messages for a conversation
   * Validates: Requirement 11.3
   */
  @Get(':id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Query('limit') limit: string = '50',
    @Query('skip') skip: string = '0',
    @Request() req: RequestWithUser
  ) {
    const messages = await this.messagingService.getMessages(
      conversationId,
      req.user.userId,
      parseInt(limit),
      parseInt(skip)
    )

    return {
      success: true,
      data: messages,
    }
  }

  /**
   * GET /conversations/:id
   * Get conversation details
   */
  @Get(':id')
  async getConversation(@Param('id') conversationId: string, @Request() req: RequestWithUser) {
    const conversation = await this.messagingService.getConversation(
      conversationId,
      req.user.userId
    )

    return {
      success: true,
      data: conversation,
    }
  }

  /**
   * GET /users/:id/conversations
   * Get all conversations for a user
   */
  @Get('users/:id/conversations')
  async getUserConversations(@Param('id') userId: string, @Request() req: RequestWithUser) {
    // Ensure user can only access their own conversations
    if (userId !== req.user.userId) {
      throw new BadRequestException('Cannot access other user conversations')
    }

    const conversations = await this.messagingService.getUserConversations(userId)

    return {
      success: true,
      data: conversations,
    }
  }

  /**
   * PUT /conversations/:id/messages/:messageId/read
   * Mark a message as read
   */
  @Put(':id/messages/:messageId/read')
  async markMessageAsRead(
    @Param('id') conversationId: string,
    @Param('messageId') messageId: string,
    @Request() req: RequestWithUser
  ) {
    await this.messagingService.markMessageAsRead(conversationId, messageId, req.user.userId)

    return {
      success: true,
      message: 'Message marked as read',
    }
  }
}
