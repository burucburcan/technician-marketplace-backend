import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderProfessional } from '../../store/api/providerApi';

interface DeleteConfirmModalProps {
  professional: ProviderProfessional;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  professional,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          {t('provider.deleteProfessional')}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-600 text-center mb-6">
          {t('provider.deleteConfirmMessage', {
            name: `${professional.firstName} ${professional.lastName}`,
          })}
        </p>

        {/* Professional Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
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
              <p className="font-medium text-gray-900">
                {professional.firstName} {professional.lastName}
              </p>
              <p className="text-sm text-gray-500">{professional.email}</p>
              <p className="text-xs text-gray-400">
                {t(`professional.${professional.professionalType}`)} • {professional.totalJobs}{' '}
                {t('provider.totalJobs')}
              </p>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-red-800">{t('provider.deleteWarning')}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? t('common.loading') : t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};
