'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MapPin, 
  Navigation, 
  NavigationOff, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Target,
  Building,
  Store,
  Home,
  Truck,
  BarChart3
} from 'lucide-react';
import { useLocationManager } from '@/hooks/use-location-manager';
import { InventoryLocation, LocationData } from '@/lib/location/location-manager';

interface LocationManagerPanelProps {
  className?: string;
}

export function LocationManagerPanel({ className }: LocationManagerPanelProps) {
  const {
    state,
    actions: { 
      startTracking, 
      stopTracking, 
      createLocation, 
      updateLocation, 
      deleteLocation,
      createGeofence,
      assignItemToLocation,
      transferItem 
    },
    queries: { reverseGeocode, getLocationAnalytics, getOverallAnalytics },
    utils: { formatCoordinates, formatDistance, formatAccuracy }
  } = useLocationManager();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLocationData, setNewLocationData] = useState({
    name: '',
    type: 'custom' as InventoryLocation['type'],
    description: '',
    useCurrentLocation: true,
    coordinates: null as LocationData | null,
    createGeofence: false,
    geofenceRadius: 100
  });

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    if (newLocationData.useCurrentLocation && state.currentLocation) {
      setNewLocationData(prev => ({
        ...prev,
        coordinates: state.currentLocation
      }));
    }
  }, [state.currentLocation, newLocationData.useCurrentLocation]);

  const handleStartTracking = async () => {
    try {
      await startTracking();
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocationData.name || !newLocationData.coordinates) {
      alert('Please provide a name and valid coordinates');
      return;
    }

    try {
      const locationId = await createLocation(
        newLocationData.name,
        newLocationData.coordinates,
        newLocationData.type,
        {
          description: newLocationData.description || undefined
        }
      );

      // Create geofence if requested
      if (newLocationData.createGeofence) {
        await createGeofence(
          locationId,
          `${newLocationData.name} Geofence`,
          {
            latitude: newLocationData.coordinates.latitude,
            longitude: newLocationData.coordinates.longitude
          },
          newLocationData.geofenceRadius
        );
      }

      // Reset form
      setNewLocationData({
        name: '',
        type: 'custom',
        description: '',
        useCurrentLocation: true,
        coordinates: null,
        createGeofence: false,
        geofenceRadius: 100
      });

      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create location:', error);
      alert('Failed to create location. Please try again.');
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      try {
        await deleteLocation(locationId);
      } catch (error) {
        console.error('Failed to delete location:', error);
        alert('Failed to delete location. Please try again.');
      }
    }
  };

  const getLocationTypeIcon = (type: InventoryLocation['type']) => {
    switch (type) {
      case 'warehouse': return <Building className="h-4 w-4" />;
      case 'store': return <Store className="h-4 w-4" />;
      case 'office': return <Home className="h-4 w-4" />;
      case 'mobile': return <Truck className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const overallAnalytics = getOverallAnalytics();

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Location Management</h2>
        </div>

        <div className="flex items-center space-x-2">
          {!state.isTracking ? (
            <Button onClick={handleStartTracking} disabled={!state.isSupported}>
              <Navigation className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
          ) : (
            <Button variant="outline" onClick={stopTracking}>
              <NavigationOff className="h-4 w-4 mr-2" />
              Stop Tracking
            </Button>
          )}

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Location</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="location-name">Name</Label>
                  <Input
                    id="location-name"
                    value={newLocationData.name}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Warehouse A, Main Store, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="location-type">Type</Label>
                  <Select
                    value={newLocationData.type}
                    onValueChange={(value: InventoryLocation['type']) => 
                      setNewLocationData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="store">Store</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location-description">Description (Optional)</Label>
                  <Input
                    id="location-description"
                    value={newLocationData.description}
                    onChange={(e) => setNewLocationData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details about this location"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="use-current"
                    checked={newLocationData.useCurrentLocation}
                    onChange={(e) => setNewLocationData(prev => ({ 
                      ...prev, 
                      useCurrentLocation: e.target.checked 
                    }))}
                  />
                  <Label htmlFor="use-current">Use current location</Label>
                </div>

                {state.currentLocation && newLocationData.useCurrentLocation && (
                  <div className="text-sm text-muted-foreground">
                    <p>Current coordinates: {formatCoordinates(state.currentLocation).display}</p>
                    <p>Accuracy: {formatAccuracy(state.currentLocation.accuracy)}</p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="create-geofence"
                    checked={newLocationData.createGeofence}
                    onChange={(e) => setNewLocationData(prev => ({ 
                      ...prev, 
                      createGeofence: e.target.checked 
                    }))}
                  />
                  <Label htmlFor="create-geofence">Create geofence</Label>
                </div>

                {newLocationData.createGeofence && (
                  <div>
                    <Label htmlFor="geofence-radius">Geofence Radius (meters)</Label>
                    <Input
                      id="geofence-radius"
                      type="number"
                      value={newLocationData.geofenceRadius}
                      onChange={(e) => setNewLocationData(prev => ({ 
                        ...prev, 
                        geofenceRadius: parseInt(e.target.value) || 100 
                      }))}
                      min="10"
                      max="1000"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLocation}>
                    Create Location
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tracking Status</p>
                <p className="text-lg font-semibold">
                  {state.isTracking ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className={`p-2 rounded-full ${state.isTracking ? 'bg-green-100' : 'bg-gray-100'}`}>
                {state.isTracking ? (
                  <Navigation className="h-5 w-5 text-green-600" />
                ) : (
                  <NavigationOff className="h-5 w-5 text-gray-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Locations</p>
                <p className="text-lg font-semibold">{state.locations.length}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Location</p>
                <p className="text-sm font-medium">
                  {state.currentLocation ? 
                    formatAccuracy(state.currentLocation.accuracy) : 
                    'Unknown'
                  }
                </p>
              </div>
              <div className="p-2 rounded-full bg-purple-100">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error display */}
      {state.error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600">
              <Target className="h-4 w-4" />
              <span className="text-sm">{state.error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current location info */}
      {state.currentLocation && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">Current Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Coordinates</p>
                <p className="font-mono">{formatCoordinates(state.currentLocation).display}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Accuracy</p>
                <p>{formatDistance(state.currentLocation.accuracy)} ({formatAccuracy(state.currentLocation.accuracy)})</p>
              </div>
              {state.nearestLocation && (
                <>
                  <div>
                    <p className="text-muted-foreground">Nearest Location</p>
                    <p>{state.nearestLocation.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Distance</p>
                    <p>{formatDistance(calculateDistance(
                      state.currentLocation.latitude,
                      state.currentLocation.longitude,
                      state.nearestLocation.coordinates.latitude,
                      state.nearestLocation.coordinates.longitude
                    ))}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      <Tabs defaultValue="locations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations">
            Locations ({state.locations.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="events">
            Events ({state.recentEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4">
          {state.locations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Locations</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first location to start tracking inventory by location.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Location
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {state.locations.map((location) => (
                <Card key={location.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getLocationTypeIcon(location.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">{location.name}</h3>
                            <Badge variant={location.active ? "default" : "secondary"}>
                              {location.active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {location.type}
                            </Badge>
                          </div>
                          
                          {location.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {location.description}
                            </p>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 text-xs text-muted-foreground">
                            <div>
                              <span>Coordinates:</span>
                              <p className="font-mono">{formatCoordinates(location.coordinates, 4).display}</p>
                            </div>
                            <div>
                              <span>Items:</span>
                              <p>{location.itemCount} items</p>
                            </div>
                            <div>
                              <span>Last Activity:</span>
                              <p>{new Date(location.lastActivity).toLocaleDateString()}</p>
                            </div>
                            {location.geofence && (
                              <div>
                                <span>Geofence:</span>
                                <p>{formatDistance(location.geofence.radius)} radius</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLocation(location.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteLocation(location.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Location Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {overallAnalytics.locations.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Locations</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {overallAnalytics.locations.active}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Locations</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {overallAnalytics.geofences.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Geofences</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {overallAnalytics.activity.todayEvents}
                  </div>
                  <div className="text-sm text-muted-foreground">Today's Events</div>
                </div>
              </div>

              {/* Location types breakdown */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Location Types</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(overallAnalytics.locations.types).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        {getLocationTypeIcon(type as InventoryLocation['type'])}
                        <span className="text-sm capitalize">{type}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {state.recentEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Location Events</h3>
                <p className="text-muted-foreground">
                  Location events will appear here once you start tracking and create locations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {state.recentEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getEventTypeColor(event.type)}`}>
                          {getEventTypeIcon(event.type)}
                        </div>
                        
                        <div>
                          <p className="text-sm font-semibold capitalize">
                            {event.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {formatAccuracy(event.accuracy)}
                        </Badge>
                      </div>
                    </div>

                    {event.data && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {JSON.stringify(event.data, null, 2)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Location suggestions */}
      {state.suggestions.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Location Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.suggestions.slice(0, 3).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="text-sm">
                    <p>New location detected</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCoordinates(suggestion.coordinates).display}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Create
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper functions
function getEventTypeColor(type: string): string {
  switch (type) {
    case 'enter': return 'bg-green-100';
    case 'exit': return 'bg-red-100';
    case 'movement': return 'bg-blue-100';
    case 'inventory_update': return 'bg-purple-100';
    default: return 'bg-gray-100';
  }
}

function getEventTypeIcon(type: string) {
  switch (type) {
    case 'enter': return <Target className="h-4 w-4 text-green-600" />;
    case 'exit': return <NavigationOff className="h-4 w-4 text-red-600" />;
    case 'movement': return <Navigation className="h-4 w-4 text-blue-600" />;
    case 'inventory_update': return <BarChart3 className="h-4 w-4 text-purple-600" />;
    default: return <MapPin className="h-4 w-4 text-gray-600" />;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
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