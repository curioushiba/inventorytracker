export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface GeofenceArea {
  id: string;
  name: string;
  description?: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number; // in meters
  active: boolean;
  createdAt: number;
  triggeredCount: number;
}

export interface LocationBasedInventory {
  itemId: string;
  locationId: string;
  quantity: number;
  lastUpdated: number;
  autoTracking: boolean;
  geofenceTriggered?: boolean;
}

export interface InventoryLocation {
  id: string;
  name: string;
  description?: string;
  address?: string;
  coordinates: LocationData;
  type: 'warehouse' | 'store' | 'office' | 'mobile' | 'custom';
  active: boolean;
  itemCount: number;
  geofence?: GeofenceArea;
  managerUserId?: string;
  timezone?: string;
  businessHours?: {
    open: string;
    close: string;
    days: number[]; // 0-6, Sunday = 0
  };
  createdAt: number;
  lastActivity: number;
}

export interface LocationEvent {
  id: string;
  type: 'enter' | 'exit' | 'movement' | 'inventory_update';
  locationId: string;
  userId: string;
  timestamp: number;
  data: any;
  accuracy: number;
}

export interface LocationConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  trackingInterval: number;
  geofenceCheckInterval: number;
  autoLocationDetection: boolean;
  privacyMode: boolean;
  retentionDays: number;
}

class LocationManager {
  private currentLocation: LocationData | null = null;
  private watchId: number | null = null;
  private isTracking = false;
  private locations: Map<string, InventoryLocation> = new Map();
  private geofences: Map<string, GeofenceArea> = new Map();
  private locationInventory: Map<string, LocationBasedInventory[]> = new Map();
  private locationEvents: LocationEvent[] = [];
  
