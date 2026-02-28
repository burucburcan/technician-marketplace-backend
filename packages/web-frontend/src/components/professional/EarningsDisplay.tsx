import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGetEarningsQuery } from '../../store/api/professionalDashboardApi';

export const EarningsDisplay: React.FC = () => {
  const { t } = useTranslation();
  const { data: earnings, isLoading } = useGetEarningsQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!earnings) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {t('professionalDashboard.earnings')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">
            {t('professionalDashboard.thisMonth')}
          </p>
          <p className="text-2xl font-bold text-blue-600">
            ${earnings.thisMonth.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">
            {t('professionalDashboard.lastMonth')}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            ${earnings.lastMonth.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">
            {t('professionalDashboard.thisYear')}
          </p>
          <p className="text-2xl font-bold text-green-600">
            ${earnings.thisYear.toFixed(2)}
          </p>
        </div>
      </div>

      {earnings.recentPayments && earnings.recentPayments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('professionalDashboard.recentPayments')}
          </h3>
          <div className="space-y-3">
            {earnings.recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    ${payment.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    payment.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
