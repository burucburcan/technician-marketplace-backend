import { api } from '../api';
import type {
  Product,
  ProductSearchQuery,
  ProductSearchResults,
  Cart,
  Order,
  ProductReview,
  SupplierReview,
} from '../../types';

export const productApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Product search and listing
    searchProducts: builder.query<ProductSearchResults, ProductSearchQuery>({
      query: (params) => ({
        url: '/products/search',
        params,
      }),
      providesTags: ['Product'],
    }),

    getProductsByCategory: builder.query<Product[], { category: string; filters?: any }>({
      query: ({ category, filters }) => ({
        url: `/products/category/${category}`,
        params: filters,
      }),
      providesTags: ['Product'],
    }),

    getProductDetails: builder.query<Product, string>({
      query: (productId) => `/products/${productId}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    // Cart management
    getCart: builder.query<Cart, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),

    addToCart: builder.mutation<Cart, { productId: string; quantity: number }>({
      query: (data) => ({
        url: '/cart/items',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Cart'],
    }),

    updateCartItem: builder.mutation<Cart, { cartItemId: string; quantity: number }>({
      query: ({ cartItemId, quantity }) => ({
        url: `/cart/items/${cartItemId}`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),

    removeFromCart: builder.mutation<Cart, string>({
      query: (cartItemId) => ({
        url: `/cart/items/${cartItemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    clearCart: builder.mutation<void, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Order management
    createOrder: builder.mutation<Order, any>({
      query: (data) => ({
        url: '/orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Order', 'Cart'],
    }),

    getOrder: builder.query<Order, string>({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    getUserOrders: builder.query<Order[], { filters?: any }>({
      query: ({ filters }) => ({
        url: '/orders',
        params: filters,
      }),
      providesTags: ['Order'],
    }),

    getSupplierOrders: builder.query<Order[], { supplierId: string; filters?: any }>({
      query: ({ supplierId, filters }) => ({
        url: `/suppliers/${supplierId}/orders`,
        params: filters,
      }),
      providesTags: ['Order'],
    }),

    updateOrderStatus: builder.mutation<Order, { orderId: string; status: string; data?: any }>({
      query: ({ orderId, status, data }) => ({
        url: `/orders/${orderId}/status`,
        method: 'PUT',
        body: { status, ...data },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    cancelOrder: builder.mutation<Order, { orderId: string; reason: string }>({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    addTrackingInfo: builder.mutation<Order, { orderId: string; trackingNumber: string; carrier: string }>({
      query: ({ orderId, trackingNumber, carrier }) => ({
        url: `/orders/${orderId}/tracking`,
        method: 'POST',
        body: { trackingNumber, carrier },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    // Product reviews
    createProductReview: builder.mutation<ProductReview, any>({
      query: (data) => ({
        url: '/reviews/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ProductReview', 'Product'],
    }),

    getProductReviews: builder.query<{ reviews: ProductReview[]; total: number }, { productId: string; page?: number }>({
      query: ({ productId, page = 1 }) => ({
        url: `/products/${productId}/reviews`,
        params: { page },
      }),
      providesTags: ['ProductReview'],
    }),

    // Supplier reviews
    createSupplierReview: builder.mutation<SupplierReview, any>({
      query: (data) => ({
        url: '/reviews/suppliers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['SupplierReview'],
    }),

    getSupplierReviews: builder.query<{ reviews: SupplierReview[]; total: number }, { supplierId: string; page?: number }>({
      query: ({ supplierId, page = 1 }) => ({
        url: `/suppliers/${supplierId}/reviews`,
        params: { page },
      }),
      providesTags: ['SupplierReview'],
    }),
  }),
});

export const {
  useSearchProductsQuery,
  useGetProductsByCategoryQuery,
  useGetProductDetailsQuery,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useCreateOrderMutation,
  useGetOrderQuery,
  useGetUserOrdersQuery,
  useGetSupplierOrdersQuery,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
  useAddTrackingInfoMutation,
  useCreateProductReviewMutation,
  useGetProductReviewsQuery,
  useCreateSupplierReviewMutation,
  useGetSupplierReviewsQuery,
} = productApi;
