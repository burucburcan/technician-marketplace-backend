import { useTranslation } from 'react-i18next';
import { useGetDashboardStatsQuery } from '../../store/api/professionalDashboardApi';
import { useGetMyProfileQuery } from '../../store/api/professionalDashboardApi';
import { StatsCard } from '../../components/professional/StatsCard';
import { IncomingBookings } from '../../components/professional/IncomingBookings';
import { PortfolioManagement } from '../../components/professional/PortfolioManagement';
import { EarningsDisplay } from '../../components/professional/EarningsDisplay';
import { ProfessionalType } from '../../types';

export const ProfessionalProfilePage = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStatsQuery();
  const { data: profile, isLoading: profileLoading } = useGetMyProfileQuery();

  const isArtist = profile?.professionalType === ProfessionalType.ARTIST;

  if (statsLoading || profileLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="professional-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('professionalDashboard.title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('professionalDashboard.welcome')}, {profile?.firstName}!
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="dashboard-stats">
          <StatsCard
            title={t('professionalDashboard.totalBookings')}
            value={stats.totalBookings}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            subtitle={`${stats.pendingBookings} ${t('professionalDashboard.pending')}`}
          />
          <StatsCard
            title={t('professionalDashboard.completedJobs')}
            value={stats.completedBookings}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            subtitle={`${stats.completionRate}% ${t('professionalDashboard.completionRate')}`}
          />
          <StatsCard
            title={t('professionalDashboard.averageRating')}
            value={stats.averageRating.toFixed(1)}
            icon={
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            }
          />
          <StatsCard
            title={t('professionalDashboard.totalEarnings')}
            value={`$${stats.totalEarnings.toFixed(2)}`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Incoming Bookings */}
      <IncomingBookings />

      {/* Earnings Display */}
      <EarningsDisplay />

      {/* Portfolio Management (Artists only) */}
      {isArtist && <PortfolioManagement />}

      {/* Profile Management Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('professionalDashboard.profileManagement')}
        </h2>
        <p className="text-gray-600 mb-4">
          {t('professionalDashboard.profileDescription')}
        </p>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          data-testid="edit-profile-button"
        >
          {t('profile.editProfile')}
        </button>
      </div>
    </div>
  );
};
