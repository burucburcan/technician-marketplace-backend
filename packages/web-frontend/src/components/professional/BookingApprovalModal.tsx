import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useApproveBookingMutation,
  useRejectBookingMutation,
} from '../../store/api/professionalDashboardApi';
import type { BookingDetail } from '../../store/api/bookingApi';

interface BookingApprovalModalProps {
  booking: BookingDetail;
  action: 'approve' | 'reject';
  onClose: () => void;
}

export const BookingApprovalModal: React.FC<BookingApprovalModalProps> = ({
  booking,
  action,
  onClose,
}) => {
  const { t } = useTranslation();
  const [approveBooking, { isLoading: isApproving }] = useApproveBookingMutation();
  const [rejectBooking, { isLoading: isRejecting }] = useRejectBookingMutation();
  const [reason, setReason] = useState('');
  const [alternativeSuggestions, setAlternativeSuggestions] = useState('');
  const [error, setError] = useState('');

  const handleApprove = async () => {
    try {
      await approveBooking({ bookingId: booking.id }).unwrap();
      onClose();
    } catch (err) {
      setError(t('professionalDashboard.approveError'));
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError(t('professionalDashboard.reasonRequired'));
      return;
    }

    try {
      await rejectBooking({
        bookingId: booking.id,
        reason,
        alternativeSuggestions: alternativeSuggestions || undefined,
      }).unwrap();
      onClose();
    } catch (err) {
      setError(t('professionalDashboard.rejectError'));
    }
  };

  const isLoading = isApproving || isRejecting;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {action === 'approve'
            ? t('professionalDashboard.approveBooking')
            : t('professionalDashboard.rejectBooking')}
        </h2>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">{t('booking.serviceCategory')}:</span>{' '}
            {booking.serviceCategory}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">{t('booking.date')}:</span>{' '}
            {new Date(booking.scheduledDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{t('booking.price')}:</span> $
            {booking.estimatedPrice}
          </p>
        </div>

        {action === 'approve' ? (
          <p className="text-gray-600 mb-6">
            {t('professionalDashboard.confirmApprove')}
          </p>
        ) : (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('professionalDashboard.rejectionReason')} *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder={t('professionalDashboard.reasonPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('professionalDashboard.alternativeSuggestions')}
              </label>
              <textarea
                value={alternativeSuggestions}
                onChange={(e) => setAlternativeSuggestions(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder={t('professionalDashboard.suggestionsPlaceholder')}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={action === 'approve' ? handleApprove : handleReject}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isLoading
              ? t('common.loading')
              : action === 'approve'
              ? t('professionalDashboard.approve')
              : t('professionalDashboard.reject')}
          </button>
        </div>
      </div>
    </div>
  );
};
