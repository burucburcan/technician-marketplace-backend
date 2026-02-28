import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useGetMyPortfolioQuery,
  useUploadPortfolioImageMutation,
  useUpdatePortfolioImageMutation,
  useDeletePortfolioImageMutation,
} from '../../store/api/professionalDashboardApi';
import type { PortfolioItem } from '../../store/api/searchApi';
import type { PortfolioMetadata } from '../../store/api/professionalDashboardApi';

export const PortfolioManagement: React.FC = () => {
  const { t } = useTranslation();
  const { data: portfolio, isLoading } = useGetMyPortfolioQuery();
  const [uploadImage] = useUploadPortfolioImageMutation();
  const [updateImage] = useUpdatePortfolioImageMutation();
  const [deleteImage] = useDeletePortfolioImageMutation();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PortfolioMetadata>({
    title: '',
    description: '',
    category: '',
    dimensions: '',
    materials: [],
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError(t('professionalDashboard.fileTooLarge'));
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !metadata.title || !metadata.category) {
      setError(t('professionalDashboard.requiredFields'));
      return;
    }

    setUploading(true);
    setError('');

    try {
      await uploadImage({ file: selectedFile, metadata }).unwrap();
      resetForm();
      setShowUploadModal(false);
    } catch (err) {
      setError(t('professionalDashboard.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem || !metadata.title || !metadata.category) {
      setError(t('professionalDashboard.requiredFields'));
      return;
    }

    setUploading(true);
    setError('');

    try {
      await updateImage({ imageId: editingItem.id, metadata }).unwrap();
      resetForm();
      setEditingItem(null);
    } catch (err) {
      setError(t('professionalDashboard.updateError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm(t('professionalDashboard.confirmDelete'))) {
      return;
    }

    try {
      await deleteImage(imageId).unwrap();
    } catch (err) {
      setError(t('professionalDashboard.deleteError'));
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setMetadata({
      title: '',
      description: '',
      category: '',
      dimensions: '',
      materials: [],
    });
    setError('');
  };

  const openEditModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setMetadata({
      title: item.title,
      description: item.description || '',
      category: item.category,
      dimensions: '',
      materials: [],
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const canAddMore = !portfolio || portfolio.length < 20;

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('professionalDashboard.portfolioManagement')}
          </h2>
          {canAddMore && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('professionalDashboard.uploadImage')}
            </button>
          )}
        </div>

        {!portfolio || portfolio.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {t('professionalDashboard.noPortfolioItems')}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('professionalDashboard.uploadFirstImage')}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {portfolio.length} / 20 {t('professionalDashboard.images')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mb-3">{item.category}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex-1 px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upload/Edit Modal */}
      {(showUploadModal || editingItem) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingItem
                ? t('professionalDashboard.editImage')
                : t('professionalDashboard.uploadImage')}
            </h2>

            <div className="space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('professionalDashboard.selectImage')} *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('professionalDashboard.imageTitle')} *
                </label>
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('professionalDashboard.titlePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('professionalDashboard.imageDescription')}
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder={t('professionalDashboard.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('professionalDashboard.imageCategory')} *
                </label>
                <input
                  type="text"
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('professionalDashboard.categoryPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('professionalDashboard.imageDimensions')}
                </label>
                <input
                  type="text"
                  value={metadata.dimensions}
                  onChange={(e) => setMetadata({ ...metadata, dimensions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('professionalDashboard.dimensionsPlaceholder')}
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  resetForm();
                  setShowUploadModal(false);
                  setEditingItem(null);
                }}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={editingItem ? handleUpdate : handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading
                  ? t('common.loading')
                  : editingItem
                  ? t('common.save')
                  : t('professionalDashboard.upload')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
