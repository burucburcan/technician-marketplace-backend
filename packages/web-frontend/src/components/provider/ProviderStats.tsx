import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderStats as ProviderStatsType } from '../../store/api/providerApi';

interface ProviderStatsProps {
  stats: ProviderStatsType;
}

export const ProviderStats: React.FC<ProviderStatsProps> = ({ stats }) => {
  const { t } = useTranslation();

  const statCards = [
    {
      label: t('provider.totalProfessionals'),
      value: stats.totalProfessionals,
      icon: '👥',
      color: 'blue',
    },
    {
      label: t('provider.activeProfessionals'),
      value: stats.activeProfessionals,
      icon: '✅',
      color: 'green',
    },
    {
      label: t('provider.totalBookings'),
      value: stats.totalBookings,
      icon: '📅',
      color: 'purple',
    },
    {
      label: t('provider.completedBookings'),
      value: stats.completedBookings,
      icon: '✓',
      color: 'teal',
    },
    {
      label: t('provider.cancelledBookings'),
      value: stats.cancelledBookings,
      icon: '✗',
      color: 'red',
    },
    {
      label: t('provider.averageRating'),
      value: stats.averageRating.toFixed(1),
      icon: '⭐',
      color: 'yellow',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
      red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const colors = getColorClasses(stat.color);
          return (
            <div
              key={index}
              className={`${colors.bg} ${colors.border} border rounded-lg p-6 transition-transform hover:scale-105`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className={`text-3xl font-bold ${colors.text}`}>{stat.value}</p>
                </div>
                <div className="text-4xl">{stat.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Professional Type Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('provider.professionalsByType')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">{t('professional.handyman')}</p>
              <p className="text-2xl font-bold text-blue-700">
                {stats.professionalsByType.handyman}
              </p>
            </div>
            <div className="text-3xl">🔧</div>
          </div>
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">{t('professional.artist')}</p>
              <p className="text-2xl font-bold text-purple-700">
                {stats.professionalsByType.artist}
              </p>
            </div>
            <div className="text-3xl">🎨</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('provider.performanceMetrics')}
        </h3>
        <div className="space-y-4">
          {/* Completion Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{t('provider.completionRate')}</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.totalBookings > 0
                  ? ((stats.completedBookings / stats.totalBookings) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    stats.totalBookings > 0
                      ? (stats.completedBookings / stats.totalBookings) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Cancellation Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{t('provider.cancellationRate')}</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.totalBookings > 0
                  ? ((stats.cancelledBookings / stats.totalBookings) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    stats.totalBookings > 0
                      ? (stats.cancelledBookings / stats.totalBookings) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Active Professional Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{t('provider.activeProfessionalRate')}</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.totalProfessionals > 0
                  ? ((stats.activeProfessionals / stats.totalProfessionals) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    stats.totalProfessionals > 0
                      ? (stats.activeProfessionals / stats.totalProfessionals) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue */}
      {stats.totalRevenue > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('provider.totalRevenue')}</p>
              <p className="text-3xl font-bold text-green-700">
                ${stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="text-5xl">💰</div>
          </div>
        </div>
      )}
    </div>
  );
};
