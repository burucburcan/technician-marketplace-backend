# Payment Service

Complete payment processing system with Stripe integration, escrow management, invoice/receipt generation, and professional payout handling.

## Features

### 1. Stripe Integration
- Payment intent creation (authorize)
- Payment capture (charge customer)
- Payment refunds
- Webhook handling for payment events
- Test and production key management

### 2. Payment Processing
- **POST /payments/intent** - Create payment intent with invoice/receipt option
- **POST /payments/capture** - Capture authorized payment
- **POST /payments/refund** - Refund a payment
- **GET /payments/:id** - Get payment details

### 3. Escrow System
- Automatic payment holding after capture
- 24-hour waiting period after service completion
- Automatic release to professional balance
- Commission calculation (configurable, default 15%)
- Cron job for automatic escrow releases

### 4. Invoice & Receipt Generation
- **WITH_INVOICE**: Official invoices with tax calculation
  - Requires tax ID and customer details
  - Automatic VAT/tax calculation
  - PDF generation
  - Email delivery
- **WITHOUT_INVOICE**: Simple payment receipts
  - No tax ID required
  - Basic payment confirmation
  - PDF generation
  - Email delivery

### 5. Professional Balance & Payouts
- **GET /payments/professionals/:id/balance** - Get balance
- **POST /payments/professionals/:id/payout** - Request payout
- **GET /payments/professionals/:id/payouts** - Payout history
- Minimum payout amount: 100 MXN
- Automatic payout processing
- Balance tracking (available + pending)

## Configuration

### Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_test_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Platform Configuration
PLATFORM_COMMISSION_RATE=0.15  # 15% commission
PLATFORM_TAX_RATE=0.16         # 16% VAT (Mexico)
```

### Installation

```bash
# Install Stripe SDK
npm install stripe

# Install schedule module for cron jobs
npm install @nestjs/schedule
```

## Payment Flow

### 1. Service Booking Payment Flow

```
1. User creates booking
2. POST /payments/intent (with invoice type selection)
   - If WITH_INVOICE: collect tax ID and invoice data
   - Calculate tax if applicable
   - Create Stripe payment intent (authorize)
3. User confirms payment on frontend
4. Webhook: payment_intent.succeeded
   - Update payment status to AUTHORIZED
5. Service starts
6. POST /payments/capture
   - Capture payment (move to escrow)
   - Update status to CAPTURED
7. Service completes
8. Wait 24 hours (escrow hold period)
9. Automatic escrow release (cron job)
   - Calculate commission
   - Transfer to professional balance
   - Generate invoice/receipt
   - Send email notification
10. Professional requests payout
11. Process payout to bank account
```

### 2. Invoice vs Receipt

**WITH_INVOICE (Faturalı)**:
- Requires tax ID (RFC in Mexico)
- Includes VAT/tax calculation
- Official invoice document
- Legal compliance
- Higher amount typically

**WITHOUT_INVOICE (Faturasız)**:
- No tax ID required
- No tax calculation
- Simple receipt
- Faster processing
- Smaller amounts typically

## API Examples

### Create Payment Intent (With Invoice)

```typescript
POST /payments/intent
{
  "bookingId": "uuid",
  "amount": 1000,
  "currency": "MXN",
  "invoiceType": "with_invoice",
  "invoiceData": {
    "customerName": "Juan Pérez",
    "customerTaxId": "XAXX010101000",
    "customerAddress": "Calle Principal 123",
    "customerCity": "Ciudad de México",
    "customerCountry": "MX",
    "customerPostalCode": "01000",
    "customerEmail": "juan@example.com"
  }
}

Response:
{
  "paymentId": "uuid",
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 1160,      // 1000 + 16% tax
  "taxAmount": 160,
  "currency": "MXN",
  "invoiceType": "with_invoice"
}
```

### Create Payment Intent (Without Invoice)

```typescript
POST /payments/intent
{
  "bookingId": "uuid",
  "amount": 500,
  "currency": "MXN",
  "invoiceType": "without_invoice"
}

