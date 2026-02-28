// Location service for handling GPS and location permissions
// Note: Requires expo-location package to be installed

export interface LocationCoordinates {
  latitude: number
  longitude: number
}

export class LocationService {
  /**
   * Request location permissions from the user
   * @returns Promise<boolean> - true if permission granted
   */
  static async requestLocationPermission(): Promise<boolean> {
    // TODO: Implement with expo-location
    // const { status } = await Location.requestForegroundPermissionsAsync()
    // return status === 'granted'
    console.log('Location permission requested (not implemented)')
    return true
  }

  /**
   * Get current device location
   * @returns Promise<LocationCoordinates | null>
   */
  static async getCurrentLocation(): Promise<LocationCoordinates | null> {
    // TODO: Implement with expo-location
    // const location = await Location.getCurrentPositionAsync({})
    // return {
    //   latitude: location.coords.latitude,
    //   longitude: location.coords.longitude,
    // }
    console.log('Get current location (not implemented)')
    return null
  }

  /**
   * Calculate distance between two coordinates in kilometers
   * @param coord1 First coordinate
   * @param coord2 Second coordinate
   * @returns Distance in kilometers
   */
  static calculateDistance(
    coord1: LocationCoordinates,
    coord2: LocationCoordinates
  ): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(coord2.latitude - coord1.latitude)
    const dLon = this.toRad(coord2.longitude - coord1.longitude)
    const lat1 = this.toRad(coord1.latitude)
    const lat2 = this.toRad(coord2.latitude)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) *
        Math.sin(dLon / 2) *
        Math.cos(lat1) *
        Math.cos(lat2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static toRad(degrees: number): number {
    return (degrees * Math.PI) / 180
  }
}

// Installation instructions:
// npm install expo-location react-native-maps
// Then uncomment the implementation above
