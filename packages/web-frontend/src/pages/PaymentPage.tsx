import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { InvoiceType } from '../store/api/paymentApi';
import { InvoiceOptionSelector } from '../components/payment/InvoiceOptionSelector';
import { InvoiceForm } from '../components/payment/InvoiceForm';
import { PaymentForm } from '../components/payment/PaymentForm';
import { PaymentSummary } from '../components/payment/PaymentSummary';
import { PaymentSuccess } from '../components/payment/PaymentSuccess';
import { useGetBookingDetailQuery } from '../store/api/bookingApi';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export const PaymentPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [invoiceType, setInvoiceType] = useState<InvoiceType>(InvoiceType.WITHOUT_INVOICE);
  const [invoiceData, setInvoiceData] = useState({
    customerName: '',
    customerTaxId: '',
    customerAddress: '',
    customerCity: '',
    customerCountry: 'MX',
    customerPostalCode: '',
    customerEmail: '',
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    invoiceId?: string;
    receiptId?: string;
  } | null>(null);

  // Fetch booking details
  const { data: booking, isLoading: isLoadingBooking } = useGetBookingDetailQuery(
    bookingId || '',
    {
      skip: !bookingId,
    }
  );

  useEffect(() => {
    if (!bookingId) {
      navigate('/bookings');
    }
  }, [bookingId, navigate]);

  const handleInvoiceTypeChange = (type: InvoiceType) => {
    setInvoiceType(type);
  };

  const handleInvoiceDataChange = (data: typeof invoiceData) => {
    setInvoiceData(data);
  };

  const handlePaymentSuccess = (result: { invoiceId?: string; receiptId?: string }) => {
    setPaymentSuccess(true);
    setPaymentResult(result);
  };

  if (isLoadingBooking) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('booking.error.loadFailed')}
          </h2>
          <button
            onClick={() => navigate('/bookings')}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  if (paymentSuccess && paymentResult) {
    return (
      <PaymentSuccess
        booking={booking}
        invoiceId={paymentResult.invoiceId}
        receiptId={paymentResult.receiptId}
        invoiceType={invoiceType}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/bookings/${bookingId}`)}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('common.back')}
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('payment.title')}</h1>
      <p className="text-gray-600 mb-8">
        {t('payment.paymentFor')}: {booking.serviceCategory}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Payment form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice option selector */}
          <InvoiceOptionSelector
            selectedType={invoiceType}
            onTypeChange={handleInvoiceTypeChange}
          />

          {/* Invoice form (only shown if WITH_INVOICE is selected) */}
          {invoiceType === InvoiceType.WITH_INVOICE && (
            <InvoiceForm
              invoiceData={invoiceData}
              onDataChange={handleInvoiceDataChange}
            />
          )}

          {/* Payment form with Stripe Elements */}
          <Elements stripe={stripePromise}>
            <PaymentForm
              booking={booking}
              invoiceType={invoiceType}
              invoiceData={invoiceType === InvoiceType.WITH_INVOICE ? invoiceData : undefined}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        </div>

        {/* Right column - Payment summary */}
        <div className="lg:col-span-1">
          <PaymentSummary
            booking={booking}
            invoiceType={invoiceType}
          />
        </div>
      </div>
    </div>
  );
};
