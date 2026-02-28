import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BookingDetail } from '../../store/api/bookingApi';
import { BookingStatus } from '../../types';
import {
  useStartServiceMutation,
  useCompleteServiceMutation,
} from '../../store/api/bookingApi';
import { useCancelBookingMutation } from '../../store/api/userApi';

interface BookingActionsProps {
  booking: BookingDetail;
}

export const BookingActions = ({ booking }: BookingActionsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const [startService, { isLoading: isStarting }] = useStartServiceMutation();
  const [completeService, { isLoading: isCompleting }] = useCompleteServiceMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();

  const handleStartService = async () => {
    if (window.confirm(t('booking.detail.confirmStart'))) {
      try {
        await startService(booking.id).unwrap();
      } catch (error) {
        alert(t('booking.error.updateFailed'));
      }
    }
  };

  const handleCompleteService = async () => {
    try {
      await completeService({ bookingId: booking.id, notes: completionNotes }).unwrap();
      setShowCompleteModal(false);
    } catch (error) {
      alert(t('booking.error.updateFailed'));
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      alert(t('booking.cancelReason'));
      return;
    }

    try {
      await cancelBooking({ bookingId: booking.id, reason: cancelReason }).unwrap();
      setShowCancelModal(false);
      navigate('/bookings');
    } catch (error) {
      alert(t('booking.error.cancelFailed'));
    }
  };

  const canStart = booking.status === BookingStatus.CONFIRMED;
  const canComplete = booking.status === BookingStatus.IN_PROGRESS;
  const canCancel = [BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('booking.detail.actions')}
        </h2>

        <div className="space-y-3">
          {/* View Professional Profile */}
          <button
            onClick={() => navigate(`/professionals/${booking.professionalId}`)}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {t('booking.detail.viewProfile')}
          </button>

          {/* Start Service (for professionals) */}
          {canStart && (
            <button
              onClick={handleStartService}
              disabled={isStarting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isStarting ? t('common.loading') : t('booking.detail.startService')}
            </button>
          )}

          {/* Complete Service (for professionals) */}
          {canComplete && (
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isCompleting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {t('booking.detail.completeService')}
            </button>
          )}

          {/* Cancel Booking */}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={isCancelling}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              data-testid="cancel-booking-button"
            >
              {t('booking.cancelBooking')}
            </button>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {t('booking.cancelBooking')}
            </h3>
            <p className="text-gray-600 mb-4">{t('booking.confirmCancel')}</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('booking.cancelReason')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows={4}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling || !cancelReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? t('common.loading') : t('common.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {t('booking.detail.completeService')}
            </h3>
            <p className="text-gray-600 mb-4">{t('booking.detail.confirmComplete')}</p>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder={t('booking.detail.completionNotes')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows={4}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCompleteService}
                disabled={isCompleting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isCompleting ? t('common.loading') : t('common.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
