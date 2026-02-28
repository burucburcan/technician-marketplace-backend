/// <reference types="cypress" />

describe('Payment Flow', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.login(users.testUser.email, users.testUser.password)
    })
  })

  describe('Payment Process', () => {
    it('should complete payment for confirmed booking', () => {
      const booking = {
        id: 'booking-123',
        status: 'confirmed',
        estimatedPrice: 500,
        serviceCategory: 'Electricidad',
        professionalName: 'Carlos Electricista',
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      
      cy.visit('/booking/booking-123')
      
      // Click pay now button
      cy.getByTestId('pay-now-button').click()
      
      // Should navigate to payment page
      cy.url().should('include', '/payment/booking-123')
      
      // Should show payment form
      cy.getByTestId('payment-form').should('be.visible')
      cy.getByTestId('amount-display').should('contain', '500')
    })

    it('should select invoice type (with/without invoice)', () => {
      const booking = {
        id: 'booking-123',
        status: 'confirmed',
        estimatedPrice: 500,
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      
      cy.visit('/payment/booking-123')
      
      // Should show invoice type selection
      cy.getByTestId('invoice-type-select').should('be.visible')
      
      // Select with invoice
      cy.getByTestId('invoice-type-select').select('with_invoice')
      
      // Should show invoice form
      cy.getByTestId('invoice-form').should('be.visible')
      cy.getByTestId('tax-id-input').should('be.visible')
      cy.getByTestId('company-name-input').should('be.visible')
    })

    it('should calculate tax for invoiced payment', () => {
      const booking = {
        id: 'booking-123',
        status: 'confirmed',
        estimatedPrice: 500,
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      cy.mockApiResponse('POST', '**/api/payment/calculate-tax', {
        subtotal: 500,
        taxRate: 0.16,
        taxAmount: 80,
        total: 580,
      })
      
      cy.visit('/payment/booking-123')
      
      // Select with invoice
      cy.getByTestId('invoice-type-select').select('with_invoice')
      
      // Should show tax calculation
      cy.getByTestId('subtotal-display').should('contain', '500')
      cy.getByTestId('tax-display').should('contain', '80')
      cy.getByTestId('total-display').should('contain', '580')
    })

    it('should fill invoice information', () => {
      const booking = {
        id: 'booking-123',
        status: 'confirmed',
        estimatedPrice: 500,
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      
      cy.visit('/payment/booking-123')
      
      cy.getByTestId('invoice-type-select').select('with_invoice')
      
      // Fill invoice form
      cy.getByTestId('tax-id-input').type('ABC123456XYZ')
      cy.getByTestId('company-name-input').type('Mi Empresa S.A.')
      cy.getByTestId('invoice-address-input').type('Av. Reforma 123')
      cy.getByTestId('invoice-city-input').type('Ciudad de México')
      cy.getByTestId('invoice-postal-code-input').type('06600')
      
      // All fields should be filled
      cy.getByTestId('tax-id-input').should('have.value', 'ABC123456XYZ')
      cy.getByTestId('company-name-input').should('have.value', 'Mi Empresa S.A.')
    })

    it('should process payment with credit card', () => {
      const booking = {
        id: 'booking-123',
        status: 'confirmed',
        estimatedPrice: 500,
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      cy.mockApiResponse('POST', '**/api/payment/create-intent', {
        clientSecret: 'test_secret_123',
        paymentIntentId: 'pi_123',
      })
      cy.mockApiResponse('POST', '**/api/payment/confirm', {
        success: true,
        paymentId: 'payment-123',
      })
      
      cy.visit('/payment/booking-123')
      
      // Select without invoice
      cy.getByTestId('invoice-type-select').select('without_invoice')
      
      // Fill payment form (Stripe Elements would be mocked in real scenario)
      cy.getByTestId('card-holder-name-input').type('Juan Pérez')
      
      // Mock Stripe card element
      cy.window().then((win) => {
        // In real tests, you'd use Stripe test cards
        // For now, we'll mock the submission
      })
      
      // Submit payment
      cy.getByTestId('submit-payment-button').click()
      
      // Should show processing state
      cy.getByTestId('submit-payment-button').should('be.disabled')
      cy.contains(/procesando|processing/i).should('be.visible')
    })

    it('should show payment success page', () => {
      cy.mockApiResponse('GET', '**/api/payment/payment-123', {
        id: 'payment-123',
        bookingId: 'booking-123',
        amount: 500,
        status: 'captured',
        invoiceType: 'without_invoice',
      })
      
      cy.visit('/payment/success?paymentId=payment-123')
      
      // Should show success message
      cy.getByTestId('payment-success-message').should('be.visible')
      cy.contains(/pago exitoso|payment successful/i).should('be.visible')
      
      // Should show payment details
      cy.getByTestId('payment-amount').should('contain', '500')
      
      // Should have download receipt button
      cy.getByTestId('download-receipt-button').should('be.visible')
      
      // Should have view booking button
      cy.getByTestId('view-booking-button').should('be.visible')
    })

    it('should download receipt after payment', () => {
      cy.mockApiResponse('GET', '**/api/payment/payment-123', {
        id: 'payment-123',
        bookingId: 'booking-123',
        amount: 500,
        status: 'captured',
        receiptUrl: '/receipts/receipt-123.pdf',
      })
      
      cy.visit('/payment/success?paymentId=payment-123')
      
      // Click download receipt
      cy.getByTestId('download-receipt-button').click()
      
      // Should trigger download (in real test, verify file download)
      cy.window().then((win) => {
        // Verify download was triggered
      })
    })

    it('should download invoice for invoiced payment', () => {
      cy.mockApiResponse('GET', '**/api/payment/payment-123', {
        id: 'payment-123',
        bookingId: 'booking-123',
        amount: 580,
        status: 'captured',
        invoiceType: 'with_invoice',
        invoiceUrl: '/invoices/invoice-123.pdf',
      })
      
      cy.visit('/payment/success?paymentId=payment-123')
      
      // Should show download invoice button
      cy.getByTestId('download-invoice-button').should('be.visible')
      
      // Click download invoice
      cy.getByTestId('download-invoice-button').click()
    })

    it('should handle payment failure', () => {
      cy.mockApiResponse('POST', '**/api/payment/confirm', {
        statusCode: 400,
        body: {
          error: 'Payment failed',
          message: 'Insufficient funds',
        },
      })
      
      const booking = {
        id: 'booking-123',
        status: 'confirmed',
        estimatedPrice: 500,
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      
      cy.visit('/payment/booking-123')
      
      cy.getByTestId('invoice-type-select').select('without_invoice')
      cy.getByTestId('card-holder-name-input').type('Juan Pérez')
      cy.getByTestId('submit-payment-button').click()
      
      // Should show error message
      cy.contains(/pago fallido|payment failed|fondos insuficientes|insufficient funds/i).should('be.visible')
      
      // Should allow retry
      cy.getByTestId('submit-payment-button').should('not.be.disabled')
    })

    it('should validate invoice form before payment', () => {
      const booking = {
        id: 'booking-123',
        status: 'confirmed',
        estimatedPrice: 500,
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      
      cy.visit('/payment/booking-123')
      
      cy.getByTestId('invoice-type-select').select('with_invoice')
      
      // Try to submit without filling invoice form
      cy.getByTestId('submit-payment-button').click()
      
      // Should show validation errors
      cy.contains(/requerido|required/i).should('be.visible')
    })
  })

  describe('Payment History', () => {
    it('should display payment history', () => {
      cy.mockApiResponse('GET', '**/api/payment/user/*', {
        payments: [
          {
            id: 'payment-1',
            bookingId: 'booking-1',
            amount: 500,
            status: 'captured',
            createdAt: '2024-01-15T10:00:00Z',
            serviceCategory: 'Electricidad',
          },
          {
            id: 'payment-2',
            bookingId: 'booking-2',
            amount: 800,
            status: 'captured',
            createdAt: '2024-01-20T14:00:00Z',
            serviceCategory: 'Plomería',
          },
        ],
        total: 2,
      })
      
      cy.visit('/user/payments')
      
      // Should show payment list
      cy.getByTestId('payment-item').should('have.length', 2)
      cy.contains('500').should('be.visible')
      cy.contains('800').should('be.visible')
    })

    it('should filter payments by date range', () => {
      cy.visit('/user/payments')
      
      // Set date range
      cy.getByTestId('start-date-input').type('2024-01-01')
      cy.getByTestId('end-date-input').type('2024-01-31')
      cy.getByTestId('apply-filter-button').click()
      
      // Should filter results
      cy.getByTestId('payment-item').should('exist')
    })

    it('should download receipt from payment history', () => {
      cy.mockApiResponse('GET', '**/api/payment/user/*', {
        payments: [
          {
            id: 'payment-1',
            amount: 500,
            receiptUrl: '/receipts/receipt-1.pdf',
          },
        ],
        total: 1,
      })
      
      cy.visit('/user/payments')
      
      // Click download receipt
      cy.getByTestId('payment-item').first().find('[data-testid="download-receipt-button"]').click()
    })
  })

  describe('Refund Process', () => {
    it('should request refund for cancelled booking', () => {
      const booking = {
        id: 'booking-123',
        status: 'cancelled',
        paymentId: 'payment-123',
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
      cy.mockApiResponse('POST', '**/api/payment/payment-123/refund', {
        success: true,
        refundId: 'refund-123',
      })
      
      cy.visit('/booking/booking-123')
      
      // Should show refund button
      cy.getByTestId('request-refund-button').should('be.visible')
      
      // Click refund button
      cy.getByTestId('request-refund-button').click()
      
      // Should show confirmation modal
      cy.getByTestId('refund-confirmation-modal').should('be.visible')
      
      // Confirm refund
      cy.getByTestId('confirm-refund-button').click()
      
      // Should show success message
      cy.contains(/reembolso solicitado|refund requested/i).should('be.visible')
    })
  })
})
