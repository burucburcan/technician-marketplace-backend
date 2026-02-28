import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateRatingMutation, useGetBookingRatingQuery, RatingCategory } from '../../store/api/ratingApi';

interface RatingFormProps {
  bookingId: string;
  professionalId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
}

export const RatingForm = ({ bookingId }: RatingFormProps) => {
  const { t } = useTranslation();
  const [overallScore, setOverallScore] = useState(5);
  const [comment, setComment] = useState('');
  const [categoryScores, setCategoryScores] = useState<Record<RatingCategory, number>>({
    [RatingCategory.QUALITY]: 5,
    [RatingCategory.PUNCTUALITY]: 5,
    [RatingCategory.COMMUNICATION]: 5,
    [RatingCategory.PROFESSIONALISM]: 5,
    [RatingCategory.VALUE]: 5,
  });

  const { data: existingRating, isLoading: isCheckingRating } = useGetBookingRatingQuery(bookingId);
  const [createRating, { isLoading: isSubmitting }] = useCreateRatingMutation();

  const handleCategoryScoreChange = (category: RatingCategory, score: number) => {
    setCategoryScores((prev) => ({ ...prev, [category]: score }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      alert(t('booking.detail.ratingComment'));
      return;
    }

    try {
      await createRating({
        bookingId,
        score: overallScore,
        comment: comment.trim(),
        categories: Object.entries(categoryScores).map(([category, score]) => ({
          category: category as RatingCategory,
          score,
        })),
      }).unwrap();

      alert(t('booking.detail.ratingSubmitted'));
    } catch (error) {
      alert(t('booking.error.ratingFailed'));
    }
  };

  if (isCheckingRating) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (existingRating) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {t('booking.detail.yourRating')}
        </h2>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-6 h-6 ${
                    star <= existingRating.score ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="ml-2 text-lg font-semibold text-gray-900">
              {existingRating.score}/5
            </span>
          </div>
          <p className="text-gray-700 mt-2">{existingRating.comment}</p>
          <p className="text-sm text-green-700 mt-3">
            {t('booking.detail.alreadyRated')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6" data-testid="rating-form">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {t('booking.detail.leaveRating')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.detail.overallRating')}
          </label>
          <div className="flex items-center space-x-2" data-testid="overall-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setOverallScore(star)}
                className="focus:outline-none"
                data-testid={`star-${star}`}
              >
                <svg
                  className={`w-8 h-8 ${
                    star <= overallScore ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
            <span className="ml-2 text-lg font-semibold text-gray-900">
              {overallScore}/5
            </span>
          </div>
        </div>

        {/* Category Ratings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('booking.detail.rating')} {t('professional.category.quality')}
          </label>
          <div className="space-y-3">
            {Object.values(RatingCategory).map((category) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {t(`professional.category.${category}`)}
                </span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleCategoryScoreChange(category, star)}
                      className="focus:outline-none"
                    >
                      <svg
                        className={`w-5 h-5 ${
                          star <= categoryScores[category]
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('booking.detail.ratingComment')}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('booking.detail.ratingCommentPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="rating-comment"
            rows={4}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="submit-rating"
        >
          {isSubmitting ? t('common.loading') : t('booking.detail.submitRating')}
        </button>
      </form>
    </div>
  );
};
