import { Controller, Post, Headers, RawBodyRequest, Req, Logger, HttpCode } from '@nestjs/common'
import { Request } from 'express'
import Stripe from 'stripe'
import { StripeService } from './stripe.service'
import { PaymentService } from './payment.service'

@Controller('webhooks/stripe')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(
    private readonly stripeService: StripeService,
    private readonly paymentService: PaymentService
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>
  ) {
    if (!signature) {
      this.logger.error('Missing stripe-signature header')
      throw new Error('Missing stripe-signature header')
    }

    const rawBody = request.rawBody
    if (!rawBody) {
      this.logger.error('Missing raw body')
      throw new Error('Missing raw body')
    }

    try {
      const event = this.stripeService.constructWebhookEvent(rawBody, signature)

      this.logger.log(`Received webhook event: ${event.type}`)

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
          break

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
          break

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent)
          break

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge)
          break

        default:
          this.logger.log(`Unhandled event type: ${event.type}`)
      }

      return { received: true }
    } catch (error) {
      this.logger.error('Webhook error', error)
      throw error
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`)
    // Update payment status in database
    await this.paymentService.handlePaymentSuccess(paymentIntent.id)
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment intent failed: ${paymentIntent.id}`)
    // Update payment status in database
    await this.paymentService.handlePaymentFailure(
      paymentIntent.id,
      paymentIntent.last_payment_error?.message
    )
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment intent canceled: ${paymentIntent.id}`)
    // Update payment status in database
    await this.paymentService.handlePaymentCanceled(paymentIntent.id)
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    this.logger.log(`Charge refunded: ${charge.id}`)
    // Handle refund in database
    await this.paymentService.handleRefund(charge.payment_intent as string)
  }
}
