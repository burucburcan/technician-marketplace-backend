import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  useGetProviderProfessionalsQuery,
  useGetProviderStatsQuery,
  useAddProfessionalMutation,
  useUpdateProfessionalMutation,
  useToggleProfessionalStatusMutation,
  useDeleteProfessionalMutation,
  type ProviderProfessional,
  type ProfessionalFormData,
} from '../../store/api/providerApi';
import { ProfessionalList } from '../../components/provider/ProfessionalList';
import { ProfessionalForm } from '../../components/provider/ProfessionalForm';
import { ProviderStats } from '../../components/provider/ProviderStats';
import { DeleteConfirmModal } from '../../components/provider/DeleteConfirmModal';

type ViewMode = 'list' | 'add' | 'edit';

export const ProviderDashboardPage = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProfessional, setSelectedProfessional] = useState<ProviderProfessional | null>(
    null
  );
  const [professionalToDelete, setProfessionalToDelete] = useState<ProviderProfessional | null>(
    null
  );

  // API hooks
  const { data: professionals = [], isLoading: loadingProfessionals } =
    useGetProviderProfessionalsQuery(
      { providerId: user?.id || '' },
      { skip: !user?.id }
    );

  const { data: stats, isLoading: loadingStats } = useGetProviderStatsQuery(user?.id || '', {
    skip: !user?.id,
  });

  const [addProfessional, { isLoading: isAdding }] = useAddProfessionalMutation();
  const [updateProfessional, { isLoading: isUpdating }] = useUpdateProfessionalMutation();
  const [toggleStatus] = useToggleProfessionalStatusMutation();
  const [deleteProfessional, { isLoading: isDeleting }] = useDeleteProfessionalMutation();

  // Handlers
  const handleAddClick = () => {
    setSelectedProfessional(null);
    setViewMode('add');
  };

  const handleEditClick = (professional: ProviderProfessional) => {
    setSelectedProfessional(professional);
    setViewMode('edit');
  };

  const handleDeleteClick = (professional: ProviderProfessional) => {
    setProfessionalToDelete(professional);
  };

  const handleToggleStatus = async (professional: ProviderProfessional) => {
    if (!user?.id) return;
    try {
      await toggleStatus({
        providerId: user.id,
        professionalId: professional.id,
        isActive: !professional.isActive,
      }).unwrap();
    } catch (error) {
      console.error('Failed to toggle professional status:', error);
    }
  };

  const handleFormSubmit = async (data: ProfessionalFormData) => {
    if (!user?.id) return;

    try {
      if (viewMode === 'add') {
        await addProfessional({
          providerId: user.id,
          data,
        }).unwrap();
      } else if (viewMode === 'edit' && selectedProfessional) {
        await updateProfessional({
          providerId: user.id,
          professionalId: selectedProfessional.id,
          data,
        }).unwrap();
      }
      setViewMode('list');
      setSelectedProfessional(null);
    } catch (error) {
      console.error('Failed to save professional:', error);
    }
  };

  const handleFormCancel = () => {
    setViewMode('list');
    setSelectedProfessional(null);
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !professionalToDelete) return;

    try {
      await deleteProfessional({
        providerId: user.id,
        professionalId: professionalToDelete.id,
      }).unwrap();
      setProfessionalToDelete(null);
    } catch (error) {
      console.error('Failed to delete professional:', error);
    }
  };

  const handleDeleteCancel = () => {
    setProfessionalToDelete(null);
  };

  if (loadingProfessionals || loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('provider.dashboard')}</h1>
          <p className="text-gray-600 mt-1">{t('provider.dashboardSubtitle')}</p>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={handleAddClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {t('provider.addProfessional')}
          </button>
        )}
      </div>

      {/* Statistics */}
      {viewMode === 'list' && stats && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('provider.statistics')}
          </h2>
          <ProviderStats stats={stats} />
        </div>
      )}

      {/* Content */}
      <div>
        {viewMode === 'list' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('provider.professionals')}
              </h2>
              <span className="text-sm text-gray-600">
                {professionals.length} {t('provider.total')}
              </span>
            </div>
            <ProfessionalList
              professionals={professionals}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onToggleStatus={handleToggleStatus}
            />
          </>
        )}

        {(viewMode === 'add' || viewMode === 'edit') && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {viewMode === 'add'
                ? t('provider.addProfessional')
                : t('provider.editProfessional')}
            </h2>
            <ProfessionalForm
              professional={selectedProfessional || undefined}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isLoading={isAdding || isUpdating}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {professionalToDelete && (
        <DeleteConfirmModal
          professional={professionalToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
