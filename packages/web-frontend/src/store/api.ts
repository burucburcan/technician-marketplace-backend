import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './index';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['User', 'Professional', 'Booking', 'Notification', 'Message', 'Rating', 'Admin', 'Product', 'Cart', 'Order', 'ProductReview', 'SupplierReview', 'Supplier'],
  endpoints: () => ({}),
});
