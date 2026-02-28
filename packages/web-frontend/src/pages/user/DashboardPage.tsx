import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useGetUserProfileQuery, useGetUserBookingsQuery, useGetUserNotificationsQuery } from '../../store/api/userApi';
import { BookingStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export const UserDashboardPage = () => {
  const { t } = useTranslation();
  const { userId } = useAuth();
  
  const { data: profile } = useGetUserProfileQuery(userId);
  const { data: bookings } = useGetUserBookingsQuery({ userId });
  const { data: notifications } = useGetUserNotificationsQuery(userId);

  // Get active bookings
  const activeBookings = bookings?.filter((booking) =>
    [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS].includes(booking.status)
  ).slice(0, 3);

  // Get recent notifications
  const recentNotifications = notifications?.slice(0, 3);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      month: 'short',
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('dashboard.welcome')}, {profile?.firstName || 'Usuario'}!
        </h1>
        <p className="text-gray-600">
          Gestiona tus reservaciones, perfil y notificaciones desde aquí
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/search"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('dashboard.searchProfessionals')}
          </h3>
          <p className="text-sm text-gray-600">
            Encuentra técnicos y artistas cerca de ti
          </p>
        </Link>

        <Link
          to="/user/bookings"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('dashboard.myBookings')}
          </h3>
          <p className="text-sm text-gray-600">
            Ver y gestionar tus reservaciones
          </p>
        </Link>

        <Link
          to="/user/profile"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('dashboard.myProfile')}
          </h3>
          <p className="text-sm text-gray-600">
            Actualiza tu información personal
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('dashboard.recentBookings')}
            </h2>
            <Link
              to="/user/bookings"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {!activeBookings || activeBookings.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-2"
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
              <p className="text-gray-600 text-sm">{t('booking.noActiveBookings')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to={`/booking/${booking.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{booking.serviceCategory}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {t(`booking.${booking.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-1">{booking.description}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(booking.scheduledDate)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('dashboard.recentNotifications')}
            </h2>
            <Link
              to="/notifications"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {!recentNotifications || recentNotifications.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-gray-600 text-sm">{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border border-gray-200 rounded-lg ${
                    !notification.isRead ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-2"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
