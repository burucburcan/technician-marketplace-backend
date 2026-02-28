import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProgressPhoto } from '../../store/api/bookingApi';
import { useUploadProgressPhotoMutation } from '../../store/api/bookingApi';

interface ProgressPhotosGalleryProps {
  bookingId: string;
  photos: ProgressPhoto[];
}

export const ProgressPhotosGallery = ({ bookingId, photos }: ProgressPhotosGalleryProps) => {
  const { t, i18n } = useTranslation();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);

  const [uploadPhoto, { isLoading: isUploading }] = useUploadProgressPhotoMutation();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.language === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleDateString(i18n.language === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadPhoto({
        bookingId,
        file: selectedFile,
        caption: caption.trim() || undefined,
      }).unwrap();
      
      setShowUploadModal(false);
      setSelectedFile(null);
      setCaption('');
    } catch (error) {
      alert(t('booking.error.uploadFailed'));
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6" data-testid="progress-photos-gallery">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('booking.detail.progressPhotos')}
          </h2>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            data-testid="upload-photo-button"
          >
            {t('booking.detail.uploadProgressPhoto')}
          </button>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>{t('booking.detail.noProgressPhotos')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="relative group cursor-pointer"
                data-testid={`progress-photo-${photo.id}`}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || 'Progress photo'}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
                {photo.caption && (
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{photo.caption}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(photo.uploadedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {t('booking.detail.uploadProgressPhoto')}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('booking.uploadImages')}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="w-full"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">{selectedFile.name}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('booking.detail.photoCaption')}
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('booking.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setCaption('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? t('common.loading') : t('common.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-white hover:text-gray-300"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.caption || 'Progress photo'}
              className="w-full h-auto rounded-lg"
            />
            {selectedPhoto.caption && (
              <p className="mt-4 text-white text-lg">{selectedPhoto.caption}</p>
            )}
            <div className="mt-2 text-gray-300 text-sm">
              <p>{t('booking.detail.uploadedBy')}: {selectedPhoto.uploadedBy}</p>
              <p>{formatDateTime(selectedPhoto.uploadedAt)}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
