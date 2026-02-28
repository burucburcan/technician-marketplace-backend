import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetPendingPortfoliosQuery,
  useApprovePortfolioMutation,
  useRejectPortfolioMutation,
  type PendingPortfolio,
} from '../../store/api/adminApi';

export const AdminPortfoliosPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedPortfolio, setSelectedPortfolio] = useState<PendingPortfolio | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: portfolios = [], isLoading } = useGetPendingPortfoliosQuery();
  const [approvePortfolio] = useApprovePortfolioMutation();
  const [rejectPortfolio] = useRejectPortfolioMutation();

  const handleApprove = async (portfolioId: string) => {
    try {
      await approvePortfolio(portfolioId).unwrap();
    } catch (error) {
      console.error('Failed to approve portfolio:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedPortfolio) return;
    try {
      await rejectPortfolio({ portfolioId: selectedPortfolio.id, reason: rejectReason }).unwrap();
      setShowRejectModal(false);
      setSelectedPortfolio(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject portfolio:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.portfolioApproval')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.portfolioApprovalDescription')}</p>
      </div>

      {/* Portfolios Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-600">{t('common.loading')}</div>
      ) : portfolios.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('admin.noPortfoliosPending')}</h3>
          <p className="text-gray-600">{t('admin.allPortfoliosReviewed')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Image */}
              <div className="relative aspect-square">
                <img
                  src={portfolio.imageUrl}
                  alt={portfolio.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    {t('admin.pending')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{portfolio.title}</h3>
                {portfolio.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{portfolio.description}</p>
                )}

                {/* Artist Info */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-medium text-xs">
                      {portfolio.artistName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{portfolio.artistName}</p>
                    <p className="text-xs text-gray-500">{portfolio.category}</p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-500 mb-4">
                  {t('admin.submittedOn')}: {new Date(portfolio.submittedAt).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(portfolio.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    ✓ {t('admin.approve')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPortfolio(portfolio);
                      setShowRejectModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    ✗ {t('admin.reject')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.rejectPortfolio')}</h3>
            
            {/* Portfolio Preview */}
            <div className="mb-4">
              <img
                src={selectedPortfolio.thumbnailUrl}
                alt={selectedPortfolio.title}
                className="w-full h-48 object-cover rounded-lg"
              />
              <p className="text-sm font-medium text-gray-900 mt-2">{selectedPortfolio.title}</p>
              <p className="text-xs text-gray-500">{selectedPortfolio.artistName}</p>
            </div>

            {/* Reason Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.rejectionReason')}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('admin.rejectionReasonPlaceholder')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedPortfolio(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
              >
                {t('admin.reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
