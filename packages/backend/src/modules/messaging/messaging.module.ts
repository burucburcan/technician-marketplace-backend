import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MessagingController } from './messaging.controller'
import { MessagingService } from './messaging.service'
import { MessagingGateway } from './messaging.gateway'
import { Booking } from '../../entities/booking.entity'
import { NotificationModule } from '../notification/notification.module'
import { S3Module } from '../s3/s3.module'

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), NotificationModule, S3Module],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingGateway],
  exports: [MessagingService],
})
export class MessagingModule {}
