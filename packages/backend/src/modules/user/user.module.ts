import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MulterModule } from '@nestjs/platform-express'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Certificate } from '../../entities/certificate.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { ActivityLogModule } from '../activity-log/activity-log.module'
import { S3Module } from '../s3/s3.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      ProfessionalProfile,
      ServiceCategory,
      Certificate,
      PortfolioItem,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB for portfolio images
      },
    }),
    ActivityLogModule,
    S3Module,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
