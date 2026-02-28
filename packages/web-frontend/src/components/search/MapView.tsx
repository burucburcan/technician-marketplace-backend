import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfessionalSearchResult } from '../../store/api/searchApi';

interface MapViewProps {
  professionals: ProfessionalSearchResult[];
  center?: { lat: number; lng: number };
  onProfessionalClick?: (professional: ProfessionalSearchResult) => void;
}

export const MapView = ({ professionals, center, onProfessionalClick }: MapViewProps) => {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalSearchResult | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const defaultCenter = center || { lat: 19.4326, lng: -99.1332 }; // Mexico City default

    const newMap = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    setMap(newMap);
  }, [mapRef, center, map]);

  // Update markers when professionals change
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null));

    // Create new markers
    const newMarkers = professionals.map((professional) => {
      const marker = new google.maps.Marker({
        position: {
          lat: professional.location.coordinates.latitude,
          lng: professional.location.coordinates.longitude,
        },
        map,
        title: professional.businessName || `${professional.firstName} ${professional.lastName}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: professional.professionalType === 'artist' ? '#9333ea' : '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        setSelectedProfessional(professional);
        if (onProfessionalClick) {
          onProfessionalClick(professional);
        }
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Fit bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach((marker) => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      map.fitBounds(bounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, professionals, onProfessionalClick]);

  return (
    <div className="relative h-full" data-testid="map-view">
      <div ref={mapRef} className="w-full h-full rounded-lg" data-testid="map-container" />

      {/* Selected Professional Info Card */}
      {selectedProfessional && (
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
          <button
            onClick={() => setSelectedProfessional(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start gap-3">
            {selectedProfessional.avatar ? (
              <img
                src={selectedProfessional.avatar}
                alt={selectedProfessional.firstName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {selectedProfessional.businessName ||
                  `${selectedProfessional.firstName} ${selectedProfessional.lastName}`}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-medium">{selectedProfessional.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-gray-500">
                  ${selectedProfessional.hourlyRate} {t('search.perHour')}
                </span>
              </div>
              <a
                href={`/professional/${selectedProfessional.id}`}
                className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('professional.viewProfile')} →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Loading Google Maps Script */}
      {!map && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('search.loading')}</p>
          </div>
        </div>
      )}
    </div>
  );
};
