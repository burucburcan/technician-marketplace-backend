import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ServiceRating } from '../../entities/service-rating.entity'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { BookingStatus } from '../../common/enums'
import { CreateRatingDto } from './dto/create-rating.dto'
import { ModerateRatingDto } from './dto/moderate-rating.dto'
import { NotificationService } from '../notification/notification.service'
import { NotificationType, NotificationChannel } from '../../entities/notification.entity'
import { ContentFilter } from '../../common/utils/content-filter.util'

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(ServiceRating)
    private ratingRepository: Repository<ServiceRating>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(ProfessionalProfile)
    private professionalProfileRepository: Repository<ProfessionalProfile>,
    private notificationService: NotificationService
  ) {}

  async createRating(userId: string, createRatingDto: CreateRatingDto): Promise<ServiceRating> {
    const { bookingId, score, comment, categoryRatings, photoUrls } = createRatingDto

    // Find the booking
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['user', 'professional'],
    })

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`)
    }

    // Validate that the user owns this booking
    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only rate your own bookings')
    }

    // Validate that the booking is completed (Requirement 7.4)
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Only completed bookings can be rated')
    }

    // Check if a rating already exists for this booking (Requirement 7.6)
    const existingRating = await this.ratingRepository.findOne({
      where: { bookingId },
    })

    if (existingRating) {
      throw new BadRequestException('A rating already exists for this booking')
    }

    // Check for inappropriate content (Requirement 7.2 - moderation)
    const hasInappropriateContent = ContentFilter.containsInappropriateContent(comment)
    const moderationStatus = hasInappropriateContent ? 'flagged' : 'approved'

    // Create the rating (Requirement 7.2)
    const rating = this.ratingRepository.create({
      bookingId,
      userId,
      professionalId: booking.professionalId,
      score,
      comment,
      categoryRatings,
      photoUrls: photoUrls || [],
      isVerified: true, // Auto-verify for now
      moderationStatus,
    })

    const savedRating = await this.ratingRepository.save(rating)

    // Only update professional average if rating is approved
    if (moderationStatus === 'approved') {
      await this.updateProfessionalAverageRating(booking.professionalId)
    }

    // Send notification to professional
    try {
      await this.notificationService.sendNotification({
        userId: booking.professionalId,
        type: NotificationType.NEW_RATING,
        data: {
          userName: booking.user?.email || 'User',
          professionalName: 'Professional',
          rating: score,
          comment: comment,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    } catch (error) {
      // Log error but don't fail the rating creation
      console.error('Failed to send rating notification:', error)
    }

    return savedRating
  }

  async findByBookingId(bookingId: string): Promise<ServiceRating | null> {
    return this.ratingRepository.findOne({
      where: { bookingId },
    })
  }

  async findById(id: string): Promise<ServiceRating> {
    const rating = await this.ratingRepository.findOne({
      where: { id },
      relations: ['user', 'professional'],
    })

    if (!rating) {
      throw new NotFoundException(`Rating with ID ${id} not found`)
    }

    return rating
  }

  async findByProfessionalId(professionalId: string): Promise<ServiceRating[]> {
    return this.ratingRepository.find({
      where: { professionalId },
      order: { createdAt: 'DESC' },
    })
  }

  async getProfessionalRatings(
    professionalId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    ratings: ServiceRating[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    const skip = (page - 1) * limit

    const [ratings, total] = await this.ratingRepository.findAndCount({
      where: { professionalId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['user'],
    })

    return {
      ratings,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findByUserId(userId: string): Promise<ServiceRating[]> {
    return this.ratingRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * Calculate and update professional average rating (Requirement 7.3)
   * This method calculates the overall average rating and category-based averages
   * Only approved ratings are included in the calculation
   */
  async updateProfessionalAverageRating(professionalId: string): Promise<void> {
    // Get all approved ratings for this professional
    const ratings = await this.ratingRepository.find({
      where: {
        professionalId,
        moderationStatus: 'approved',
      },
    })

    if (!ratings || ratings.length === 0) {
      // No approved ratings yet, set to 0
      await this.professionalProfileRepository.update({ id: professionalId }, { rating: 0 })
      return
    }

    // Calculate overall average rating
    const averageRating = this.calculateAverageRating(ratings)

    // Update professional profile with new average
    await this.professionalProfileRepository.update(
      { id: professionalId },
      { rating: averageRating }
    )
  }

  /**
   * Calculate average rating from a list of ratings
   * Returns the arithmetic mean of all rating scores
   */
  calculateAverageRating(ratings: ServiceRating[]): number {
    if (ratings.length === 0) {
      return 0
    }

    const sum = ratings.reduce((acc, rating) => acc + rating.score, 0)
    const average = sum / ratings.length

    // Round to 2 decimal places
    return Math.round(average * 100) / 100
  }

  /**
   * Calculate category-based average ratings
   * Returns average scores for each rating category (quality, punctuality, etc.)
   */
  calculateCategoryAverages(ratings: ServiceRating[]): Record<string, number> {
    if (ratings.length === 0) {
      return {}
    }

    // Collect all category ratings
    const categoryScores: Record<string, number[]> = {}

    ratings.forEach(rating => {
      if (rating.categoryRatings && Array.isArray(rating.categoryRatings)) {
        rating.categoryRatings.forEach(catRating => {
          if (!categoryScores[catRating.category]) {
            categoryScores[catRating.category] = []
          }
          categoryScores[catRating.category].push(catRating.score)
        })
      }
    })

    // Calculate average for each category
    const categoryAverages: Record<string, number> = {}

    Object.keys(categoryScores).forEach(category => {
      const scores = categoryScores[category]
      const sum = scores.reduce((acc, score) => acc + score, 0)
      const average = sum / scores.length
      categoryAverages[category] = Math.round(average * 100) / 100
    })

    return categoryAverages
  }

  /**
   * Get professional rating statistics including category averages
   */
  async getProfessionalRatingStats(professionalId: string): Promise<{
    averageRating: number
    totalRatings: number
    categoryAverages: Record<string, number>
  }> {
    const ratings = await this.findByProfessionalId(professionalId)

    return {
      averageRating: this.calculateAverageRating(ratings),
      totalRatings: ratings.length,
      categoryAverages: this.calculateCategoryAverages(ratings),
    }
  }

  /**
   * Report a rating for inappropriate content (Requirement 7.2)
   * Users can report ratings that contain inappropriate content
   */
  async reportRating(ratingId: string): Promise<ServiceRating> {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    })

    if (!rating) {
      throw new NotFoundException(`Rating with ID ${ratingId} not found`)
    }

    // Update moderation status to flagged
    rating.moderationStatus = 'flagged'
    const updatedRating = await this.ratingRepository.save(rating)

    // If rating was previously approved, recalculate professional average
    // (excluding flagged ratings)
    await this.updateProfessionalAverageRating(rating.professionalId)

    return updatedRating
  }

  /**
   * Moderate a rating (admin only) (Requirement 7.2)
   * Admins can approve, reject, or flag ratings
   */
  async moderateRating(ratingId: string, moderateDto: ModerateRatingDto): Promise<ServiceRating> {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    })

    if (!rating) {
      throw new NotFoundException(`Rating with ID ${ratingId} not found`)
    }

    const previousStatus = rating.moderationStatus

    // Update moderation status based on action
    rating.moderationStatus = moderateDto.action
    const updatedRating = await this.ratingRepository.save(rating)

    // Recalculate professional average rating if status changed
    // Only approved ratings should count towards the average
    if (previousStatus !== moderateDto.action) {
      await this.updateProfessionalAverageRating(rating.professionalId)
    }

    return updatedRating
  }
}
