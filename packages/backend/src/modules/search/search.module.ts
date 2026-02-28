import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ElasticsearchModule } from './elasticsearch.module'
import { ElasticsearchService } from './elasticsearch.service'
import { ProfessionalSyncService } from './professional-sync.service'
import { SearchService } from './search.service'
import { SearchController } from './search.controller'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { Booking } from '../../entities/booking.entity'

@Module({
  imports: [
    ElasticsearchModule,
    TypeOrmModule.forFeature([ProfessionalProfile, PortfolioItem, Booking]),
  ],
  controllers: [SearchController],
  providers: [ElasticsearchService, ProfessionalSyncService, SearchService],
  exports: [ElasticsearchService, ProfessionalSyncService, SearchService],
})
export class SearchModule {}
