import { useTranslation } from 'react-i18next';
import { BookingDetail } from '../../store/api/bookingApi';
import { BookingStatus, ProfessionalType } from '../../types';

interface BookingInfoProps {
  booking: BookingDetail;
}

export const BookingInfo = ({ booking }: BookingInfoProps) => {
  const { t, i18n } = useTranslation();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.language === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      case BookingStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6" data-testid="booking-details">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t('booking.detail.bookingInfo')}
      </h2>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t('booking.detail.status')}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`} data-testid="booking-status">
            {t(`booking.${booking.status}`)}
          </span>
        </div>

        {/* Booking ID */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t('booking.detail.bookingId')}</span>
          <span className="text-gray-900 font-mono text-sm">{booking.id.slice(0, 8)}</span>
        </div>

        {/* Service Category */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t('booking.serviceCategory')}</span>
          <span className="text-gray-900">{booking.serviceCategory}</span>
        </div>

        {/* Scheduled Date */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t('booking.scheduledFor')}</span>
          <span className="text-gray-900">
            {formatDate(booking.scheduledDate)}
          </span>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t('booking.duration')}</span>
          <span className="text-gray-900">
            {booking.estimatedDuration} {t('booking.minutes')}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">{t('booking.estimatedPrice')}</span>
          <span className="text-gray-900 font-semibold">
            ${booking.estimatedPrice.toFixed(2)}
          </span>
        </div>

        {/* Actual Price (if completed) */}
        {booking.actualPrice && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">{t('booking.price')}</span>
            <span className="text-gray-900 font-semibold">
              ${booking.actualPrice.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Service Address */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {t('booking.address')}
        </h3>
        <div className="text-gray-700">
          <p>{booking.serviceAddress.address}</p>
          <p>{booking.serviceAddress.city}, {booking.serviceAddress.state}</p>
          <p>{booking.serviceAddress.postalCode}</p>
        </div>
      </div>

      {/* Description */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {t('booking.description')}
        </h3>
        <p className="text-gray-700">{booking.description}</p>
      </div>

      {/* Project Details (for artistic projects) */}
      {booking.professionalType === ProfessionalType.ARTIST && booking.projectDetails && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {t('booking.detail.projectDetails')}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('booking.projectType')}</span>
              <span className="text-gray-900">{booking.projectDetails.projectType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('booking.estimatedProjectDuration')}</span>
              <span className="text-gray-900">{booking.projectDetails.estimatedDuration}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('booking.detail.priceRange')}</span>
              <span className="text-gray-900">
                ${booking.projectDetails.priceRange.min} - ${booking.projectDetails.priceRange.max}
              </span>
            </div>
            {booking.projectDetails.materials && booking.projectDetails.materials.length > 0 && (
              <div>
                <span className="text-gray-600">{t('booking.detail.materials')}</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {booking.projectDetails.materials.map((material, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                    >
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {booking.projectDetails.specialRequirements && (
              <div className="mt-3">
                <span className="text-gray-600">{t('booking.specialRequirements')}</span>
                <p className="text-gray-700 mt-1">{booking.projectDetails.specialRequirements}</p>
              </div>
            )}
          </div>

          {/* Reference Images */}
          {booking.referenceImages && booking.referenceImages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900 mb-2">
                {t('booking.detail.referenceImages')}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {booking.referenceImages.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Reference ${index + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Professional Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {t('booking.detail.professionalInfo')}
        </h3>
        <div className="flex items-center">
          {booking.professionalAvatar && (
            <img
              src={booking.professionalAvatar}
              alt={booking.professionalName}
              className="w-12 h-12 rounded-full mr-3"
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{booking.professionalName}</p>
            <p className="text-sm text-gray-600">
              {t(`professional.${booking.professionalType}`)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
