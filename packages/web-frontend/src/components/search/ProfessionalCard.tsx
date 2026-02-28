import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProfessionalType } from '../../types';
import type { ProfessionalSearchResult } from '../../store/api/searchApi';

interface ProfessionalCardProps {
  professional: ProfessionalSearchResult;
}

export const ProfessionalCard = ({ professional }: ProfessionalCardProps) => {
  const { t } = useTranslation();

  const isArtist = professional.professionalType === ProfessionalType.ARTIST;

  return (
    <Link
      to={`/professional/${professional.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
      data-testid="professional-card"
    >
      {/* Header with Avatar and Basic Info */}
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {professional.avatar ? (
              <img
                src={professional.avatar}
                alt={`${professional.firstName} ${professional.lastName}`}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Name and Type */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {professional.businessName || `${professional.firstName} ${professional.lastName}`}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isArtist ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}
              >
                {isArtist ? t('search.artist') : t('search.handyman')}
              </span>
              {professional.distance && (
                <span className="text-sm text-gray-500">
                  {professional.distance.toFixed(1)} km {t('search.away')}
                </span>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-semibold text-gray-900">{professional.rating.toFixed(1)}</span>
            <span className="text-sm text-gray-500">({professional.totalJobs})</span>
          </div>
        </div>

        {/* Specializations */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {professional.specializations.slice(0, 3).map((spec, index) => (
              <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {t(`search.categories.${spec}`, spec)}
              </span>
            ))}
            {professional.specializations.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm">
                +{professional.specializations.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Experience and Price */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center gap-1 text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span>
              {professional.experienceYears} {t('search.yearsExperience')}
            </span>
          </div>
          <div className="font-semibold text-gray-900">
            ${professional.hourlyRate} {t('search.perHour')}
          </div>
        </div>

        {/* Artist Portfolio Preview */}
        {isArtist && professional.portfolioPreview && professional.portfolioPreview.length > 0 && (
          <div data-testid="portfolio-preview">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">{t('search.viewPortfolio')}</h4>
              <span className="text-xs text-gray-500">
                {professional.portfolioPreview.length} {t('professional.portfolio')}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {professional.portfolioPreview.slice(0, 3).map((item) => (
                <div key={item.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100" data-testid="portfolio-image">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Profile Button */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {professional.totalJobs} {t('search.jobs')}
            </span>
            <span className="text-blue-600 font-medium hover:text-blue-700" data-testid="view-profile-button">
              {t('professional.viewProfile')} →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
