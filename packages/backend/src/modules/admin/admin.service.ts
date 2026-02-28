import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Booking } from '../../entities/booking.entity'
import { Payment } from '../../entities/payment.entity'
import { Dispute } from '../../entities/dispute.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import {
  UserRole,
  BookingStatus,
  PaymentStatus,
  ProfessionalType,
  VerificationStatus,
  DisputeStatus,
  ApprovalStatus,
} from '../../common/enums'
import {
  ListUsersDto,
  ListProvidersDto,
  ListProfessionalsDto,
  SuspendUserDto,
  ListCategoriesDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  GetPlatformStatsDto,
  PlatformStatsResponseDto,
  ListDisputesDto,
  ResolveDisputeDto,
  ListPendingPortfoliosDto,
  ApprovePortfolioDto,
  RejectPortfolioDto,
} from './dto'

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(ProfessionalProfile)
    private readonly professionalProfileRepository: Repository<ProfessionalProfile>,
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepository: Repository<SupplierProfile>,
    @InjectRepository(ServiceCategory)
    private readonly serviceCategoryRepository: Repository<ServiceCategory>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Dispute)
    private readonly disputeRepository: Repository<Dispute>,
    @InjectRepository(PortfolioItem)
    private readonly portfolioItemRepository: Repository<PortfolioItem>,
    private readonly activityLogService: ActivityLogService
  ) {}

  async listUsers(filters: ListUsersDto) {
    const { role, search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .select([
        'user.id',
        'user.email',
        'user.role',
        'user.isEmailVerified',
        'user.isSuspended',
        'user.createdAt',
        'user.updatedAt',
        'profile.id',
        'profile.firstName',
        'profile.lastName',
        'profile.phone',
      ])

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role })
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR profile.firstName ILIKE :search OR profile.lastName ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount()

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async listProviders(filters: ListProvidersDto) {
    const { search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const queryBuilder = this.supplierProfileRepository
      .createQueryBuilder('supplier')
      .leftJoinAndSelect('supplier.user', 'user')
      .select([
        'supplier.id',
        'supplier.userId',
        'supplier.companyName',
        'supplier.contactEmail',
        'supplier.contactPhone',
        'supplier.verificationStatus',
        'supplier.rating',
        'supplier.totalOrders',
        'supplier.createdAt',
        'user.id',
        'user.email',
        'user.isSuspended',
      ])

    if (search) {
      queryBuilder.andWhere(
        '(supplier.companyName ILIKE :search OR supplier.contactEmail ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    const [providers, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('supplier.createdAt', 'DESC')
      .getManyAndCount()

    return {
      data: providers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async listProfessionals(filters: ListProfessionalsDto) {
    const { professionalType, search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const queryBuilder = this.professionalProfileRepository
      .createQueryBuilder('professional')
      .leftJoinAndSelect('professional.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('professional.specializations', 'specializations')
      .select([
        'professional.id',
        'professional.userId',
        'professional.professionalType',
        'professional.businessName',
        'professional.experienceYears',
        'professional.hourlyRate',
        'professional.verificationStatus',
        'professional.isAvailable',
        'professional.rating',
        'professional.totalJobs',
        'professional.createdAt',
        'user.id',
        'user.email',
        'user.isSuspended',
        'profile.id',
        'profile.firstName',
        'profile.lastName',
        'profile.phone',
        'specializations.id',
        'specializations.name',
      ])

    if (professionalType) {
      queryBuilder.andWhere('professional.professionalType = :professionalType', {
        professionalType,
      })
    }

    if (search) {
      queryBuilder.andWhere(
        '(professional.businessName ILIKE :search OR profile.firstName ILIKE :search OR profile.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    const [professionals, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('professional.createdAt', 'DESC')
      .getManyAndCount()

    return {
      data: professionals,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async suspendUser(userId: string, suspendUserDto: SuspendUserDto, adminId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Prevent admins from suspending themselves
    if (userId === adminId) {
      throw new BadRequestException('You cannot suspend your own account')
    }

    // Prevent suspending other admins
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot suspend admin accounts')
    }

    user.isSuspended = suspendUserDto.isSuspended

    const updatedUser = await this.userRepository.save(user)

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: suspendUserDto.isSuspended ? 'user_suspended' : 'user_unsuspended',
      resource: 'user',
      resourceId: userId,
      metadata: {
        reason: suspendUserDto.reason,
        targetUserId: userId,
        targetUserEmail: user.email,
      },
    })

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      isSuspended: updatedUser.isSuspended,
    }
  }

  async deleteUser(userId: string, adminId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'professionalProfile', 'supplierProfile'],
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Prevent admins from deleting themselves
    if (userId === adminId) {
      throw new BadRequestException('You cannot delete your own account')
    }

    // Prevent deleting other admins
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin accounts')
    }

    // Log activity before deletion
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'user_deleted',
      resource: 'user',
      resourceId: userId,
      metadata: {
        targetUserId: userId,
        targetUserEmail: user.email,
        targetUserRole: user.role,
      },
    })

    // Soft delete by removing the user (cascade will handle related entities)
    await this.userRepository.remove(user)

    return {
      message: 'User deleted successfully',
      deletedUserId: userId,
    }
  }

  // Category Management Methods

  async listCategories(filters: ListCategoriesDto) {
    const { isTechnical, search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const queryBuilder = this.serviceCategoryRepository
      .createQueryBuilder('category')
      .select([
        'category.id',
        'category.name',
        'category.nameTranslations',
        'category.description',
        'category.isTechnical',
        'category.isActive',
        'category.createdAt',
        'category.updatedAt',
      ])

    if (isTechnical !== undefined) {
      queryBuilder.andWhere('category.isTechnical = :isTechnical', { isTechnical })
    }

    if (search) {
      queryBuilder.andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', {
        search: `%${search}%`,
      })
    }

    const [categories, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('category.name', 'ASC')
      .getManyAndCount()

    return {
      data: categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getCategory(categoryId: string) {
    const category = await this.serviceCategoryRepository.findOne({
      where: { id: categoryId },
    })

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    return category
  }

  async createCategory(createDto: CreateCategoryDto, adminId: string) {
    // Check if category name already exists
    const existingCategory = await this.serviceCategoryRepository.findOne({
      where: { name: createDto.name },
    })

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists')
    }

    // Validate nameTranslations has both es and en
    if (!createDto.nameTranslations.es || !createDto.nameTranslations.en) {
      throw new BadRequestException(
        'Name translations must include both Spanish (es) and English (en)'
      )
    }

    const category = this.serviceCategoryRepository.create({
      name: createDto.name,
      nameTranslations: createDto.nameTranslations,
      description: createDto.description,
      isTechnical: createDto.isTechnical,
      isActive: true,
    })

    const savedCategory = await this.serviceCategoryRepository.save(category)

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'category_created',
      resource: 'service_category',
      resourceId: savedCategory.id,
      metadata: {
        categoryName: savedCategory.name,
        isTechnical: savedCategory.isTechnical,
      },
    })

    return savedCategory
  }

  async updateCategory(categoryId: string, updateDto: UpdateCategoryDto, adminId: string) {
    const category = await this.serviceCategoryRepository.findOne({
      where: { id: categoryId },
    })

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    // Check if new name conflicts with existing category
    if (updateDto.name && updateDto.name !== category.name) {
      const existingCategory = await this.serviceCategoryRepository.findOne({
        where: { name: updateDto.name },
      })

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists')
      }
    }

    // Validate nameTranslations if provided
    if (updateDto.nameTranslations) {
      if (!updateDto.nameTranslations.es || !updateDto.nameTranslations.en) {
        throw new BadRequestException(
          'Name translations must include both Spanish (es) and English (en)'
        )
      }
    }

    // Update fields
    if (updateDto.name !== undefined) {
      category.name = updateDto.name
    }
    if (updateDto.nameTranslations !== undefined) {
      category.nameTranslations = updateDto.nameTranslations
    }
    if (updateDto.description !== undefined) {
      category.description = updateDto.description
    }
    if (updateDto.isTechnical !== undefined) {
      category.isTechnical = updateDto.isTechnical
    }

    const updatedCategory = await this.serviceCategoryRepository.save(category)

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'category_updated',
      resource: 'service_category',
      resourceId: categoryId,
      metadata: {
        categoryName: updatedCategory.name,
        updates: updateDto,
      },
    })

    return updatedCategory
  }

  async deleteCategory(categoryId: string, adminId: string) {
    const category = await this.serviceCategoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.professionals', 'professionals')
      .where('category.id = :categoryId', { categoryId })
      .getOne()

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    // Check if category is in use by professionals
    if (category.professionals && category.professionals.length > 0) {
      // Soft delete by setting isActive to false
      category.isActive = false
      await this.serviceCategoryRepository.save(category)

      // Log activity
      await this.activityLogService.logActivity({
        userId: adminId,
        action: 'category_deactivated',
        resource: 'service_category',
        resourceId: categoryId,
        metadata: {
          categoryName: category.name,
          reason: 'Category is in use by professionals',
          professionalsCount: category.professionals.length,
        },
      })

      return {
        message: 'Category deactivated successfully (in use by professionals)',
        categoryId,
        isActive: false,
      }
    }

    // Hard delete if not in use
    await this.serviceCategoryRepository.remove(category)

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'category_deleted',
      resource: 'service_category',
      resourceId: categoryId,
      metadata: {
        categoryName: category.name,
      },
    })

    return {
      message: 'Category deleted successfully',
      categoryId,
    }
  }

  // Platform Statistics Methods

  async getPlatformStats(
    filters: GetPlatformStatsDto,
    adminId: string
  ): Promise<PlatformStatsResponseDto> {
    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'platform_stats_accessed',
      resource: 'admin_stats',
      resourceId: 'platform',
      metadata: {
        filters,
      },
    })

    // Calculate user statistics by role
    const userStats = await this.calculateUserStats()

    // Calculate booking statistics by status
    const bookingStats = await this.calculateBookingStats()

    // Calculate revenue statistics
    const revenueStats = await this.calculateRevenueStats()

    // Calculate professional statistics (with optional type filter)
    const professionalStats = await this.calculateProfessionalStats(filters.professionalType)

    // Calculate dashboard metrics
    const dashboardMetrics = await this.calculateDashboardMetrics()

    return {
      totalUsers: userStats,
      totalBookings: bookingStats,
      totalRevenue: revenueStats,
      professionalStats,
      dashboardMetrics,
    }
  }

  private async calculateUserStats() {
    const userCounts = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany()

    const byRole = {
      user: 0,
      professional: 0,
      provider: 0,
      supplier: 0,
      admin: 0,
    }

    let total = 0
    for (const row of userCounts) {
      const count = parseInt(row.count, 10)
      total += count
      const role = row.role as keyof typeof byRole
      if (role in byRole) {
        byRole[role] = count
      }
    }

    return {
      total,
      byRole,
    }
  }

  private async calculateBookingStats() {
    const bookingCounts = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('booking.status')
      .getRawMany()

    const byStatus = {
      pending: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
      disputed: 0,
      resolved: 0,
    }

    let total = 0
    for (const row of bookingCounts) {
      const count = parseInt(row.count, 10)
      total += count
      // Map database status to camelCase
      if (row.status === 'in_progress') {
        byStatus.inProgress = count
      } else {
        const statusKey = row.status as keyof typeof byStatus
        if (statusKey in byStatus) {
          byStatus[statusKey] = count
        }
      }
    }

    return {
      total,
      byStatus,
    }
  }

  private async calculateRevenueStats() {
    // Calculate total revenue from completed bookings
    const revenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin('payment.booking', 'booking')
      .select('SUM(payment.amount)', 'totalRevenue')
      .addSelect('COUNT(booking.id)', 'completedBookings')
      .addSelect('AVG(payment.amount)', 'averageValue')
      .where('booking.status = :status', { status: BookingStatus.COMPLETED })
      .andWhere('payment.status = :paymentStatus', { paymentStatus: PaymentStatus.CAPTURED })
      .getRawOne()

    const totalRevenue = parseFloat(revenueResult?.totalRevenue || '0')
    const averageValue = parseFloat(revenueResult?.averageValue || '0')

    return {
      totalRevenue,
      completedBookingsRevenue: totalRevenue,
      averageBookingValue: averageValue,
      currency: 'MXN',
    }
  }

  private async calculateProfessionalStats(professionalType?: ProfessionalType) {
    const queryBuilder = this.professionalProfileRepository.createQueryBuilder('professional')

    // Apply professional type filter if provided
    if (professionalType) {
      queryBuilder.where('professional.professionalType = :professionalType', {
        professionalType,
      })
    }

    // Get total count
    const total = await queryBuilder.getCount()

    // Get counts by type
    const typeCounts = await this.professionalProfileRepository
      .createQueryBuilder('professional')
      .select('professional.professionalType', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('professional.professionalType')
      .getRawMany()

    const byType = {
      handyman: 0,
      artist: 0,
    }

    for (const row of typeCounts) {
      const count = parseInt(row.count, 10)
      const type = row.type as keyof typeof byType
      if (type in byType) {
        byType[type] = count
      }
    }

    // Get verified count
    const verifiedQuery = this.professionalProfileRepository
      .createQueryBuilder('professional')
      .where('professional.verificationStatus = :status', {
        status: VerificationStatus.VERIFIED,
      })

    if (professionalType) {
      verifiedQuery.andWhere('professional.professionalType = :professionalType', {
        professionalType,
      })
    }

    const verified = await verifiedQuery.getCount()

    // Get available count
    const availableQuery = this.professionalProfileRepository
      .createQueryBuilder('professional')
      .where('professional.isAvailable = :isAvailable', { isAvailable: true })

    if (professionalType) {
      availableQuery.andWhere('professional.professionalType = :professionalType', {
        professionalType,
      })
    }

    const available = await availableQuery.getCount()

    // Calculate average rating
    const ratingResult = await this.professionalProfileRepository
      .createQueryBuilder('professional')
      .select('AVG(professional.rating)', 'averageRating')
      .where('professional.rating > 0')
      .getRawOne()

    const averageRating = parseFloat(ratingResult?.averageRating || '0')

    return {
      total,
      byType,
      verified,
      available,
      averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
    }
  }

  private async calculateDashboardMetrics() {
    // Active users: users who logged in within last 30 days
    // For now, we'll count users created in last 30 days as a proxy
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :date', { date: thirtyDaysAgo })
      .getCount()

    // Active bookings: bookings in pending, confirmed, or in_progress status
    const activeBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
      .getCount()

    // Recent bookings: bookings created in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.createdAt >= :date', { date: sevenDaysAgo })
      .getCount()

    // Active users: users with at least one booking in last 30 days
    const activeUsersResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('COUNT(DISTINCT booking.userId)', 'count')
      .where('booking.createdAt >= :date', { date: thirtyDaysAgo })
      .getRawOne()

    const activeUsers = parseInt(activeUsersResult?.count || '0', 10)

    return {
      activeUsers,
      activeBookings,
      recentBookings,
      recentUsers,
    }
  }

  // Dispute Management Methods

  async listDisputes(filters: ListDisputesDto, adminId: string) {
    const { status, issueType, startDate, endDate, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const queryBuilder = this.disputeRepository
      .createQueryBuilder('dispute')
      .leftJoinAndSelect('dispute.booking', 'booking')
      .leftJoinAndSelect('dispute.reporter', 'reporter')
      .leftJoinAndSelect('reporter.profile', 'reporterProfile')
      .leftJoinAndSelect('dispute.reportedUser', 'reportedUser')
      .leftJoinAndSelect('reportedUser.profile', 'reportedUserProfile')
      .leftJoinAndSelect('dispute.resolver', 'resolver')
      .select([
        'dispute.id',
        'dispute.bookingId',
        'dispute.reporterId',
        'dispute.reportedUserId',
        'dispute.issueType',
        'dispute.description',
        'dispute.photos',
        'dispute.status',
        'dispute.resolutionNotes',
        'dispute.adminAction',
        'dispute.resolvedBy',
        'dispute.resolvedAt',
        'dispute.createdAt',
        'dispute.updatedAt',
        'booking.id',
        'booking.serviceCategory',
        'booking.scheduledDate',
        'booking.status',
        'reporter.id',
        'reporter.email',
        'reporterProfile.id',
        'reporterProfile.firstName',
        'reporterProfile.lastName',
        'reportedUser.id',
        'reportedUser.email',
        'reportedUserProfile.id',
        'reportedUserProfile.firstName',
        'reportedUserProfile.lastName',
        'resolver.id',
        'resolver.email',
      ])

    // Apply filters
    if (status) {
      queryBuilder.andWhere('dispute.status = :status', { status })
    }

    if (issueType) {
      queryBuilder.andWhere('dispute.issueType = :issueType', { issueType })
    }

    if (startDate) {
      queryBuilder.andWhere('dispute.createdAt >= :startDate', { startDate: new Date(startDate) })
    }

    if (endDate) {
      queryBuilder.andWhere('dispute.createdAt <= :endDate', { endDate: new Date(endDate) })
    }

    const [disputes, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('dispute.createdAt', 'DESC')
      .getManyAndCount()

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'disputes_listed',
      resource: 'dispute',
      resourceId: 'list',
      metadata: {
        filters,
        resultCount: disputes.length,
      },
    })

    return {
      data: disputes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getDisputeDetails(disputeId: string, adminId: string) {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
      relations: [
        'booking',
        'booking.user',
        'booking.user.profile',
        'booking.professional',
        'booking.professional.user',
        'booking.professional.user.profile',
        'reporter',
        'reporter.profile',
        'reportedUser',
        'reportedUser.profile',
        'resolver',
      ],
    })

    if (!dispute) {
      throw new NotFoundException('Dispute not found')
    }

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'dispute_viewed',
      resource: 'dispute',
      resourceId: disputeId,
      metadata: {
        disputeStatus: dispute.status,
        issueType: dispute.issueType,
      },
    })

    return dispute
  }

  async resolveDispute(disputeId: string, resolveDto: ResolveDisputeDto, adminId: string) {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
      relations: ['booking', 'reporter', 'reportedUser'],
    })

    if (!dispute) {
      throw new NotFoundException('Dispute not found')
    }

    // Check if dispute is already resolved or closed
    if (dispute.status === DisputeStatus.RESOLVED || dispute.status === DisputeStatus.CLOSED) {
      throw new BadRequestException('Dispute is already resolved or closed')
    }

    // Update dispute
    dispute.status = DisputeStatus.RESOLVED
    dispute.resolutionNotes = resolveDto.resolutionNotes
    if (resolveDto.adminAction) {
      dispute.adminAction = resolveDto.adminAction
    }
    dispute.resolvedBy = adminId
    dispute.resolvedAt = new Date()

    const resolvedDispute = await this.disputeRepository.save(dispute)

    // Update booking status to RESOLVED if it was DISPUTED
    if (dispute.booking && dispute.booking.status === BookingStatus.DISPUTED) {
      dispute.booking.status = BookingStatus.RESOLVED
      await this.bookingRepository.save(dispute.booking)
    }

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'dispute_resolved',
      resource: 'dispute',
      resourceId: disputeId,
      metadata: {
        bookingId: dispute.bookingId,
        issueType: dispute.issueType,
        resolutionNotes: resolveDto.resolutionNotes,
        adminAction: resolveDto.adminAction,
      },
    })

    return resolvedDispute
  }

  // Portfolio Approval Methods

  async listPendingPortfolios(filters: ListPendingPortfoliosDto, adminId: string) {
    const { search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const queryBuilder = this.portfolioItemRepository
      .createQueryBuilder('portfolio')
      .leftJoinAndSelect('portfolio.professional', 'professional')
      .leftJoinAndSelect('professional.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .select([
        'portfolio.id',
        'portfolio.professionalId',
        'portfolio.imageUrl',
        'portfolio.thumbnailUrl',
        'portfolio.title',
        'portfolio.description',
        'portfolio.category',
        'portfolio.completionDate',
        'portfolio.dimensions',
        'portfolio.materials',
        'portfolio.approvalStatus',
        'portfolio.createdAt',
        'professional.id',
        'professional.businessName',
        'professional.professionalType',
        'user.id',
        'user.email',
        'profile.id',
        'profile.firstName',
        'profile.lastName',
      ])
      .where('portfolio.approvalStatus = :status', { status: ApprovalStatus.PENDING })

    if (search) {
      queryBuilder.andWhere(
        '(portfolio.title ILIKE :search OR portfolio.category ILIKE :search OR professional.businessName ILIKE :search OR profile.firstName ILIKE :search OR profile.lastName ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    const [portfolios, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('portfolio.createdAt', 'ASC')
      .getManyAndCount()

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'pending_portfolios_listed',
      resource: 'portfolio_item',
      resourceId: 'list',
      metadata: {
        filters,
        resultCount: portfolios.length,
      },
    })

    return {
      data: portfolios,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async approvePortfolio(portfolioId: string, approveDto: ApprovePortfolioDto, adminId: string) {
    const portfolio = await this.portfolioItemRepository.findOne({
      where: { id: portfolioId },
      relations: ['professional', 'professional.user', 'professional.user.profile'],
    })

    if (!portfolio) {
      throw new NotFoundException('Portfolio item not found')
    }

    // Check if already approved or rejected
    if (portfolio.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Portfolio item is already ${portfolio.approvalStatus}`)
    }

    // Update portfolio
    portfolio.approvalStatus = ApprovalStatus.APPROVED
    portfolio.reviewedBy = adminId
    portfolio.reviewedAt = new Date()
    portfolio.rejectionReason = undefined // Clear any previous rejection reason

    const approvedPortfolio = await this.portfolioItemRepository.save(portfolio)

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'portfolio_approved',
      resource: 'portfolio_item',
      resourceId: portfolioId,
      metadata: {
        portfolioTitle: portfolio.title,
        professionalId: portfolio.professionalId,
        notes: approveDto.notes,
      },
    })

    return approvedPortfolio
  }

  async rejectPortfolio(portfolioId: string, rejectDto: RejectPortfolioDto, adminId: string) {
    const portfolio = await this.portfolioItemRepository.findOne({
      where: { id: portfolioId },
      relations: ['professional', 'professional.user', 'professional.user.profile'],
    })

    if (!portfolio) {
      throw new NotFoundException('Portfolio item not found')
    }

    // Check if already approved or rejected
    if (portfolio.approvalStatus !== ApprovalStatus.PENDING) {
      throw new BadRequestException(`Portfolio item is already ${portfolio.approvalStatus}`)
    }

    // Update portfolio
    portfolio.approvalStatus = ApprovalStatus.REJECTED
    portfolio.rejectionReason = rejectDto.reason
    portfolio.reviewedBy = adminId
    portfolio.reviewedAt = new Date()

    const rejectedPortfolio = await this.portfolioItemRepository.save(portfolio)

    // Log activity
    await this.activityLogService.logActivity({
      userId: adminId,
      action: 'portfolio_rejected',
      resource: 'portfolio_item',
      resourceId: portfolioId,
      metadata: {
        portfolioTitle: portfolio.title,
        professionalId: portfolio.professionalId,
        rejectionReason: rejectDto.reason,
      },
    })

    return rejectedPortfolio
  }
}
