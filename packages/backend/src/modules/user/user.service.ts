import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Certificate } from '../../entities/certificate.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
  CreateProfessionalProfileDto,
  UpdateProfessionalProfileDto,
  UploadCertificateDto,
  UploadPortfolioImageDto,
  UpdatePortfolioImageDto,
  UpdatePreferencesDto,
  UpdateLocationDto,
} from './dto'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { In } from 'typeorm'
import { ProfessionalType } from '../../common/enums'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(ProfessionalProfile)
    private readonly professionalProfileRepository: Repository<ProfessionalProfile>,
    @InjectRepository(ServiceCategory)
    private readonly serviceCategoryRepository: Repository<ServiceCategory>,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(PortfolioItem)
    private readonly portfolioItemRepository: Repository<PortfolioItem>,
    private readonly activityLogService: ActivityLogService,
    private readonly s3Service: S3Service
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    })

    if (!profile) {
      throw new NotFoundException('User profile not found')
    }

    return profile
  }

  async createProfile(
    userId: string,
    createProfileDto: CreateUserProfileDto
  ): Promise<UserProfile> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Check if profile already exists
    const existingProfile = await this.userProfileRepository.findOne({
      where: { userId },
    })
    if (existingProfile) {
      throw new BadRequestException('User profile already exists')
    }

    // Set default preferences if not provided
    const defaultPreferences = {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      currency: 'MXN',
      ...createProfileDto.preferences,
    }

    const profile = this.userProfileRepository.create({
      userId,
      ...createProfileDto,
      language: createProfileDto.language || 'es',
      preferences: defaultPreferences,
    })

    const savedProfile = await this.userProfileRepository.save(profile)

    // Log activity
    await this.activityLogService.logActivity({
      userId,
      action: 'profile_created',
      resource: 'user_profile',
      metadata: { profileId: savedProfile.id },
    })

    return savedProfile
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateUserProfileDto,
    requestingUserId: string
  ): Promise<UserProfile> {
    // Check authorization - users can only update their own profile
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own profile')
    }

    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    })

    if (!profile) {
      throw new NotFoundException('User profile not found')
    }

    // Update profile
    Object.assign(profile, updateProfileDto)

    // If preferences are being updated, merge with existing preferences
    if (updateProfileDto.preferences) {
      profile.preferences = {
        ...profile.preferences,
        ...updateProfileDto.preferences,
      }
    }

    const updatedProfile = await this.userProfileRepository.save(profile)

    // Log activity
    await this.activityLogService.logActivity({
      userId,
      action: 'profile_updated',
      resource: 'user_profile',
      metadata: {
        profileId: profile.id,
        updatedFields: Object.keys(updateProfileDto),
      },
    })

    return updatedProfile
  }

  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
    requestingUserId: string
  ): Promise<UserProfile> {
    // Check authorization - users can only update their own preferences
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own preferences')
    }

    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    })

    if (!profile) {
      throw new NotFoundException('User profile not found')
    }

    // Update language if provided
    if (updatePreferencesDto.language !== undefined) {
      profile.language = updatePreferencesDto.language
    }

    // Update preferences
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { language, ...preferencesUpdate } = updatePreferencesDto
    if (Object.keys(preferencesUpdate).length > 0) {
      profile.preferences = {
        ...profile.preferences,
        ...preferencesUpdate,
      }
    }

    const updatedProfile = await this.userProfileRepository.save(profile)

    // Log activity
    await this.activityLogService.logActivity({
      userId,
      action: 'preferences_updated',
      resource: 'user_profile',
      metadata: {
        profileId: profile.id,
        updatedFields: Object.keys(updatePreferencesDto),
      },
    })

    return updatedProfile
  }

  async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File,
    requestingUserId: string
  ): Promise<{ avatarUrl: string }> {
    // Check authorization
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own profile photo')
    }

    const profile = await this.userProfileRepository.findOne({
      where: { userId },
    })

    if (!profile) {
      throw new NotFoundException('User profile not found')
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP are allowed')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB')
    }

    try {
      // Upload to S3
      const avatarUrl = await this.s3Service.uploadProfilePhoto(userId, file)

      // Update profile
      profile.avatarUrl = avatarUrl
      await this.userProfileRepository.save(profile)

      // Log activity
      await this.activityLogService.logActivity({
        userId,
        action: 'profile_photo_uploaded',
        resource: 'user_profile',
        metadata: {
          profileId: profile.id,
          avatarUrl,
        },
      })

      return { avatarUrl }
    } catch (error) {
      throw new BadRequestException('Failed to upload profile photo')
    }
  }

  async deleteAccount(userId: string, requestingUserId: string): Promise<{ message: string }> {
    // Check authorization
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own account')
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'professionalProfile', 'supplierProfile'],
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Log activity before deletion
    await this.activityLogService.logActivity({
      userId,
      action: 'account_deletion_requested',
      resource: 'user',
      metadata: {
        email: user.email,
        role: user.role,
      },
    })

    // Delete profile photo from S3 if exists
    if (user.profile?.avatarUrl) {
      try {
        await this.s3Service.deleteProfilePhoto(userId)
      } catch (error) {
        // Log error but don't fail the deletion
        console.error('Failed to delete profile photo from S3:', error)
      }
    }

    // Delete user (cascade will handle related records)
    await this.userRepository.remove(user)

    return { message: 'Account deleted successfully' }
  }

  async exportUserData(userId: string, requestingUserId: string): Promise<any> {
    // Check authorization
    if (userId !== requestingUserId) {
      throw new ForbiddenException('You can only export your own data')
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'profile',
        'professionalProfile',
        'supplierProfile',
        'bookings',
        'orders',
        'serviceRatings',
        'productReviews',
        'supplierReviews',
      ],
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Log activity
    await this.activityLogService.logActivity({
      userId,
      action: 'data_export_requested',
      resource: 'user',
      metadata: { email: user.email },
    })

    // Remove sensitive data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, twoFactorSecret, ...userData } = user

    return {
      exportDate: new Date().toISOString(),
      userData,
    }
  }

  // Professional Profile Management

  async createProfessionalProfile(
    userId: string,
    createProfessionalProfileDto: CreateProfessionalProfileDto
  ): Promise<ProfessionalProfile> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Check if professional profile already exists
    const existingProfile = await this.professionalProfileRepository.findOne({
      where: { userId },
    })
    if (existingProfile) {
      throw new BadRequestException('Professional profile already exists')
    }

    // Validate specializations (service categories)
    const { specializationIds, ...profileData } = createProfessionalProfileDto
    const categories = await this.serviceCategoryRepository.find({
      where: { id: In(specializationIds), isActive: true },
    })

    if (categories.length !== specializationIds.length) {
      throw new BadRequestException('One or more invalid service category IDs provided')
    }

    // Create professional profile
    const professionalProfile = this.professionalProfileRepository.create({
      userId,
      ...profileData,
      specializations: categories,
    })

    const savedProfile = await this.professionalProfileRepository.save(professionalProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId,
      action: 'professional_profile_created',
      resource: 'professional_profile',
      metadata: {
        profileId: savedProfile.id,
        professionalType: savedProfile.professionalType,
      },
    })

    return savedProfile
  }

  async updateProfessionalProfile(
    professionalId: string,
    updateProfessionalProfileDto: UpdateProfessionalProfileDto,
    requestingUserId: string
  ): Promise<ProfessionalProfile> {
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId },
      relations: ['specializations'],
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    // Check authorization - users can only update their own professional profile
    if (professionalProfile.userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own professional profile')
    }

    // Handle specialization updates if provided
    const { specializationIds, ...profileData } = updateProfessionalProfileDto

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

    const updatedProfile = await this.professionalProfileRepository.save(professionalProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: professionalProfile.userId,
      action: 'professional_profile_updated',
      resource: 'professional_profile',
      metadata: {
        profileId: professionalProfile.id,
        updatedFields: Object.keys(updateProfessionalProfileDto),
      },
    })

    return updatedProfile
  }

  async getProfessionalProfile(professionalId: string): Promise<ProfessionalProfile> {
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId },
      relations: ['specializations', 'certificates', 'portfolio', 'user'],
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    return professionalProfile
  }

  // Certificate Management

  async uploadCertificate(
    professionalId: string,
    file: Express.Multer.File,
    uploadCertificateDto: UploadCertificateDto,
    requestingUserId: string
  ): Promise<Certificate> {
    // Check if professional profile exists
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    // Check authorization - users can only upload certificates to their own profile
    if (professionalProfile.userId !== requestingUserId) {
      throw new ForbiddenException('You can only upload certificates to your own profile')
    }

    // Validate file type (PDF, images)
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed')
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB')
    }

    try {
      // Upload to S3
      const fileUrl = await this.s3Service.uploadCertificate(professionalId, file)

      // Create certificate record
      const certificate = await this.certificateRepository.save({
        professionalId,
        name: uploadCertificateDto.name,
        issuer: uploadCertificateDto.issuer,
        issueDate: new Date(uploadCertificateDto.issueDate),
        expiryDate: uploadCertificateDto.expiryDate
          ? new Date(uploadCertificateDto.expiryDate)
          : undefined,
        fileUrl,
        verifiedByAdmin: false,
      })

      // Log activity
      await this.activityLogService.logActivity({
        userId: professionalProfile.userId,
        action: 'certificate_uploaded',
        resource: 'certificate',
        metadata: {
          certificateId: certificate.id,
          professionalId,
          name: uploadCertificateDto.name,
        },
      })

      return certificate
    } catch (error) {
      throw new BadRequestException('Failed to upload certificate')
    }
  }

  async getCertificates(professionalId: string): Promise<Certificate[]> {
    // Check if professional profile exists
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    // Get all certificates for the professional
    const certificates = await this.certificateRepository.find({
      where: { professionalId },
      order: { createdAt: 'DESC' },
    })

    return certificates
  }

  // Portfolio Management (Artist-specific)

  async uploadPortfolioImage(
    artistId: string,
    file: Express.Multer.File,
    uploadPortfolioImageDto: UploadPortfolioImageDto,
    requestingUserId: string
  ): Promise<PortfolioItem> {
    // Check if professional profile exists and is an artist
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: artistId },
      relations: ['portfolio'],
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    if (professionalProfile.professionalType !== ProfessionalType.ARTIST) {
      throw new BadRequestException('Portfolio management is only available for artists')
    }

    // Check authorization
    if (professionalProfile.userId !== requestingUserId) {
      throw new ForbiddenException('You can only upload portfolio images to your own profile')
    }

    // Check portfolio count (max 20)
    const currentCount = await this.portfolioItemRepository.count({
      where: { professionalId: artistId },
    })

    if (currentCount >= 20) {
      throw new BadRequestException('Maximum portfolio limit reached (20 images)')
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, and WebP are allowed')
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 10MB')
    }

    try {
      // Upload and optimize image with Sharp
      const { imageUrl, thumbnailUrl } = await this.s3Service.uploadOptimizedPortfolioImage(
        artistId,
        file
      )

      // Calculate display order (append to end)
      const maxOrder = await this.portfolioItemRepository
        .createQueryBuilder('portfolio')
        .where('portfolio.professionalId = :artistId', { artistId })
        .select('MAX(portfolio.displayOrder)', 'maxOrder')
        .getRawOne()

      const displayOrder = (maxOrder?.maxOrder ?? -1) + 1

      // Create portfolio item record
      const portfolioItem = await this.portfolioItemRepository.save({
        professionalId: artistId,
        imageUrl,
        thumbnailUrl,
        title: uploadPortfolioImageDto.title,
        description: uploadPortfolioImageDto.description,
        category: uploadPortfolioImageDto.category,
        completionDate: uploadPortfolioImageDto.completionDate
          ? new Date(uploadPortfolioImageDto.completionDate)
          : undefined,
        dimensions: uploadPortfolioImageDto.dimensions,
        materials: uploadPortfolioImageDto.materials,
        displayOrder,
      })

      // Log activity
      await this.activityLogService.logActivity({
        userId: professionalProfile.userId,
        action: 'portfolio_image_uploaded',
        resource: 'portfolio_item',
        metadata: {
          portfolioItemId: portfolioItem.id,
          artistId,
          title: uploadPortfolioImageDto.title,
        },
      })

      return portfolioItem
    } catch (error) {
      throw new BadRequestException('Failed to upload portfolio image')
    }
  }

  async deletePortfolioImage(
    artistId: string,
    imageId: string,
    requestingUserId: string
  ): Promise<{ message: string }> {
    // Check if professional profile exists and is an artist
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: artistId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    if (professionalProfile.professionalType !== ProfessionalType.ARTIST) {
      throw new BadRequestException('Portfolio management is only available for artists')
    }

    // Check authorization
    if (professionalProfile.userId !== requestingUserId) {
      throw new ForbiddenException('You can only delete portfolio images from your own profile')
    }

    // Find portfolio item
    const portfolioItem = await this.portfolioItemRepository.findOne({
      where: { id: imageId, professionalId: artistId },
    })

    if (!portfolioItem) {
      throw new NotFoundException('Portfolio item not found')
    }

    // Check minimum count (min 3 after deletion)
    const currentCount = await this.portfolioItemRepository.count({
      where: { professionalId: artistId },
    })

    if (currentCount <= 3) {
      throw new BadRequestException('Cannot delete portfolio image. Minimum 3 images required')
    }

    try {
      // Delete images from S3
      await this.s3Service.deleteFile(portfolioItem.imageUrl)
      await this.s3Service.deleteFile(portfolioItem.thumbnailUrl)

      // Delete portfolio item record
      await this.portfolioItemRepository.remove(portfolioItem)

      // Log activity
      await this.activityLogService.logActivity({
        userId: professionalProfile.userId,
        action: 'portfolio_image_deleted',
        resource: 'portfolio_item',
        metadata: {
          portfolioItemId: imageId,
          artistId,
        },
      })

      return { message: 'Portfolio image deleted successfully' }
    } catch (error) {
      throw new BadRequestException('Failed to delete portfolio image')
    }
  }

  async getPortfolio(artistId: string): Promise<PortfolioItem[]> {
    // Check if professional profile exists
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: artistId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    if (professionalProfile.professionalType !== ProfessionalType.ARTIST) {
      throw new BadRequestException('Portfolio is only available for artists')
    }

    // Get all portfolio items ordered by display order
    const portfolioItems = await this.portfolioItemRepository.find({
      where: { professionalId: artistId },
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    })

    return portfolioItems
  }

  async updatePortfolioImage(
    artistId: string,
    imageId: string,
    updatePortfolioImageDto: UpdatePortfolioImageDto,
    requestingUserId: string
  ): Promise<PortfolioItem> {
    // Check if professional profile exists and is an artist
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: artistId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    if (professionalProfile.professionalType !== ProfessionalType.ARTIST) {
      throw new BadRequestException('Portfolio management is only available for artists')
    }

    // Check authorization
    if (professionalProfile.userId !== requestingUserId) {
      throw new ForbiddenException('You can only update portfolio images in your own profile')
    }

    // Find portfolio item
    const portfolioItem = await this.portfolioItemRepository.findOne({
      where: { id: imageId, professionalId: artistId },
    })

    if (!portfolioItem) {
      throw new NotFoundException('Portfolio item not found')
    }

    // Update fields
    if (updatePortfolioImageDto.title !== undefined) {
      portfolioItem.title = updatePortfolioImageDto.title
    }
    if (updatePortfolioImageDto.description !== undefined) {
      portfolioItem.description = updatePortfolioImageDto.description
    }
    if (updatePortfolioImageDto.category !== undefined) {
      portfolioItem.category = updatePortfolioImageDto.category
    }
    if (updatePortfolioImageDto.completionDate !== undefined) {
      portfolioItem.completionDate = new Date(updatePortfolioImageDto.completionDate)
    }
    if (updatePortfolioImageDto.dimensions !== undefined) {
      portfolioItem.dimensions = updatePortfolioImageDto.dimensions
    }
    if (updatePortfolioImageDto.materials !== undefined) {
      portfolioItem.materials = updatePortfolioImageDto.materials
    }

    const updatedPortfolioItem = await this.portfolioItemRepository.save(portfolioItem)

    // Log activity
    await this.activityLogService.logActivity({
      userId: professionalProfile.userId,
      action: 'portfolio_image_updated',
      resource: 'portfolio_item',
      metadata: {
        portfolioItemId: imageId,
        artistId,
        updatedFields: Object.keys(updatePortfolioImageDto),
      },
    })

    return updatedPortfolioItem
  }

  async updateProfessionalLocation(
    professionalId: string,
    updateLocationDto: UpdateLocationDto,
    requestingUserId: string
  ): Promise<ProfessionalProfile> {
    // Check if professional profile exists
    const professionalProfile = await this.professionalProfileRepository.findOne({
      where: { id: professionalId },
    })

    if (!professionalProfile) {
      throw new NotFoundException('Professional profile not found')
    }

    // Check authorization - only the professional can update their own location
    if (professionalProfile.userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own location')
    }

    // Update current location if latitude and longitude are provided
    if (updateLocationDto.latitude !== undefined && updateLocationDto.longitude !== undefined) {
      professionalProfile.currentLocation = {
        latitude: updateLocationDto.latitude,
        longitude: updateLocationDto.longitude,
      }
    }

    // Update service address if address is provided
    if (updateLocationDto.address) {
      // If we have existing service address, update it
      if (professionalProfile.serviceAddress) {
        professionalProfile.serviceAddress = {
          ...professionalProfile.serviceAddress,
          address: updateLocationDto.address,
          latitude: updateLocationDto.latitude || professionalProfile.serviceAddress.latitude,
          longitude: updateLocationDto.longitude || professionalProfile.serviceAddress.longitude,
        }
      } else {
        // Create new service address
        professionalProfile.serviceAddress = {
          address: updateLocationDto.address,
          latitude: updateLocationDto.latitude || 0,
          longitude: updateLocationDto.longitude || 0,
        }
      }
    }

    // Update service radius if provided
    if (updateLocationDto.serviceRadius !== undefined) {
      professionalProfile.serviceRadius = updateLocationDto.serviceRadius
    }

    const updatedProfile = await this.professionalProfileRepository.save(professionalProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: professionalProfile.userId,
      action: 'professional_location_updated',
      resource: 'professional_profile',
      metadata: {
        professionalId,
        hasCurrentLocation: !!updatedProfile.currentLocation,
        hasServiceAddress: !!updatedProfile.serviceAddress,
        serviceRadius: updatedProfile.serviceRadius,
      },
    })

    return updatedProfile
  }
}
