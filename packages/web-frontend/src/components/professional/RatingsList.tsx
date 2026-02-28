import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Rating } from '../../store/api/professionalApi';

interface RatingsListProps {
  ratings: Rating[];
  totalRatings: number;
  averageScore: number;
  ratingDistribution: Record<number, number>;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const RatingsList = ({
  ratings,
  totalRatings,
  averageScore,
  ratingDistribution,
  onLoadMore,
  hasMore,
}: RatingsListProps) => {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= score ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start gap-6">
          {/* Average Score */}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{averageScore.toFixed(1)}</div>
            {renderStars(Math.round(averageScore))}
            <div className="text-sm text-gray-600 mt-1">
              {totalRatings} {t('professional.reviews')}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0;
              const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600 w-8">{star}★</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('professional.customerReviews')}
        </h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="recent">{t('professional.sortRecent')}</option>
          <option value="highest">{t('professional.sortHighest')}</option>
          <option value="lowest">{t('professional.sortLowest')}</option>
        </select>
      </div>

      {/* Ratings List */}
      <div className="space-y-4">
        {ratings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('professional.noReviews')}
          </div>
        ) : (
          ratings.map((rating) => (
            <div key={rating.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {rating.userAvatar ? (
                    <img
                      src={rating.userAvatar}
                      alt={rating.userName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Rating Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{rating.userName}</h4>
                      <p className="text-sm text-gray-500">{formatDate(rating.createdAt)}</p>
                    </div>
                    {renderStars(rating.score)}
                  </div>

                  {/* Comment */}
                  <p className="text-gray-700 mb-3">{rating.comment}</p>

                  {/* Category Ratings */}
                  {rating.categories && rating.categories.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-3">
                      {rating.categories.map((cat) => (
                        <div key={cat.category} className="text-sm">
                          <span className="text-gray-600">
                            {t(`professional.category.${cat.category}`)}:
                          </span>
                          <span className="ml-1 font-medium text-gray-900">
                            {cat.score}/5
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Photos */}
                  {rating.photos && rating.photos.length > 0 && (
                    <div className="flex gap-2">
                      {rating.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Review photo ${index + 1}`}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('common.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
};
