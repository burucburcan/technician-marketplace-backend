import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchForm } from '../components/search/SearchForm';
import { ProfessionalCard } from '../components/search/ProfessionalCard';
import { MapView } from '../components/search/MapView';
import { useLazySearchProfessionalsQuery } from '../store/api/searchApi';
import type { SearchQuery } from '../store/api/searchApi';

type ViewMode = 'list' | 'map';

export const SearchPage = () => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchProfessionals, { data: searchResults, isLoading, isFetching }] = useLazySearchProfessionalsQuery();

  const handleSearch = (query: SearchQuery) => {
    searchProfessionals(query);
  };

  const handleClear = () => {
    // Reset search results
    searchProfessionals({});
  };

  const professionals = searchResults?.professionals || [];
  const total = searchResults?.total || 0;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('search.title')}</h1>
        <p className="text-gray-600">
          Encuentra técnicos y artistas profesionales cerca de ti
        </p>
      </div>

      {/* Search Form */}
      <SearchForm onSearch={handleSearch} onClear={handleClear} />

      {/* View Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">
          {total > 0 && (
            <span>
              {total} {t('search.results')}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              {t('search.viewList')}
            </div>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            data-testid="map-view-toggle"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              {t('search.viewMap')}
            </div>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {(isLoading || isFetching) && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('search.loading')}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && !isFetching && (
        <>
          {viewMode === 'list' ? (
            <div>
              {professionals.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('search.noResults')}</h3>
                  <p className="text-gray-600">{t('search.noResultsDescription')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {professionals.map((professional) => (
                    <ProfessionalCard key={professional.id} professional={professional} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[600px] bg-white rounded-lg shadow-md overflow-hidden">
              <MapView
                professionals={professionals}
                onProfessionalClick={(_professional) => {
                  // Navigate to professional detail page
                  // console.log('Professional clicked:', _professional);
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