  private config: LocationConfig = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
    trackingInterval: 60000, // 1 minute
    geofenceCheckInterval: 30000, // 30 seconds
    autoLocationDetection: true,
    privacyMode: false,
    retentionDays: 30
  };

  private listeners: {
    location: Set<(location: LocationData) => void>;
    geofence: Set<(event: { type: 'enter' | 'exit'; geofence: GeofenceArea; location: LocationData }) => void>;
    error: Set<(error: Error) => void>;
  } = {
    location: new Set(),
    geofence: new Set(),
    error: new Set()
  };

  constructor() {
    this.loadStoredData();
    this.startPeriodicGeofenceCheck();
  }

  private loadStoredData() {
    try {
      // Load locations
      const locationsData = localStorage.getItem('inventoryLocations');
      if (locationsData) {
        const locations = JSON.parse(locationsData);
        this.locations = new Map(Object.entries(locations));
      }

      // Load geofences
      const geofencesData = localStorage.getItem('inventoryGeofences');
      if (geofencesData) {
        const geofences = JSON.parse(geofencesData);
        this.geofences = new Map(Object.entries(geofences));
      }

      // Load location inventory
      const locationInventoryData = localStorage.getItem('locationInventory');
      if (locationInventoryData) {
        const inventory = JSON.parse(locationInventoryData);
        this.locationInventory = new Map(Object.entries(inventory));
      }

      // Load configuration
      const configData = localStorage.getItem('locationManagerConfig');
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load location data:', error);
    }
  }

  private persistData() {
    try {
      localStorage.setItem('inventoryLocations', JSON.stringify(Object.fromEntries(this.locations)));
      localStorage.setItem('inventoryGeofences', JSON.stringify(Object.fromEntries(this.geofences)));
      localStorage.setItem('locationInventory', JSON.stringify(Object.fromEntries(this.locationInventory)));
      localStorage.setItem('locationManagerConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to persist location data:', error);
    }
  }

  // Location Tracking
  public async startLocationTracking(): Promise<void> {
    if (!this.checkGeolocationSupport()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    if (this.isTracking) {
      console.warn('Location tracking is already active');
      return;
    }

    try {
      // Request permission
      const permission = await this.requestLocationPermission();
      if (permission !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Start watching position
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error),
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge
        }
      );

      this.isTracking = true;
      console.log('Location tracking started');

      // Get initial position
      this.getCurrentPosition();

    } catch (error) {
      this.handleLocationError(error);
      throw error;
    }
  }

  public stopLocationTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    console.log('Location tracking stopped');
  }

  private async getCurrentPosition(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.convertPositionToLocationData(position);
          resolve(location);
        },
        (error) => reject(new Error(`Failed to get current position: ${error.message}`)),
        {
          enableHighAccuracy: this.config.enableHighAccuracy,
          timeout: this.config.timeout,
          maximumAge: this.config.maximumAge
        }
      );
    });
  }

  private handleLocationUpdate(position: GeolocationPosition) {
    const location = this.convertPositionToLocationData(position);
    this.currentLocation = location;

    // Notify listeners
    this.listeners.location.forEach(listener => {
      try {
        listener(location);
      } catch (error) {
        console.error('Location listener error:', error);
      }
    });

    // Check geofences
    this.checkGeofences(location);

    // Auto-detect new locations
    if (this.config.autoLocationDetection) {
      this.autoDetectLocation(location);
    }

    // Add to event log
    this.addLocationEvent({
      id: `movement_${Date.now()}`,
      type: 'movement',
      locationId: this.findNearestLocation(location)?.id || 'unknown',
      userId: 'current_user', // Would get from auth context
      timestamp: Date.now(),
      data: location,
      accuracy: location.accuracy
    });
  }

  private convertPositionToLocationData(position: GeolocationPosition): LocationData {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined,
      timestamp: position.timestamp
    };
  }

  private handleLocationError(error: any) {
    let errorMessage = 'Location error occurred';
    
    if (error instanceof GeolocationPositionError) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied by user';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    const locationError = new Error(errorMessage);
    console.error('Location error:', locationError);

    this.listeners.error.forEach(listener => {
      try {
        listener(locationError);
      } catch (listenerError) {
        console.error('Location error listener failed:', listenerError);
      }
    });
  }

  // Location Management
  public async createLocation(
    name: string,
    coordinates: LocationData,
    type: InventoryLocation['type'] = 'custom',
    options?: Partial<InventoryLocation>
  ): Promise<string> {
    const locationId = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const location: InventoryLocation = {
      id: locationId,
      name,
      coordinates,
      type,
      active: true,
      itemCount: 0,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ...options
    };

    this.locations.set(locationId, location);
    this.locationInventory.set(locationId, []);
    
    // Create geofence if specified
    if (options?.geofence) {
      this.geofences.set(locationId, options.geofence);
    }

    this.persistData();
    return locationId;
  }

  public async updateLocation(locationId: string, updates: Partial<InventoryLocation>): Promise<void> {
    const location = this.locations.get(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    const updatedLocation = { ...location, ...updates, lastActivity: Date.now() };
    this.locations.set(locationId, updatedLocation);
    this.persistData();
  }

  public async deleteLocation(locationId: string): Promise<void> {
    this.locations.delete(locationId);
    this.geofences.delete(locationId);
    this.locationInventory.delete(locationId);
    this.persistData();
  }

  public getLocation(locationId: string): InventoryLocation | null {
    return this.locations.get(locationId) || null;
  }

  public getAllLocations(): InventoryLocation[] {
    return Array.from(this.locations.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }

  // Geofencing
  public async createGeofence(
    locationId: string,
    name: string,
    center: { latitude: number; longitude: number },
    radius: number
  ): Promise<string> {
    const geofenceId = locationId; // Use location ID as geofence ID
    
    const geofence: GeofenceArea = {
      id: geofenceId,
      name,
      center,
      radius,
      active: true,
      createdAt: Date.now(),
      triggeredCount: 0
    };

    this.geofences.set(geofenceId, geofence);
    
    // Update location with geofence
    const location = this.locations.get(locationId);
    if (location) {
      location.geofence = geofence;
      this.locations.set(locationId, location);
    }

    this.persistData();
    return geofenceId;
  }

  private checkGeofences(currentLocation: LocationData) {
    for (const [locationId, geofence] of this.geofences) {
      if (!geofence.active) continue;

      const distance = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        geofence.center.latitude,
        geofence.center.longitude
      );

      const wasInside = this.wasInsideGeofence(locationId);
      const isInside = distance <= geofence.radius;

      if (isInside && !wasInside) {
        // Entering geofence
        this.handleGeofenceEnter(geofence, currentLocation);
      } else if (!isInside && wasInside) {
        // Exiting geofence
        this.handleGeofenceExit(geofence, currentLocation);
      }

      // Update geofence state
      this.setGeofenceState(locationId, isInside);
    }
  }

  private wasInsideGeofence(locationId: string): boolean {
    const state = localStorage.getItem(`geofence_state_${locationId}`);
    return state === 'inside';
  }

  private setGeofenceState(locationId: string, inside: boolean) {
    localStorage.setItem(`geofence_state_${locationId}`, inside ? 'inside' : 'outside');
  }

  private handleGeofenceEnter(geofence: GeofenceArea, location: LocationData) {
    console.log(`Entered geofence: ${geofence.name}`);
    
    geofence.triggeredCount++;
    this.geofences.set(geofence.id, geofence);

    this.listeners.geofence.forEach(listener => {
      try {
        listener({ type: 'enter', geofence, location });
      } catch (error) {
        console.error('Geofence listener error:', error);
      }
    });

    // Add event
    this.addLocationEvent({
      id: `geofence_enter_${Date.now()}`,
      type: 'enter',
      locationId: geofence.id,
      userId: 'current_user',
      timestamp: Date.now(),
      data: { geofence: geofence.name, coordinates: location },
      accuracy: location.accuracy
    });

    // Auto-update location-based inventory
    this.autoUpdateLocationInventory(geofence.id, 'enter');
  }

  private handleGeofenceExit(geofence: GeofenceArea, location: LocationData) {
    console.log(`Exited geofence: ${geofence.name}`);

    this.listeners.geofence.forEach(listener => {
      try {
        listener({ type: 'exit', geofence, location });
      } catch (error) {
        console.error('Geofence listener error:', error);
      }
    });

    // Add event
    this.addLocationEvent({
      id: `geofence_exit_${Date.now()}`,
      type: 'exit',
      locationId: geofence.id,
      userId: 'current_user',
      timestamp: Date.now(),
      data: { geofence: geofence.name, coordinates: location },
      accuracy: location.accuracy
    });

    // Auto-update location-based inventory
    this.autoUpdateLocationInventory(geofence.id, 'exit');
  }

  private async autoUpdateLocationInventory(locationId: string, event: 'enter' | 'exit') {
    const location = this.locations.get(locationId);
    if (!location) return;

    try {
      // Get user's current inventory context
      const inventory = this.locationInventory.get(locationId) || [];
      
      if (event === 'enter' && location.type === 'warehouse') {
        // Auto-sync inventory when entering warehouse
        await this.syncLocationInventory(locationId);
        
        // Mark user as present at location
        await this.updateUserPresence(locationId, true);
      } else if (event === 'exit') {
        // Mark user as no longer present
        await this.updateUserPresence(locationId, false);
      }
    } catch (error) {
      console.error('Auto inventory update failed:', error);
    }
  }

  private async syncLocationInventory(locationId: string): Promise<void> {
    // This would integrate with the main inventory system
    // to sync items based on location
    
    const location = this.locations.get(locationId);
    if (!location) return;

    // Add location event
    this.addLocationEvent({
      id: `inventory_sync_${Date.now()}`,
      type: 'inventory_update',
      locationId,
      userId: 'current_user',
      timestamp: Date.now(),
      data: { action: 'auto_sync', trigger: 'geofence_enter' },
      accuracy: this.currentLocation?.accuracy || 0
    });
  }

  private async updateUserPresence(locationId: string, present: boolean): Promise<void> {
    const location = this.locations.get(locationId);
    if (!location) return;

    // Update last activity
    location.lastActivity = Date.now();
    this.locations.set(locationId, location);
    this.persistData();
  }

  // Distance calculation using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  private findNearestLocation(location: LocationData): InventoryLocation | null {
    let nearest: InventoryLocation | null = null;
    let minDistance = Infinity;

    for (const inventoryLocation of this.locations.values()) {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        inventoryLocation.coordinates.latitude,
        inventoryLocation.coordinates.longitude
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = inventoryLocation;
      }
    }

    return nearest;
  }

  private autoDetectLocation(location: LocationData) {
    if (!this.config.autoLocationDetection) return;

    const nearest = this.findNearestLocation(location);
    const threshold = 100; // 100 meters

    if (!nearest || this.calculateDistance(
      location.latitude,
      location.longitude,
      nearest.coordinates.latitude,
      nearest.coordinates.longitude
    ) > threshold) {
      // Create new location suggestion
      this.suggestNewLocation(location);
    }
  }

  private suggestNewLocation(location: LocationData) {
    // This could trigger a notification or UI prompt
    // For now, just log the suggestion
    console.log('New location detected - suggest creating location at:', location);
    
    // Could emit an event for the UI to handle
    const suggestion = {
      type: 'location_suggestion',
      coordinates: location,
      timestamp: Date.now()
    };

    // Store suggestion for later retrieval
    const suggestions = JSON.parse(localStorage.getItem('locationSuggestions') || '[]');
    suggestions.unshift(suggestion);
    suggestions.splice(10); // Keep only 10 suggestions
    localStorage.setItem('locationSuggestions', JSON.stringify(suggestions));
  }

  // Location-based Inventory Management
  public async assignItemToLocation(itemId: string, locationId: string, quantity: number): Promise<void> {
    const location = this.locations.get(locationId);
    if (!location) {
      throw new Error(`Location not found: ${locationId}`);
    }

    let inventory = this.locationInventory.get(locationId) || [];
    const existingIndex = inventory.findIndex(item => item.itemId === itemId);

    const locationInventoryItem: LocationBasedInventory = {
      itemId,
      locationId,
      quantity,
      lastUpdated: Date.now(),
      autoTracking: true
    };

    if (existingIndex >= 0) {
      inventory[existingIndex] = locationInventoryItem;
    } else {
      inventory.push(locationInventoryItem);
    }

    this.locationInventory.set(locationId, inventory);
    
    // Update location item count
    location.itemCount = inventory.length;
    this.locations.set(locationId, location);
    
    this.persistData();
  }

  public async transferItem(
    itemId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ): Promise<void> {
    const fromLocation = this.locations.get(fromLocationId);
    const toLocation = this.locations.get(toLocationId);

    if (!fromLocation || !toLocation) {
      throw new Error('Source or destination location not found');
    }

    // Remove from source location
    let fromInventory = this.locationInventory.get(fromLocationId) || [];
    const fromIndex = fromInventory.findIndex(item => item.itemId === itemId);
    
    if (fromIndex >= 0) {
      const fromItem = fromInventory[fromIndex];
      if (fromItem.quantity <= quantity) {
        fromInventory.splice(fromIndex, 1);
      } else {
        fromItem.quantity -= quantity;
        fromItem.lastUpdated = Date.now();
      }
      this.locationInventory.set(fromLocationId, fromInventory);
    }

    // Add to destination location
    await this.assignItemToLocation(itemId, toLocationId, quantity);

    // Add transfer event
    this.addLocationEvent({
      id: `transfer_${Date.now()}`,
      type: 'inventory_update',
      locationId: toLocationId,
      userId: 'current_user',
      timestamp: Date.now(),
      data: {
        action: 'transfer',
        itemId,
        quantity,
        fromLocation: fromLocation.name,
        toLocation: toLocation.name
      },
      accuracy: this.currentLocation?.accuracy || 0
    });
  }

  public getLocationInventory(locationId: string): LocationBasedInventory[] {
    return this.locationInventory.get(locationId) || [];
  }

  public getAllLocationInventory(): Map<string, LocationBasedInventory[]> {
    return new Map(this.locationInventory);
  }

  // Address and Geocoding
  public async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      // Using a free geocoding service (in production, you'd use a proper service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.locality || data.city || data.countryName || 'Unknown Location';
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
    
    return null;
  }

  public async geocodeAddress(address: string): Promise<LocationData | null> {
    try {
      // Using Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const result = data[0];
          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            accuracy: 100, // Estimated accuracy for geocoded results
            timestamp: Date.now()
          };
        }
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
    
    return null;
  }

  // Location Analytics
  public getLocationAnalytics(locationId: string) {
    const location = this.locations.get(locationId);
    const inventory = this.locationInventory.get(locationId) || [];
    const events = this.locationEvents.filter(e => e.locationId === locationId);

    if (!location) return null;

    const analytics = {
      location,
      inventory: {
        totalItems: inventory.length,
        totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
        lastUpdate: Math.max(...inventory.map(item => item.lastUpdated), 0),
        autoTrackedItems: inventory.filter(item => item.autoTracking).length
      },
      activity: {
        totalEvents: events.length,
        recentEvents: events.filter(e => e.timestamp > Date.now() - 86400000), // 24 hours
        enterEvents: events.filter(e => e.type === 'enter').length,
        exitEvents: events.filter(e => e.type === 'exit').length,
        inventoryUpdates: events.filter(e => e.type === 'inventory_update').length
      },
      geofence: location.geofence ? {
        ...location.geofence,
        isCurrentlyInside: this.wasInsideGeofence(locationId)
      } : null
    };

    return analytics;
  }

  public getOverallAnalytics() {
    const allLocations = Array.from(this.locations.values());
    const allEvents = this.locationEvents;

    return {
      locations: {
        total: allLocations.length,
        active: allLocations.filter(l => l.active).length,
        types: allLocations.reduce((acc, l) => {
          acc[l.type] = (acc[l.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      activity: {
        totalEvents: allEvents.length,
        todayEvents: allEvents.filter(e => e.timestamp > Date.now() - 86400000).length,
        weekEvents: allEvents.filter(e => e.timestamp > Date.now() - 604800000).length
      },
      geofences: {
        total: this.geofences.size,
        active: Array.from(this.geofences.values()).filter(g => g.active).length,
        totalTriggers: Array.from(this.geofences.values()).reduce((sum, g) => sum + g.triggeredCount, 0)
      },
      currentLocation: this.currentLocation
    };
  }

  // Event Management
  private addLocationEvent(event: LocationEvent) {
    this.locationEvents.unshift(event);
    
    // Limit events based on retention policy
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    this.locationEvents = this.locationEvents.filter(e => e.timestamp > cutoff);
    
    // Persist events
    try {
      localStorage.setItem('locationEvents', JSON.stringify(this.locationEvents.slice(0, 100))); // Keep only 100 recent events
    } catch (error) {
      console.error('Failed to persist location events:', error);
    }
  }

  public getLocationEvents(locationId?: string): LocationEvent[] {
    if (locationId) {
      return this.locationEvents.filter(e => e.locationId === locationId);
    }
    return [...this.locationEvents];
  }

  private startPeriodicGeofenceCheck() {
    setInterval(() => {
      if (this.currentLocation && this.geofences.size > 0) {
        this.checkGeofences(this.currentLocation);
      }
    }, this.config.geofenceCheckInterval);
  }

  // Permissions and Privacy
  private async requestLocationPermission(): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      console.warn('Failed to check location permissions:', error);
      return 'prompt';
    }
  }

  private checkGeolocationSupport(): boolean {
    return 'geolocation' in navigator;
  }

  public async getLocationPermissionStatus(): Promise<PermissionState> {
    return await this.requestLocationPermission();
  }

  public enablePrivacyMode(enabled: boolean): void {
    this.config.privacyMode = enabled;
    
    if (enabled) {
      // Clear stored location data
      this.currentLocation = null;
      this.locationEvents = [];
      localStorage.removeItem('locationEvents');
      console.log('Privacy mode enabled - location data cleared');
    }
    
    this.persistData();
  }

  // Event Listeners
  public onLocationUpdate(listener: (location: LocationData) => void): () => void {
    this.listeners.location.add(listener);
    return () => this.listeners.location.delete(listener);
  }

  public onGeofenceEvent(listener: (event: { type: 'enter' | 'exit'; geofence: GeofenceArea; location: LocationData }) => void): () => void {
    this.listeners.geofence.add(listener);
    return () => this.listeners.geofence.delete(listener);
  }

  public onError(listener: (error: Error) => void): () => void {
    this.listeners.error.add(listener);
    return () => this.listeners.error.delete(listener);
  }

  // Configuration
  public updateConfiguration(updates: Partial<LocationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.persistData();

    // Restart tracking if settings changed
    if (this.isTracking) {
      this.stopLocationTracking();
      setTimeout(() => this.startLocationTracking(), 1000);
    }
  }

  public getConfiguration(): LocationConfig {
    return { ...this.config };
  }

  // Utility methods
  public getCurrentLocation(): LocationData | null {
    return this.currentLocation;
  }

  public isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  public getLocationSuggestions(): any[] {
    try {
      return JSON.parse(localStorage.getItem('locationSuggestions') || '[]');
    } catch (error) {
      return [];
    }
  }

  public clearLocationSuggestions(): void {
    localStorage.removeItem('locationSuggestions');
  }

  // Export functionality
  public exportLocationData(): any {
    return {
      locations: Object.fromEntries(this.locations),
      geofences: Object.fromEntries(this.geofences),
      inventory: Object.fromEntries(this.locationInventory),
      events: this.locationEvents,
      config: this.config,
      exportTimestamp: Date.now()
    };
  }

  public async importLocationData(data: any): Promise<void> {
    try {
      if (data.locations) {
        this.locations = new Map(Object.entries(data.locations));
      }
      if (data.geofences) {
        this.geofences = new Map(Object.entries(data.geofences));
      }
      if (data.inventory) {
        this.locationInventory = new Map(Object.entries(data.inventory));
      }
      if (data.events) {
        this.locationEvents = data.events;
      }
      if (data.config) {
        this.config = { ...this.config, ...data.config };
      }

      this.persistData();
      console.log('Location data imported successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to import location data: ${errorMessage}`);
    }
  }

  // Cleanup
  public destroy(): void {
    this.stopLocationTracking();
    this.listeners.location.clear();
    this.listeners.geofence.clear();
    this.listeners.error.clear();
    this.locations.clear();
    this.geofences.clear();
    this.locationInventory.clear();
    this.locationEvents = [];
  }
}

// Singleton instance
let locationManagerInstance: LocationManager | null = null;

export function getLocationManager(): LocationManager {
  if (!locationManagerInstance) {
    locationManagerInstance = new LocationManager();
  }
  return locationManagerInstance;
}

// Export for service worker use
export { LocationManager };