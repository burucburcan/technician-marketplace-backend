import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { InvoiceType } from '../../store/api/paymentApi';
import { BookingDetail } from '../../store/api/bookingApi';
import { useGetInvoiceQuery, useGetReceiptQuery } from '../../store/api/paymentApi';

interface PaymentSuccessProps {
  booking: BookingDetail;
  invoiceId?: string;
  receiptId?: string;
  invoiceType: InvoiceType;
}

export const PaymentSuccess = ({
  booking,
  invoiceId,
  receiptId,
  invoiceType,
}: PaymentSuccessProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Fetch invoice or receipt data
  const { data: invoice } = useGetInvoiceQuery(invoiceId || '', {
    skip: !invoiceId || invoiceType !== InvoiceType.WITH_INVOICE,
  });

  const { data: receipt } = useGetReceiptQuery(receiptId || '', {
    skip: !receiptId || invoiceType !== InvoiceType.WITHOUT_INVOICE,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  const handleDownload = () => {
    const url = invoice?.pdfUrl || receipt?.pdfUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4" data-testid="payment-success">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="success-title">
          {t('payment.paymentSuccess')}
        </h1>
        <p className="text-gray-600">{t('payment.paymentSuccessMessage')}</p>
      </div>

      {/* Payment Details Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        {/* Invoice/Receipt Information */}
        {invoiceType === InvoiceType.WITH_INVOICE && invoice && (
          <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.invoiceNumber')}</span>
              <span className="font-medium text-gray-900" data-testid="invoice-number">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.issueDate')}</span>
              <span className="font-medium text-gray-900">{formatDate(invoice.issueDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.customerName')}</span>
              <span className="font-medium text-gray-900">{invoice.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.taxId')}</span>
              <span className="font-medium text-gray-900">{invoice.customerTaxId}</span>
            </div>
          </div>
        )}

        {invoiceType === InvoiceType.WITHOUT_INVOICE && receipt && (
          <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.receiptNumber')}</span>
              <span className="font-medium text-gray-900" data-testid="receipt-number">{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('payment.issueDate')}</span>
              <span className="font-medium text-gray-900">{formatDate(receipt.issueDate)}</span>
            </div>
          </div>
        )}

        {/* Booking Information */}
        <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
          <div className="flex justify-between">
            <span className="text-gray-600">{t('booking.serviceCategory')}</span>
            <span className="font-medium text-gray-900">{booking.serviceCategory}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t('booking.professional')}</span>
            <span className="font-medium text-gray-900">{booking.professionalName}</span>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="space-y-3">
          {invoiceType === InvoiceType.WITH_INVOICE && invoice && (
            <>
              <div className="flex justify-between text-gray-900">
                <span>{t('payment.subtotal')}</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-900">
                <span>
                  {t('payment.tax')} ({(invoice.taxRate * 100).toFixed(0)}%)
                </span>
                <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
            <span>{t('payment.total')}</span>
            <span data-testid="success-total">
              {formatCurrency(
                invoice?.total || receipt?.amount || booking.estimatedPrice
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={handleDownload}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          data-testid="download-button"
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {invoiceType === InvoiceType.WITH_INVOICE
            ? t('payment.downloadInvoice')
            : t('payment.downloadReceipt')}
        </button>

        <button
          onClick={() => navigate(`/bookings/${booking.id}`)}
          className="flex-1 bg-white text-gray-700 py-3 px-6 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
          data-testid="back-to-booking-button"
        >
          {t('payment.backToBooking')}
        </button>
      </div>
    </div>
  );
};
