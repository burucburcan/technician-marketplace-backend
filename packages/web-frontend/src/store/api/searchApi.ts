import { api } from '../api';
import type { ProfessionalType } from '../../types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: Coordinates;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  category: string;
}

export interface ProfessionalSearchResult {
  id: string;
  userId: string;
  professionalType: ProfessionalType;
  businessName?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  specializations: string[];
  experienceYears: number;
  hourlyRate: number;
  rating: number;
  totalJobs: number;
  location: Location;
  distance?: number;
  matchScore?: number;
  estimatedPrice?: number;
  nextAvailableSlot?: Date;
  portfolioPreview?: PortfolioItem[];
}

export interface SearchQuery {
  location?: Coordinates;
  category?: string;
  professionalType?: ProfessionalType;
  radius?: number;
  minRating?: number;
  maxPrice?: number;
  artStyle?: string[];
  sortBy?: 'distance' | 'rating' | 'price' | 'experience' | 'portfolio';
}

export interface SearchResults {
  professionals: ProfessionalSearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

export const searchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    searchProfessionals: builder.query<SearchResults, SearchQuery>({
      query: (params) => ({
        url: '/search/professionals',
        method: 'POST',
        body: params,
      }),
      providesTags: ['Professional'],
    }),
    getNearbyProfessionals: builder.query<
      ProfessionalSearchResult[],
      { location: Coordinates; radius: number; type?: ProfessionalType }
    >({
      query: ({ location, radius, type }) => ({
        url: '/search/nearby',
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius,
          type,
        },
      }),
      providesTags: ['Professional'],
    }),
    getProfessionalsByCategory: builder.query<
      ProfessionalSearchResult[],
      { category: string; filters?: Partial<SearchQuery> }
    >({
      query: ({ category, filters }) => ({
        url: `/search/category/${category}`,
        params: filters,
      }),
      providesTags: ['Professional'],
    }),
  }),
});

export const {
  useSearchProfessionalsQuery,
  useLazySearchProfessionalsQuery,
  useGetNearbyProfessionalsQuery,
  useGetProfessionalsByCategoryQuery,
} = searchApi;
