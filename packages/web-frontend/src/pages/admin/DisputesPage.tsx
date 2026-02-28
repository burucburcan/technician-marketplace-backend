import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetAllDisputesQuery,
  useResolveDisputeMutation,
  type Dispute,
} from '../../store/api/adminApi';

export const AdminDisputesPage: React.FC = () => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');

  const { data: disputes = [], isLoading } = useGetAllDisputesQuery({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const [resolveDispute] = useResolveDisputeMutation();

  const handleResolve = async () => {
    if (!selectedDispute) return;
    try {
      await resolveDispute({ disputeId: selectedDispute.id, resolution }).unwrap();
      setShowResolveModal(false);
      setSelectedDispute(null);
      setResolution('');
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-red-100 text-red-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors]}`}>
        {t(`admin.dispute.${status}`)}
      </span>
    );
  };

  const getIssueTypeIcon = (issueType: string) => {
    const icons: Record<string, string> = {
      no_show: '👻',
      poor_quality: '⚠️',
      damage: '💥',
      safety_concern: '🚨',
      pricing_dispute: '💰',
      other: '❓',
    };
    return icons[issueType] || '❓';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.disputeManagement')}</h1>
        <p className="text-gray-600 mt-2">{t('admin.disputeManagementDescription')}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid="filter-all-disputes"
        >
          {t('admin.allDisputes')}
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'open'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid="filter-open"
        >
          {t('admin.dispute.open')}
        </button>
        <button
          onClick={() => setStatusFilter('investigating')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'investigating'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid="filter-investigating"
        >
          {t('admin.dispute.investigating')}
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            statusFilter === 'resolved'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          data-testid="filter-resolved"
        >
          {t('admin.dispute.resolved')}
        </button>
      </div>

      {/* Disputes List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">{t('common.loading')}</div>
        ) : disputes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('admin.noDisputesFound')}</h3>
            <p className="text-gray-600">{t('admin.noDisputesDescription')}</p>
          </div>
        ) : (
          disputes.map((dispute) => (
            <div key={dispute.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid={`dispute-${dispute.id}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getIssueTypeIcon(dispute.issueType)}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {t(`admin.issueType.${dispute.issueType}`)}
                      </h3>
                      {getStatusBadge(dispute.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {t('admin.bookingId')}: {dispute.bookingId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('admin.reportedOn')}: {new Date(dispute.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                  <button
                    onClick={() => {
                      setSelectedDispute(dispute);
                      setShowResolveModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    data-testid={`resolve-dispute-${dispute.id}`}
                  >
                    {t('admin.resolve')}
                  </button>
                )}
              </div>

              {/* Parties Involved */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('admin.reportedBy')}</p>
                  <p className="text-sm font-medium text-gray-900">{dispute.reportedByName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('admin.professional')}</p>
                  <p className="text-sm font-medium text-gray-900">{dispute.professionalName}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">{t('admin.description')}</p>
                <p className="text-sm text-gray-600">{dispute.description}</p>
              </div>

              {/* Resolution */}
              {dispute.resolution && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-1">{t('admin.resolution')}</p>
                  <p className="text-sm text-green-800">{dispute.resolution}</p>
                  {dispute.resolvedAt && (
                    <p className="text-xs text-green-600 mt-2">
                      {t('admin.resolvedOn')}: {new Date(dispute.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-testid="resolve-dispute-modal">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('admin.resolveDispute')}</h3>

            {/* Dispute Details */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getIssueTypeIcon(selectedDispute.issueType)}</span>
                <h4 className="font-medium text-gray-900">
                  {t(`admin.issueType.${selectedDispute.issueType}`)}
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">{selectedDispute.description}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <span className="font-medium">{t('admin.reportedBy')}:</span> {selectedDispute.reportedByName}
                </div>
                <div>
                  <span className="font-medium">{t('admin.professional')}:</span> {selectedDispute.professionalName}
                </div>
              </div>
            </div>

            {/* Resolution Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.resolutionDetails')}
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('admin.resolutionPlaceholder')}
                data-testid="resolution-input"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedDispute(null);
                  setResolution('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                data-testid="cancel-resolve"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                data-testid="confirm-resolve"
              >
                {t('admin.resolveDispute')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
