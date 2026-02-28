import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common'
import { PaymentService } from './payment.service'
import { InvoiceService } from './invoice.service'
import { PayoutService } from './payout.service'
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto'
import { CapturePaymentDto } from './dto/capture-payment.dto'
import { RefundPaymentDto } from './dto/refund-payment.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RequestWithUser } from '../../common/types/request.types'

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService,
    private readonly payoutService: PayoutService
  ) {}

  /**
   * Create a payment intent (authorize payment)
   * POST /payments/intent
   */
  @Post('intent')
  async createPaymentIntent(
    @Request() req: RequestWithUser,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto
  ) {
    return this.paymentService.createPaymentIntent(req.user.userId, createPaymentIntentDto)
  }

  /**
   * Capture a previously authorized payment
   * POST /payments/capture
   */
  @Post('capture')
  async capturePayment(@Body() capturePaymentDto: CapturePaymentDto) {
    return this.paymentService.capturePayment(capturePaymentDto.paymentIntentId)
  }

  /**
   * Refund a payment
   * POST /payments/refund
   */
  @Post('refund')
  async refundPayment(@Body() refundPaymentDto: RefundPaymentDto) {
    return this.paymentService.refundPayment(
      refundPaymentDto.paymentId,
      refundPaymentDto.amount,
      refundPaymentDto.reason
    )
  }

  /**
   * Get payment details
   * GET /payments/:id
   */
  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.paymentService.getPayment(id)
  }

  /**
   * Get professional balance
   * GET /payments/professionals/:id/balance
   */
  @Get('professionals/:id/balance')
  async getProfessionalBalance(@Param('id') professionalId: string) {
    return this.payoutService.getBalance(professionalId)
  }

  /**
   * Request payout for professional
   * POST /payments/professionals/:id/payout
   */
  @Post('professionals/:id/payout')
  async requestPayout(@Param('id') professionalId: string, @Body('amount') amount: number) {
    return this.payoutService.requestPayout(professionalId, amount)
  }

  /**
   * Get payout history for professional
   * GET /payments/professionals/:id/payouts
   */
  @Get('professionals/:id/payouts')
  async getPayoutHistory(@Param('id') professionalId: string) {
    return this.payoutService.getPayoutHistory(professionalId)
  }

  /**
   * Generate invoice for a payment
   * POST /payments/:id/invoice
   */
  @Post(':id/invoice')
  async generateInvoice(@Param('id') paymentId: string, @Body() invoiceData: any) {
    return this.invoiceService.generateInvoice(paymentId, invoiceData)
  }

  /**
   * Generate receipt for a payment
   * POST /payments/:id/receipt
   */
  @Post(':id/receipt')
  async generateReceipt(@Param('id') paymentId: string) {
    return this.invoiceService.generateReceipt(paymentId)
  }

  /**
   * Get invoice by ID
   * GET /payments/invoices/:id
   */
  @Get('invoices/:id')
  async getInvoice(@Param('id') invoiceId: string) {
    return this.invoiceService.getInvoice(invoiceId)
  }

  /**
   * Get receipt by ID
   * GET /payments/receipts/:id
   */
  @Get('receipts/:id')
  async getReceipt(@Param('id') receiptId: string) {
    return this.invoiceService.getReceipt(receiptId)
  }

  /**
   * Calculate tax for an amount
   * POST /payments/calculate-tax
   */
  @Post('calculate-tax')
  async calculateTax(@Body('amount') amount: number, @Body('country') country: string) {
    return this.invoiceService.calculateTax(amount, country)
  }
}
