import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetUserProfileQuery, useUpdateUserProfileMutation, useGetUserBookingsQuery } from '../../store/api/userApi';
import { useAuth } from '../../hooks/useAuth';
import { BookingStatus } from '../../types';

export const ClientProfilePage = () => {
  const { t } = useTranslation();
  const { userId } = useAuth();

  const { data: profile, isLoading: isProfileLoading } = useGetUserProfileQuery(userId);
  const [updateProfile, { isLoading: isUpdating }] = useUpdateUserProfileMutation();
  const { data: bookings, isLoading: isBookingsLoading } = useGetUserBookingsQuery({ userId });

  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    preferredServices: '',
    contactPhone: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        contactPhone: profile.phone || '',
      }));
    }
  }, [profile]);

  const bookingCounts = {
    total: bookings?.length ?? 0,
    completed: bookings?.filter((b) => b.status === BookingStatus.COMPLETED).length ?? 0,
    cancelled: bookings?.filter((b) => b.status === BookingStatus.CANCELLED).length ?? 0,
    pending: bookings?.filter((b) => b.status === BookingStatus.PENDING).length ?? 0,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setSuccessMessage('');
    try {
      await updateProfile({
        userId,
        data: {
          phone: formData.contactPhone,
        },
      }).unwrap();
      setIsEditing(false);
      setSuccessMessage(t('clientProfile.profileUpdated'));
    } catch (error: unknown) {
      const err = error as { data?: { errors?: Record<string, string> } };
      if (err?.data?.errors) {
        setFieldErrors(err.data.errors);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFieldErrors({});
    setSuccessMessage('');
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        contactPhone: profile.phone || '',
      }));
    }
  };

  if (isProfileLoading || isBookingsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('clientProfile.title')}</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('profile.editProfile')}
            </button>
          )}
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">{successMessage}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Address Section */}
            <h3 className="text-lg font-semibold text-gray-900">{t('clientProfile.address')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('clientProfile.street')}
                </label>
                <input
                  id="street"
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {fieldErrors.street && <p className="mt-1 text-sm text-red-600">{fieldErrors.street}</p>}
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('clientProfile.city')}
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {fieldErrors.city && <p className="mt-1 text-sm text-red-600">{fieldErrors.city}</p>}
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('clientProfile.state')}
                </label>
                <input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {fieldErrors.state && <p className="mt-1 text-sm text-red-600">{fieldErrors.state}</p>}
              </div>

              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('clientProfile.postalCode')}
                </label>
                <input
                  id="postalCode"
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {fieldErrors.postalCode && <p className="mt-1 text-sm text-red-600">{fieldErrors.postalCode}</p>}
              </div>
            </div>

            {/* Preferred Services */}
            <div>
              <label htmlFor="preferredServices" className="block text-sm font-medium text-gray-700 mb-2">
                {t('clientProfile.preferredServices')}
              </label>
              <input
                id="preferredServices"
                type="text"
                value={formData.preferredServices}
                onChange={(e) => setFormData({ ...formData, preferredServices: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {fieldErrors.preferredServices && <p className="mt-1 text-sm text-red-600">{fieldErrors.preferredServices}</p>}
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
                {t('clientProfile.contactPhone')}
              </label>
              <input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {fieldErrors.contactPhone && <p className="mt-1 text-sm text-red-600">{fieldErrors.contactPhone}</p>}
            </div>

            {/* Edit/Save Buttons */}
            {isEditing && (
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {isUpdating ? t('common.loading') : t('common.save')}
                </button>
              </div>
            )}
          </div>
        </form>

        {/* Booking History Summary */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('clientProfile.bookingHistory')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{bookingCounts.total}</p>
              <p className="text-sm text-gray-600">{t('clientProfile.totalBookings')}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{bookingCounts.completed}</p>
              <p className="text-sm text-gray-600">{t('clientProfile.completedBookings')}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{bookingCounts.cancelled}</p>
              <p className="text-sm text-gray-600">{t('clientProfile.cancelledBookings')}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">{bookingCounts.pending}</p>
              <p className="text-sm text-gray-600">{t('clientProfile.pendingBookings')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
