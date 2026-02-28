import { useTranslation } from 'react-i18next';
import { BookingDetail } from '../../store/api/bookingApi';
import { BookingStatus } from '../../types';

interface BookingTimelineProps {
  booking: BookingDetail;
}

export const BookingTimeline = ({ booking }: BookingTimelineProps) => {
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

  const timelineEvents = [
    {
      status: BookingStatus.PENDING,
      label: t('booking.pending'),
      date: booking.createdAt,
      completed: true,
    },
    {
      status: BookingStatus.CONFIRMED,
      label: t('booking.confirmed'),
      date: booking.status !== BookingStatus.PENDING ? booking.updatedAt : null,
      completed: [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED].includes(booking.status),
    },
    {
      status: BookingStatus.IN_PROGRESS,
      label: t('booking.inProgress'),
      date: booking.startedAt,
      completed: [BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED].includes(booking.status),
    },
    {
      status: BookingStatus.COMPLETED,
      label: t('booking.completed'),
      date: booking.completedAt,
      completed: booking.status === BookingStatus.COMPLETED,
    },
  ];

  // Handle cancelled/rejected status
  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('booking.detail.timeline')}
        </h2>
        <div className="flex items-center">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="ml-4">
            <p className="text-lg font-medium text-gray-900">
              {t(`booking.${booking.status}`)}
            </p>
            <p className="text-sm text-gray-600">
              {formatDate(booking.updatedAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {t('booking.detail.timeline')}
      </h2>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline events */}
        <div className="space-y-8">
          {timelineEvents.map((event) => (
            <div key={event.status} className="relative flex items-start">
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                  event.completed
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                {event.completed ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                )}
              </div>

              {/* Content */}
              <div className="ml-4 flex-1">
                <p className={`text-lg font-medium ${event.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                  {event.label}
                </p>
                {event.date && (
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(event.date)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
