import { useState, useEffect, useCallback } from 'react';
import { 
  getLocationManager, 
  LocationData, 
  InventoryLocation, 
  GeofenceArea, 
  LocationEvent,
  LocationBasedInventory 
} from '@/lib/location/location-manager';

export interface LocationState {
  isSupported: boolean;
  permission: PermissionState;
  isTracking: boolean;
  currentLocation: LocationData | null;
  locations: InventoryLocation[];
  geofences: GeofenceArea[];
  locationInventory: Map<string, LocationBasedInventory[]>;
  recentEvents: LocationEvent[];
  error: string | null;
  nearestLocation: InventoryLocation | null;
  suggestions: any[];
}

export function useLocationManager() {
  const [state, setState] = useState<LocationState>({
    isSupported: false,
    permission: 'prompt',
    isTracking: false,
    currentLocation: null,
    locations: [],
    geofences: [],
    locationInventory: new Map(),
    recentEvents: [],
    error: null,
    nearestLocation: null,
    suggestions: []
  });

  const locationManager = getLocationManager();

  const updateState = useCallback(async () => {
    try {
      const isSupported = 'geolocation' in navigator;
      const permission = await locationManager.getLocationPermissionStatus();
      const currentLocation = locationManager.getCurrentLocation();
      const isTracking = locationManager.isCurrentlyTracking();
      const locations = locationManager.getAllLocations();
      const locationInventory = locationManager.getAllLocationInventory();
      const recentEvents = locationManager.getLocationEvents().slice(0, 20);
      const suggestions = locationManager.getLocationSuggestions();

      // Find nearest location
      let nearestLocation = null;
      if (currentLocation && locations.length > 0) {
        let minDistance = Infinity;
        for (const loc of locations) {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            loc.coordinates.latitude,
            loc.coordinates.longitude
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestLocation = loc;
          }
        }
      }

      setState(prev => ({
        ...prev,
        isSupported,
        permission,
        isTracking,
        currentLocation,
        locations,
        locationInventory,
        recentEvents,
        nearestLocation,
        suggestions,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [locationManager]);

  useEffect(() => {
    updateState();

    // Set up location update listener
    const unsubscribeLocation = locationManager.onLocationUpdate((location) => {
      setState(prev => ({ ...prev, currentLocation: location, error: null }));
    });

    // Set up geofence event listener
    const unsubscribeGeofence = locationManager.onGeofenceEvent((event) => {
      console.log('Geofence event:', event);
      // Could trigger notifications or UI updates
      updateState();
    });

    // Set up error listener
    const unsubscribeError = locationManager.onError((error) => {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isTracking: false 
      }));
    });

    // Update state periodically
    const interval = setInterval(updateState, 10000); // Every 10 seconds

    return () => {
      unsubscribeLocation();
      unsubscribeGeofence();
      unsubscribeError();
      clearInterval(interval);
    };
  }, [locationManager, updateState]);

  // Location tracking controls
  const startTracking = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await locationManager.startLocationTracking();
      await updateState();
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start tracking',
        isTracking: false 
      }));
      throw error;
    }
  }, [locationManager, updateState]);

  const stopTracking = useCallback(() => {
    locationManager.stopLocationTracking();
    setState(prev => ({ ...prev, isTracking: false }));
  }, [locationManager]);

  // Location management
  const createLocation = useCallback(async (
    name: string,
    coordinates: LocationData,
    type: InventoryLocation['type'] = 'custom',
    options?: Partial<InventoryLocation>
  ): Promise<string> => {
    const locationId = await locationManager.createLocation(name, coordinates, type, options);
    await updateState();
    return locationId;
  }, [locationManager, updateState]);

  const updateLocation = useCallback(async (
    locationId: string,
    updates: Partial<InventoryLocation>
  ): Promise<void> => {
    await locationManager.updateLocation(locationId, updates);
    await updateState();
  }, [locationManager, updateState]);

  const deleteLocation = useCallback(async (locationId: string): Promise<void> => {
    await locationManager.deleteLocation(locationId);
    await updateState();
  }, [locationManager, updateState]);

  // Geofence management
  const createGeofence = useCallback(async (
    locationId: string,
    name: string,
    center: { latitude: number; longitude: number },
    radius: number
  ): Promise<string> => {
    const geofenceId = await locationManager.createGeofence(locationId, name, center, radius);
    await updateState();
    return geofenceId;
  }, [locationManager, updateState]);

  // Inventory management
  const assignItemToLocation = useCallback(async (
    itemId: string,
    locationId: string,
    quantity: number
  ): Promise<void> => {
    await locationManager.assignItemToLocation(itemId, locationId, quantity);
    await updateState();
  }, [locationManager, updateState]);

  const transferItem = useCallback(async (
    itemId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ): Promise<void> => {
    await locationManager.transferItem(itemId, fromLocationId, toLocationId, quantity);
    await updateState();
  }, [locationManager, updateState]);

  // Address and geocoding
  const reverseGeocode = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<string | null> => {
    return await locationManager.reverseGeocode(latitude, longitude);
  }, [locationManager]);

  const geocodeAddress = useCallback(async (address: string): Promise<LocationData | null> => {
    return await locationManager.geocodeAddress(address);
  }, [locationManager]);

  // Analytics
  const getLocationAnalytics = useCallback((locationId: string) => {
    return locationManager.getLocationAnalytics(locationId);
  }, [locationManager]);

  const getOverallAnalytics = useCallback(() => {
    return locationManager.getOverallAnalytics();
  }, [locationManager]);

  // Configuration
  const updateConfiguration = useCallback((config: any) => {
    locationManager.updateConfiguration(config);
    updateState();
  }, [locationManager, updateState]);

  const enablePrivacyMode = useCallback((enabled: boolean) => {
    locationManager.enablePrivacyMode(enabled);
    updateState();
  }, [locationManager, updateState]);

  // Utility functions
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearSuggestions = useCallback(() => {
    locationManager.clearLocationSuggestions();
    setState(prev => ({ ...prev, suggestions: [] }));
  }, [locationManager]);

  const getCurrentLocationName = useCallback(async (): Promise<string> => {
    if (!state.currentLocation) return 'Unknown';
    
    if (state.nearestLocation) {
      const distance = calculateDistance(
        state.currentLocation.latitude,
        state.currentLocation.longitude,
        state.nearestLocation.coordinates.latitude,
        state.nearestLocation.coordinates.longitude
      );
      
      if (distance < 100) { // Within 100 meters
        return state.nearestLocation.name;
      }
    }

    // Try reverse geocoding
    const address = await reverseGeocode(
      state.currentLocation.latitude,
      state.currentLocation.longitude
    );
    
    return address || 'Current Location';
  }, [state.currentLocation, state.nearestLocation, reverseGeocode]);

  const getLocationInventory = useCallback((locationId: string) => {
    return locationManager.getLocationInventory(locationId);
  }, [locationManager]);

  const exportLocationData = useCallback(() => {
    return locationManager.exportLocationData();
  }, [locationManager]);

  const importLocationData = useCallback(async (data: any) => {
    await locationManager.importLocationData(data);
    await updateState();
  }, [locationManager, updateState]);

  // Format utilities
  const formatCoordinates = useCallback((location: LocationData, precision: number = 6) => {
    return {
      latitude: location.latitude.toFixed(precision),
      longitude: location.longitude.toFixed(precision),
      display: `${location.latitude.toFixed(precision)}, ${location.longitude.toFixed(precision)}`
    };
  }, []);

  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }, []);

  const formatAccuracy = useCallback((accuracy: number): string => {
    if (accuracy < 10) return 'Excellent';
    if (accuracy < 50) return 'Good';
    if (accuracy < 100) return 'Fair';
    return 'Poor';
  }, []);

  return {
    state,
    actions: {
      startTracking,
      stopTracking,
      createLocation,
      updateLocation,
      deleteLocation,
      createGeofence,
      assignItemToLocation,
      transferItem,
      updateConfiguration,
      enablePrivacyMode,
      clearError,
      clearSuggestions,
      exportLocationData,
      importLocationData
    },
    queries: {
      reverseGeocode,
      geocodeAddress,
      getLocationAnalytics,
      getOverallAnalytics,
      getCurrentLocationName,
      getLocationInventory
    },
    utils: {
      formatCoordinates,
      formatDistance,
      formatAccuracy,
      calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => 
        calculateDistance(lat1, lon1, lat2, lon2)
    }
  };
}

// Utility function for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}