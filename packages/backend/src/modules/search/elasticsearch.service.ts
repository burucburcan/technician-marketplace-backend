import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common'
import { Client } from '@elastic/elasticsearch'
import { ELASTICSEARCH_CLIENT } from './elasticsearch.module'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ProfessionalType } from '../../common/enums'

export interface ProfessionalDocument {
  id: string
  userId: string
  professionalType: ProfessionalType
  businessName?: string
  specializations: string[]
  experienceYears: number
  hourlyRate: number
  serviceRadius: number
  location?: {
    lat: number
    lon: number
  }
  rating: number
  totalJobs: number
  completionRate: number
  isAvailable: boolean
  verificationStatus: string
  // Artist-specific fields
  artStyle?: string[]
  materials?: string[]
  techniques?: string[]
  portfolioCount?: number
  portfolioImages?: string[]
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name)
  private readonly indexName = 'professionals'

  constructor(
    @Inject(ELASTICSEARCH_CLIENT)
    private readonly esClient: Client
  ) {}

  async onModuleInit() {
    await this.createIndexIfNotExists()
  }

  private async createIndexIfNotExists() {
    try {
      const exists = await this.esClient.indices.exists({
        index: this.indexName,
      })

      if (!exists) {
        await this.createIndex()
        this.logger.log(`Created ElasticSearch index: ${this.indexName}`)
      } else {
        this.logger.log(`ElasticSearch index already exists: ${this.indexName}`)
      }
    } catch (error) {
      this.logger.error(`Failed to check/create index: ${error.message}`)
    }
  }

  async createIndex() {
    return this.esClient.indices.create({
      index: this.indexName,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              professional_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'spanish_stop', 'spanish_stemmer'],
              },
            },
            filter: {
              spanish_stop: {
                type: 'stop',
                stopwords: '_spanish_',
              },
              spanish_stemmer: {
                type: 'stemmer',
                language: 'spanish',
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'keyword' },
            professionalType: { type: 'keyword' },
            businessName: {
              type: 'text',
              analyzer: 'professional_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            specializations: {
              type: 'text',
              analyzer: 'professional_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            experienceYears: { type: 'integer' },
            hourlyRate: { type: 'float' },
            serviceRadius: { type: 'integer' },
            location: { type: 'geo_point' },
            rating: { type: 'float' },
            totalJobs: { type: 'integer' },
            completionRate: { type: 'float' },
            isAvailable: { type: 'boolean' },
            verificationStatus: { type: 'keyword' },
            // Artist-specific fields
            artStyle: {
              type: 'text',
              analyzer: 'professional_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            materials: {
              type: 'text',
              analyzer: 'professional_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            techniques: {
              type: 'text',
              analyzer: 'professional_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            portfolioCount: { type: 'integer' },
            portfolioImages: { type: 'keyword' },
          },
        },
      },
    })
  }

  async indexProfessional(professional: ProfessionalProfile, portfolioImages?: string[]) {
    const document: ProfessionalDocument = {
      id: professional.id,
      userId: professional.userId,
      professionalType: professional.professionalType,
      businessName: professional.businessName,
      specializations: professional.specializations?.map(s => s.name) || [],
      experienceYears: professional.experienceYears,
      hourlyRate: Number(professional.hourlyRate),
      serviceRadius: professional.serviceRadius,
      location: professional.currentLocation
        ? {
            lat: professional.currentLocation.latitude,
            lon: professional.currentLocation.longitude,
          }
        : undefined,
      rating: Number(professional.rating),
      totalJobs: professional.totalJobs,
      completionRate: Number(professional.completionRate),
      isAvailable: professional.isAvailable,
      verificationStatus: professional.verificationStatus,
      artStyle: professional.artStyle,
      materials: professional.materials,
      techniques: professional.techniques,
      portfolioCount: portfolioImages?.length || 0,
      portfolioImages: portfolioImages || [],
    }

    try {
      await this.esClient.index({
        index: this.indexName,
        id: professional.id,
        document,
      })
      this.logger.log(`Indexed professional: ${professional.id}`)
    } catch (error) {
      this.logger.error(`Failed to index professional ${professional.id}: ${error.message}`)
      throw error
    }
  }

  async updateProfessional(professionalId: string, updates: Partial<ProfessionalDocument>) {
    try {
      await this.esClient.update({
        index: this.indexName,
        id: professionalId,
        doc: updates,
      })
      this.logger.log(`Updated professional: ${professionalId}`)
    } catch (error) {
      this.logger.error(`Failed to update professional ${professionalId}: ${error.message}`)
      throw error
    }
  }

  async deleteProfessional(professionalId: string) {
    try {
      await this.esClient.delete({
        index: this.indexName,
        id: professionalId,
      })
      this.logger.log(`Deleted professional: ${professionalId}`)
    } catch (error) {
      this.logger.error(`Failed to delete professional ${professionalId}: ${error.message}`)
      throw error
    }
  }

  async search(query: Record<string, unknown>) {
    try {
      const result = await this.esClient.search({
        index: this.indexName,
        body: query,
      })
      return result
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`)
      throw error
    }
  }

  async bulkIndex(
    professionals: Array<{ professional: ProfessionalProfile; portfolioImages?: string[] }>
  ) {
    const operations = professionals.flatMap(({ professional, portfolioImages }) => [
      { index: { _index: this.indexName, _id: professional.id } },
      {
        id: professional.id,
        userId: professional.userId,
        professionalType: professional.professionalType,
        businessName: professional.businessName,
        specializations: professional.specializations?.map(s => s.name) || [],
        experienceYears: professional.experienceYears,
        hourlyRate: Number(professional.hourlyRate),
        serviceRadius: professional.serviceRadius,
        location: professional.currentLocation
          ? {
              lat: professional.currentLocation.latitude,
              lon: professional.currentLocation.longitude,
            }
          : undefined,
        rating: Number(professional.rating),
        totalJobs: professional.totalJobs,
        completionRate: Number(professional.completionRate),
        isAvailable: professional.isAvailable,
        verificationStatus: professional.verificationStatus,
        artStyle: professional.artStyle,
        materials: professional.materials,
        techniques: professional.techniques,
        portfolioCount: portfolioImages?.length || 0,
        portfolioImages: portfolioImages || [],
      },
    ])

    try {
      const result = await this.esClient.bulk({ operations })
      this.logger.log(`Bulk indexed ${professionals.length} professionals`)
      return result
    } catch (error) {
      this.logger.error(`Bulk index failed: ${error.message}`)
      throw error
    }
  }
}
