import { useTranslation } from 'react-i18next';
import { InvoiceType } from '../../store/api/paymentApi';

interface InvoiceOptionSelectorProps {
  selectedType: InvoiceType;
  onTypeChange: (type: InvoiceType) => void;
}

export const InvoiceOptionSelector = ({
  selectedType,
  onTypeChange,
}: InvoiceOptionSelectorProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="invoice-option-selector">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t('payment.invoiceOption')}
      </h2>

      <div className="space-y-4">
        {/* With Invoice Option */}
        <label
          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selectedType === InvoiceType.WITH_INVOICE
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          data-testid="invoice-option-with"
        >
          <input
            type="radio"
            name="invoiceType"
            value={InvoiceType.WITH_INVOICE}
            checked={selectedType === InvoiceType.WITH_INVOICE}
            onChange={() => onTypeChange(InvoiceType.WITH_INVOICE)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
            data-testid="invoice-radio-with"
          />
          <div className="ml-3 flex-1">
            <div className="font-medium text-gray-900">
              {t('payment.withInvoice')}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {t('payment.withInvoiceDescription')}
            </div>
          </div>
        </label>

        {/* Without Invoice Option */}
        <label
          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            selectedType === InvoiceType.WITHOUT_INVOICE
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          data-testid="invoice-option-without"
        >
          <input
            type="radio"
            name="invoiceType"
            value={InvoiceType.WITHOUT_INVOICE}
            checked={selectedType === InvoiceType.WITHOUT_INVOICE}
            onChange={() => onTypeChange(InvoiceType.WITHOUT_INVOICE)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
            data-testid="invoice-radio-without"
          />
          <div className="ml-3 flex-1">
            <div className="font-medium text-gray-900">
              {t('payment.withoutInvoice')}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {t('payment.withoutInvoiceDescription')}
            </div>
          </div>
        </label>
      </div>
    </div>
  );
};
