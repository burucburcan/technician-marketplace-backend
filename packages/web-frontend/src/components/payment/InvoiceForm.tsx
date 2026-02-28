import { useTranslation } from 'react-i18next';
import { InvoiceData } from '../../store/api/paymentApi';

interface InvoiceFormProps {
  invoiceData: InvoiceData;
  onDataChange: (data: InvoiceData) => void;
}

export const InvoiceForm = ({ invoiceData, onDataChange }: InvoiceFormProps) => {
  const { t } = useTranslation();

  const handleChange = (field: keyof InvoiceData, value: string) => {
    onDataChange({
      ...invoiceData,
      [field]: value,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="invoice-form">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t('payment.invoiceInformation')}
      </h2>

      <div className="space-y-4">
        {/* Customer Name */}
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
            {t('payment.customerName')} *
          </label>
          <input
            type="text"
            id="customerName"
            value={invoiceData.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
            placeholder={t('payment.customerNamePlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="invoice-customer-name"
            required
          />
        </div>

        {/* Tax ID */}
        <div>
          <label htmlFor="customerTaxId" className="block text-sm font-medium text-gray-700 mb-1">
            {t('payment.taxId')} *
          </label>
          <input
            type="text"
            id="customerTaxId"
            value={invoiceData.customerTaxId}
            onChange={(e) => handleChange('customerTaxId', e.target.value)}
            placeholder={t('payment.taxIdPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="invoice-tax-id"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
            {t('payment.email')} *
          </label>
          <input
            type="email"
            id="customerEmail"
            value={invoiceData.customerEmail}
            onChange={(e) => handleChange('customerEmail', e.target.value)}
            placeholder={t('payment.emailPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="invoice-email"
            required
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">
            {t('payment.address')} *
          </label>
          <input
            type="text"
            id="customerAddress"
            value={invoiceData.customerAddress}
            onChange={(e) => handleChange('customerAddress', e.target.value)}
            placeholder={t('payment.addressPlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="invoice-address"
            required
          />
        </div>

        {/* City and Postal Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="customerCity" className="block text-sm font-medium text-gray-700 mb-1">
              {t('payment.city')} *
            </label>
            <input
              type="text"
              id="customerCity"
              value={invoiceData.customerCity}
              onChange={(e) => handleChange('customerCity', e.target.value)}
              placeholder={t('payment.cityPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="invoice-city"
              required
            />
          </div>

          <div>
            <label htmlFor="customerPostalCode" className="block text-sm font-medium text-gray-700 mb-1">
              {t('payment.postalCode')} *
            </label>
            <input
              type="text"
              id="customerPostalCode"
              value={invoiceData.customerPostalCode}
              onChange={(e) => handleChange('customerPostalCode', e.target.value)}
              placeholder={t('payment.postalCodePlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="invoice-postal-code"
              required
            />
          </div>
        </div>

        {/* Country */}
        <div>
          <label htmlFor="customerCountry" className="block text-sm font-medium text-gray-700 mb-1">
            {t('payment.country')} *
          </label>
          <select
            id="customerCountry"
            value={invoiceData.customerCountry}
            onChange={(e) => handleChange('customerCountry', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="invoice-country"
            required
          >
            <option value="MX">México</option>
            <option value="AR">Argentina</option>
            <option value="BR">Brasil</option>
            <option value="CL">Chile</option>
            <option value="CO">Colombia</option>
            <option value="PE">Perú</option>
          </select>
        </div>
      </div>
    </div>
  );
};
