import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from './index';

// Defensive check for VITE_API_URL at runtime
const getBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Development mode logging
  if (import.meta.env.DEV) {
    console.log('[API Config] VITE_API_URL:', apiUrl);
  }
  
  // Runtime validation
  if (!apiUrl || apiUrl === '' || apiUrl === 'undefined') {
    const errorMessage = 
      'VITE_API_URL is not configured. ' +
      'Please set the environment variable in Railway or .env.production file.';
    
    console.error('❌ [API Config Error]', errorMessage);
    
    // In production, throw an error to fail fast
    if (import.meta.env.PROD) {
      throw new Error(errorMessage);
    }
    
    // In development, return empty string (will use proxy)
    return '';
  }
  
  const baseUrl = `${apiUrl}/api`;
  
  // Log the constructed baseUrl in development
  if (import.meta.env.DEV) {
    console.log('[API Config] Constructed baseUrl:', baseUrl);
  }
  
  return baseUrl;
};

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
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
