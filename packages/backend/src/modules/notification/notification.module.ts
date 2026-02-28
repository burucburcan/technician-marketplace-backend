import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule } from '@nestjs/config'
import { NotificationService } from './notification.service'
import { NotificationController } from './notification.controller'
import { EmailService } from './services/email.service'
import { SmsService } from './services/sms.service'
import { Notification, User, UserProfile } from '../../entities'

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, UserProfile]), ConfigModule],
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, SmsService],
  exports: [NotificationService],
})
export class NotificationModule {}
