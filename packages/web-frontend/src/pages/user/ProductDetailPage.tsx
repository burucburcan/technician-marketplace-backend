import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  useGetProductDetailsQuery,
  useGetProductReviewsQuery,
  useAddToCartMutation,
} from '../../store/api/productApi';

// Constants to avoid re-creating on each render
const STAR_INDICES = [0, 1, 2, 3, 4];

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviewPage] = useState(1);

  const { data: product, isLoading, error } = useGetProductDetailsQuery(productId!);
  const { data: reviewsData } = useGetProductReviewsQuery({ productId: productId!, page: reviewPage });
  const [addToCart, { isLoading: isAddingToCart }] = useAddToCartMutation();

  const handleAddToCart = useCallback(async () => {
    try {
      await addToCart({ productId: productId!, quantity }).unwrap();
      alert('Producto agregado al carrito');
    } catch (err) {
      alert('Error al agregar al carrito');
    }
  }, [addToCart, productId, quantity]);

  const handleQuantityDecrease = useCallback(() => {
    setQuantity(prev => Math.max(1, prev - 1));
  }, []);

  const handleQuantityIncrease = useCallback(() => {
    if (product) {
      setQuantity(prev => Math.min(product.stockQuantity, prev + 1));
    }
  }, [product]);

  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(Math.max(1, parseInt(e.target.value) || 1));
  }, []);

  const handleImageSelect = useCallback((index: number) => {
    setSelectedImage(index);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Producto no encontrado</h2>
          <Link to="/products" className="text-blue-600 hover:text-blue-700">
            Volver a productos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                Inicio
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link to="/products" className="text-gray-500 hover:text-gray-700">
                Productos
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
              <div className="aspect-square">
                <img
                  src={product.images[selectedImage]?.url || '/placeholder-product.png'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => handleImageSelect(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImage === index
                        ? 'border-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.thumbnailUrl || image.url}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Brand */}
            {product.brand && (
              <p className="text-sm text-gray-500 uppercase tracking-wide mb-2">
                {product.brand}
              </p>
            )}

            {/* Product Name */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center mb-6">
              <div className="flex items-center">
                {STAR_INDICES.map((i) => (
                  <svg
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="ml-2 text-sm text-gray-600">
                {product.rating.toFixed(1)} ({product.totalReviews} reseñas)
              </span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <p className="text-4xl font-bold text-gray-900">
                ${product.price.toFixed(2)}
                <span className="text-xl font-normal text-gray-500 ml-2">
                  {product.currency}
                </span>
              </p>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.isAvailable && product.stockQuantity > 0 ? (
                <p className="text-green-600 font-medium">
                  En stock ({product.stockQuantity} disponibles)
                </p>
              ) : (
                <p className="text-red-600 font-medium">Agotado</p>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h2>
              <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>

            {/* Specifications */}
            {product.specifications.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Especificaciones</h2>
                <dl className="grid grid-cols-2 gap-4">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="border-b border-gray-200 pb-2">
                      <dt className="text-sm text-gray-500">{spec.key}</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {spec.value} {spec.unit}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            {product.isAvailable && product.stockQuantity > 0 && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    onClick={handleQuantityDecrease}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={handleQuantityChange}
                    className="w-16 text-center border-x border-gray-300 py-2 focus:outline-none"
                  />
                  <button
                    onClick={handleQuantityIncrease}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isAddingToCart ? 'Agregando...' : 'Agregar al carrito'}
                </button>
              </div>
            )}

            {/* Supplier Info */}
            {product.supplier && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Vendido por</h3>
                <Link
                  to={`/suppliers/${product.supplierId}`}
                  className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-md"
                >
                  {product.supplier.logo && (
                    <img
                      src={product.supplier.logo}
                      alt={product.supplier.companyName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {product.supplier.companyName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.supplier.rating.toFixed(1)} ⭐ ({product.supplier.totalOrders} pedidos)
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Reseñas de clientes</h2>

          {reviewsData && reviewsData.reviews.length > 0 ? (
            <div className="space-y-6">
              {reviewsData.reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-center mb-2">
                    <div className="flex items-center">
                      {STAR_INDICES.map((i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    {review.isVerifiedPurchase && (
                      <span className="ml-2 text-xs text-green-600 font-medium">
                        Compra verificada
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{review.comment}</p>
                  {review.images && review.images.length > 0 && (
                    <div className="flex space-x-2 mt-2">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="h-20 w-20 object-cover rounded-md"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Aún no hay reseñas para este producto
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
