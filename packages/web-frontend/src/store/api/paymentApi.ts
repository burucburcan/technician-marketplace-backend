import { api } from '../api';

export enum InvoiceType {
  WITH_INVOICE = 'with_invoice',
  WITHOUT_INVOICE = 'without_invoice',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export interface InvoiceData {
  customerName: string;
  customerTaxId: string;
  customerAddress: string;
  customerCity: string;
  customerCountry: string;
  customerPostalCode: string;
  customerEmail: string;
}

export interface CreatePaymentIntentDTO {
  bookingId?: string;
  orderId?: string;
  amount: number;
  currency: string;
  invoiceType: InvoiceType;
  invoiceData?: InvoiceData;
}

export interface PaymentIntent {
  paymentId: string;
  clientSecret: string;
  amount: number;
  taxAmount: number;
  currency: string;
  invoiceType: InvoiceType;
}

export interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  customerTaxId: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  pdfUrl: string;
  status: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  issueDate: string;
  amount: number;
  currency: string;
  description: string;
  pdfUrl: string;
}

export const paymentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createPaymentIntent: builder.mutation<PaymentIntent, CreatePaymentIntentDTO>({
      query: (data) => ({
        url: '/payments/intent',
        method: 'POST',
        body: data,
      }),
    }),
    
    capturePayment: builder.mutation<{ paymentId: string; status: PaymentStatus }, string>({
      query: (paymentIntentId) => ({
        url: '/payments/capture',
        method: 'POST',
        body: { paymentIntentId },
      }),
    }),
    
    calculateTax: builder.query<TaxCalculation, { amount: number; country?: string }>({
      query: ({ amount, country = 'MX' }) => ({
        url: '/payments/calculate-tax',
        params: { amount, country },
      }),
    }),
    
    getInvoice: builder.query<Invoice, string>({
      query: (invoiceId) => `/payments/invoices/${invoiceId}`,
    }),
    
    getReceipt: builder.query<Receipt, string>({
      query: (receiptId) => `/payments/receipts/${receiptId}`,
    }),
  }),
});

export const {
  useCreatePaymentIntentMutation,
  useCapturePaymentMutation,
  useCalculateTaxQuery,
  useLazyCalculateTaxQuery,
  useGetInvoiceQuery,
  useGetReceiptQuery,
} = paymentApi;
