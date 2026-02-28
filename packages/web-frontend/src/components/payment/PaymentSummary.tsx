import { useTranslation } from 'react-i18next';
import { InvoiceType } from '../../store/api/paymentApi';
import { BookingDetail } from '../../store/api/bookingApi';
import { useLazyCalculateTaxQuery } from '../../store/api/paymentApi';
import { useEffect } from 'react';

interface PaymentSummaryProps {
  booking: BookingDetail;
  invoiceType: InvoiceType;
}

export const PaymentSummary = ({ booking, invoiceType }: PaymentSummaryProps) => {
  const { t } = useTranslation();
  const [calculateTax, { data: taxCalculation }] = useLazyCalculateTaxQuery();

  useEffect(() => {
    if (invoiceType === InvoiceType.WITH_INVOICE) {
      calculateTax({ amount: booking.estimatedPrice, country: 'MX' });
    }
  }, [invoiceType, booking.estimatedPrice, calculateTax]);

  const subtotal = invoiceType === InvoiceType.WITH_INVOICE 
    ? (taxCalculation?.subtotal || booking.estimatedPrice)
    : booking.estimatedPrice;
  
  const taxAmount = invoiceType === InvoiceType.WITH_INVOICE 
    ? (taxCalculation?.taxAmount || 0)
    : 0;
  
  const taxRate = invoiceType === InvoiceType.WITH_INVOICE 
    ? (taxCalculation?.taxRate || 0.16)
    : 0;
  
  const total = invoiceType === InvoiceType.WITH_INVOICE 
    ? (taxCalculation?.total || booking.estimatedPrice)
    : booking.estimatedPrice;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 sticky top-6" data-testid="payment-summary">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t('payment.paymentDetails')}
      </h2>

      {/* Booking Information */}
      <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
        <div>
          <div className="text-sm text-gray-600">{t('booking.serviceCategory')}</div>
          <div className="font-medium text-gray-900">{booking.serviceCategory}</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">{t('booking.professional')}</div>
          <div className="font-medium text-gray-900">{booking.professionalName}</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">{t('booking.scheduledFor')}</div>
          <div className="font-medium text-gray-900">{formatDate(booking.scheduledDate)}</div>
        </div>

        <div>
          <div className="text-sm text-gray-600">{t('booking.estimatedDuration')}</div>
          <div className="font-medium text-gray-900">
            {booking.estimatedDuration} {t('booking.minutes')}
          </div>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-3">
        <div className="flex justify-between text-gray-900">
          <span>{t('payment.subtotal')}</span>
          <span className="font-medium" data-testid="payment-subtotal">{formatCurrency(subtotal)}</span>
        </div>

        {invoiceType === InvoiceType.WITH_INVOICE && (
          <>
            <div className="flex justify-between text-gray-900">
              <span>
                {t('payment.tax')} ({(taxRate * 100).toFixed(0)}%)
              </span>
              <span className="font-medium" data-testid="payment-tax">{formatCurrency(taxAmount)}</span>
            </div>
          </>
        )}

        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between text-lg font-bold text-gray-900">
            <span>{t('payment.total')}</span>
            <span data-testid="payment-total">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Invoice Type Badge */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{t('payment.invoiceOption')}</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              invoiceType === InvoiceType.WITH_INVOICE
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
            data-testid="payment-invoice-type"
          >
            {invoiceType === InvoiceType.WITH_INVOICE
              ? t('payment.withInvoice')
              : t('payment.withoutInvoice')}
          </span>
        </div>
      </div>
    </div>
  );
};
