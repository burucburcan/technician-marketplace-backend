import { api } from '../api';
import type { ProfessionalType } from '../../types';
import type { Location, PortfolioItem } from './searchApi';

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  fileUrl: string;
  verifiedByAdmin: boolean;
}

export interface WorkingHours {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface ProfessionalDetail {
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
  serviceRadius: number;
  workingHours: WorkingHours;
  certificates: Certificate[];
  rating: number;
  totalJobs: number;
  completionRate: number;
  location: Location;
  isAvailable: boolean;
  
  // Artist specific fields
  portfolio?: PortfolioItem[];
  artStyle?: string[];
  materials?: string[];
  techniques?: string[];
}

export interface Rating {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  professionalId: string;
  score: number;
  comment: string;
  categories: CategoryRating[];
  photos?: string[];
  createdAt: Date;
}

export interface CategoryRating {
  category: 'quality' | 'punctuality' | 'communication' | 'professionalism' | 'value';
  score: number;
}

export interface RatingStats {
  professionalId: string;
  averageScore: number;
  totalRatings: number;
  categoryAverages: Record<string, number>;
  ratingDistribution: Record<number, number>;
}

export interface AvailabilitySlot {
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export const professionalApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProfessionalDetail: builder.query<ProfessionalDetail, string>({
      query: (professionalId) => `/professionals/${professionalId}/profile`,
      providesTags: ['Professional'],
    }),
    
    getProfessionalRatings: builder.query<
      { ratings: Rating[]; total: number; page: number; pageSize: number },
      { professionalId: string; page?: number; pageSize?: number; sortBy?: string }
    >({
      query: ({ professionalId, page = 1, pageSize = 10, sortBy = 'recent' }) => ({
        url: `/professionals/${professionalId}/ratings`,
        params: { page, pageSize, sortBy },
      }),
    }),
    
    getProfessionalStats: builder.query<RatingStats, string>({
      query: (professionalId) => `/professionals/${professionalId}/stats`,
    }),
    
    checkAvailability: builder.query<
      AvailabilitySlot[],
      { professionalId: string; date: string; duration: number }
    >({
      query: ({ professionalId, date, duration }) => ({
        url: `/professionals/${professionalId}/availability`,
        params: { date, duration },
      }),
    }),
    
    getArtistPortfolio: builder.query<PortfolioItem[], string>({
      query: (artistId) => `/artists/${artistId}/portfolio`,
      providesTags: ['Professional'],
    }),
  }),
});

export const {
  useGetProfessionalDetailQuery,
  useGetProfessionalRatingsQuery,
  useGetProfessionalStatsQuery,
  useCheckAvailabilityQuery,
  useLazyCheckAvailabilityQuery,
  useGetArtistPortfolioQuery,
} = professionalApi;
