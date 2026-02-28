import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RatingController } from './rating.controller'
import { RatingService } from './rating.service'
import { ServiceRating } from '../../entities/service-rating.entity'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceRating, Booking, ProfessionalProfile]),
    NotificationModule,
  ],
  controllers: [RatingController],
  providers: [RatingService],
  exports: [RatingService],
})
export class RatingModule {}
