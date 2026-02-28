import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BookingController } from './booking.controller'
import { BookingService } from './booking.service'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { NotificationModule } from '../notification/notification.module'
import { MessagingModule } from '../messaging/messaging.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, ProfessionalProfile, User, UserProfile]),
    NotificationModule,
    forwardRef(() => MessagingModule),
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
