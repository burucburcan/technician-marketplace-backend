import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { ElasticsearchService } from './elasticsearch.service'

@Injectable()
export class ProfessionalSyncService {
  private readonly logger = new Logger(ProfessionalSyncService.name)

  constructor(
    @InjectRepository(ProfessionalProfile)
    private readonly professionalRepository: Repository<ProfessionalProfile>,
    @InjectRepository(PortfolioItem)
    private readonly portfolioRepository: Repository<PortfolioItem>,
    private readonly elasticsearchService: ElasticsearchService
  ) {}

  async syncProfessional(professionalId: string) {
    try {
      const professional = await this.professionalRepository.findOne({
        where: { id: professionalId },
        relations: ['specializations'],
      })

      if (!professional) {
        this.logger.warn(`Professional ${professionalId} not found for sync`)
        return
      }

      // Get portfolio images for artists
      let portfolioImages: string[] = []
      if (professional.professionalType === 'artist') {
        const portfolioItems = await this.portfolioRepository.find({
          where: { professionalId },
          order: { displayOrder: 'ASC' },
          take: 5, // Preview first 5 images
        })
        portfolioImages = portfolioItems.map(item => item.thumbnailUrl)
      }

      await this.elasticsearchService.indexProfessional(professional, portfolioImages)
      this.logger.log(`Synced professional ${professionalId} to ElasticSearch`)
    } catch (error) {
      this.logger.error(`Failed to sync professional ${professionalId}: ${error.message}`)
      throw error
    }
  }

  async syncAllProfessionals() {
    try {
      const professionals = await this.professionalRepository.find({
        relations: ['specializations'],
      })

      this.logger.log(`Starting sync of ${professionals.length} professionals`)

      const professionalData = await Promise.all(
        professionals.map(async professional => {
          let portfolioImages: string[] = []
          if (professional.professionalType === 'artist') {
            const portfolioItems = await this.portfolioRepository.find({
              where: { professionalId: professional.id },
              order: { displayOrder: 'ASC' },
              take: 5,
            })
            portfolioImages = portfolioItems.map(item => item.thumbnailUrl)
          }
          return { professional, portfolioImages }
        })
      )

      await this.elasticsearchService.bulkIndex(professionalData)
      this.logger.log(`Successfully synced all professionals to ElasticSearch`)
    } catch (error) {
      this.logger.error(`Failed to sync all professionals: ${error.message}`)
      throw error
    }
  }

  async removeProfessional(professionalId: string) {
    try {
      await this.elasticsearchService.deleteProfessional(professionalId)
      this.logger.log(`Removed professional ${professionalId} from ElasticSearch`)
    } catch (error) {
      this.logger.error(`Failed to remove professional ${professionalId}: ${error.message}`)
      throw error
    }
  }

  async updateProfessionalAvailability(professionalId: string, isAvailable: boolean) {
    try {
      await this.elasticsearchService.updateProfessional(professionalId, { isAvailable })
      this.logger.log(`Updated availability for professional ${professionalId}`)
    } catch (error) {
      this.logger.error(`Failed to update availability: ${error.message}`)
      throw error
    }
  }

  async updateProfessionalRating(professionalId: string, rating: number, totalJobs: number) {
    try {
      await this.elasticsearchService.updateProfessional(professionalId, { rating, totalJobs })
      this.logger.log(`Updated rating for professional ${professionalId}`)
    } catch (error) {
      this.logger.error(`Failed to update rating: ${error.message}`)
      throw error
    }
  }
}
