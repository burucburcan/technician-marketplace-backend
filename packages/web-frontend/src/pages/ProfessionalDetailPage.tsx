import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ProfessionalType } from '../types';
import {
  useGetProfessionalDetailQuery,
  useGetProfessionalRatingsQuery,
  useGetProfessionalStatsQuery,
} from '../store/api/professionalApi';
import { PortfolioGallery } from '../components/professional/PortfolioGallery';
import { RatingsList } from '../components/professional/RatingsList';
import { BookingForm } from '../components/professional/BookingForm';
import { AvailabilityCalendar } from '../components/professional/AvailabilityCalendar';

export const ProfessionalDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'reviews' | 'booking'>(
    'overview'
  );
  const [ratingsPage, setRatingsPage] = useState(1);

  const { data: professional, isLoading, error } = useGetProfessionalDetailQuery(id!);
  const { data: ratingsData } = useGetProfessionalRatingsQuery({
    professionalId: id!,
    page: ratingsPage,
    pageSize: 10,
  });
  const { data: stats } = useGetProfessionalStatsQuery(id!);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !professional) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="text-center py-12">
          <p className="text-red-600">{t('professional.notFound')}</p>
          <Link to="/search" className="mt-4 inline-block text-blue-600 hover:underline">
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  const isArtist = professional.professionalType === ProfessionalType.ARTIST;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Back Button */}
      <Link
        to="/search"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {t('common.back')}
      </Link>

      {/* Professional Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {professional.avatar ? (
              <img
                src={professional.avatar}
                alt={`${professional.firstName} ${professional.lastName}`}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="professional-name">
                  {professional.businessName ||
                    `${professional.firstName} ${professional.lastName}`}
                </h1>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isArtist ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isArtist ? t('professional.artist') : t('professional.handyman')}
                  </span>
                  {professional.isAvailable && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {t('professional.available')}
                    </span>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div className="text-right" data-testid="professional-rating">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-2xl font-bold text-gray-900">
                    {professional.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {professional.totalJobs} {t('professional.completedJobs')}
                </p>
              </div>
            </div>

            {/* Specializations */}
            <div className="mb-4" data-testid="specializations-list">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {t('professional.specializations')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {professional.specializations.map((spec, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {t(`search.categories.${spec}`, spec)}
                  </span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div data-testid="professional-experience">
                <p className="text-sm text-gray-600">{t('professional.experience')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {professional.experienceYears} {t('professional.years')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('professional.hourlyRate')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${professional.hourlyRate} MXN
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('professional.completionRate')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(professional.completionRate * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('professional.serviceRadius')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {professional.serviceRadius} km
                </p>
              </div>
            </div>

            {/* Artist Specific Info */}
            {isArtist && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {professional.artStyle && professional.artStyle.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {t('professional.artStyle')}:
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      {professional.artStyle.join(', ')}
                    </span>
                  </div>
                )}
                {professional.materials && professional.materials.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {t('professional.materials')}:
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      {professional.materials.join(', ')}
                    </span>
                  </div>
                )}
                {professional.techniques && professional.techniques.length > 0 && (
                  <div>
                    <span className="text-sm font-semibold text-gray-700">
                      {t('professional.techniques')}:
                    </span>
                    <span className="ml-2 text-sm text-gray-600">
                      {professional.techniques.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {t('professional.overview')}
            </button>
            {isArtist && (
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'portfolio'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {t('professional.portfolio')}
              </button>
            )}
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
              data-testid="reviews-list"
            >
              {t('professional.reviews')} ({stats?.totalRatings || 0})
            </button>
            <button
              onClick={() => setActiveTab('booking')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'booking'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
              data-testid="book-now-button"
            >
              {t('professional.bookNow')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Location */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('professional.location')}
                </h3>
                <p className="text-gray-700">
                  {professional.location.city}, {professional.location.state}
                </p>
                <p className="text-sm text-gray-600">{professional.location.address}</p>
              </div>

              {/* Certificates */}
              {professional.certificates && professional.certificates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('professional.certificates')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {professional.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="border border-gray-200 rounded-lg p-4 flex items-start gap-3"
                      >
                        <div className="flex-shrink-0">
                          {cert.verifiedByAdmin ? (
                            <svg
                              className="w-6 h-6 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path
                                fillRule="evenodd"
                                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{cert.name}</h4>
                          <p className="text-sm text-gray-600">{cert.issuer}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(cert.issueDate).toLocaleDateString('es-MX')}
                            {cert.expiryDate &&
                              ` - ${new Date(cert.expiryDate).toLocaleDateString('es-MX')}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability Calendar */}
              <div data-testid="availability-calendar">
                <AvailabilityCalendar professionalId={professional.id} />
              </div>
            </div>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && isArtist && (
            <div data-testid="portfolio-gallery">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('professional.portfolio')}
              </h3>
              <PortfolioGallery portfolio={professional.portfolio || []} />
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && stats && ratingsData && (
            <RatingsList
              ratings={ratingsData.ratings}
              totalRatings={stats.totalRatings}
              averageScore={stats.averageScore}
              ratingDistribution={stats.ratingDistribution}
              hasMore={ratingsData.total > ratingsPage * 10}
              onLoadMore={() => setRatingsPage((prev) => prev + 1)}
            />
          )}

          {/* Booking Tab */}
          {activeTab === 'booking' && (
            <div data-testid="booking-form">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('professional.createBooking')}
              </h3>
              <BookingForm professional={professional} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