Response:
{
  "paymentId": "uuid",
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 500,
  "taxAmount": 0,
  "currency": "MXN",
  "invoiceType": "without_invoice"
}
```

### Request Payout

```typescript
POST /payments/professionals/:id/payout
{
  "amount": 5000
}

Response:
{
  "id": "uuid",
  "professionalId": "uuid",
  "amount": 5000,
  "currency": "MXN",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Database Schema

### Payment
- id, bookingId, orderId
- amount, currency, status
- paymentMethod, stripePaymentId
- platformFee, professionalAmount
- invoiceType, taxAmount

### Invoice
- id, bookingId, orderId, invoiceNumber
- issueDate, dueDate
- customerName, customerTaxId, customerAddress
- items (JSONB), subtotal, taxRate, taxAmount, total
- pdfUrl, status

### Receipt
- id, bookingId, orderId, receiptNumber
- issueDate, amount, currency
- description, pdfUrl

### Balance
- id, professionalId
- available, pending, currency

### Payout
- id, professionalId
- amount, currency, status
- stripeTransferId, failureReason
- completedAt

## Escrow System

### Automatic Release

The escrow service runs a cron job every hour to check for payments ready to be released:

```typescript
@Cron(CronExpression.EVERY_HOUR)
async processEscrowReleases()
```

**Release Conditions**:
1. Booking status = COMPLETED
2. Payment status = CAPTURED
3. Time since completion >= 24 hours

**Release Process**:
1. Calculate platform commission (15%)
2. Calculate professional amount (85%)
3. Update payment record
4. Add funds to professional balance
5. Send notification

### Manual Release

```typescript
// For admin or special cases
POST /payments/escrow/release/:bookingId
```

## Commission Calculation

```typescript
const commissionRate = 0.15; // 15%
const platformFee = amount * commissionRate;
const professionalAmount = amount - platformFee;

// Example: 1000 MXN payment
// Platform fee: 150 MXN
// Professional gets: 850 MXN
```

## Tax Calculation

```typescript
// Mexico (MX): 16% VAT
// Argentina (AR): 21% VAT
// Brazil (BR): 17% (simplified)
// Chile (CL): 19% VAT
// Colombia (CO): 19% VAT
// Peru (PE): 18% VAT

const taxRate = 0.16; // Mexico
const subtotal = 1000;
const taxAmount = subtotal * taxRate; // 160
const total = subtotal + taxAmount; // 1160
```

## Webhook Events

### Supported Events

- `payment_intent.succeeded` - Payment authorized
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment canceled
- `charge.refunded` - Payment refunded

### Webhook Endpoint

```
POST /webhooks/stripe
Header: stripe-signature
```

### Testing Webhooks Locally

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
```

## Error Handling

### Common Errors

- `Payment not found` - Invalid payment ID
- `Insufficient balance` - Not enough funds for payout
- `Payment cannot be captured in X status` - Invalid state transition
- `Tax ID required for invoice payments` - Missing required data
- `Minimum payout amount is 100 MXN` - Amount too small

## Testing

### Unit Tests
```bash
npm test payment.service.spec.ts
npm test escrow.service.spec.ts
npm test invoice.service.spec.ts
npm test payout.service.spec.ts
```

### Integration Tests
```bash
npm test payment.integration.spec.ts
```

### Property-Based Tests
```bash
npm test payment.property.spec.ts
```

## Security

- All payment data encrypted in database
- Stripe handles sensitive card data (PCI compliant)
- Webhook signature verification
- JWT authentication required for all endpoints
- Role-based access control

## Monitoring

### Key Metrics
- Payment success rate
- Average escrow hold time
- Payout processing time
- Commission revenue
- Failed payment reasons

### Logs
- Payment intent creation
- Payment capture
- Escrow releases
- Payout processing
- Webhook events

## Future Enhancements

1. **PDF Generation**: Implement actual PDF generation using pdfkit or puppeteer
2. **Multiple Payment Methods**: Add support for bank transfers, cash, etc.
3. **Recurring Payments**: Subscription support
4. **Split Payments**: Multiple professionals per booking
5. **Currency Conversion**: Multi-currency support
6. **Dispute Management**: Handle payment disputes
7. **Analytics Dashboard**: Payment analytics and reporting
