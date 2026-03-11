/**
 * Google Maps API Loader
 * Dynamically loads Google Maps JavaScript API with the API key from environment variables
 */

let isLoading = false;
let isLoaded = false;
const callbacks: Array<() => void> = [];

/**
 * Load Google Maps JavaScript API
 * @returns Promise that resolves when Google Maps is loaded
 */
export const loadGoogleMaps = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isLoaded && window.google?.maps) {
      resolve();
      return;
    }

    // If currently loading, add to callbacks
    if (isLoading) {
      callbacks.push(resolve);
      return;
    }

    // Start loading
    isLoading = true;

    // Get API key from environment variables
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      const error = new Error('Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your .env.local file.');
      console.error(error);
      reject(error);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    // Handle successful load
    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      resolve();
      
      // Call all pending callbacks
      callbacks.forEach(callback => callback());
      callbacks.length = 0;
    };

    // Handle load error
    script.onerror = () => {
      isLoading = false;
      const error = new Error('Failed to load Google Maps API. Please check your API key and internet connection.');
      console.error(error);
      reject(error);
      
      // Reject all pending callbacks
      callbacks.length = 0;
    };

    // Append script to document
    document.head.appendChild(script);
  });
};

/**
 * Check if Google Maps is loaded
 */
export const isGoogleMapsLoaded = (): boolean => {
  return isLoaded && !!window.google?.maps;
};
