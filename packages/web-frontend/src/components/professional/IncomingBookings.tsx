import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIncomingBookingsQuery } from '../../store/api/professionalDashboardApi';
import { BookingApprovalModal } from './BookingApprovalModal';
import type { BookingDetail } from '../../store/api/bookingApi';

export const IncomingBookings: React.FC = () => {
  const { t } = useTranslation();
  const { data: bookings, isLoading } = useGetIncomingBookingsQuery();
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = (booking: BookingDetail) => {
    setSelectedBooking(booking);
    setModalAction('approve');
  };

  const handleReject = (booking: BookingDetail) => {
    setSelectedBooking(booking);
    setModalAction('reject');
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setModalAction(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('professionalDashboard.incomingBookings')}
        </h2>
        <p className="text-gray-500 text-center py-8">
          {t('professionalDashboard.noIncomingBookings')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('professionalDashboard.incomingBookings')}
        </h2>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {booking.serviceCategory}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                      {t('booking.pending')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {booking.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      📅 {new Date(booking.scheduledDate).toLocaleDateString()}
                    </span>
                    <span>
                      ⏱️ {booking.estimatedDuration} {t('booking.minutes')}
                    </span>
                    <span>
                      💰 ${booking.estimatedPrice}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    📍 {booking.serviceAddress.address}, {booking.serviceAddress.city}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleApprove(booking)}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('professionalDashboard.approve')}
                  </button>
                  <button
                    onClick={() => handleReject(booking)}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {t('professionalDashboard.reject')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedBooking && modalAction && (
        <BookingApprovalModal
          booking={selectedBooking}
          action={modalAction}
          onClose={closeModal}
        />
      )}
    </>
  );
};
