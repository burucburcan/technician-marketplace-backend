import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Between } from 'typeorm'
import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types'
import { ElasticsearchService } from './elasticsearch.service'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Booking } from '../../entities/booking.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { SearchProfessionalsDto } from './dto/search-professionals.dto'
import { RecommendedProfessionalsDto } from './dto/recommended-professionals.dto'
import { ProfessionalType } from '../../common/enums'

export interface SearchResult {
  professional: ProfessionalProfile
  distance?: number
  matchScore?: number
  estimatedPrice?: number
  nextAvailableSlot?: Date
  portfolioPreview?: PortfolioItem[]
}

export interface SearchResponse {
  professionals: SearchResult[]
  total: number
  page: number
  pageSize: number
}

export interface AvailabilitySlot {
  start: Date
  end: Date
  isAvailable: boolean
}

interface ElasticsearchHit {
  _id: string
  _score: number
  _source?: Record<string, unknown>
  sort?: unknown[]
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    @InjectRepository(ProfessionalProfile)
    private readonly professionalRepository: Repository<ProfessionalProfile>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(PortfolioItem)
    private readonly portfolioRepository: Repository<PortfolioItem>
  ) {}

  async searchProfessionals(dto: SearchProfessionalsDto): Promise<SearchResponse> {
    const { page = 1, pageSize = 20 } = dto
    const from = (page - 1) * pageSize

    // Build ElasticSearch query
    const must: QueryDslQueryContainer[] = []
    const filter: QueryDslQueryContainer[] = []

    // Professional type filter
    if (dto.professionalType) {
      filter.push({ term: { professionalType: dto.professionalType } })
    }

    // Category filter
    if (dto.category) {
      must.push({
        match: {
          specializations: {
            query: dto.category,
            operator: 'and',
          },
        },
      })
    }

    // Rating filter
    if (dto.minRating) {
      filter.push({ range: { rating: { gte: dto.minRating } } })
    }

    // Price filter
    if (dto.maxPrice) {
      filter.push({ range: { hourlyRate: { lte: dto.maxPrice } } })
    }

    // Availability filter
    if (dto.availableOnly) {
      filter.push({ term: { isAvailable: true } })
    }

    // Verification filter
    if (dto.verifiedOnly) {
      filter.push({ term: { verificationStatus: 'verified' } })
    }

    // Artist-specific filters
    if (dto.professionalType === ProfessionalType.ARTIST) {
      if (dto.artStyle && dto.artStyle.length > 0) {
        must.push({
          terms: { 'artStyle.keyword': dto.artStyle },
        })
      }

      if (dto.materials && dto.materials.length > 0) {
        must.push({
          terms: { 'materials.keyword': dto.materials },
        })
      }
    }

    // Build query
    const query: QueryDslQueryContainer = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter,
      },
    }

    // Geo-distance query
    if (dto.latitude && dto.longitude && query.bool?.filter) {
      const filterArray = Array.isArray(query.bool.filter) ? query.bool.filter : [query.bool.filter]
      filterArray.push({
        geo_distance: {
          distance: `${dto.radius}km`,
          location: {
            lat: dto.latitude,
            lon: dto.longitude,
          },
        },
      })
      query.bool.filter = filterArray
    }

    // Sorting
    const sort: Array<Record<string, unknown>> = []

    if (dto.latitude && dto.longitude && dto.sortBy === 'distance') {
      sort.push({
        _geo_distance: {
          location: {
            lat: dto.latitude,
            lon: dto.longitude,
          },
          order: 'asc',
          unit: 'km',
        },
      })
    } else {
      switch (dto.sortBy) {
        case 'rating':
          sort.push({ rating: 'desc' }, { totalJobs: 'desc' })
          break
        case 'price':
          sort.push({ hourlyRate: 'asc' })
          break
        case 'experience':
          sort.push({ experienceYears: 'desc' })
          break
        case 'portfolio':
          sort.push({ portfolioCount: 'desc' }, { rating: 'desc' })
          break
        default:
          sort.push({ rating: 'desc' })
      }
    }

    // Execute search
    const esResult = await this.elasticsearchService.search({
      query,
      sort,
      from,
      size: pageSize,
    })

    const hits = esResult.hits.hits as ElasticsearchHit[]
    const total =
      typeof esResult.hits.total === 'number'
        ? esResult.hits.total
        : (esResult.hits.total?.value ?? 0)

    // Fetch full professional data from PostgreSQL
    const professionalIds = hits.map((hit) => hit._id)
    const professionals = await this.professionalRepository.find({
      where: professionalIds.map(id => ({ id })),
      relations: ['specializations', 'user', 'user.profile'],
    })

    // Build results with additional data
    const results: SearchResult[] = (
      await Promise.all(
        hits.map(async (hit) => {
          const professional = professionals.find(p => p.id === hit._id)
          if (!professional) return null

          const result: SearchResult = {
            professional,
            distance: hit.sort?.[0] as number | undefined,
          }

          // Add portfolio preview for artists
          if (professional.professionalType === ProfessionalType.ARTIST) {
            result.portfolioPreview = await this.portfolioRepository.find({
              where: { professionalId: professional.id },
              order: { displayOrder: 'ASC' },
              take: 3,
            })
          }

          // Estimate price
          result.estimatedPrice = Number(professional.hourlyRate)

          return result
        })
      )
    ).filter((result): result is SearchResult => result !== null)

    return {
      professionals: results.filter(r => r !== null),
      total,
      page,
      pageSize,
    }
  }

  async getRecommendedProfessionals(dto: RecommendedProfessionalsDto): Promise<SearchResult[]> {
    const {
      latitude,
      longitude,
      category,
      professionalType,
      maxPrice,
      preferredStyles,
      limit = 10,
    } = dto

    // Build base query
    const must: QueryDslQueryContainer[] = [
      {
        match: {
          specializations: {
            query: category,
            operator: 'and',
          },
        },
      },
    ]

    const filter: QueryDslQueryContainer[] = [
      { term: { isAvailable: true } },
      { term: { verificationStatus: 'verified' } },
      {
        geo_distance: {
          distance: '50km',
          location: { lat: latitude, lon: longitude },
        },
      },
    ]

    if (professionalType) {
      filter.push({ term: { professionalType } })
    }

    if (maxPrice) {
      filter.push({ range: { hourlyRate: { lte: maxPrice } } })
    }

    if (preferredStyles && preferredStyles.length > 0) {
      must.push({
        terms: { 'artStyle.keyword': preferredStyles },
      })
    }

    const esResult = await this.elasticsearchService.search({
      query: {
        bool: {
          must,
          filter,
        },
      },
      size: limit * 2, // Get more for scoring
    })

    const hits = esResult.hits.hits as ElasticsearchHit[]
    const professionalIds = hits.map((hit) => hit._id)

    const professionals = await this.professionalRepository.find({
      where: professionalIds.map(id => ({ id })),
      relations: ['specializations', 'user', 'user.profile'],
    })

    // Calculate match scores
    const results: SearchResult[] = (
      await Promise.all(
        hits.map(async (hit) => {
          const professional = professionals.find(p => p.id === hit._id)
          if (!professional) return null

          const distance = this.calculateDistance(
            latitude,
            longitude,
            professional.currentLocation?.latitude || 0,
            professional.currentLocation?.longitude || 0
          )

          const matchScore = await this.calculateMatchScore(professional, {
            distance,
            maxPrice,
            preferredStyles,
          })

          const result: SearchResult = {
            professional,
            distance,
            matchScore,
            estimatedPrice: Number(professional.hourlyRate),
          }

          // Add portfolio preview for artists
          if (professional.professionalType === ProfessionalType.ARTIST) {
            result.portfolioPreview = await this.portfolioRepository.find({
              where: { professionalId: professional.id },
              order: { displayOrder: 'ASC' },
              take: 3,
            })
          }

          return result
        })
      )
    ).filter((result): result is SearchResult => result !== null)

    // Sort by match score and return top results
    return results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, limit)
  }

  async checkAvailability(
    professionalId: string,
    date: Date,
    duration: number
  ): Promise<AvailabilitySlot[]> {
    const professional = await this.professionalRepository.findOne({
      where: { id: professionalId },
    })

    if (!professional) {
      throw new Error('Professional not found')
    }

    const requestedDate = new Date(date)
    const dayOfWeek = requestedDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase() as keyof typeof professional.workingHours

    // Get working hours for the day
    const workingHours = professional.workingHours[dayOfWeek] || []

    if (workingHours.length === 0) {
      return []
    }

    // Get existing bookings for the day
    const startOfDay = new Date(requestedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(requestedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const bookings = await this.bookingRepository.find({
      where: {
        professionalId,
        scheduledDate: Between(startOfDay, endOfDay),
        status: 'confirmed' as any,
      },
      order: { scheduledDate: 'ASC' },
    })

    // Build availability slots
    const slots: AvailabilitySlot[] = []

    for (const timeSlot of workingHours) {
      const [startHour, startMinute] = timeSlot.start.split(':').map(Number)
      const [endHour, endMinute] = timeSlot.end.split(':').map(Number)

      const slotStart = new Date(requestedDate)
      slotStart.setHours(startHour, startMinute, 0, 0)

      const slotEnd = new Date(requestedDate)
      slotEnd.setHours(endHour, endMinute, 0, 0)

      // Check for conflicts with existing bookings
      let currentTime = slotStart
      while (currentTime < slotEnd) {
        const slotEndTime = new Date(currentTime.getTime() + duration * 60000)

        if (slotEndTime > slotEnd) break

        const hasConflict = bookings.some(booking => {
          const bookingStart = new Date(booking.scheduledDate)
          const bookingEnd = new Date(bookingStart.getTime() + booking.estimatedDuration * 60000)

          return (
            (currentTime >= bookingStart && currentTime < bookingEnd) ||
            (slotEndTime > bookingStart && slotEndTime <= bookingEnd) ||
            (currentTime <= bookingStart && slotEndTime >= bookingEnd)
          )
        })

        slots.push({
          start: new Date(currentTime),
          end: new Date(slotEndTime),
          isAvailable: !hasConflict,
        })

        currentTime = new Date(currentTime.getTime() + 30 * 60000) // 30-minute intervals
      }
    }

    return slots
  }

  private async calculateMatchScore(
    professional: ProfessionalProfile,
    context: {
      distance: number
      maxPrice?: number
      preferredStyles?: string[]
    }
  ): Promise<number> {
    const maxRadius = 50 // km

    // Distance Score (0-1)
    const distanceScore = Math.max(0, 1 - context.distance / maxRadius) * 0.25

    // Rating Score (0-1)
    const ratingScore = (Number(professional.rating) / 5) * 0.2

    // Experience Score (0-1)
    const experienceScore = Math.min(1, professional.experienceYears / 10) * 0.15

    // Availability Score
    const availabilityScore = professional.isAvailable ? 1 * 0.15 : 0.3 * 0.15

    // Price Compatibility (0-1)
    let priceScore = 0.1
    if (context.maxPrice) {
      const priceRatio = Number(professional.hourlyRate) / context.maxPrice
      priceScore = Math.max(0, 1 - priceRatio) * 0.1
    }

    // Past Success Rate (completion rate)
    const successScore = (Number(professional.completionRate) / 100) * 0.1

    // User Preference Match (style compatibility for artists)
    let preferenceScore = 0.05
    if (
      professional.professionalType === ProfessionalType.ARTIST &&
      context.preferredStyles &&
      context.preferredStyles.length > 0
    ) {
      const matchingStyles =
        professional.artStyle?.filter(style => context.preferredStyles!.includes(style)).length || 0
      preferenceScore = (matchingStyles / Math.max(context.preferredStyles.length, 1)) * 0.05
    }

    let totalScore =
      distanceScore +
      ratingScore +
      experienceScore +
      availabilityScore +
      priceScore +
      successScore +
      preferenceScore

    // Artist-specific scoring
    if (professional.professionalType === ProfessionalType.ARTIST) {
      // Portfolio Quality Score
      const portfolioCount = await this.portfolioRepository.count({
        where: { professionalId: professional.id },
      })
      const portfolioQuality =
        (Math.min(portfolioCount, 20) / 20) * Number(professional.rating) * 0.1

      // Style Compatibility (already included in preference score, add bonus)
      const styleBonus = preferenceScore > 0 ? 0.05 : 0

      totalScore += portfolioQuality + styleBonus
    }

    return Math.min(1, totalScore)
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}
