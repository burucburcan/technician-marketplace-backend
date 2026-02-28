import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { Invoice, InvoiceStatus, InvoiceItem } from '../../entities/invoice.entity'
import { Receipt } from '../../entities/receipt.entity'
import { Payment } from '../../entities/payment.entity'
import { Booking } from '../../entities/booking.entity'
import { Order } from '../../entities/order.entity'
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../../entities/notification.entity'
import { InvoiceType } from '../../common/enums/invoice-type.enum'

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Receipt)
    private readonly receiptRepository: Repository<Receipt>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Generate invoice for a payment
   */
  async generateInvoice(
    paymentId: string,
    invoiceData: {
      customerName: string
      customerTaxId: string
      customerAddress: string
      customerCity: string
      customerCountry: string
      customerPostalCode: string
      customerEmail: string
    }
  ): Promise<Invoice> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'order'],
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.invoiceType !== InvoiceType.WITH_INVOICE) {
      throw new Error('Payment is not configured for invoice generation')
    }

    // Check if invoice already exists
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        bookingId: payment.bookingId,
        orderId: payment.orderId,
      },
    })

    if (existingInvoice) {
      return existingInvoice
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber()

    // Calculate tax
    const taxRate = this.configService.get<number>('PLATFORM_TAX_RATE', 0.16)
    const subtotal = payment.amount / (1 + taxRate)
    const taxAmount = payment.amount - subtotal

    // Create invoice items
    const items: InvoiceItem[] = []

    if (payment.booking) {
      items.push({
        description: `${payment.booking.serviceCategory} Service`,
        quantity: 1,
        unitPrice: subtotal,
        total: subtotal,
      })
    } else if (payment.order) {
      // For orders, we would need to get order items
      items.push({
        description: 'Order Items',
        quantity: 1,
        unitPrice: subtotal,
        total: subtotal,
      })
    }

    // Create invoice
    const invoice = this.invoiceRepository.create({
      bookingId: payment.bookingId,
      orderId: payment.orderId,
      invoiceNumber,
      issueDate: new Date(),
      dueDate: new Date(), // Immediate payment
      customerName: invoiceData.customerName,
      customerTaxId: invoiceData.customerTaxId,
      customerAddress: invoiceData.customerAddress,
      customerCity: invoiceData.customerCity,
      customerCountry: invoiceData.customerCountry,
      customerPostalCode: invoiceData.customerPostalCode,
      customerEmail: invoiceData.customerEmail,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total: payment.amount,
      currency: payment.currency,
      status: InvoiceStatus.ISSUED,
    })

    await this.invoiceRepository.save(invoice)

    // Generate PDF (placeholder - would use a PDF library like pdfkit or puppeteer)
    const pdfUrl = await this.generateInvoicePDF(invoice)
    invoice.pdfUrl = pdfUrl
    await this.invoiceRepository.save(invoice)

    this.logger.log(`Invoice generated: ${invoice.id}, number: ${invoiceNumber}`)

    // Send invoice via email
    await this.sendInvoiceEmail(invoice)

    return invoice
  }

  /**
   * Generate receipt for a payment (without invoice)
   */
  async generateReceipt(paymentId: string): Promise<Receipt> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'order'],
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.invoiceType !== InvoiceType.WITHOUT_INVOICE) {
      throw new Error('Payment is not configured for receipt generation')
    }

    // Check if receipt already exists
    const existingReceipt = await this.receiptRepository.findOne({
      where: {
        bookingId: payment.bookingId,
        orderId: payment.orderId,
      },
    })

    if (existingReceipt) {
      return existingReceipt
    }

    // Generate receipt number
    const receiptNumber = await this.generateReceiptNumber()

    // Create description
    let description = 'Payment received'
    if (payment.booking) {
      description = `Payment for ${payment.booking.serviceCategory} service`
    } else if (payment.order) {
      description = 'Payment for order'
    }

    // Create receipt
    const receipt = this.receiptRepository.create({
      bookingId: payment.bookingId,
      orderId: payment.orderId,
      receiptNumber,
      issueDate: new Date(),
      amount: payment.amount,
      currency: payment.currency,
      description,
    })

    await this.receiptRepository.save(receipt)

    // Generate PDF
    const pdfUrl = await this.generateReceiptPDF(receipt)
    receipt.pdfUrl = pdfUrl
    await this.receiptRepository.save(receipt)

    this.logger.log(`Receipt generated: ${receipt.id}, number: ${receiptNumber}`)

    // Send receipt via email
    await this.sendReceiptEmail(receipt)

    return receipt
  }

  /**
   * Calculate tax for an amount
   */
  calculateTax(
    amount: number,
    country: string = 'MX'
  ): {
    subtotal: number
    taxRate: number
    taxAmount: number
    total: number
  } {
    // Get tax rate based on country
    const taxRate = this.getTaxRateForCountry(country)

    const subtotal = amount
    const taxAmount = amount * taxRate
    const total = amount + taxAmount

    return {
      subtotal,
      taxRate,
      taxAmount,
      total,
    }
  }

  /**
   * Get tax rate for a country
   */
  private getTaxRateForCountry(country: string): number {
    // Default tax rates by country
    const taxRates: Record<string, number> = {
      MX: 0.16, // Mexico VAT (IVA)
      AR: 0.21, // Argentina VAT
      BR: 0.17, // Brazil (simplified)
      CL: 0.19, // Chile VAT
      CO: 0.19, // Colombia VAT
      PE: 0.18, // Peru VAT
    }

    return taxRates[country] || this.configService.get<number>('PLATFORM_TAX_RATE', 0.16)
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.invoiceRepository.count()
    const sequence = (count + 1).toString().padStart(6, '0')
    return `INV-${year}-${sequence}`
  }

  /**
   * Generate unique receipt number
   */
  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await this.receiptRepository.count()
    const sequence = (count + 1).toString().padStart(6, '0')
    return `REC-${year}-${sequence}`
  }

  /**
   * Generate invoice PDF
   * This is a placeholder - in production, use a PDF library
   */
  private async generateInvoicePDF(invoice: Invoice): Promise<string> {
    // TODO: Implement PDF generation using pdfkit, puppeteer, or similar
    // For now, return a placeholder URL
    const pdfUrl = `/invoices/${invoice.id}.pdf`
    this.logger.log(`Invoice PDF would be generated at: ${pdfUrl}`)
    return pdfUrl
  }

  /**
   * Generate receipt PDF
   * This is a placeholder - in production, use a PDF library
   */
  private async generateReceiptPDF(receipt: Receipt): Promise<string> {
    // TODO: Implement PDF generation using pdfkit, puppeteer, or similar
    // For now, return a placeholder URL
    const pdfUrl = `/receipts/${receipt.id}.pdf`
    this.logger.log(`Receipt PDF would be generated at: ${pdfUrl}`)
    return pdfUrl
  }

  /**
   * Send invoice via email
   */
  private async sendInvoiceEmail(invoice: Invoice): Promise<void> {
    // Get user ID from booking or order
    let userId: string | undefined

    if (invoice.bookingId) {
      const booking = await this.bookingRepository.findOne({
        where: { id: invoice.bookingId },
      })
      userId = booking?.userId
    } else if (invoice.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: invoice.orderId },
      })
      userId = order?.userId
    }

    if (!userId) {
      this.logger.warn(`Cannot send invoice email - user not found for invoice ${invoice.id}`)
      return
    }

    await this.notificationService.sendNotification({
      userId,
      type: NotificationType.PAYMENT_RECEIVED,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        pdfUrl: invoice.pdfUrl,
      },
    })

    this.logger.log(`Invoice email sent for invoice: ${invoice.id}`)
  }

  /**
   * Send receipt via email
   */
  private async sendReceiptEmail(receipt: Receipt): Promise<void> {
    // Get user ID from booking or order
    let userId: string | undefined

    if (receipt.bookingId) {
      const booking = await this.bookingRepository.findOne({
        where: { id: receipt.bookingId },
      })
      userId = booking?.userId
    } else if (receipt.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: receipt.orderId },
      })
      userId = order?.userId
    }

    if (!userId) {
      this.logger.warn(`Cannot send receipt email - user not found for receipt ${receipt.id}`)
      return
    }

    await this.notificationService.sendNotification({
      userId,
      type: NotificationType.PAYMENT_RECEIVED,
      data: {
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        pdfUrl: receipt.pdfUrl,
      },
    })

    this.logger.log(`Receipt email sent for receipt: ${receipt.id}`)
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    })

    if (!invoice) {
      throw new NotFoundException('Invoice not found')
    }

    return invoice
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId: string): Promise<Receipt> {
    const receipt = await this.receiptRepository.findOne({
      where: { id: receiptId },
    })

    if (!receipt) {
      throw new NotFoundException('Receipt not found')
    }

    return receipt
  }
}
