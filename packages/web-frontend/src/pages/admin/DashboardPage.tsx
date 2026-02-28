import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useGetPlatformStatsQuery } from '../../store/api/adminApi';

export const AdminDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useGetPlatformStatsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('admin.totalUsers'),
      value: stats?.totalUsers || 0,
      icon: '👥',
      color: 'bg-blue-500',
      link: '/admin/users',
    },
    {
      title: t('admin.totalProfessionals'),
      value: stats?.totalProfessionals || 0,
      icon: '👨‍🔧',
      color: 'bg-green-500',
      link: '/admin/professionals',
    },
    {
      title: t('admin.totalHandymen'),
      value: stats?.totalHandymen || 0,
      icon: '🔧',
      color: 'bg-purple-500',
      link: '/admin/professionals?type=handyman',
    },
    {
      title: t('admin.totalArtists'),
      value: stats?.totalArtists || 0,
      icon: '🎨',
      color: 'bg-pink-500',
      link: '/admin/professionals?type=artist',
    },
    {
      title: t('admin.totalBookings'),
      value: stats?.totalBookings || 0,
      icon: '📅',
      color: 'bg-yellow-500',
      link: '/admin/bookings',
    },
    {
      title: t('admin.completedBookings'),
      value: stats?.completedBookings || 0,
      icon: '✅',
      color: 'bg-teal-500',
      link: '/admin/bookings?status=completed',
    },
    {
      title: t('admin.totalRevenue'),
      value: `$${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: '💰',
      color: 'bg-indigo-500',
      link: '/admin/revenue',
    },
    {
      title: t('admin.activeDisputes'),
      value: stats?.activeDisputes || 0,
      icon: '⚠️',
      color: 'bg-red-500',
      link: '/admin/disputes',
    },
  ];

  const quickActions = [
    {
      title: t('admin.userManagement'),
      description: t('admin.manageAllUsers'),
      icon: '👥',
      link: '/admin/users',
      color: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      title: t('admin.professionalManagement'),
      description: t('admin.manageProfessionals'),
      icon: '👨‍🔧',
      link: '/admin/professionals',
      color: 'bg-green-50 hover:bg-green-100',
    },
    {
      title: t('admin.categoryManagement'),
      description: t('admin.manageCategories'),
      icon: '📂',
      link: '/admin/categories',
      color: 'bg-purple-50 hover:bg-purple-100',
    },
    {
      title: t('admin.portfolioApproval'),
      description: t('admin.reviewPortfolios'),
      icon: '🎨',
      link: '/admin/portfolios',
      color: 'bg-pink-50 hover:bg-pink-100',
    },
    {
      title: t('admin.disputeManagement'),
      description: t('admin.resolveDisputes'),
      icon: '⚖️',
      link: '/admin/disputes',
      color: 'bg-red-50 hover:bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.dashboardDescription')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Items Alert */}
      {stats && stats.pendingPortfolios > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-medium text-yellow-900">
                {t('admin.pendingPortfoliosAlert', { count: stats.pendingPortfolios })}
              </p>
              <Link to="/admin/portfolios" className="text-sm text-yellow-700 hover:text-yellow-800 underline">
                {t('admin.reviewNow')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('admin.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className={`${action.color} rounded-lg p-6 transition-colors border border-gray-200`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{action.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
