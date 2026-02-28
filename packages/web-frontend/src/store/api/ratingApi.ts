import { api } from '../api';

export enum RatingCategory {
  QUALITY = 'quality',
  PUNCTUALITY = 'punctuality',
  COMMUNICATION = 'communication',
  PROFESSIONALISM = 'professionalism',
  VALUE = 'value',
}

export interface CategoryRating {
  category: RatingCategory;
  score: number;
}

export interface Rating {
  id: string;
  bookingId: string;
  userId: string;
  professionalId: string;
  score: number;
  comment: string;
  categories: CategoryRating[];
  photos?: string[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRatingDTO {
  bookingId: string;
  score: number;
  comment: string;
  categories: CategoryRating[];
}

export const ratingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createRating: builder.mutation<Rating, CreateRatingDTO>({
      query: (data) => ({
        url: '/ratings',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Booking'],
    }),
    
    getRating: builder.query<Rating, string>({
      query: (ratingId) => `/ratings/${ratingId}`,
    }),
    
    getBookingRating: builder.query<Rating | null, string>({
      query: (bookingId) => `/ratings/booking/${bookingId}`,
    }),
    
    uploadRatingPhotos: builder.mutation<{ photoUrls: string[] }, { ratingId: string; files: File[] }>({
      query: ({ ratingId, files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('photos', file);
        });
        return {
          url: `/ratings/${ratingId}/photos`,
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useCreateRatingMutation,
  useGetRatingQuery,
  useGetBookingRatingQuery,
  useUploadRatingPhotosMutation,
} = ratingApi;
