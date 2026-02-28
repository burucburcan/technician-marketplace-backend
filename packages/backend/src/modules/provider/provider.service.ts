import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { User } from '../../entities/user.entity'
import { Booking } from '../../entities/booking.entity'
import { ServiceRating } from '../../entities/service-rating.entity'
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
  ProfessionalFilterDto,
  VerifyProfessionalDto,
  ProviderStatsQueryDto,
  ProviderStatsDto,
  ProfessionalStatsDto,
} from './dto'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { UserRole, BookingStatus, ProfessionalType } from '../../common/enums'

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(ProfessionalProfile)
    private readonly professionalProfileRepository: Repository<ProfessionalProfile>,
    @InjectRepository(ServiceCategory)
    private readonly serviceCategoryRepository: Repository<ServiceCategory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(ServiceRating)
    private readonly serviceRatingRepository: Repository<ServiceRating>,
    private readonly activityLogService: ActivityLogService
  ) {}

  async getProfessionals(
    providerId: string,
    filters?: ProfessionalFilterDto
  ): Promise<ProfessionalProfile[]> {
    // Verify provider exists
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: UserRole.PROVIDER },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    // Build query
    const queryBuilder = this.professionalProfileRepository
      .createQueryBuilder('professional')
      .leftJoinAndSelect('professional.specializations', 'specializations')
      .leftJoinAndSelect('professional.user', 'user')
      .where('professional.providerId = :providerId', { providerId })

    // Apply filters
    if (filters?.professionalType) {
      queryBuilder.andWhere('professional.professionalType = :professionalType', {
        professionalType: filters.professionalType,
      })
    }

    const professionals = await queryBuilder.orderBy('professional.createdAt', 'DESC').getMany()

    return professionals
  }

  async getProfessional(providerId: string, professionalId: string): Promise<ProfessionalProfile> {
    // Verify provider exists
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: UserRole.PROVIDER },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const professional = await this.professionalProfileRepository.findOne({
      where: { id: professionalId, providerId },
      relations: ['specializations', 'certificates', 'portfolio', 'user'],
    })

    if (!professional) {
      throw new NotFoundException('Professional not found or does not belong to this provider')
    }

    return professional
  }

  async createProfessional(
    providerId: string,
    createProfessionalDto: CreateProfessionalDto
  ): Promise<ProfessionalProfile> {
    // Verify provider exists
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: UserRole.PROVIDER },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    // Validate specializations (service categories)
    const { specializationIds, ...profileData } = createProfessionalDto
    const categories = await this.serviceCategoryRepository.find({
      where: { id: In(specializationIds), isActive: true },
    })

    if (categories.length !== specializationIds.length) {
      throw new BadRequestException('One or more invalid service category IDs provided')
    }

    // Create a user account for the professional
    // For now, we'll create a placeholder user - in a real scenario, this would involve
    // an invitation system or separate registration flow
    const professionalUser = this.userRepository.create({
      email: `professional_${Date.now()}@temp.com`, // Temporary email
      passwordHash: '', // Will be set when professional completes registration
      role: UserRole.PROFESSIONAL,
      isEmailVerified: false,
    })

    const savedUser = await this.userRepository.save(professionalUser)

    // Create professional profile
    const professionalProfile = this.professionalProfileRepository.create({
      userId: savedUser.id,
      providerId,
      ...profileData,
      specializations: categories,
    })

    const savedProfile = await this.professionalProfileRepository.save(professionalProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: providerId,
      action: 'professional_created',
      resource: 'professional_profile',
      metadata: {
        professionalId: savedProfile.id,
        professionalType: savedProfile.professionalType,
      },
    })

    return this.getProfessional(providerId, savedProfile.id)
  }

  async updateProfessional(
    providerId: string,
    professionalId: string,
    updateProfessionalDto: UpdateProfessionalDto
  ): Promise<ProfessionalProfile> {
    // Verify provider exists
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: UserRole.PROVIDER },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId, providerId },
      relations: ['specializations'],
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional not found or does not belong to this provider')
    }

    // Handle specialization updates if provided
    const { specializationIds, ...profileData } = updateProfessionalDto

    if (specializationIds) {
      const categories = await this.serviceCategoryRepository.find({
        where: { id: In(specializationIds), isActive: true },
      })

      if (categories.length !== specializationIds.length) {
        throw new BadRequestException('One or more invalid service category IDs provided')
      }

      professionalProfile.specializations = categories
    }

    // Update other fields
    Object.assign(professionalProfile, profileData)

    await this.professionalProfileRepository.save(professionalProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: providerId,
      action: 'professional_updated',
      resource: 'professional_profile',
      metadata: {
        professionalId,
        updatedFields: Object.keys(updateProfessionalDto),
      },
    })

    return this.getProfessional(providerId, professionalId)
  }

  async deleteProfessional(
    providerId: string,
    professionalId: string
  ): Promise<{ message: string }> {
    // Verify provider exists
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: UserRole.PROVIDER },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId, providerId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional not found or does not belong to this provider')
    }

    // Instead of deleting, we'll disable the professional
    // This preserves historical data and bookings
    professionalProfile.isAvailable = false

    await this.professionalProfileRepository.save(professionalProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: providerId,
      action: 'professional_disabled',
      resource: 'professional_profile',
      metadata: {
        professionalId,
      },
    })

    return { message: 'Professional disabled successfully' }
  }

  async verifyProfessional(
    providerId: string,
    professionalId: string,
    verifyProfessionalDto: VerifyProfessionalDto
  ): Promise<ProfessionalProfile> {
    // Verify provider exists
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: UserRole.PROVIDER },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId, providerId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional not found or does not belong to this provider')
    }

    // Update verification status
    professionalProfile.verificationStatus = verifyProfessionalDto.verificationStatus

    await this.professionalProfileRepository.save(professionalProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: providerId,
      action: 'professional_verification_updated',
      resource: 'professional_profile',
      metadata: {
        professionalId,
        verificationStatus: verifyProfessionalDto.verificationStatus,
        notes: verifyProfessionalDto.notes,
      },
    })

    return this.getProfessional(providerId, professionalId)
  }

  async getProviderStats(
    providerId: string,
    query?: ProviderStatsQueryDto
  ): Promise<ProviderStatsDto> {
    // Verify provider exists
    const provider = await this.userRepository.findOne({
      where: { id: providerId, role: UserRole.PROVIDER },
    })

    if (!provider) {
      throw new NotFoundException('Provider not found')
    }

    // Get all professionals for this provider
    const queryBuilder = this.professionalProfileRepository
      .createQueryBuilder('professional')
      .leftJoinAndSelect('professional.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('professional.providerId = :providerId', { providerId })

    // Apply professional type filter if provided
    if (query?.professionalType) {
      queryBuilder.andWhere('professional.professionalType = :professionalType', {
        professionalType: query.professionalType,
      })
    }

    const professionals = await queryBuilder.getMany()
    const professionalIds = professionals.map(p => p.id)

    // Calculate overall statistics
    const totalProfessionals = professionals.length
    const professionalsByType = {
      handyman: professionals.filter(p => p.professionalType === ProfessionalType.HANDYMAN).length,
      artist: professionals.filter(p => p.professionalType === ProfessionalType.ARTIST).length,
    }

    // Get all bookings for these professionals
    let bookings: Booking[] = []
    if (professionalIds.length > 0) {
      bookings = await this.bookingRepository.find({
        where: { professionalId: In(professionalIds) },
      })
    }

    const totalBookings = bookings.length
    const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED).length
    const cancelledBookings = bookings.filter(b => b.status === BookingStatus.CANCELLED).length
    const pendingBookings = bookings.filter(b => b.status === BookingStatus.PENDING).length
    const inProgressBookings = bookings.filter(b => b.status === BookingStatus.IN_PROGRESS).length

    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0

    // Calculate total revenue from completed bookings
    const totalRevenue = bookings
      .filter(b => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + Number(b.actualPrice || b.estimatedPrice), 0)

    // Get all ratings for these professionals
    let ratings: ServiceRating[] = []
    if (professionalIds.length > 0) {
      ratings = await this.serviceRatingRepository.find({
        where: { professionalId: In(professionalIds) },
      })
    }

    const totalRatings = ratings.length
    const averageRating =
      totalRatings > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / totalRatings : 0

    // Calculate individual professional statistics
    const professionalStats: ProfessionalStatsDto[] = await Promise.all(
      professionals.map(async professional => {
        const professionalBookings = bookings.filter(b => b.professionalId === professional.id)
        const professionalRatings = ratings.filter(r => r.professionalId === professional.id)

        const profTotalBookings = professionalBookings.length
        const profCompletedBookings = professionalBookings.filter(
          b => b.status === BookingStatus.COMPLETED
        ).length
        const profCancelledBookings = professionalBookings.filter(
          b => b.status === BookingStatus.CANCELLED
        ).length

        const profCompletionRate =
          profTotalBookings > 0 ? (profCompletedBookings / profTotalBookings) * 100 : 0

        const profTotalRatings = professionalRatings.length
        const profAverageRating =
          profTotalRatings > 0
            ? professionalRatings.reduce((sum, r) => sum + r.score, 0) / profTotalRatings
            : 0

        const profTotalRevenue = professionalBookings
          .filter(b => b.status === BookingStatus.COMPLETED)
          .reduce((sum, b) => sum + Number(b.actualPrice || b.estimatedPrice), 0)

        return {
          professionalId: professional.id,
          professionalName:
            `${professional.user?.profile?.firstName || ''} ${professional.user?.profile?.lastName || ''}`.trim() ||
            'Unknown',
          professionalType: professional.professionalType,
          totalBookings: profTotalBookings,
          completedBookings: profCompletedBookings,
          cancelledBookings: profCancelledBookings,
          averageRating: Math.round(profAverageRating * 100) / 100,
          totalRatings: profTotalRatings,
          completionRate: Math.round(profCompletionRate * 100) / 100,
          totalRevenue: Math.round(profTotalRevenue * 100) / 100,
        }
      })
    )

    return {
      providerId,
      totalProfessionals,
      professionalsByType,
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      inProgressBookings,
      completionRate: Math.round(completionRate * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      professionals: professionalStats,
    }
  }
}
