import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto'
import { BookingStatus, PaymentStatus } from '../../common/enums'
import { NotificationService } from '../notification/notification.service'
import { NotificationType, NotificationChannel } from '../../entities/notification.entity'
import { MessagingService } from '../messaging/messaging.service'

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(ProfessionalProfile)
    private readonly professionalRepository: Repository<ProfessionalProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => MessagingService))
    private readonly messagingService: MessagingService
  ) {}

  async createBooking(userId: string, createBookingDto: CreateBookingDto): Promise<Booking> {
    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Validate professional exists and is available
    const professional = await this.professionalRepository.findOne({
      where: { id: createBookingDto.professionalId },
    })

    if (!professional) {
      throw new NotFoundException('Professional not found')
    }

    if (!professional.isAvailable) {
      throw new BadRequestException('Professional is not available')
    }

    // Validate professional type matches
    if (professional.professionalType !== createBookingDto.professionalType) {
      throw new BadRequestException(
        `Professional type mismatch. Expected ${professional.professionalType}, got ${createBookingDto.professionalType}`
      )
    }

    // Validate artist-specific requirements
    if (createBookingDto.professionalType === 'artist' && !createBookingDto.projectDetails) {
      throw new BadRequestException('Project details are required for artist bookings')
    }

    // Check for scheduling conflicts
    await this.checkSchedulingConflict(
      createBookingDto.professionalId,
      createBookingDto.scheduledDate,
      createBookingDto.estimatedDuration
    )

    // Create booking
    const booking = this.bookingRepository.create({
      userId,
      professionalId: createBookingDto.professionalId,
      professionalType: createBookingDto.professionalType,
      serviceCategory: createBookingDto.serviceCategory,
      scheduledDate: createBookingDto.scheduledDate,
      estimatedDuration: createBookingDto.estimatedDuration,
      serviceAddress: createBookingDto.serviceAddress,
      description: createBookingDto.description,
      estimatedPrice: createBookingDto.estimatedPrice,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      projectDetails: createBookingDto.projectDetails,
      referenceImages: createBookingDto.referenceImages || [],
      progressPhotos: [],
    })

    const savedBooking = await this.bookingRepository.save(booking)

    // Requirement 11.1: Create messaging channel when booking is created
    try {
      await this.messagingService.createConversation(savedBooking.id)
    } catch (error) {
      console.error('Failed to create conversation for booking:', error)
    }

    // Requirement 5.2: Notify professional when booking is created
    await this.sendBookingCreatedNotification(savedBooking, user, professional)

    return savedBooking
  }

  /**
   * Check if there's a scheduling conflict for the professional
   * Requirement 5.5: Platform SHALL prevent overlapping bookings for the same professional
   */
  private async checkSchedulingConflict(
    professionalId: string,
    scheduledDate: Date,
    estimatedDuration: number
  ): Promise<void> {
    const scheduledTime = new Date(scheduledDate)
    const endTime = new Date(scheduledTime.getTime() + estimatedDuration * 60000)

    // Find bookings that overlap with the requested time slot
    // A booking overlaps if:
    // 1. It starts before the new booking ends AND
    // 2. It ends after the new booking starts
    const conflictingBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.professional_id = :professionalId', { professionalId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
      .andWhere(
        `(
          booking.scheduled_date < :endTime AND
          (booking.scheduled_date + (booking.estimated_duration || ' minutes')::interval) > :scheduledDate
        )`,
        {
          scheduledDate: scheduledTime,
          endTime,
        }
      )
      .getMany()

    if (conflictingBookings.length > 0) {
      throw new ConflictException('Professional has a conflicting booking at this time')
    }
  }

  async findById(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['user', 'professional'],
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    return booking
  }

  /**
   * Update booking status with state machine validation
   * Requirements 6.1, 6.3, 6.4, 6.7, 6.8
   */
  async updateBookingStatus(
    bookingId: string,
    updateStatusDto: UpdateBookingStatusDto
  ): Promise<Booking> {
    const booking = await this.findById(bookingId)

    // Validate state transition
    this.validateStatusTransition(booking.status, updateStatusDto.status)

    // Update status and related fields
    booking.status = updateStatusDto.status

    // Handle status-specific updates
    switch (updateStatusDto.status) {
      case BookingStatus.CONFIRMED:
        // Requirement 5.3: Send confirmation notification to user
        await this.sendBookingConfirmedNotification(booking)
        break

      case BookingStatus.REJECTED:
        // Requirement 5.4: Send rejection notification to user with alternatives
        await this.sendBookingRejectedNotification(booking)
        break

      case BookingStatus.IN_PROGRESS:
        booking.startedAt = new Date()
        // For artistic projects, allow progress photos
        if (booking.professionalType === 'artist' && updateStatusDto.progressPhotos) {
          this.addProgressPhotos(booking, updateStatusDto.progressPhotos)
        }
        break

      case BookingStatus.COMPLETED:
        booking.completedAt = new Date()
        // Requirement 11.5: Set conversation to read-only when booking is completed
        try {
          await this.messagingService.setConversationReadOnly(booking.id)
        } catch (error) {
          console.error('Failed to set conversation read-only:', error)
        }
        // Send rating request notification to user
        // Requirement 6.4: Platform SHALL request user rating when service is completed
        await this.sendRatingRequestNotification(booking)
        break

      case BookingStatus.CANCELLED:
        booking.cancelledAt = new Date()
        if (updateStatusDto.notes) {
          booking.cancellationReason = updateStatusDto.notes
        }
        break
    }

    const savedBooking = await this.bookingRepository.save(booking)

    // Requirement 6.2: Send status change notification to relevant parties
    await this.sendStatusChangeNotification(savedBooking, updateStatusDto.status)

    return savedBooking
  }

  /**
   * Validate state machine transitions
   * Requirement 6.1: Valid state transitions according to state machine
   */
  private validateStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): void {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
      ],
      [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.DISPUTED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.REJECTED]: [],
      [BookingStatus.DISPUTED]: [BookingStatus.RESOLVED],
      [BookingStatus.RESOLVED]: [],
    }

    const allowedTransitions = validTransitions[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      )
    }
  }

  /**
   * Add progress photos to artistic project booking
   * Requirements 6.7, 6.8: Progress photo upload and viewing for artistic projects
   */
  private addProgressPhotos(
    booking: Booking,
    newPhotos: Array<{ url: string; caption?: string }>
  ): void {
    if (!booking.progressPhotos) {
      booking.progressPhotos = []
    }

    const photosToAdd = newPhotos.map(photo => ({
      id: this.generatePhotoId(),
      url: photo.url,
      caption: photo.caption,
      uploadedAt: new Date(),
      uploadedBy: booking.professionalId,
    }))

    booking.progressPhotos.push(...photosToAdd)
  }

  /**
   * Generate unique photo ID
   */
  private generatePhotoId(): string {
    return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Upload progress photo for artistic project
   * Requirements 6.7, 6.8
   */
  async uploadProgressPhoto(
    bookingId: string,
    photoUrl: string,
    caption?: string
  ): Promise<Booking> {
    const booking = await this.findById(bookingId)

    // Validate booking is for an artist
    if (booking.professionalType !== 'artist') {
      throw new BadRequestException('Progress photos are only available for artistic projects')
    }

    // Validate booking is in progress
    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException('Progress photos can only be uploaded for in-progress bookings')
    }

    this.addProgressPhotos(booking, [{ url: photoUrl, caption }])

    return await this.bookingRepository.save(booking)
  }

  /**
   * Get bookings for a user with filtering
   * Requirement 6.5: Platform SHALL show active and past bookings separately
   */
  async getUserBookings(
    userId: string,
    filter: 'active' | 'past' | 'all' = 'all'
  ): Promise<Booking[]> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.professional', 'professional')
      .where('booking.user_id = :userId', { userId })
      .orderBy('booking.scheduled_date', 'DESC')

    // Apply filter based on booking status
    // Active: PENDING, CONFIRMED, IN_PROGRESS
    // Past: COMPLETED, CANCELLED, REJECTED, DISPUTED, RESOLVED
    if (filter === 'active') {
      queryBuilder.andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
    } else if (filter === 'past') {
      queryBuilder.andWhere('booking.status IN (:...statuses)', {
        statuses: [
          BookingStatus.COMPLETED,
          BookingStatus.CANCELLED,
          BookingStatus.REJECTED,
          BookingStatus.DISPUTED,
          BookingStatus.RESOLVED,
        ],
      })
    }

    return await queryBuilder.getMany()
  }

  /**
   * Get bookings for a professional with filtering
   * Requirement 6.5: Platform SHALL show active and past bookings separately
   */
  async getProfessionalBookings(
    professionalId: string,
    filter: 'active' | 'past' | 'all' = 'all'
  ): Promise<Booking[]> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.user', 'user')
      .where('booking.professional_id = :professionalId', { professionalId })
      .orderBy('booking.scheduled_date', 'DESC')

    // Apply filter based on booking status
    if (filter === 'active') {
      queryBuilder.andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS],
      })
    } else if (filter === 'past') {
      queryBuilder.andWhere('booking.status IN (:...statuses)', {
        statuses: [
          BookingStatus.COMPLETED,
          BookingStatus.CANCELLED,
          BookingStatus.REJECTED,
          BookingStatus.DISPUTED,
          BookingStatus.RESOLVED,
        ],
      })
    }

    return await queryBuilder.getMany()
  }

  /**
   * Cancel a booking with reason
   * Requirement 6.6: Platform SHALL record cancellation reason and notify professional
   */
  async cancelBooking(bookingId: string, reason: string): Promise<Booking> {
    const booking = await this.findById(bookingId)

    // Validate that booking can be cancelled
    // Only PENDING and CONFIRMED bookings can be cancelled
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot cancel booking with status ${booking.status}. Only PENDING or CONFIRMED bookings can be cancelled.`
      )
    }

    // Update booking status to CANCELLED
    booking.status = BookingStatus.CANCELLED
    booking.cancelledAt = new Date()
    booking.cancellationReason = reason

    const savedBooking = await this.bookingRepository.save(booking)

    // Requirement 6.6: Notify both parties about cancellation
    await this.sendBookingCancelledNotification(savedBooking)

    return savedBooking
  }

  /**
   * Send rating request notification to user when booking is completed
   * Requirement 6.4: Platform SHALL request user rating when service is completed
   */
  private async sendRatingRequestNotification(booking: Booking): Promise<void> {
    try {
      await this.notificationService.sendNotification({
        userId: booking.userId,
        type: NotificationType.BOOKING_COMPLETED,
        data: {
          bookingId: booking.id,
          professionalId: booking.professionalId,
          serviceCategory: booking.serviceCategory,
          professionalType: booking.professionalType,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    } catch (error) {
      // Log error but don't fail the booking completion
      console.error('Failed to send rating request notification:', error)
    }
  }

  /**
   * Send notification to professional when booking is created
   * Requirement 5.2: Platform SHALL send notification to professional when booking is created
   */
  private async sendBookingCreatedNotification(
    booking: Booking,
    user: User,
    professional: ProfessionalProfile
  ): Promise<void> {
    try {
      // Get user profile for name
      const userProfile = await this.userProfileRepository.findOne({
        where: { userId: user.id },
      })

      const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user.email

      await this.notificationService.sendNotification({
        userId: professional.userId,
        type: NotificationType.BOOKING_CREATED,
        data: {
          bookingId: booking.id,
          userName,
          serviceCategory: booking.serviceCategory,
          scheduledDate: booking.scheduledDate.toISOString(),
          address: booking.serviceAddress.address,
          professionalName: professional.businessName || 'Professional',
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      })
    } catch (error) {
      // Log error but don't fail the booking creation
      console.error('Failed to send booking created notification:', error)
    }
  }

  /**
   * Send notification to user when booking is confirmed
   * Requirement 5.3: Platform SHALL send confirmation notification to user when professional confirms
   */
  private async sendBookingConfirmedNotification(booking: Booking): Promise<void> {
    try {
      // Get professional details
      const professional = await this.professionalRepository.findOne({
        where: { id: booking.professionalId },
      })

      if (!professional) {
        console.error('Professional not found for booking confirmation notification')
        return
      }

      await this.notificationService.sendNotification({
        userId: booking.userId,
        type: NotificationType.BOOKING_CONFIRMED,
        data: {
          bookingId: booking.id,
          professionalName: professional.businessName || 'Professional',
          serviceCategory: booking.serviceCategory,
          scheduledDate: booking.scheduledDate.toISOString(),
          address: booking.serviceAddress.address,
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      })
    } catch (error) {
      console.error('Failed to send booking confirmed notification:', error)
    }
  }

  /**
   * Send notification to user when booking is rejected
   * Requirement 5.4: Platform SHALL send notification to user and suggest alternatives when professional rejects
   */
  private async sendBookingRejectedNotification(booking: Booking): Promise<void> {
    try {
      // Get professional details
      const professional = await this.professionalRepository.findOne({
        where: { id: booking.professionalId },
      })

      if (!professional) {
        console.error('Professional not found for booking rejection notification')
        return
      }

      // TODO: Implement alternative professional suggestions
      // This would require integration with the search service to find similar professionals

      await this.notificationService.sendNotification({
        userId: booking.userId,
        type: NotificationType.BOOKING_REJECTED,
        data: {
          bookingId: booking.id,
          professionalName: professional.businessName || 'Professional',
          serviceCategory: booking.serviceCategory,
          scheduledDate: booking.scheduledDate.toISOString(),
        },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      })
    } catch (error) {
      console.error('Failed to send booking rejected notification:', error)
    }
  }

  /**
   * Send notification when booking is cancelled
   * Requirement 6.6: Platform SHALL notify professional when booking is cancelled
   */
  private async sendBookingCancelledNotification(booking: Booking): Promise<void> {
    try {
      // Get professional details to get the user ID
      const professional = await this.professionalRepository.findOne({
        where: { id: booking.professionalId },
      })

      if (!professional) {
        console.error('Professional not found for booking cancellation notification')
        return
      }

      // Notify both user and professional
      const notifications = [
        // Notify professional
        this.notificationService.sendNotification({
          userId: professional.userId,
          type: NotificationType.BOOKING_CANCELLED,
          data: {
            bookingId: booking.id,
            serviceCategory: booking.serviceCategory,
            scheduledDate: booking.scheduledDate.toISOString(),
            cancellationReason: booking.cancellationReason || 'No reason provided',
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        }),
        // Notify user
        this.notificationService.sendNotification({
          userId: booking.userId,
          type: NotificationType.BOOKING_CANCELLED,
          data: {
            bookingId: booking.id,
            serviceCategory: booking.serviceCategory,
            scheduledDate: booking.scheduledDate.toISOString(),
            cancellationReason: booking.cancellationReason || 'No reason provided',
          },
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        }),
      ]

      await Promise.all(notifications)
    } catch (error) {
      console.error('Failed to send booking cancelled notification:', error)
    }
  }

  /**
   * Send notification when booking status changes
   * Requirement 6.2: Platform SHALL notify relevant parties when booking status changes
   */
  private async sendStatusChangeNotification(
    booking: Booking,
    newStatus: BookingStatus
  ): Promise<void> {
    try {
      // Determine notification type based on status
      let notificationType: NotificationType
      let notifyUser = false
      let notifyProfessional = false

      switch (newStatus) {
        case BookingStatus.CONFIRMED:
          notificationType = NotificationType.BOOKING_CONFIRMED
          notifyUser = true
          break

        case BookingStatus.REJECTED:
          notificationType = NotificationType.BOOKING_REJECTED
          notifyUser = true
          break

        case BookingStatus.IN_PROGRESS:
          notificationType = NotificationType.BOOKING_STARTED
          notifyUser = true
          break

        case BookingStatus.COMPLETED:
          notificationType = NotificationType.BOOKING_COMPLETED
          notifyUser = true
          break

        case BookingStatus.CANCELLED:
          notificationType = NotificationType.BOOKING_CANCELLED
          notifyUser = true
          notifyProfessional = true
          break

        default:
          // No notification for other status changes
          return
      }

      const notifications: Promise<any>[] = []

      // Get professional details for notification data
      const professional = await this.professionalRepository.findOne({
        where: { id: booking.professionalId },
      })

      const professionalName = professional?.businessName || 'Professional'

      if (notifyUser) {
        notifications.push(
          this.notificationService.sendNotification({
            userId: booking.userId,
            type: notificationType,
            data: {
              bookingId: booking.id,
              professionalName,
              serviceCategory: booking.serviceCategory,
              scheduledDate: booking.scheduledDate.toISOString(),
              address: booking.serviceAddress.address,
              cancellationReason: booking.cancellationReason,
            },
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          })
        )
      }

      if (notifyProfessional && professional) {
        notifications.push(
          this.notificationService.sendNotification({
            userId: professional.userId,
            type: notificationType,
            data: {
              bookingId: booking.id,
              serviceCategory: booking.serviceCategory,
              scheduledDate: booking.scheduledDate.toISOString(),
              cancellationReason: booking.cancellationReason,
            },
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          })
        )
      }

      await Promise.all(notifications)
    } catch (error) {
      console.error('Failed to send status change notification:', error)
    }
  }
}
