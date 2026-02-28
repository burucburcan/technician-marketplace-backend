import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetBookingDetailQuery } from '../store/api/bookingApi';
import { BookingInfo } from '../components/booking/BookingInfo';
import { BookingTimeline } from '../components/booking/BookingTimeline';
import { BookingActions } from '../components/booking/BookingActions';
import { ProgressPhotosGallery } from '../components/booking/ProgressPhotosGallery';
import { MessagingPanel } from '../components/booking/MessagingPanel';
import { RatingForm } from '../components/booking/RatingForm';
import { BookingStatus } from '../types';

export const BookingDetailPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const { data: booking, isLoading, error } = useGetBookingDetailQuery(bookingId || '');

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            {t('booking.error.loadFailed')}
          </h2>
          <button
            onClick={() => navigate('/bookings')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const showProgressPhotos = booking.professionalType === 'artist' && 
    booking.status === BookingStatus.IN_PROGRESS;
  
  const showRatingForm = booking.status === BookingStatus.COMPLETED;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/bookings')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('booking.detail.title')}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info */}
          <BookingInfo booking={booking} />

          {/* Timeline */}
          <BookingTimeline booking={booking} />

          {/* Progress Photos (for artistic projects) */}
          {showProgressPhotos && (
            <ProgressPhotosGallery 
              bookingId={booking.id}
              photos={booking.progressPhotos || []}
            />
          )}

          {/* Messaging Panel */}
          <MessagingPanel bookingId={booking.id} />

          {/* Rating Form */}
          {showRatingForm && (
            <RatingForm bookingId={booking.id} professionalId={booking.professionalId} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <BookingActions booking={booking} />
        </div>
      </div>
    </div>
  );
};
