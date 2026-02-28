import { api } from '../api';
import type { UserRole, ProfessionalType } from '../../types';

// Admin-specific types
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AdminProfessional {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  professionalType: ProfessionalType;
  specializations: string[];
  experienceYears: number;
  rating: number;
  totalJobs: number;
  isActive: boolean;
  isAvailable: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface ServiceCategory {
  id: string;
  name: string;
  nameEs: string;
  nameEn: string;
  type: 'technical' | 'artistic';
  isActive: boolean;
  professionalCount: number;
}

export interface PendingPortfolio {
  id: string;
  artistId: string;
  artistName: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  category: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PlatformStats {
  totalUsers: number;
  totalProfessionals: number;
  totalHandymen: number;
  totalArtists: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  activeDisputes: number;
  pendingPortfolios: number;
}

export interface Dispute {
  id: string;
  bookingId: string;
  reportedBy: string;
  reportedByName: string;
  professionalId: string;
  professionalName: string;
  issueType: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export const adminApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // User management
    getAllUsers: builder.query<AdminUser[], { role?: UserRole; search?: string }>({
      query: (params) => ({
        url: '/admin/users',
        params,
      }),
      providesTags: ['Admin'],
    }),
    suspendUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/suspend`,
        method: 'POST',
      }),
      invalidatesTags: ['Admin'],
    }),
    activateUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['Admin'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Admin'],
    }),

    // Professional management
    getAllProfessionals: builder.query<AdminProfessional[], { type?: ProfessionalType; search?: string }>({
      query: (params) => ({
        url: '/admin/professionals',
        params,
      }),
      providesTags: ['Admin'],
    }),
    suspendProfessional: builder.mutation<void, string>({
      query: (professionalId) => ({
        url: `/admin/professionals/${professionalId}/suspend`,
        method: 'POST',
      }),
      invalidatesTags: ['Admin'],
    }),
    activateProfessional: builder.mutation<void, string>({
      query: (professionalId) => ({
        url: `/admin/professionals/${professionalId}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['Admin'],
    }),

    // Category management
    getAllCategories: builder.query<ServiceCategory[], { type?: 'technical' | 'artistic' }>({
      query: (params) => ({
        url: '/admin/categories',
        params,
      }),
      providesTags: ['Admin'],
    }),
    createCategory: builder.mutation<ServiceCategory, { nameEs: string; nameEn: string; type: 'technical' | 'artistic' }>({
      query: (data) => ({
        url: '/admin/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Admin'],
    }),
    updateCategory: builder.mutation<ServiceCategory, { id: string; data: Partial<ServiceCategory> }>({
      query: ({ id, data }) => ({
        url: `/admin/categories/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Admin'],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (categoryId) => ({
        url: `/admin/categories/${categoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Admin'],
    }),

    // Portfolio approval
    getPendingPortfolios: builder.query<PendingPortfolio[], void>({
      query: () => '/admin/portfolios/pending',
      providesTags: ['Admin'],
    }),
    approvePortfolio: builder.mutation<void, string>({
      query: (portfolioId) => ({
        url: `/admin/portfolios/${portfolioId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: ['Admin'],
    }),
    rejectPortfolio: builder.mutation<void, { portfolioId: string; reason: string }>({
      query: ({ portfolioId, reason }) => ({
        url: `/admin/portfolios/${portfolioId}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Admin'],
    }),

    // Platform statistics
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => '/admin/stats',
      providesTags: ['Admin'],
    }),

    // Dispute management
    getAllDisputes: builder.query<Dispute[], { status?: string }>({
      query: (params) => ({
        url: '/admin/disputes',
        params,
      }),
      providesTags: ['Admin'],
    }),
    resolveDispute: builder.mutation<void, { disputeId: string; resolution: string }>({
      query: ({ disputeId, resolution }) => ({
        url: `/admin/disputes/${disputeId}/resolve`,
        method: 'POST',
        body: { resolution },
      }),
      invalidatesTags: ['Admin'],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useSuspendUserMutation,
  useActivateUserMutation,
  useDeleteUserMutation,
  useGetAllProfessionalsQuery,
  useSuspendProfessionalMutation,
  useActivateProfessionalMutation,
  useGetAllCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetPendingPortfoliosQuery,
  useApprovePortfolioMutation,
  useRejectPortfolioMutation,
  useGetPlatformStatsQuery,
  useGetAllDisputesQuery,
  useResolveDisputeMutation,
} = adminApi;
