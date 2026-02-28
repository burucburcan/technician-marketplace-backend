import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Payment } from '../../entities/payment.entity'
import { Booking } from '../../entities/booking.entity'
import { Order } from '../../entities/order.entity'
import { Invoice } from '../../entities/invoice.entity'
import { Receipt } from '../../entities/receipt.entity'
import { Balance } from '../../entities/balance.entity'
import { Payout, PayoutStatus } from '../../entities/payout.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { StripeService } from './stripe.service'
import { NotificationService } from '../notification/notification.service'
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto'
import { PaymentStatus } from '../../common/enums'
import { InvoiceType } from '../../common/enums/invoice-type.enum'
import { BookingStatus } from '../../common/enums'
import { NotificationType } from '../../entities/notification.entity'

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(Balance)
    private readonly balanceRepository: Repository<Balance>,
    @InjectRepository(Payout)
    private readonly payoutRepository: Repository<Payout>,
    @InjectRepository(ProfessionalProfile)
    private readonly professionalRepository: Repository<ProfessionalProfile>,
    private readonly stripeService: StripeService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Create a payment intent (authorize payment)
   */
  async createPaymentIntent(userId: string, createPaymentIntentDto: CreatePaymentIntentDto) {
    const { bookingId, orderId, amount, currency, invoiceType, invoiceData } =
      createPaymentIntentDto

    // Validate invoice data for WITH_INVOICE type
    if (invoiceType === InvoiceType.WITH_INVOICE) {
      if (!invoiceData || !invoiceData.customerTaxId) {
        throw new BadRequestException('Tax ID and invoice data are required for invoice payments')
      }
    }

    // Calculate tax if invoice type is WITH_INVOICE
    let taxAmount = 0
    let totalAmount = amount

    if (invoiceType === InvoiceType.WITH_INVOICE) {
      const taxRate = this.configService.get<number>('PLATFORM_TAX_RATE', 0.16)
      taxAmount = amount * taxRate
      totalAmount = amount + taxAmount
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent(totalAmount, currency, {
      userId,
      bookingId: bookingId || '',
      orderId: orderId || '',
      invoiceType,
    })

    // Create payment record
    const payment = this.paymentRepository.create({
      bookingId,
      orderId,
      amount: totalAmount,
      currency,
      status: PaymentStatus.PENDING,
      paymentMethod: 'card',
      stripePaymentId: paymentIntent.id,
      invoiceType,
      taxAmount,
    })

    await this.paymentRepository.save(payment)

    this.logger.log(`Payment intent created: ${payment.id}`)

    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      taxAmount,
      currency,
      invoiceType,
    }
  }

  /**
   * Capture a previously authorized payment (move to escrow)
   */
  async capturePayment(paymentIntentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentId: paymentIntentId },
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment cannot be captured in ${payment.status} status`)
    }

    // Capture payment in Stripe
    await this.stripeService.capturePayment(paymentIntentId)

    // Update payment status
    payment.status = PaymentStatus.CAPTURED
    await this.paymentRepository.save(payment)

    this.logger.log(`Payment captured: ${payment.id}`)

    return {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException('Only captured payments can be refunded')
    }

    // Refund in Stripe
    await this.stripeService.refundPayment(payment.stripePaymentId, amount, reason)

    // Update payment status
    payment.status = PaymentStatus.REFUNDED
    await this.paymentRepository.save(payment)

    this.logger.log(`Payment refunded: ${payment.id}`)

    return {
      paymentId: payment.id,
      status: payment.status,
      refundedAmount: amount || payment.amount,
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'order'],
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    return payment
  }

  /**
   * Release payment from escrow to professional (after service completion)
   */
  async releasePaymentToProfessional(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['payment', 'professional'],
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Payment can only be released for completed bookings')
    }

    const payment = booking.payment
    if (!payment) {
      throw new NotFoundException('Payment not found for booking')
    }

    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException('Payment must be captured before release')
    }

    // Calculate platform fee and professional amount
    const commissionRate = this.configService.get<number>('PLATFORM_COMMISSION_RATE', 0.15)
    const platformFee = payment.amount * commissionRate
    const professionalAmount = payment.amount - platformFee

    // Update payment record
    payment.platformFee = platformFee
    payment.professionalAmount = professionalAmount
    await this.paymentRepository.save(payment)

    // Update professional balance
    await this.updateProfessionalBalance(booking.professionalId, professionalAmount)

    this.logger.log(
      `Payment released to professional: ${booking.professionalId}, amount: ${professionalAmount}`
    )

    // Send notification to professional
    await this.notificationService.sendNotification({
      userId: booking.professional.userId,
      type: NotificationType.PAYMENT_RECEIVED,
      data: {
        bookingId,
        paymentId: payment.id,
        amount: professionalAmount,
        currency: payment.currency,
      },
    })

    return {
      paymentId: payment.id,
      professionalAmount,
      platformFee,
    }
  }

  /**
   * Update professional balance
   */
  private async updateProfessionalBalance(professionalId: string, amount: number) {
    let balance = await this.balanceRepository.findOne({
      where: { professionalId },
    })

    if (!balance) {
      balance = this.balanceRepository.create({
        professionalId,
        available: 0,
        pending: 0,
        currency: 'MXN',
      })
    }

    balance.available += amount
    await this.balanceRepository.save(balance)

    return balance
  }

  /**
   * Get professional balance
   */
  async getProfessionalBalance(professionalId: string) {
    const professional = await this.professionalRepository.findOne({
      where: { id: professionalId },
    })

    if (!professional) {
      throw new NotFoundException('Professional not found')
    }

    let balance = await this.balanceRepository.findOne({
      where: { professionalId },
    })

    if (!balance) {
      balance = this.balanceRepository.create({
        professionalId,
        available: 0,
        pending: 0,
        currency: 'MXN',
      })
      await this.balanceRepository.save(balance)
    }

    return balance
  }

  /**
   * Request payout for professional
   */
  async requestPayout(professionalId: string, amount: number) {
    const balance = await this.getProfessionalBalance(professionalId)

    if (balance.available < amount) {
      throw new BadRequestException('Insufficient balance')
    }

    // Create payout record
    const payout = this.payoutRepository.create({
      professionalId,
      amount,
      currency: balance.currency,
      status: PayoutStatus.PENDING,
    })

    await this.payoutRepository.save(payout)

    // Update balance
    balance.available -= amount
    balance.pending += amount
    await this.balanceRepository.save(balance)

    this.logger.log(`Payout requested: ${payout.id}, amount: ${amount}`)

    // In a real implementation, you would process the payout here
    // For now, we'll just mark it as processing
    payout.status = PayoutStatus.PROCESSING
    await this.payoutRepository.save(payout)

    return payout
  }

  /**
   * Get payout history for professional
   */
  async getPayoutHistory(professionalId: string) {
    return this.payoutRepository.find({
      where: { professionalId },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * Handle payment success webhook
   */
  async handlePaymentSuccess(stripePaymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentId },
    })

    if (payment) {
      payment.status = PaymentStatus.AUTHORIZED
      await this.paymentRepository.save(payment)
      this.logger.log(`Payment authorized: ${payment.id}`)
    }
  }

  /**
   * Handle payment failure webhook
   */
  async handlePaymentFailure(stripePaymentId: string, errorMessage?: string) {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentId },
    })

    if (payment) {
      payment.status = PaymentStatus.FAILED
      await this.paymentRepository.save(payment)
      this.logger.log(`Payment failed: ${payment.id}, reason: ${errorMessage}`)
    }
  }

  /**
   * Handle payment canceled webhook
   */
  async handlePaymentCanceled(stripePaymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentId },
    })

    if (payment) {
      payment.status = PaymentStatus.FAILED
      await this.paymentRepository.save(payment)
      this.logger.log(`Payment canceled: ${payment.id}`)
    }
  }

  /**
   * Handle refund webhook
   */
  async handleRefund(stripePaymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { stripePaymentId },
    })

    if (payment) {
      payment.status = PaymentStatus.REFUNDED
      await this.paymentRepository.save(payment)
      this.logger.log(`Payment refunded via webhook: ${payment.id}`)
    }
  }
}
