import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetOrderQuery } from '../../store/api/productApi';
import ProductReviewForm from '../../components/product/ProductReviewForm';

const OrderReviewPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error } = useGetOrderQuery(orderId!);

  const handleSuccess = () => {
    navigate(`/orders/${orderId}`);
  };

  const handleCancel = () => {
    navigate(`/orders/${orderId}`);
  };

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
          <button
            onClick={() => navigate('/orders')}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver a mis pedidos
          </button>
        </div>
      </div>
    );
  }

  if (order.status !== 'delivered') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Solo puedes dejar reseñas para pedidos entregados
          </h2>
          <button
            onClick={() => navigate(`/orders/${orderId}`)}
            className="text-blue-600 hover:text-blue-700"
          >
            Volver al pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dejar reseña</h1>
          <p className="text-gray-600">Pedido #{order.orderNumber}</p>
        </div>

        <ProductReviewForm
          orderId={orderId!}
          productId={order.items[0].productId}
          supplierId={order.supplierId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default OrderReviewPage;
