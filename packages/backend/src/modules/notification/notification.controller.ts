import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { NotificationService, NotificationFilters } from './notification.service'
import { NotificationType } from '../../entities/notification.entity'
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto'
import { RequestWithUser } from '../../common/types/request.types'

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getUserNotifications(
    @Request() req: RequestWithUser,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const filters: NotificationFilters = {
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    }

    return this.notificationService.getUserNotifications(req.user.userId, filters)
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: RequestWithUser) {
    const count = await this.notificationService.getUnreadCount(req.user.userId)
    return { count }
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.notificationService.markAsRead(id, req.user.userId)
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Request() req: RequestWithUser) {
    await this.notificationService.markAllAsRead(req.user.userId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.notificationService.deleteNotification(id, req.user.userId)
  }

  @Put('preferences')
  async updateNotificationPreferences(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    return this.notificationService.updateNotificationPreferences(req.user.userId, dto)
  }

  @Get('preferences')
  async getNotificationPreferences(@Request() req: RequestWithUser) {
    return this.notificationService.getNotificationPreferences(req.user.userId)
  }
}
