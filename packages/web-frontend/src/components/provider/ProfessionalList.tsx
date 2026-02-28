import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfessionalType } from '../../types';
import type { ProviderProfessional } from '../../store/api/providerApi';

interface ProfessionalListProps {
  professionals: ProviderProfessional[];
  onEdit: (professional: ProviderProfessional) => void;
  onDelete: (professional: ProviderProfessional) => void;
  onToggleStatus: (professional: ProviderProfessional) => void;
}

export const ProfessionalList: React.FC<ProfessionalListProps> = ({
  professionals,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<ProfessionalType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProfessionals = professionals.filter((prof) => {
    const matchesType = filterType === 'all' || prof.professionalType === filterType;
    const matchesSearch =
      searchQuery === '' ||
      prof.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prof.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getStatusBadge = (professional: ProviderProfessional) => {
    if (!professional.isActive) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          {t('provider.inactive')}
        </span>
      );
    }
    if (professional.isAvailable) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          {t('professional.available')}
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
        {t('provider.unavailable')}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('provider.searchProfessionals')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('provider.allTypes')}
          </button>
          <button
            onClick={() => setFilterType(ProfessionalType.HANDYMAN)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === ProfessionalType.HANDYMAN
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('professional.handyman')}
          </button>
          <button
            onClick={() => setFilterType(ProfessionalType.ARTIST)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === ProfessionalType.ARTIST
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('professional.artist')}
          </button>
        </div>
      </div>

      {/* Professional Cards */}
      {filteredProfessionals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">{t('provider.noProfessionals')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessionals.map((professional) => (
            <div
              key={professional.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {professional.avatar ? (
                    <img
                      src={professional.avatar}
                      alt={`${professional.firstName} ${professional.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 font-medium text-lg">
                        {professional.firstName[0]}
                        {professional.lastName[0]}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {professional.firstName} {professional.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {t(`professional.${professional.professionalType}`)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(professional)}
              </div>

              {/* Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('professional.rating')}</span>
                  <span className="font-medium text-gray-900">
                    ⭐ {professional.rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('provider.totalJobs')}</span>
                  <span className="font-medium text-gray-900">{professional.totalJobs}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('professional.completionRate')}</span>
                  <span className="font-medium text-gray-900">
                    {professional.completionRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t('professional.hourlyRate')}</span>
                  <span className="font-medium text-gray-900">
                    ${professional.hourlyRate}/hr
                  </span>
                </div>
              </div>

              {/* Specializations */}
              {professional.specializations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">
                    {t('professional.specializations')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {professional.specializations.slice(0, 3).map((spec, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                      >
                        {spec}
                      </span>
                    ))}
                    {professional.specializations.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded">
                        +{professional.specializations.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => onEdit(professional)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => onToggleStatus(professional)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    professional.isActive
                      ? 'text-yellow-600 hover:bg-yellow-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {professional.isActive ? t('provider.disable') : t('provider.enable')}
                </button>
                <button
                  onClick={() => onDelete(professional)}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
