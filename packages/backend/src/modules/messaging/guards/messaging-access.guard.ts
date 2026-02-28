import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { MessagingService } from '../messaging.service'

/**
 * Guard to check if user has active booking for messaging
 * Validates: Requirement 11.4
 */
@Injectable()
export class MessagingAccessGuard implements CanActivate {
  constructor(private messagingService: MessagingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const userId = request.user?.userId
    const conversationId = request.params.id

    if (!userId || !conversationId) {
      throw new ForbiddenException('Invalid request')
    }

    // Check if user can message in this conversation
    const canMessage = await this.messagingService.canUserMessage(userId, conversationId)

    if (!canMessage) {
      throw new ForbiddenException('You can only message in conversations with active bookings')
    }

    return true
  }
}
