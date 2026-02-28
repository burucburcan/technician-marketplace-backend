import React, { useState } from 'react';
import { useCreateProductReviewMutation, useCreateSupplierReviewMutation } from '../../store/api/productApi';

interface ProductReviewFormProps {
  orderId: string;
  productId: string;
  supplierId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ProductReviewForm: React.FC<ProductReviewFormProps> = ({
  orderId,
  productId,
  supplierId,
  onSuccess,
  onCancel,
}) => {
  const [createProductReview, { isLoading: isSubmittingProduct }] = useCreateProductReviewMutation();
  const [createSupplierReview, { isLoading: isSubmittingSupplier }] = useCreateSupplierReviewMutation();

  const [productRating, setProductRating] = useState(0);
  const [productComment, setProductComment] = useState('');
  const [productImages, setProductImages] = useState<File[]>([]);

  const [supplierRatings, setSupplierRatings] = useState({
    productQuality: 0,
    deliverySpeed: 0,
    communication: 0,
  });
  const [supplierComment, setSupplierComment] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + productImages.length > 5) {
        alert('Máximo 5 imágenes permitidas');
        return;
      }
      setProductImages([...productImages, ...files]);
    }
  };

  const removeProductImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (productRating === 0) {
      newErrors.productRating = 'Por favor, califica el producto';
    }
    if (!productComment.trim()) {
      newErrors.productComment = 'Por favor, escribe un comentario sobre el producto';
    }
    if (supplierRatings.productQuality === 0) {
      newErrors.productQuality = 'Por favor, califica la calidad del producto';
    }
    if (supplierRatings.deliverySpeed === 0) {
      newErrors.deliverySpeed = 'Por favor, califica la velocidad de entrega';
    }
    if (supplierRatings.communication === 0) {
      newErrors.communication = 'Por favor, califica la comunicación';
    }
    if (!supplierComment.trim()) {
      newErrors.supplierComment = 'Por favor, escribe un comentario sobre el proveedor';
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
      // Submit product review
      const productReviewData = new FormData();
      productReviewData.append('orderId', orderId);
      productReviewData.append('productId', productId);
      productReviewData.append('rating', productRating.toString());
      productReviewData.append('comment', productComment);
      productImages.forEach((image) => {
        productReviewData.append('images', image);
      });

      await createProductReview(productReviewData).unwrap();

      // Submit supplier review
      const overallRating =
        (supplierRatings.productQuality + supplierRatings.deliverySpeed + supplierRatings.communication) / 3;

      await createSupplierReview({
        orderId,
        supplierId,
        productQualityRating: supplierRatings.productQuality,
        deliverySpeedRating: supplierRatings.deliverySpeed,
        communicationRating: supplierRatings.communication,
        overallRating,
        comment: supplierComment,
      }).unwrap();

      alert('Reseñas enviadas exitosamente');
      onSuccess?.();
    } catch (err) {
      alert('Error al enviar las reseñas. Por favor, intenta de nuevo.');
    }
  };

  const StarRating: React.FC<{
    rating: number;
    onRatingChange: (rating: number) => void;
    label: string;
    error?: string;
  }> = ({ rating, onRatingChange, label, error }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="focus:outline-none"
          >
            <svg
              className={`h-8 w-8 ${
                star <= rating ? 'text-yellow-400' : 'text-gray-300'
              } hover:text-yellow-400 transition-colors`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Product Review Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Califica el producto</h2>

        <div className="space-y-6">
          <StarRating
            rating={productRating}
            onRatingChange={setProductRating}
            label="Calificación general del producto *"
            error={errors.productRating}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu opinión sobre el producto *
            </label>
            <textarea
              value={productComment}
              onChange={(e) => setProductComment(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.productComment ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Cuéntanos sobre tu experiencia con este producto..."
            />
            {errors.productComment && (
              <p className="mt-1 text-sm text-red-600">{errors.productComment}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imágenes del producto (opcional, máximo 5)
            </label>
            <div className="space-y-4">
              {productImages.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {productImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeProductImage(index)}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {productImages.length < 5 && (
                <label className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-gray-400">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">Agregar imágenes</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProductImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Review Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Califica al proveedor</h2>

        <div className="space-y-6">
          <StarRating
            rating={supplierRatings.productQuality}
            onRatingChange={(rating) =>
              setSupplierRatings({ ...supplierRatings, productQuality: rating })
            }
            label="Calidad del producto *"
            error={errors.productQuality}
          />

          <StarRating
            rating={supplierRatings.deliverySpeed}
            onRatingChange={(rating) =>
              setSupplierRatings({ ...supplierRatings, deliverySpeed: rating })
            }
            label="Velocidad de entrega *"
            error={errors.deliverySpeed}
          />

          <StarRating
            rating={supplierRatings.communication}
            onRatingChange={(rating) =>
              setSupplierRatings({ ...supplierRatings, communication: rating })
            }
            label="Comunicación *"
            error={errors.communication}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu opinión sobre el proveedor *
            </label>
            <textarea
              value={supplierComment}
              onChange={(e) => setSupplierComment(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                errors.supplierComment ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Cuéntanos sobre tu experiencia con este proveedor..."
            />
            {errors.supplierComment && (
              <p className="mt-1 text-sm text-red-600">{errors.supplierComment}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmittingProduct || isSubmittingSupplier}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmittingProduct || isSubmittingSupplier ? 'Enviando...' : 'Enviar reseñas'}
        </button>
      </div>
    </form>
  );
};

export default ProductReviewForm;
