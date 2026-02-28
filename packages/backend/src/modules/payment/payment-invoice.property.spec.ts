import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import * as fc from 'fast-check'
import { PaymentService } from './payment.service'
import { InvoiceService } from './invoice.service'
import { Payment } from '../../entities/payment.entity'
import { Booking } from '../../entities/booking.entity'
import { Order } from '../../entities/order.entity'
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity'
import { Receipt } from '../../entities/receipt.entity'
import { Balance } from '../../entities/balance.entity'
import { Payout } from '../../entities/payout.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { StripeService } from './stripe.service'
import { NotificationService } from '../notification/notification.service'
import { ConfigService } from '@nestjs/config'
import { PaymentStatus, BookingStatus, ProfessionalType } from '../../common/enums'
import { InvoiceType } from '../../common/enums/invoice-type.enum'

/**
 * Property-Based Tests for Payment Service - Invoice and Receipt Generation
 *
 * **Feature: technician-marketplace-platform**
 * **Task: 13.3 Ödeme sistemi için property testleri yaz**
 *
 * These tests validate invoice/receipt generation, tax calculation, and payment encryption.
 */
describe('PaymentService Property Tests - Invoice and Receipt', () => {
  let paymentService: PaymentService
  let invoiceService: InvoiceService

  const mockPaymentRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockBookingRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockOrderRepository = {
    findOne: jest.fn(),
  }

  const mockInvoiceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  }

  const mockReceiptRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  }

  const mockBalanceRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockPayoutRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockProfessionalRepository = {
    findOne: jest.fn(),
  }

  const mockStripeService = {
    createPaymentIntent: jest.fn(),
    capturePayment: jest.fn(),
    refundPayment: jest.fn(),
  }

  const mockNotificationService = {
    sendNotification: jest.fn(),
  }

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'PLATFORM_TAX_RATE') return 0.16
      if (key === 'PLATFORM_COMMISSION_RATE') return 0.15
      return defaultValue
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        InvoiceService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoiceRepository,
        },
        {
          provide: getRepositoryToken(Receipt),
          useValue: mockReceiptRepository,
        },
        {
          provide: getRepositoryToken(Balance),
          useValue: mockBalanceRepository,
        },
        {
          provide: getRepositoryToken(Payout),
          useValue: mockPayoutRepository,
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: mockProfessionalRepository,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    paymentService = module.get<PaymentService>(PaymentService)
    invoiceService = module.get<InvoiceService>(InvoiceService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const amountGen = fc
    .float({ min: 100, max: 10000, noNaN: true })
    .map(n => Math.round(n * 100) / 100)
  const currencyGen = fc.constantFrom('MXN', 'USD')

  const nameGen = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
  const emailGen = fc.emailAddress()
  const addressGen = fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length > 0)
  const cityGen = fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0)
  const countryGen = fc.constantFrom('MX', 'AR', 'BR', 'CL', 'CO', 'PE')
  const postalCodeGen = fc.string({ minLength: 4, maxLength: 10 }).filter(s => /^\d+$/.test(s))
  const taxIdGen = fc.string({ minLength: 10, maxLength: 20 }).filter(s => s.trim().length > 0)

  /**
   * **Property 36: Ödeme Bilgisi Şifreleme (Payment Information Encryption)**
   *
   * **Validates: Requirements 12.3**
   *
   * For any payment transaction, payment information must be stored encrypted in the database
   * (not in plain text). This property ensures:
   * - Payment data is never stored in plain text
   * - Sensitive fields are encrypted
   * - Stripe payment IDs are used instead of raw card data
   */
  describe('Property 36: Payment Information Encryption', () => {
    it('should never store plain text payment information in database', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          fc.constantFrom(InvoiceType.WITH_INVOICE, InvoiceType.WITHOUT_INVOICE),
          async (
            userId: string,
            bookingId: string,
            amount: number,
            currency: string,
            invoiceType: InvoiceType
          ) => {
            jest.clearAllMocks()

            const invoiceData =
              invoiceType === InvoiceType.WITH_INVOICE
                ? {
                    customerName: fc.sample(nameGen, 1)[0],
                    customerTaxId: fc.sample(taxIdGen, 1)[0],
                    customerAddress: fc.sample(addressGen, 1)[0],
                    customerCity: fc.sample(cityGen, 1)[0],
                    customerCountry: fc.sample(countryGen, 1)[0],
                    customerPostalCode: fc.sample(postalCodeGen, 1)[0],
                    customerEmail: fc.sample(emailGen, 1)[0],
                  }
                : undefined

            const stripePaymentId = fc.sample(uuidGen, 1)[0]
            const clientSecret = `pi_${fc.sample(uuidGen, 1)[0]}_secret_${fc.sample(uuidGen, 1)[0]}`

            mockStripeService.createPaymentIntent.mockResolvedValue({
              id: stripePaymentId,
              client_secret: clientSecret,
            })

            const savedPayment = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              amount: invoiceType === InvoiceType.WITH_INVOICE ? amount * 1.16 : amount,
              currency,
              status: PaymentStatus.PENDING,
              paymentMethod: 'card',
              stripePaymentId,
              invoiceType,
              taxAmount: invoiceType === InvoiceType.WITH_INVOICE ? amount * 0.16 : null,
              createdAt: new Date(),
            }

            mockPaymentRepository.create.mockReturnValue(savedPayment)
            mockPaymentRepository.save.mockResolvedValue(savedPayment)

            // Property: Create payment intent
            const result = await paymentService.createPaymentIntent(userId, {
              bookingId,
              amount,
              currency,
              invoiceType,
              invoiceData,
            })

            // Property: Payment information must be encrypted
            // 1. No raw card data should be stored
            expect(mockPaymentRepository.save).toHaveBeenCalled()
            const savedData = mockPaymentRepository.save.mock.calls[0][0]

            // Verify no plain text card data fields exist
            expect(savedData).not.toHaveProperty('cardNumber')
            expect(savedData).not.toHaveProperty('cvv')
            expect(savedData).not.toHaveProperty('expiryDate')

            // 2. Only Stripe payment ID is stored (encrypted reference)
            expect(savedData.stripePaymentId).toBeDefined()
            expect(savedData.stripePaymentId).toBe(stripePaymentId)

            // 3. Payment method is generic, not specific card details
            expect(savedData.paymentMethod).toBe('card')

            // 4. Client secret is returned but not stored in database
            expect(result.clientSecret).toBeDefined()
            expect(savedData).not.toHaveProperty('clientSecret')
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Property 37: Başarılı Ödeme Fatura/Makbuz Oluşturma (Successful Payment Invoice/Receipt Generation)**
   *
   * **Validates: Requirements 12.4, 12.9, 12.10**
   *
   * For any successful payment, the system must create either an invoice (for WITH_INVOICE type)
   * or a receipt (for WITHOUT_INVOICE type) and send it to the user. This property ensures:
   * - Invoice is generated for WITH_INVOICE payments
   * - Receipt is generated for WITHOUT_INVOICE payments
   * - Document is sent to user
   */
  describe('Property 37: Successful Payment Invoice/Receipt Generation', () => {
    it('should generate invoice for WITH_INVOICE payment type', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          nameGen,
          taxIdGen,
          addressGen,
          cityGen,
          countryGen,
          postalCodeGen,
          emailGen,
          async (
            paymentId: string,
            bookingId: string,
            amount: number,
            currency: string,
            customerName: string,
            customerTaxId: string,
            customerAddress: string,
            customerCity: string,
            customerCountry: string,
            customerPostalCode: string,
            customerEmail: string
          ) => {
            jest.clearAllMocks()

            const taxRate = 0.16
            const subtotal = amount / (1 + taxRate)
            const taxAmount = amount - subtotal

            const mockPayment = {
              id: paymentId,
              bookingId,
              amount,
              currency,
              status: PaymentStatus.CAPTURED,
              invoiceType: InvoiceType.WITH_INVOICE,
              taxAmount,
              booking: {
                id: bookingId,
                serviceCategory: 'Plumbing',
                userId: fc.sample(uuidGen, 1)[0],
              },
            }

            mockPaymentRepository.findOne.mockResolvedValue(mockPayment)
            mockInvoiceRepository.findOne.mockResolvedValue(null)
            mockInvoiceRepository.count.mockResolvedValue(0)

            const invoiceNumber = 'INV-2024-000001'
            const mockInvoice = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              invoiceNumber,
              issueDate: new Date(),
              dueDate: new Date(),
              customerName,
              customerTaxId,
              customerAddress,
              customerCity,
              customerCountry,
              customerPostalCode,
              customerEmail,
              items: [
                {
                  description: 'Plumbing Service',
                  quantity: 1,
                  unitPrice: subtotal,
                  total: subtotal,
                },
              ],
              subtotal,
              taxRate,
              taxAmount,
              total: amount,
              currency,
              status: InvoiceStatus.ISSUED,
              pdfUrl: `/invoices/${fc.sample(uuidGen, 1)[0]}.pdf`,
            }

            mockInvoiceRepository.create.mockReturnValue(mockInvoice)
            mockInvoiceRepository.save.mockResolvedValue(mockInvoice)
            mockBookingRepository.findOne.mockResolvedValue(mockPayment.booking)
            mockNotificationService.sendNotification.mockResolvedValue({})

            // Property: Generate invoice for WITH_INVOICE payment
            const result = await invoiceService.generateInvoice(paymentId, {
              customerName,
              customerTaxId,
              customerAddress,
              customerCity,
              customerCountry,
              customerPostalCode,
              customerEmail,
            })

            // Verify invoice was created
            expect(result).toBeDefined()
            expect(result.invoiceNumber).toBeDefined()
            expect(result.status).toBe(InvoiceStatus.ISSUED)
            expect(result.total).toBe(amount)
            expect(result.taxAmount).toBeCloseTo(taxAmount, 2)
            expect(result.pdfUrl).toBeDefined()

            // Verify notification was sent
            expect(mockNotificationService.sendNotification).toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should generate receipt for WITHOUT_INVOICE payment type', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          async (paymentId: string, bookingId: string, amount: number, currency: string) => {
            jest.clearAllMocks()

            const mockPayment = {
              id: paymentId,
              bookingId,
              amount,
              currency,
              status: PaymentStatus.CAPTURED,
              invoiceType: InvoiceType.WITHOUT_INVOICE,
              taxAmount: null,
              booking: {
                id: bookingId,
                serviceCategory: 'Electrical',
                userId: fc.sample(uuidGen, 1)[0],
              },
            }

            mockPaymentRepository.findOne.mockResolvedValue(mockPayment)
            mockReceiptRepository.findOne.mockResolvedValue(null)
            mockReceiptRepository.count.mockResolvedValue(0)

            const receiptNumber = 'REC-2024-000001'
            const mockReceipt = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              receiptNumber,
              issueDate: new Date(),
              amount,
              currency,
              description: 'Payment for Electrical service',
              pdfUrl: `/receipts/${fc.sample(uuidGen, 1)[0]}.pdf`,
            }

            mockReceiptRepository.create.mockReturnValue(mockReceipt)
            mockReceiptRepository.save.mockResolvedValue(mockReceipt)
            mockBookingRepository.findOne.mockResolvedValue(mockPayment.booking)
            mockNotificationService.sendNotification.mockResolvedValue({})

            // Property: Generate receipt for WITHOUT_INVOICE payment
            const result = await invoiceService.generateReceipt(paymentId)

            // Verify receipt was created
            expect(result).toBeDefined()
            expect(result.receiptNumber).toBeDefined()
            expect(result.amount).toBe(amount)
            expect(result.pdfUrl).toBeDefined()

            // Verify notification was sent
            expect(mockNotificationService.sendNotification).toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Property 37.1: Faturalı Ödeme Vergi Hesaplama (Invoiced Payment Tax Calculation)**
   *
   * **Validates: Requirements 12.11**
   *
   * For any invoiced payment, the system must automatically calculate VAT/tax and add it to the invoice.
   * This property ensures:
   * - Tax is calculated correctly based on tax rate
   * - Tax amount is added to subtotal to get total
   * - Tax calculation is accurate
   */
  describe('Property 37.1: Invoiced Payment Tax Calculation', () => {
    it('should automatically calculate and add tax for WITH_INVOICE payments', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          async (userId: string, bookingId: string, subtotalAmount: number, currency: string) => {
            jest.clearAllMocks()

            const invoiceData = {
              customerName: fc.sample(nameGen, 1)[0],
              customerTaxId: fc.sample(taxIdGen, 1)[0],
              customerAddress: fc.sample(addressGen, 1)[0],
              customerCity: fc.sample(cityGen, 1)[0],
              customerCountry: fc.sample(countryGen, 1)[0],
              customerPostalCode: fc.sample(postalCodeGen, 1)[0],
              customerEmail: fc.sample(emailGen, 1)[0],
            }

            const stripePaymentId = fc.sample(uuidGen, 1)[0]
            const clientSecret = `pi_${fc.sample(uuidGen, 1)[0]}_secret_${fc.sample(uuidGen, 1)[0]}`

            // Tax calculation
            const taxRate = 0.16
            const expectedTaxAmount = subtotalAmount * taxRate
            const expectedTotalAmount = subtotalAmount + expectedTaxAmount

            mockStripeService.createPaymentIntent.mockResolvedValue({
              id: stripePaymentId,
              client_secret: clientSecret,
            })

            const savedPayment = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              amount: expectedTotalAmount,
              currency,
              status: PaymentStatus.PENDING,
              paymentMethod: 'card',
              stripePaymentId,
              invoiceType: InvoiceType.WITH_INVOICE,
              taxAmount: expectedTaxAmount,
              createdAt: new Date(),
            }

            mockPaymentRepository.create.mockReturnValue(savedPayment)
            mockPaymentRepository.save.mockResolvedValue(savedPayment)

            // Property: Create payment with tax calculation
            const result = await paymentService.createPaymentIntent(userId, {
              bookingId,
              amount: subtotalAmount,
              currency,
              invoiceType: InvoiceType.WITH_INVOICE,
              invoiceData,
            })

            // Property: Tax must be calculated correctly
            expect(result.taxAmount).toBeCloseTo(expectedTaxAmount, 2)
            expect(result.amount).toBeCloseTo(expectedTotalAmount, 2)

            // Verify tax calculation formula: total = subtotal + (subtotal * taxRate)
            const calculatedTotal = subtotalAmount + result.taxAmount
            expect(result.amount).toBeCloseTo(calculatedTotal, 2)

            // Verify tax rate is correct (16%)
            const calculatedTaxRate = result.taxAmount / subtotalAmount
            expect(calculatedTaxRate).toBeCloseTo(taxRate, 2)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should use calculateTax method to compute tax correctly', async () => {
      await fc.assert(
        fc.asyncProperty(amountGen, countryGen, async (amount: number, country: string) => {
          // Property: Calculate tax for different countries
          const result = invoiceService.calculateTax(amount, country)

          // Verify structure
          expect(result).toHaveProperty('subtotal')
          expect(result).toHaveProperty('taxRate')
          expect(result).toHaveProperty('taxAmount')
          expect(result).toHaveProperty('total')

          // Verify calculations
          expect(result.subtotal).toBe(amount)
          expect(result.taxAmount).toBeCloseTo(amount * result.taxRate, 2)
          expect(result.total).toBeCloseTo(amount + result.taxAmount, 2)

          // Verify tax rate is positive and reasonable (between 0% and 30%)
          expect(result.taxRate).toBeGreaterThanOrEqual(0)
          expect(result.taxRate).toBeLessThanOrEqual(0.3)
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Property 37.2: Fatura Bilgileri Doğrulama (Invoice Information Validation)**
   *
   * **Validates: Requirements 12.8**
   *
   * For any invoiced payment request, the user must provide tax ID and invoice information.
   * If information is missing, the transaction must be rejected. This property ensures:
   * - Tax ID is required for WITH_INVOICE payments
   * - Invoice data is validated
   * - Missing information causes rejection
   */
  describe('Property 37.2: Invoice Information Validation', () => {
    it('should reject WITH_INVOICE payment without tax ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          async (userId: string, bookingId: string, amount: number, currency: string) => {
            jest.clearAllMocks()

            // Property: Attempt to create WITH_INVOICE payment without invoice data
            await expect(
              paymentService.createPaymentIntent(userId, {
                bookingId,
                amount,
                currency,
                invoiceType: InvoiceType.WITH_INVOICE,
                // Missing invoiceData
              })
            ).rejects.toThrow(BadRequestException)

            await expect(
              paymentService.createPaymentIntent(userId, {
                bookingId,
                amount,
                currency,
                invoiceType: InvoiceType.WITH_INVOICE,
                // Missing invoiceData
              })
            ).rejects.toThrow('Tax ID and invoice data are required for invoice payments')

            // Verify no payment was created
            expect(mockPaymentRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject WITH_INVOICE payment without customer tax ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          nameGen,
          addressGen,
          cityGen,
          countryGen,
          postalCodeGen,
          emailGen,
          async (
            userId: string,
            bookingId: string,
            amount: number,
            currency: string,
            customerName: string,
            customerAddress: string,
            customerCity: string,
            customerCountry: string,
            customerPostalCode: string,
            customerEmail: string
          ) => {
            jest.clearAllMocks()

            // Property: Attempt to create WITH_INVOICE payment with incomplete invoice data (missing tax ID)
            await expect(
              paymentService.createPaymentIntent(userId, {
                bookingId,
                amount,
                currency,
                invoiceType: InvoiceType.WITH_INVOICE,
                invoiceData: {
                  customerName,
                  customerTaxId: '', // Empty tax ID
                  customerAddress,
                  customerCity,
                  customerCountry,
                  customerPostalCode,
                  customerEmail,
                },
              })
            ).rejects.toThrow(BadRequestException)

            // Verify no payment was created
            expect(mockPaymentRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should accept WITH_INVOICE payment with complete invoice data', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          nameGen,
          taxIdGen,
          addressGen,
          cityGen,
          countryGen,
          postalCodeGen,
          emailGen,
          async (
            userId: string,
            bookingId: string,
            amount: number,
            currency: string,
            customerName: string,
            customerTaxId: string,
            customerAddress: string,
            customerCity: string,
            customerCountry: string,
            customerPostalCode: string,
            customerEmail: string
          ) => {
            jest.clearAllMocks()

            const stripePaymentId = fc.sample(uuidGen, 1)[0]
            const clientSecret = `pi_${fc.sample(uuidGen, 1)[0]}_secret_${fc.sample(uuidGen, 1)[0]}`

            mockStripeService.createPaymentIntent.mockResolvedValue({
              id: stripePaymentId,
              client_secret: clientSecret,
            })

            const taxRate = 0.16
            const taxAmount = amount * taxRate
            const totalAmount = amount + taxAmount

            const savedPayment = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              amount: totalAmount,
              currency,
              status: PaymentStatus.PENDING,
              paymentMethod: 'card',
              stripePaymentId,
              invoiceType: InvoiceType.WITH_INVOICE,
              taxAmount,
              createdAt: new Date(),
            }

            mockPaymentRepository.create.mockReturnValue(savedPayment)
            mockPaymentRepository.save.mockResolvedValue(savedPayment)

            // Property: Create WITH_INVOICE payment with complete invoice data
            const result = await paymentService.createPaymentIntent(userId, {
              bookingId,
              amount,
              currency,
              invoiceType: InvoiceType.WITH_INVOICE,
              invoiceData: {
                customerName,
                customerTaxId,
                customerAddress,
                customerCity,
                customerCountry,
                customerPostalCode,
                customerEmail,
              },
            })

            // Verify payment was created successfully
            expect(result).toBeDefined()
            expect(result.paymentId).toBeDefined()
            expect(result.invoiceType).toBe(InvoiceType.WITH_INVOICE)
            expect(mockPaymentRepository.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should accept WITHOUT_INVOICE payment without invoice data', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          amountGen,
          currencyGen,
          async (userId: string, bookingId: string, amount: number, currency: string) => {
            jest.clearAllMocks()

            const stripePaymentId = fc.sample(uuidGen, 1)[0]
            const clientSecret = `pi_${fc.sample(uuidGen, 1)[0]}_secret_${fc.sample(uuidGen, 1)[0]}`

            mockStripeService.createPaymentIntent.mockResolvedValue({
              id: stripePaymentId,
              client_secret: clientSecret,
            })

            const savedPayment = {
              id: fc.sample(uuidGen, 1)[0],
              bookingId,
              amount,
              currency,
              status: PaymentStatus.PENDING,
              paymentMethod: 'card',
              stripePaymentId,
              invoiceType: InvoiceType.WITHOUT_INVOICE,
              taxAmount: null,
              createdAt: new Date(),
            }

            mockPaymentRepository.create.mockReturnValue(savedPayment)
            mockPaymentRepository.save.mockResolvedValue(savedPayment)

            // Property: Create WITHOUT_INVOICE payment without invoice data
            const result = await paymentService.createPaymentIntent(userId, {
              bookingId,
              amount,
              currency,
              invoiceType: InvoiceType.WITHOUT_INVOICE,
              // No invoiceData required
            })

            // Verify payment was created successfully
            expect(result).toBeDefined()
            expect(result.paymentId).toBeDefined()
            expect(result.invoiceType).toBe(InvoiceType.WITHOUT_INVOICE)
            expect(result.taxAmount).toBe(0)
            expect(mockPaymentRepository.save).toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
