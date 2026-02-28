import { useState, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  useCreatePaymentIntentMutation,
  InvoiceType,
  InvoiceData,
} from '../../store/api/paymentApi';
import { BookingDetail } from '../../store/api/bookingApi';

interface PaymentFormProps {
  booking: BookingDetail;
  invoiceType: InvoiceType;
  invoiceData?: InvoiceData;
  onSuccess: (result: { invoiceId?: string; receiptId?: string }) => void;
}

export const PaymentForm = ({
  booking,
  invoiceType,
  invoiceData,
  onSuccess,
}: PaymentFormProps) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const [createPaymentIntent, { isLoading: isProcessing }] = useCreatePaymentIntentMutation();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setError(null);

    // Validate invoice data if WITH_INVOICE is selected
    if (invoiceType === InvoiceType.WITH_INVOICE) {
      if (!invoiceData || !invoiceData.customerTaxId || !invoiceData.customerName) {
        setError(t('payment.errors.invoiceDataRequired'));
        return;
      }
    }

    try {
      // Create payment intent
      const paymentIntentResult = await createPaymentIntent({
        bookingId: booking.id,
        amount: booking.estimatedPrice,
        currency: 'MXN',
        invoiceType,
        invoiceData: invoiceType === InvoiceType.WITH_INVOICE ? invoiceData : undefined,
      }).unwrap();

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentResult.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || t('payment.errors.paymentFailed'));
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        // In a real implementation, the backend would generate invoice/receipt
        // and return the IDs via webhook or API response
        onSuccess({
          invoiceId: invoiceType === InvoiceType.WITH_INVOICE ? 'invoice-id' : undefined,
          receiptId: invoiceType === InvoiceType.WITHOUT_INVOICE ? 'receipt-id' : undefined,
        });
      }
    } catch (err: any) {
      setError(err.message || t('payment.errors.paymentFailed'));
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="payment-form">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t('payment.paymentMethod')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('payment.cardInformation')}
          </label>
          <div className="p-4 border border-gray-300 rounded-lg" data-testid="card-element">
            <CardElement options={cardElementOptions} />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="payment-error">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-sm text-red-800">{error}</div>
            </div>
          </div>
        )}

        {/* Secure Payment Notice */}
        <div className="flex items-center text-sm text-gray-600">
          <svg
            className="w-5 h-5 text-green-600 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {t('payment.securePayment')}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          data-testid="payment-submit"
        >
          {isProcessing ? t('payment.processing') : t('payment.payNow')}
        </button>
      </form>
    </div>
  );
};
