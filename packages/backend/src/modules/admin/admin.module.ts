import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Booking } from '../../entities/booking.entity'
import { Payment } from '../../entities/payment.entity'
import { Dispute } from '../../entities/dispute.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { ActivityLogModule } from '../activity-log/activity-log.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      ProfessionalProfile,
      SupplierProfile,
      ServiceCategory,
      Booking,
      Payment,
      Dispute,
      PortfolioItem,
    ]),
    ActivityLogModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
