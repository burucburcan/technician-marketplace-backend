import { api } from '../api';
import type { SupplierProfile, Product } from '../../types';

interface SupplierStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  completedOrders: number;
  averageRating: number;
  totalRevenue: number;
  responseRate: number;
}

export const supplierApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Supplier profile
    getSupplierProfile: builder.query<SupplierProfile, string>({
      query: (supplierId) => `/suppliers/${supplierId}`,
      providesTags: (_result, _error, id) => [{ type: 'Supplier', id }],
    }),

    updateSupplierProfile: builder.mutation<SupplierProfile, { supplierId: string; data: any }>({
      query: ({ supplierId, data }) => ({
        url: `/suppliers/${supplierId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { supplierId }) => [{ type: 'Supplier', id: supplierId }],
    }),

    // Product management
    createProduct: builder.mutation<Product, any>({
      query: (data) => ({
        url: '/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Product'],
    }),

    updateProduct: builder.mutation<Product, { productId: string; data: any }>({
      query: ({ productId, data }) => ({
        url: `/products/${productId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { productId }) => [{ type: 'Product', id: productId }],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (productId) => ({
        url: `/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),

    getSupplierProducts: builder.query<Product[], { supplierId: string; filters?: any }>({
      query: ({ supplierId, filters }) => ({
        url: `/suppliers/${supplierId}/products`,
        params: filters,
      }),
      providesTags: ['Product'],
    }),

    // Stock management
    updateStock: builder.mutation<Product, { productId: string; quantity: number }>({
      query: ({ productId, quantity }) => ({
        url: `/products/${productId}/stock`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: (_result, _error, { productId }) => [{ type: 'Product', id: productId }],
    }),

    // Product images
    uploadProductImage: builder.mutation<any, { productId: string; file: File }>({
      query: ({ productId, file }) => {
        const formData = new FormData();
        formData.append('image', file);
        return {
          url: `/products/${productId}/images`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { productId }) => [{ type: 'Product', id: productId }],
    }),

    deleteProductImage: builder.mutation<void, { productId: string; imageId: string }>({
      query: ({ productId, imageId }) => ({
        url: `/products/${productId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { productId }) => [{ type: 'Product', id: productId }],
    }),

    // Statistics
    getSupplierStats: builder.query<SupplierStats, string>({
      query: (supplierId) => `/suppliers/${supplierId}/stats`,
      providesTags: (_result, _error, id) => [{ type: 'Supplier', id }],
    }),
  }),
});

export const {
  useGetSupplierProfileQuery,
  useUpdateSupplierProfileMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetSupplierProductsQuery,
  useUpdateStockMutation,
  useUploadProductImageMutation,
  useDeleteProductImageMutation,
  useGetSupplierStatsQuery,
} = supplierApi;
