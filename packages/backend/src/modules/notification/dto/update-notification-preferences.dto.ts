import { IsBoolean, IsOptional, IsObject, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { NotificationType } from '../../../entities/notification.entity'

class NotificationTypePreferences {
  @IsOptional()
  @IsBoolean()
  [NotificationType.BOOKING_CREATED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.BOOKING_CONFIRMED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.BOOKING_REJECTED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.BOOKING_CANCELLED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.BOOKING_REMINDER]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.BOOKING_STARTED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.BOOKING_COMPLETED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.NEW_MESSAGE]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.NEW_RATING]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.PAYMENT_RECEIVED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.PAYOUT_PROCESSED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.ACCOUNT_VERIFIED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.PROFILE_APPROVED]?: boolean;

  @IsOptional()
  @IsBoolean()
  [NotificationType.PROFILE_REJECTED]?: boolean
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationTypePreferences)
  notificationTypes?: Record<string, boolean>
}
