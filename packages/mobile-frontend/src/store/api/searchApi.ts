import { api } from '../api'
import { ProfessionalProfile, ProfessionalType } from '../../types'

interface SearchQuery {
  location?: {
    latitude: number
    longitude: number
  }
  category?: string
  professionalType?: ProfessionalType
  radius?: number
  minRating?: number
  maxPrice?: number
}

interface SearchResults {
  professionals: ProfessionalProfile[]
  total: number
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
    getProfessionalProfile: builder.query<ProfessionalProfile, string>({
      query: (id) => `/professionals/${id}/profile`,
      providesTags: ['Professional'],
    }),
  }),
})

export const { useSearchProfessionalsQuery, useGetProfessionalProfileQuery } =
  searchApi
