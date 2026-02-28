import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Balance } from '../../entities/balance.entity'
import { Payout, PayoutStatus } from '../../entities/payout.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { StripeService } from './stripe.service'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../../entities/notification.entity'

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name)
  private readonly MIN_PAYOUT_AMOUNT = 100 // Minimum payout amount in MXN

  constructor(
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
   * Get professional balance
   */
  async getBalance(professionalId: string): Promise<Balance> {
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
      // Create initial balance
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
   * Request payout
   */
  async requestPayout(professionalId: string, amount: number): Promise<Payout> {
    // Validate professional
    const professional = await this.professionalRepository.findOne({
      where: { id: professionalId },
      relations: ['user'],
    })

    if (!professional) {
      throw new NotFoundException('Professional not found')
    }

    // Validate amount
    if (amount < this.MIN_PAYOUT_AMOUNT) {
      throw new BadRequestException(`Minimum payout amount is ${this.MIN_PAYOUT_AMOUNT} MXN`)
    }

    // Get balance
    const balance = await this.getBalance(professionalId)

    if (balance.available < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance.available}, Requested: ${amount}`
      )
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

    this.logger.log(
      `Payout requested: ${payout.id}, professional: ${professionalId}, amount: ${amount}`
    )

    // Process payout asynchronously
    this.processPayout(payout.id).catch(error => {
      this.logger.error(`Failed to process payout ${payout.id}`, error)
    })

    return payout
  }

  /**
   * Process payout (transfer to professional's bank account)
   */
  async processPayout(payoutId: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
      relations: ['professional', 'professional.user'],
    })

    if (!payout) {
      throw new NotFoundException('Payout not found')
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Payout cannot be processed in ${payout.status} status`)
    }

    try {
      // Update status to processing
      payout.status = PayoutStatus.PROCESSING
      await this.payoutRepository.save(payout)

      // In a real implementation, you would:
      // 1. Create a Stripe transfer to the professional's connected account
      // 2. Or use Stripe payouts API
      // For now, we'll simulate the transfer

      // Simulate transfer (in production, use Stripe)
      // const transfer = await this.stripeService.createTransfer(
      //   payout.amount,
      //   payout.currency,
      //   professional.stripeAccountId,
      //   { payoutId: payout.id }
      // );

      // Mark as completed
      payout.status = PayoutStatus.COMPLETED
      payout.completedAt = new Date()
      // payout.stripeTransferId = transfer.id;
      await this.payoutRepository.save(payout)

      // Update balance
      const balance = await this.getBalance(payout.professionalId)
      balance.pending -= payout.amount
      await this.balanceRepository.save(balance)

      this.logger.log(`Payout completed: ${payout.id}`)

      // Send notification
      await this.notificationService.sendNotification({
        userId: payout.professional.userId,
        type: NotificationType.PAYOUT_PROCESSED,
        data: {
          payoutId: payout.id,
          amount: payout.amount,
          currency: payout.currency,
        },
      })

      return payout
    } catch (error) {
      // Mark as failed
      payout.status = PayoutStatus.FAILED
      payout.failureReason = error.message
      await this.payoutRepository.save(payout)

      // Restore balance
      const balance = await this.getBalance(payout.professionalId)
      balance.available += payout.amount
      balance.pending -= payout.amount
      await this.balanceRepository.save(balance)

      this.logger.error(`Payout failed: ${payout.id}`, error)

      // Send notification
      await this.notificationService.sendNotification({
        userId: payout.professional.userId,
        type: NotificationType.PAYOUT_PROCESSED,
        data: {
          payoutId: payout.id,
          amount: payout.amount,
          error: error.message,
        },
      })

      throw error
    }
  }

  /**
   * Get payout history for professional
   */
  async getPayoutHistory(professionalId: string): Promise<Payout[]> {
    const professional = await this.professionalRepository.findOne({
      where: { id: professionalId },
    })

    if (!professional) {
      throw new NotFoundException('Professional not found')
    }

    return this.payoutRepository.find({
      where: { professionalId },
      order: { createdAt: 'DESC' },
    })
  }

  /**
   * Get payout by ID
   */
  async getPayout(payoutId: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
      relations: ['professional'],
    })

    if (!payout) {
      throw new NotFoundException('Payout not found')
    }

    return payout
  }

  /**
   * Cancel payout (only if pending)
   */
  async cancelPayout(payoutId: string): Promise<Payout> {
    const payout = await this.payoutRepository.findOne({
      where: { id: payoutId },
    })

    if (!payout) {
      throw new NotFoundException('Payout not found')
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(`Payout cannot be cancelled in ${payout.status} status`)
    }

    // Update status
    payout.status = PayoutStatus.CANCELLED
    await this.payoutRepository.save(payout)

    // Restore balance
    const balance = await this.getBalance(payout.professionalId)
    balance.available += payout.amount
    balance.pending -= payout.amount
    await this.balanceRepository.save(balance)

    this.logger.log(`Payout cancelled: ${payout.id}`)

    return payout
  }

  /**
   * Add funds to professional balance (called after escrow release)
   */
  async addFunds(professionalId: string, amount: number): Promise<Balance> {
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

    this.logger.log(`Funds added to balance: professional ${professionalId}, amount: ${amount}`)

    return balance
  }
}
