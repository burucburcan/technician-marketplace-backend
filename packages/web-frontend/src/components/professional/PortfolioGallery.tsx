import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PortfolioItem } from '../../store/api/searchApi';

interface PortfolioGalleryProps {
  portfolio: PortfolioItem[];
}

export const PortfolioGallery = ({ portfolio }: PortfolioGalleryProps) => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<PortfolioItem | null>(null);

  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {t('professional.noPortfolio')}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {portfolio.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedImage(item)}
            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
          >
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
            {item.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <p className="text-white text-sm font-medium truncate">{item.title}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage.imageUrl}
              alt={selectedImage.title}
              className="w-full h-auto rounded-lg"
            />
            {(selectedImage.title || selectedImage.description) && (
              <div className="mt-4 text-white">
                {selectedImage.title && (
                  <h3 className="text-xl font-semibold mb-2">{selectedImage.title}</h3>
                )}
                {selectedImage.description && (
                  <p className="text-gray-300">{selectedImage.description}</p>
                )}
                {selectedImage.category && (
                  <span className="inline-block mt-2 px-3 py-1 bg-purple-600 rounded-full text-sm">
                    {selectedImage.category}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
