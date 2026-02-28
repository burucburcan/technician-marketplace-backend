import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetAllProfessionalsQuery,
  useSuspendProfessionalMutation,
  useActivateProfessionalMutation,
} from '../../store/api/adminApi';
import { ProfessionalType } from '../../types';

export const AdminProfessionalsPage: React.FC = () => {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<ProfessionalType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: professionals = [], isLoading } = useGetAllProfessionalsQuery({
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: searchQuery || undefined,
  });

  const [suspendProfessional] = useSuspendProfessionalMutation();
  const [activateProfessional] = useActivateProfessionalMutation();

  const handleSuspend = async (professionalId: string) => {
    try {
      await suspendProfessional(professionalId).unwrap();
    } catch (error) {
      console.error('Failed to suspend professional:', error);
    }
  };

  const handleActivate = async (professionalId: string) => {
    try {
      await activateProfessional(professionalId).unwrap();
    } catch (error) {
      console.error('Failed to activate professional:', error);
    }
  };

  const getVerificationBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors]}`}>
        {t(`admin.verification.${status}`)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.professionalManagement')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.professionalManagementDescription')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('admin.searchProfessionals')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="search-professionals"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="filter-all-types"
            >
              {t('admin.allTypes')}
            </button>
            <button
              onClick={() => setTypeFilter(ProfessionalType.HANDYMAN)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === ProfessionalType.HANDYMAN
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="filter-handyman"
            >
              {t('professional.handyman')}
            </button>
            <button
              onClick={() => setTypeFilter(ProfessionalType.ARTIST)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                typeFilter === ProfessionalType.ARTIST
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid="filter-artist"
            >
              {t('professional.artist')}
            </button>
          </div>
        </div>
      </div>

      {/* Professionals Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">{t('common.loading')}</div>
        ) : professionals.length === 0 ? (
          <div className="p-8 text-center text-gray-600">{t('admin.noProfessionalsFound')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.professional')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.specializations')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.stats')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.verification')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.status')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {professionals.map((professional) => (
                  <tr key={professional.id} className="hover:bg-gray-50" data-testid={`professional-row-${professional.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {professional.firstName[0]}
                            {professional.lastName[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {professional.firstName} {professional.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{professional.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          professional.professionalType === ProfessionalType.HANDYMAN
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-pink-100 text-pink-800'
                        }`}
                      >
                        {t(`professional.${professional.professionalType}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {professional.specializations.slice(0, 2).join(', ')}
                        {professional.specializations.length > 2 && (
                          <span className="text-gray-500"> +{professional.specializations.length - 2}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {professional.experienceYears} {t('professional.years')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ⭐ {professional.rating.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {professional.totalJobs} {t('admin.jobs')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getVerificationBadge(professional.verificationStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {professional.isActive ? (
                        professional.isAvailable ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            {t('professional.available')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            {t('admin.unavailable')}
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          {t('admin.suspended')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {professional.isActive ? (
                          <button
                            onClick={() => handleSuspend(professional.id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title={t('admin.suspend')}
                            data-testid={`suspend-professional-${professional.id}`}
                          >
                            🚫
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(professional.id)}
                            className="text-green-600 hover:text-green-900"
                            title={t('admin.activate')}
                            data-testid={`activate-professional-${professional.id}`}
                          >
                            ✅
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
