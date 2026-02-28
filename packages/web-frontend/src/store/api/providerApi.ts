import { api } from '../api';
import type { ProfessionalType } from '../../types';

export interface ProviderProfessional {
  id: string;
  userId: string;
  professionalType: ProfessionalType;
  businessName?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone: string;
  email: string;
  specializations: string[];
  experienceYears: number;
  hourlyRate: number;
  rating: number;
  totalJobs: number;
  completionRate: number;
  isAvailable: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface ProviderStats {
  providerId: string;
  totalProfessionals: number;
  activeProfessionals: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating: number;
  totalRevenue: number;
  professionalsByType: {
    handyman: number;
    artist: number;
  };
}

export interface ProfessionalFormData {
  professionalType: ProfessionalType;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  businessName?: string;
  specializations: string[];
  experienceYears: number;
  hourlyRate: number;
  serviceRadius: number;
  // Artist specific
  artStyle?: string[];
  materials?: string[];
  techniques?: string[];
}

export const providerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get all professionals for a provider
    getProviderProfessionals: builder.query<
      ProviderProfessional[],
      { providerId: string; type?: ProfessionalType }
    >({
      query: ({ providerId, type }) => ({
        url: `/providers/${providerId}/professionals`,
        params: type ? { type } : undefined,
      }),
      providesTags: ['Professional'],
    }),

    // Get provider statistics
    getProviderStats: builder.query<ProviderStats, string>({
      query: (providerId) => `/providers/${providerId}/stats`,
      providesTags: ['Professional'],
    }),

    // Add new professional
    addProfessional: builder.mutation<
      ProviderProfessional,
      { providerId: string; data: ProfessionalFormData }
    >({
      query: ({ providerId, data }) => ({
        url: `/providers/${providerId}/professionals`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Professional'],
    }),

    // Update professional
    updateProfessional: builder.mutation<
      ProviderProfessional,
      { providerId: string; professionalId: string; data: Partial<ProfessionalFormData> }
    >({
      query: ({ providerId, professionalId, data }) => ({
        url: `/providers/${providerId}/professionals/${professionalId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Professional'],
    }),

    // Disable/enable professional
    toggleProfessionalStatus: builder.mutation<
      void,
      { providerId: string; professionalId: string; isActive: boolean }
    >({
      query: ({ providerId, professionalId, isActive }) => ({
        url: `/providers/${providerId}/professionals/${professionalId}/status`,
        method: 'PUT',
        body: { isActive },
      }),
      invalidatesTags: ['Professional'],
    }),

    // Delete professional
    deleteProfessional: builder.mutation<
      void,
      { providerId: string; professionalId: string }
    >({
      query: ({ providerId, professionalId }) => ({
        url: `/providers/${providerId}/professionals/${professionalId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Professional'],
    }),
  }),
});

export const {
  useGetProviderProfessionalsQuery,
  useGetProviderStatsQuery,
  useAddProfessionalMutation,
  useUpdateProfessionalMutation,
  useToggleProfessionalStatusMutation,
  useDeleteProfessionalMutation,
} = providerApi;
