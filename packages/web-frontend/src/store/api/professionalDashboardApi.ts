import { api } from '../api';
import type { BookingDetail } from './bookingApi';
import type { PortfolioItem } from './searchApi';

export interface DashboardStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating: number;
  totalEarnings: number;
  pendingBookings: number;
  completionRate: number;
}

export interface EarningsBreakdown {
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  currency: string;
  recentPayments: Payment[];
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  date: Date;
  status: string;
}

export interface ApproveBookingDTO {
  bookingId: string;
}

export interface RejectBookingDTO {
  bookingId: string;
  reason: string;
  alternativeSuggestions?: string;
}

export interface PortfolioMetadata {
  title: string;
  description?: string;
  category: string;
  completionDate?: Date;
  dimensions?: string;
  materials?: string[];
}

export const professionalDashboardApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Dashboard stats
    getDashboardStats: builder.query<DashboardStats, void>({
      query: () => '/professionals/me/stats',
      providesTags: ['Professional'],
    }),
    
    // Earnings
    getEarnings: builder.query<EarningsBreakdown, void>({
      query: () => '/professionals/me/earnings',
      providesTags: ['Professional'],
    }),
    
    // Incoming bookings
    getIncomingBookings: builder.query<BookingDetail[], void>({
      query: () => '/professionals/me/bookings/incoming',
      providesTags: ['Booking'],
    }),
    
    // My bookings (all)
    getMyBookings: builder.query<BookingDetail[], { status?: string }>({
      query: ({ status }) => ({
        url: '/professionals/me/bookings',
        params: status ? { status } : {},
      }),
      providesTags: ['Booking'],
    }),
    
    // Approve booking
    approveBooking: builder.mutation<BookingDetail, ApproveBookingDTO>({
      query: ({ bookingId }) => ({
        url: `/bookings/${bookingId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Booking'],
    }),
    
    // Reject booking
    rejectBooking: builder.mutation<BookingDetail, RejectBookingDTO>({
      query: ({ bookingId, reason, alternativeSuggestions }) => ({
        url: `/bookings/${bookingId}/reject`,
        method: 'POST',
        body: { reason, alternativeSuggestions },
      }),
      invalidatesTags: ['Booking'],
    }),
    
    // Portfolio management (for artists)
    uploadPortfolioImage: builder.mutation<
      PortfolioItem,
      { file: File; metadata: PortfolioMetadata }
    >({
      query: ({ file, metadata }) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('title', metadata.title);
        if (metadata.description) formData.append('description', metadata.description);
        formData.append('category', metadata.category);
        if (metadata.completionDate) formData.append('completionDate', metadata.completionDate.toISOString());
        if (metadata.dimensions) formData.append('dimensions', metadata.dimensions);
        if (metadata.materials) formData.append('materials', JSON.stringify(metadata.materials));
        
        return {
          url: '/artists/me/portfolio',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Professional'],
    }),
    
    updatePortfolioImage: builder.mutation<
      PortfolioItem,
      { imageId: string; metadata: PortfolioMetadata }
    >({
      query: ({ imageId, metadata }) => ({
        url: `/artists/me/portfolio/${imageId}`,
        method: 'PUT',
        body: metadata,
      }),
      invalidatesTags: ['Professional'],
    }),
    
    deletePortfolioImage: builder.mutation<void, string>({
      query: (imageId) => ({
        url: `/artists/me/portfolio/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Professional'],
    }),
    
    getMyPortfolio: builder.query<PortfolioItem[], void>({
      query: () => '/artists/me/portfolio',
      providesTags: ['Professional'],
    }),
    
    // Profile management
    getMyProfile: builder.query<any, void>({
      query: () => '/professionals/me/profile',
      providesTags: ['Professional'],
    }),
    
    updateMyProfile: builder.mutation<any, any>({
      query: (data) => ({
        url: '/professionals/me/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Professional'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetEarningsQuery,
  useGetIncomingBookingsQuery,
  useGetMyBookingsQuery,
  useApproveBookingMutation,
  useRejectBookingMutation,
  useUploadPortfolioImageMutation,
  useUpdatePortfolioImageMutation,
  useDeletePortfolioImageMutation,
  useGetMyPortfolioQuery,
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
} = professionalDashboardApi;
