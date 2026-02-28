import { api } from '../api';
import type { UserProfile, Booking, Notification } from '../../types';

export const userApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Profile endpoints
    getUserProfile: builder.query<UserProfile, string>({
      query: (userId) => `/users/${userId}/profile`,
      providesTags: ['User'],
    }),
    updateUserProfile: builder.mutation<UserProfile, { userId: string; data: Partial<UserProfile> }>({
      query: ({ userId, data }) => ({
        url: `/users/${userId}/profile`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    uploadAvatar: builder.mutation<{ avatarUrl: string }, { userId: string; file: File }>({
      query: ({ userId, file }) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return {
          url: `/users/${userId}/avatar`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['User'],
    }),

    // Booking endpoints
    getUserBookings: builder.query<Booking[], { userId: string; status?: string }>({
      query: ({ userId, status }) => ({
        url: `/bookings/user/${userId}`,
        params: status ? { status } : undefined,
      }),
      providesTags: ['Booking'],
    }),
    cancelBooking: builder.mutation<void, { bookingId: string; reason: string }>({
      query: ({ bookingId, reason }) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Booking'],
    }),

    // Notification endpoints
    getUserNotifications: builder.query<Notification[], string>({
      query: (userId) => `/notifications/user/${userId}`,
      providesTags: ['Notification'],
    }),
    getUnreadNotificationCount: builder.query<{ count: number }, string>({
      query: (userId) => `/notifications/user/${userId}/unread-count`,
      providesTags: ['Notification'],
    }),
    markNotificationAsRead: builder.mutation<void, string>({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsAsRead: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/notifications/user/${userId}/read-all`,
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useUploadAvatarMutation,
  useGetUserBookingsQuery,
  useCancelBookingMutation,
  useGetUserNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = userApi;
