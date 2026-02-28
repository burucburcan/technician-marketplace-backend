import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Payment } from '../../entities/payment.entity'
import { Booking } from '../../entities/booking.entity'
import { PaymentStatus, BookingStatus } from '../../common/enums'
import { PaymentService } from './payment.service'

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name)
  private readonly ESCROW_HOLD_HOURS = 24 // Hold payment for 24 hours after completion

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Hold payment in escrow (capture from customer)
   */
  async holdPaymentInEscrow(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['payment'],
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    const payment = booking.payment
    if (!payment) {
      throw new Error('Payment not found for booking')
    }

    if (payment.status !== PaymentStatus.AUTHORIZED) {
      throw new Error('Payment must be authorized before holding in escrow')
    }

    // Capture the payment (move funds from customer to platform escrow)
    await this.paymentService.capturePayment(payment.stripePaymentId)

    this.logger.log(`Payment held in escrow for booking: ${bookingId}`)

    return payment
  }

  /**
   * Release payment from escrow to professional
   * Called after service completion and waiting period
   */
  async releasePaymentFromEscrow(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['payment', 'professional'],
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new Error('Booking must be completed before releasing payment')
    }

    const payment = booking.payment
    if (!payment || payment.status !== PaymentStatus.CAPTURED) {
      throw new Error('Payment not in escrow')
    }

    // Check if waiting period has passed
    const completedAt = booking.completedAt
    if (!completedAt) {
      throw new Error('Booking completion time not set')
    }

    const hoursSinceCompletion = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceCompletion < this.ESCROW_HOLD_HOURS) {
      throw new Error(`Payment is still in escrow hold period (${this.ESCROW_HOLD_HOURS} hours)`)
    }

    // Calculate commission and professional amount
    const commissionRate = this.configService.get<number>('PLATFORM_COMMISSION_RATE', 0.15)
    const platformFee = payment.amount * commissionRate
    const professionalAmount = payment.amount - platformFee

    // Update payment record
    payment.platformFee = platformFee
    payment.professionalAmount = professionalAmount
    await this.paymentRepository.save(payment)

    // Transfer to professional balance
    await this.paymentService['updateProfessionalBalance'](
      booking.professionalId,
      professionalAmount
    )

    this.logger.log(
      `Payment released from escrow: ${payment.id}, professional: ${booking.professionalId}, amount: ${professionalAmount}`
    )

    return {
      paymentId: payment.id,
      professionalAmount,
      platformFee,
      commissionRate,
    }
  }

  /**
   * Automatic escrow release job
   * Runs every hour to check for payments ready to be released
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processEscrowReleases() {
    this.logger.log('Running automatic escrow release job')

    try {
      // Find completed bookings with captured payments
      // where completion time is more than ESCROW_HOLD_HOURS ago
      const releaseThreshold = new Date()
      releaseThreshold.setHours(releaseThreshold.getHours() - this.ESCROW_HOLD_HOURS)

      const bookingsToRelease = await this.bookingRepository.find({
        where: {
          status: BookingStatus.COMPLETED,
          completedAt: LessThan(releaseThreshold),
          paymentStatus: PaymentStatus.CAPTURED,
        },
        relations: ['payment'],
      })

      this.logger.log(`Found ${bookingsToRelease.length} bookings ready for escrow release`)

      for (const booking of bookingsToRelease) {
        try {
          await this.releasePaymentFromEscrow(booking.id)
          this.logger.log(`Auto-released payment for booking: ${booking.id}`)
        } catch (error) {
          this.logger.error(`Failed to auto-release payment for booking ${booking.id}`, error)
        }
      }
    } catch (error) {
      this.logger.error('Error in automatic escrow release job', error)
    }
  }

  /**
   * Get escrow status for a booking
   */
  async getEscrowStatus(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['payment'],
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    const payment = booking.payment
    if (!payment) {
      return {
        inEscrow: false,
        status: 'no_payment',
      }
    }

    const inEscrow = payment.status === PaymentStatus.CAPTURED
    let releaseTime = null
    let canRelease = false

    if (inEscrow && booking.completedAt) {
      releaseTime = new Date(booking.completedAt)
      releaseTime.setHours(releaseTime.getHours() + this.ESCROW_HOLD_HOURS)

      canRelease = Date.now() >= releaseTime.getTime()
    }

    return {
      inEscrow,
      paymentStatus: payment.status,
      bookingStatus: booking.status,
      completedAt: booking.completedAt,
      releaseTime,
      canRelease,
      amount: payment.amount,
      currency: payment.currency,
    }
  }

  /**
   * Calculate commission for a payment amount
   */
  calculateCommission(amount: number): {
    platformFee: number
    professionalAmount: number
    commissionRate: number
  } {
    const commissionRate = this.configService.get<number>('PLATFORM_COMMISSION_RATE', 0.15)
    const platformFee = amount * commissionRate
    const professionalAmount = amount - platformFee

    return {
      platformFee,
      professionalAmount,
      commissionRate,
    }
  }
}
