import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProviderController } from './provider.controller'
import { ProviderService } from './provider.service'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { User } from '../../entities/user.entity'
import { Booking } from '../../entities/booking.entity'
import { ServiceRating } from '../../entities/service-rating.entity'
import { ActivityLogModule } from '../activity-log/activity-log.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfessionalProfile, ServiceCategory, User, Booking, ServiceRating]),
    ActivityLogModule,
  ],
  controllers: [ProviderController],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProviderModule {}
