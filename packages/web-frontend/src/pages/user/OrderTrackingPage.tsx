import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useGetOrderQuery,
  useCancelOrderMutation,
} from '../../store/api/productApi';
import { OrderStatus } from '../../types';

const statusSteps = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'confirmed', label: 'Confirmado' },
  { key: 'preparing', label: 'Preparando' },
  { key: 'shipped', label: 'Enviado' },
  { key: 'delivered', label: 'Entregado' },
];

const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, error } = useGetOrderQuery(orderId!);
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Por favor, proporciona un motivo de cancelación');
      return;
    }

    try {
      await cancelOrder({ orderId: orderId!, reason: cancelReason }).unwrap();
      setShowCancelModal(false);
      alert('Pedido cancelado exitosamente');
    } catch (err) {
      alert('Error al cancelar el pedido');
    }
  };

  const getStatusIndex = (status: OrderStatus): number => {
    return statusSteps.findIndex((step) => step.key === status.toLowerCase());
  };

  const canCancel = order && (order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido no encontrado</h2>
          <Link to="/orders" className="text-blue-600 hover:text-blue-700">
            Ver mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/orders" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Volver a mis pedidos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Pedido #{order.orderNumber}</h1>
          <p className="text-gray-600 mt-1">
            Realizado el {new Date(order.createdAt).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status Timeline */}
            {order.status !== OrderStatus.CANCELLED && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Estado del pedido</h2>
                <div className="relative">
                  <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="relative flex justify-between">
                    {statusSteps.map((step, index) => (
                      <div key={step.key} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                            index <= currentStatusIndex
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-400'
                          }`}
                        >
                          {index < currentStatusIndex ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-center text-gray-600">{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cancelled Status */}
            {order.status === OrderStatus.CANCELLED && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <svg className="h-6 w-6 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Pedido cancelado</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Este pedido fue cancelado el{' '}
                      {order.updatedAt && new Date(order.updatedAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking Information */}
            {order.trackingNumber && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de envío</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Número de rastreo</p>
                    <p className="text-base font-medium text-gray-900">{order.trackingNumber}</p>
                  </div>
                  {order.carrier && (
                    <div>
                      <p className="text-sm text-gray-600">Paquetería</p>
                      <p className="text-base font-medium text-gray-900">{order.carrier}</p>
                    </div>
                  )}
                  {order.estimatedDelivery && (
                    <div>
                      <p className="text-sm text-gray-600">Entrega estimada</p>
                      <p className="text-base font-medium text-gray-900">
                        {new Date(order.estimatedDelivery).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos</h2>
              <div className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <div key={item.id} className="py-4 flex items-center space-x-4">
                    <img
                      src={item.productImage || '/placeholder-product.png'}
                      alt={item.productName}
                      className="w-20 h-20 object-cover rounded-md"
                    />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{item.productName}</h3>
                      <p className="text-sm text-gray-500 mt-1">Cantidad: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">
                        ${item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dirección de envío</h2>
              <p className="text-sm text-gray-700">
                {order.shippingAddress.address}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}
                <br />
                {order.shippingAddress.postalCode}, {order.shippingAddress.country}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    ${order.subtotal.toFixed(2)} {order.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envío</span>
                  <span className="font-medium text-gray-900">
                    ${order.shippingCost.toFixed(2)} {order.currency}
                  </span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA</span>
                    <span className="font-medium text-gray-900">
                      ${order.tax.toFixed(2)} {order.currency}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-base font-semibold text-gray-900">
                      ${order.total.toFixed(2)} {order.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
              <div className="space-y-3">
                {order.status === OrderStatus.DELIVERED && (
                  <Link
                    to={`/orders/${order.id}/review`}
                    className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                  >
                    Dejar reseña
                  </Link>
                )}
                {canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="block w-full text-center border border-red-600 text-red-600 py-2 px-4 rounded-md hover:bg-red-50"
                  >
                    Cancelar pedido
                  </button>
                )}
                <Link
                  to="/support"
                  className="block w-full text-center border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
                >
                  Contactar soporte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancelar pedido</h3>
            <p className="text-sm text-gray-600 mb-4">
              Por favor, indica el motivo de la cancelación:
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Motivo de cancelación..."
            />
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
              >
                Volver
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingPage;
