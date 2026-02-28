import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfessionalType } from '../../types';
import type { SearchQuery } from '../../store/api/searchApi';

interface SearchFormProps {
  onSearch: (query: SearchQuery) => void;
  onClear: () => void;
}

export const SearchForm = ({ onSearch, onClear }: SearchFormProps) => {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchQuery>({
    radius: 50,
    sortBy: 'distance',
  });

  const categories = [
    'electrical',
    'plumbing',
    'hvac',
    'painting',
    'carpentry',
    'cleaning',
    'maintenance',
    'wallPainting',
    'sculpture',
    'decorativeArt',
    'mosaic',
    'fresco',
    'customDesign',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({
      radius: 50,
      sortBy: 'distance',
    });
    onClear();
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFilters({
            ...filters,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <form onSubmit={handleSubmit} data-testid="search-form">
        {/* Main Search Bar */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('search.searchPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            {t('search.filters')}
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {t('common.search')}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search.category')}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                data-testid="category-select"
              >
                <option value="">{t('search.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`search.categories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Professional Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search.professionalType')}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.professionalType || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    professionalType: e.target.value ? (e.target.value as ProfessionalType) : undefined,
                  })
                }
                data-testid="professional-type-filter"
              >
                <option value="">{t('search.allTypes')}</option>
                <option value={ProfessionalType.HANDYMAN}>{t('search.handyman')}</option>
                <option value={ProfessionalType.ARTIST}>{t('search.artist')}</option>
              </select>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search.radius')} ({filters.radius} {t('search.km')})
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={filters.radius || 50}
                onChange={(e) => setFilters({ ...filters, radius: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search.minRating')}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.minRating || ''}
                onChange={(e) =>
                  setFilters({ ...filters, minRating: e.target.value ? parseFloat(e.target.value) : undefined })
                }
              >
                <option value="">Cualquiera</option>
                <option value="3">3+ ⭐</option>
                <option value="4">4+ ⭐</option>
                <option value="4.5">4.5+ ⭐</option>
              </select>
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search.maxPrice')}
              </label>
              <input
                type="number"
                placeholder="$"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.maxPrice || ''}
                onChange={(e) =>
                  setFilters({ ...filters, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                data-testid="price-range-filter"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search.sortBy')}
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.sortBy || 'distance'}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sortBy: e.target.value as SearchQuery['sortBy'],
                  })
                }
                data-testid="sort-select"
              >
                <option value="distance">{t('search.distance')}</option>
                <option value="rating">{t('search.rating')}</option>
                <option value="price">{t('search.price')}</option>
                <option value="experience">{t('search.experience')}</option>
                <option value="portfolio">{t('search.portfolio')}</option>
              </select>
            </div>

            {/* Location Button */}
            <div className="md:col-span-2 lg:col-span-3">
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t('search.useMyLocation')}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 lg:col-span-3 flex gap-4 pt-4 border-t">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                {t('search.applyFilters')}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                {t('search.clearFilters')}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
