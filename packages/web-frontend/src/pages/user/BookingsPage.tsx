import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useGetUserBookingsQuery, useCancelBookingMutation } from '../../store/api/userApi';
import { BookingStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';

type BookingFilter = 'active' | 'past';

export const UserBookingsPage = () => {
  const { t } = useTranslation();
  const { userId } = useAuth();
  
  const [filter, setFilter] = useState<BookingFilter>('active');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  
  const { data: bookings, isLoading } = useGetUserBookingsQuery({ userId });
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();

  // Filter bookings based on active/past status
  const filteredBookings = bookings?.filter((booking) => {
    if (filter === 'active') {
      return [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS].includes(booking.status);
    } else {
      return [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REJECTED].includes(booking.status);
    }
  });

  const handleCancelBooking = async (bookingId: string) => {
    if (!cancelReason.trim()) {
      alert(t('booking.cancelReason'));
      return;
    }
    
    try {
      await cancelBooking({ bookingId, reason: cancelReason }).unwrap();
      setCancellingBookingId(null);
      setCancelReason('');
      // Show success message
    } catch (error) {
      // Show error message
      console.error('Failed to cancel booking:', error);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case BookingStatus.CONFIRMED:
        return 'bg-blue-100 text-blue-800';
      case BookingStatus.IN_PROGRESS:
        return 'bg-purple-100 text-purple-800';
      case BookingStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case BookingStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case BookingStatus.REJECTED:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('booking.myBookings')}</h1>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setFilter('active')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                filter === 'active'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('booking.active')}
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                filter === 'past'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('booking.past')}
            </button>
          </nav>
        </div>
      </div>

      {/* Bookings List */}
      {!filteredBookings || filteredBookings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'active' ? t('booking.noActiveBookings') : t('booking.noPastBookings')}
          </h3>
          <p className="text-gray-600">{t('booking.noBookings')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 mr-3">
                      {booking.serviceCategory}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {t(`booking.${booking.status}`)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{booking.description}</p>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDate(booking.scheduledDate)}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {booking.estimatedDuration} min
                    </span>
                    <span className="flex items-center font-semibold text-gray-900">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      ${booking.estimatedPrice}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-4">
                  <Link
                    to={`/booking/${booking.id}`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors text-center"
                  >
                    {t('booking.viewDetails')}
                  </Link>
                  {booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED ? (
                    <button
                      onClick={() => setCancellingBookingId(booking.id)}
                      className="px-4 py-2 border border-red-600 text-red-600 text-sm rounded-md hover:bg-red-50 transition-colors"
                    >
                      {t('booking.cancelBooking')}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Cancel Booking Modal */}
              {cancellingBookingId === booking.id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    {t('booking.confirmCancel')}
                  </h4>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder={t('booking.cancelReason')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setCancellingBookingId(null);
                        setCancelReason('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      disabled={isCancelling}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? t('common.loading') : t('booking.cancelBooking')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
