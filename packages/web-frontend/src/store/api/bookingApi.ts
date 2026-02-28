import { api } from '../api';
import type { BookingStatus, ProfessionalType } from '../../types';
import type { Location } from './searchApi';

export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

export interface ProjectDetails {
  projectType: string;
  estimatedDuration: string;
  priceRange: PriceRange;
  specialRequirements?: string;
  materials?: string[];
}

export interface CreateBookingDTO {
  professionalId: string;
  professionalType: ProfessionalType;
  serviceCategory: string;
  scheduledDate: Date;
  estimatedDuration: number;
  serviceAddress: Location;
  description: string;
  estimatedPrice: number;
  
  // Artistic project specific fields
  projectDetails?: ProjectDetails;
  referenceImages?: string[];
}

export interface BookingDetail {
  id: string;
  userId: string;
  professionalId: string;
  professionalType: ProfessionalType;
  professionalName: string;
  professionalAvatar?: string;
  serviceCategory: string;
  status: BookingStatus;
  scheduledDate: Date;
  estimatedDuration: number;
  serviceAddress: Location;
  description: string;
  estimatedPrice: number;
  actualPrice?: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Artistic project specific fields
  projectDetails?: ProjectDetails;
  progressPhotos?: ProgressPhoto[];
  referenceImages?: string[];
}

export interface ProgressPhoto {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export const bookingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createBooking: builder.mutation<BookingDetail, CreateBookingDTO>({
      query: (data) => ({
        url: '/bookings',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Booking'],
    }),
    
    getBookingDetail: builder.query<BookingDetail, string>({
      query: (bookingId) => `/bookings/${bookingId}`,
      providesTags: ['Booking'],
    }),
    
    updateBookingStatus: builder.mutation<BookingDetail, { bookingId: string; status: BookingStatus }>({
      query: ({ bookingId, status }) => ({
        url: `/bookings/${bookingId}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['Booking'],
    }),
    
    startService: builder.mutation<BookingDetail, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/start`,
        method: 'POST',
      }),
      invalidatesTags: ['Booking'],
    }),
    
    completeService: builder.mutation<BookingDetail, { bookingId: string; notes?: string }>({
      query: ({ bookingId, notes }) => ({
        url: `/bookings/${bookingId}/complete`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: ['Booking'],
    }),
    
    uploadReferenceImages: builder.mutation<
      { imageUrls: string[] },
      { bookingId: string; files: File[] }
    >({
      query: ({ bookingId, files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('images', file);
        });
        return {
          url: `/bookings/${bookingId}/reference-images`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Booking'],
    }),
    
    uploadProgressPhoto: builder.mutation<
      ProgressPhoto,
      { bookingId: string; file: File; caption?: string }
    >({
      query: ({ bookingId, file, caption }) => {
        const formData = new FormData();
        formData.append('photo', file);
        if (caption) {
          formData.append('caption', caption);
        }
        return {
          url: `/bookings/${bookingId}/progress-photos`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Booking'],
    }),
  }),
});

export const {
  useCreateBookingMutation,
  useGetBookingDetailQuery,
  useUpdateBookingStatusMutation,
  useStartServiceMutation,
  useCompleteServiceMutation,
  useUploadReferenceImagesMutation,
  useUploadProgressPhotoMutation,
} = bookingApi;
