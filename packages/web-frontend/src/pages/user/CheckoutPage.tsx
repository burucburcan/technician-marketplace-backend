import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCartQuery, useCreateOrderMutation } from '../../store/api/productApi';
import { Location } from '../../types';

interface CheckoutForm {
  shippingAddress: Location;
  billingAddress: Location;
  sameAsShipping: boolean;
  paymentMethod: string;
  invoiceType: 'with_invoice' | 'without_invoice';
  taxId?: string;
  invoiceCompanyName?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: cart, isLoading: isLoadingCart } = useGetCartQuery();
  const [createOrder, { isLoading: isCreatingOrder }] = useCreateOrderMutation();

  const [formData, setFormData] = useState<CheckoutForm>({
    shippingAddress: {
      address: '',
      city: '',
      state: '',
      country: 'México',
      postalCode: '',
      coordinates: { latitude: 0, longitude: 0 },
    },
    billingAddress: {
      address: '',
      city: '',
      state: '',
      country: 'México',
      postalCode: '',
      coordinates: { latitude: 0, longitude: 0 },
    },
    sameAsShipping: true,
    paymentMethod: 'card',
    invoiceType: 'without_invoice',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (type: 'shippingAddress' | 'billingAddress', field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate shipping address
    if (!formData.shippingAddress.address) newErrors.shippingAddress = 'La dirección es requerida';
    if (!formData.shippingAddress.city) newErrors.shippingCity = 'La ciudad es requerida';
    if (!formData.shippingAddress.state) newErrors.shippingState = 'El estado es requerido';
    if (!formData.shippingAddress.postalCode) newErrors.shippingPostalCode = 'El código postal es requerido';

    // Validate billing address if different
    if (!formData.sameAsShipping) {
      if (!formData.billingAddress.address) newErrors.billingAddress = 'La dirección es requerida';
      if (!formData.billingAddress.city) newErrors.billingCity = 'La ciudad es requerida';
      if (!formData.billingAddress.state) newErrors.billingState = 'El estado es requerido';
      if (!formData.billingAddress.postalCode) newErrors.billingPostalCode = 'El código postal es requerido';
    }

    // Validate invoice data if required
    if (formData.invoiceType === 'with_invoice') {
      if (!formData.taxId) newErrors.taxId = 'El RFC es requerido';
      if (!formData.invoiceCompanyName) newErrors.invoiceCompanyName = 'El nombre de la empresa es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const orderData = {
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
        paymentMethod: formData.paymentMethod,
        invoiceType: formData.invoiceType,
        ...(formData.invoiceType === 'with_invoice' && {
          taxId: formData.taxId,
          invoiceCompanyName: formData.invoiceCompanyName,
        }),
      };

      const order = await createOrder(orderData).unwrap();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      alert('Error al crear el pedido. Por favor, intenta de nuevo.');
    }
  };

  if (isLoadingCart) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Finalizar compra</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección de envío</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección completa *
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress.address}
                    onChange={(e) => handleAddressChange('shippingAddress', 'address', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.shippingAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Calle, número, colonia"
                  />
                  {errors.shippingAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.shippingAddress}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                    <input
                      type="text"
                      value={formData.shippingAddress.city}
                      onChange={(e) => handleAddressChange('shippingAddress', 'city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.shippingCity ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.shippingCity && (
                      <p className="mt-1 text-sm text-red-600">{errors.shippingCity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                    <input
                      type="text"
                      value={formData.shippingAddress.state}
                      onChange={(e) => handleAddressChange('shippingAddress', 'state', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.shippingState ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.shippingState && (
                      <p className="mt-1 text-sm text-red-600">{errors.shippingState}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código postal *
                    </label>
                    <input
                      type="text"
                      value={formData.shippingAddress.postalCode}
                      onChange={(e) => handleAddressChange('shippingAddress', 'postalCode', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.shippingPostalCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.shippingPostalCode && (
                      <p className="mt-1 text-sm text-red-600">{errors.shippingPostalCode}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                    <input
                      type="text"
                      value={formData.shippingAddress.country}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Dirección de facturación</h2>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.sameAsShipping}
                    onChange={(e) => handleInputChange('sameAsShipping', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Igual que dirección de envío</span>
                </label>
              </div>

              {!formData.sameAsShipping && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección completa *
                    </label>
                    <input
                      type="text"
                      value={formData.billingAddress.address}
                      onChange={(e) => handleAddressChange('billingAddress', 'address', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.billingAddress ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.billingAddress && (
                      <p className="mt-1 text-sm text-red-600">{errors.billingAddress}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                      <input
                        type="text"
                        value={formData.billingAddress.city}
                        onChange={(e) => handleAddressChange('billingAddress', 'city', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.billingCity ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                      <input
                        type="text"
                        value={formData.billingAddress.state}
                        onChange={(e) => handleAddressChange('billingAddress', 'state', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.billingState ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código postal *
                      </label>
                      <input
                        type="text"
                        value={formData.billingAddress.postalCode}
                        onChange={(e) => handleAddressChange('billingAddress', 'postalCode', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.billingPostalCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                      <input
                        type="text"
                        value={formData.billingAddress.country}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoice Options */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Opciones de facturación</h2>
              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    type="radio"
                    value="without_invoice"
                    checked={formData.invoiceType === 'without_invoice'}
                    onChange={(e) => handleInputChange('invoiceType', e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Sin factura</span>
                    <p className="text-sm text-gray-500">Recibirás un recibo de compra simple</p>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="radio"
                    value="with_invoice"
                    checked={formData.invoiceType === 'with_invoice'}
                    onChange={(e) => handleInputChange('invoiceType', e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Con factura</span>
                    <p className="text-sm text-gray-500">Recibirás una factura fiscal oficial</p>
                  </div>
                </label>

                {formData.invoiceType === 'with_invoice' && (
                  <div className="ml-7 space-y-4 pt-4 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RFC *</label>
                      <input
                        type="text"
                        value={formData.taxId || ''}
                        onChange={(e) => handleInputChange('taxId', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.taxId ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="XAXX010101000"
                      />
                      {errors.taxId && <p className="mt-1 text-sm text-red-600">{errors.taxId}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Razón social *
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceCompanyName || ''}
                        onChange={(e) => handleInputChange('invoiceCompanyName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.invoiceCompanyName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.invoiceCompanyName && (
                        <p className="mt-1 text-sm text-red-600">{errors.invoiceCompanyName}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Método de pago</h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    Tarjeta de crédito/débito
                  </span>
                </label>

                <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="wallet"
                    checked={formData.paymentMethod === 'wallet'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-900">Billetera digital</span>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen del pedido</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    ${cart.subtotal.toFixed(2)} {cart.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envío</span>
                  <span className="font-medium text-gray-900">$50.00 {cart.currency}</span>
                </div>
                {formData.invoiceType === 'with_invoice' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (16%)</span>
                    <span className="font-medium text-gray-900">
                      ${((cart.subtotal + 50) * 0.16).toFixed(2)} {cart.currency}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-base font-semibold text-gray-900">
                      $
                      {formData.invoiceType === 'with_invoice'
                        ? ((cart.subtotal + 50) * 1.16).toFixed(2)
                        : (cart.subtotal + 50).toFixed(2)}{' '}
                      {cart.currency}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingOrder}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isCreatingOrder ? 'Procesando...' : 'Confirmar pedido'}
              </button>

              <p className="mt-4 text-xs text-gray-500 text-center">
                Al confirmar, aceptas nuestros términos y condiciones
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
