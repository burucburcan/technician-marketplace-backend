import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name)
  private stripe: Stripe

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY')

    if (!apiKey) {
      this.logger.warn('Stripe API key not configured')
    }

    this.stripe = new Stripe(apiKey || '', {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })

    this.logger.log('Stripe service initialized')
  }

  /**
   * Create a payment intent for authorization
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        capture_method: 'manual', // For escrow - authorize first, capture later
      })

      this.logger.log(`Payment intent created: ${paymentIntent.id}`)
      return paymentIntent
    } catch (error) {
      this.logger.error('Failed to create payment intent', error)
      throw error
    }
  }

  /**
   * Capture a previously authorized payment
   */
  async capturePayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(paymentIntentId)

      this.logger.log(`Payment captured: ${paymentIntentId}`)
      return paymentIntent
    } catch (error) {
      this.logger.error('Failed to capture payment', error)
      throw error
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      }

      if (amount) {
        refundData.amount = Math.round(amount * 100)
      }

      if (reason) {
        refundData.reason = reason as Stripe.RefundCreateParams.Reason
      }

      const refund = await this.stripe.refunds.create(refundData)

      this.logger.log(`Payment refunded: ${paymentIntentId}`)
      return refund
    } catch (error) {
      this.logger.error('Failed to refund payment', error)
      throw error
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId)
    } catch (error) {
      this.logger.error('Failed to retrieve payment intent', error)
      throw error
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured')
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (error) {
      this.logger.error('Failed to construct webhook event', error)
      throw error
    }
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      })

      this.logger.log(`Customer created: ${customer.id}`)
      return customer
    } catch (error) {
      this.logger.error('Failed to create customer', error)
      throw error
    }
  }

  /**
   * Create a transfer to a connected account (for professional payouts)
   */
  async createTransfer(
    amount: number,
    currency: string,
    destination: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Transfer> {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        destination,
        metadata,
      })

      this.logger.log(`Transfer created: ${transfer.id}`)
      return transfer
    } catch (error) {
      this.logger.error('Failed to create transfer', error)
      throw error
    }
  }
}
