// Custom Service Worker with Background Sync Pro and Rich Notifications
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Configuration
const CACHE_NAME = 'inventory-tracker-v1';
const PREDICTIVE_CACHE_NAME = 'predictive-cache-v1';
const OFFLINE_URL = '/offline.html';
const SYNC_TAGS = {
  BACKGROUND_SYNC: 'background-sync',
  BACKGROUND_SYNC_PRO: 'background-sync-pro',
  DATA_SYNC: 'data-sync',
  NOTIFICATION_SYNC: 'notification-sync',
  CONFLICT_RESOLUTION: 'conflict-resolution',
  PRIORITY_SYNC: 'priority-sync',
  DIFFERENTIAL_SYNC: 'differential-sync'
};

// Advanced caching configuration
const CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 days
  maxEntries: 100,
  networkTimeoutSeconds: 3,
  warmCachePatterns: [
    '/api/items',
    '/api/categories', 
    '/api/reports/summary'
  ]
};

// Push notification configuration
const NOTIFICATION_CONFIG = {
  icon: '/icons/icon-192x192.png',
  badge: '/icons/icon-72x72.png',
  vibrate: [200, 100, 200],
  requireInteraction: true,
  tag: 'inventory-notification'
};

// Initialize Workbox
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Skip waiting and claim clients immediately
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// Background Sync Setup
let syncManager = null;

// Background Sync Event Handler
self.addEventListener('sync', async (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === SYNC_TAGS.DATA_SYNC) {
    event.waitUntil(doBackgroundSync());
  }
  
  if (event.tag === SYNC_TAGS.BACKGROUND_SYNC_PRO) {
    event.waitUntil(doBackgroundSyncPro());
  }
  
  if (event.tag === SYNC_TAGS.PRIORITY_SYNC) {
    event.waitUntil(doPrioritySync());
  }
  
  if (event.tag === SYNC_TAGS.NOTIFICATION_SYNC) {
    event.waitUntil(processOfflineNotifications());
  }
  
  if (event.tag === SYNC_TAGS.CONFLICT_RESOLUTION) {
    event.waitUntil(resolveConflicts());
  }
});

// Function to perform background sync
async function doBackgroundSync() {
  try {
    console.log('Performing background sync...');
    
    // Get IndexedDB instance
    const dbRequest = indexedDB.open('InventoryTrackerOfflineDB', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        
        try {
          // Process sync queue
          const transaction = db.transaction(['syncQueue'], 'readonly');
          const store = transaction.objectStore('syncQueue');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = async () => {
            const syncQueue = getAllRequest.result;
            console.log(`Processing ${syncQueue.length} queued items`);
            
            for (const item of syncQueue) {
              try {
                await processSyncItem(item);
                
                // Remove from sync queue after successful sync
                const deleteTransaction = db.transaction(['syncQueue'], 'readwrite');
                const deleteStore = deleteTransaction.objectStore('syncQueue');
                deleteStore.delete(item.id);
              } catch (error) {
                console.error('Failed to sync item:', item.id, error);
                
                // Increment retry count
                const updateTransaction = db.transaction(['syncQueue'], 'readwrite');
                const updateStore = updateTransaction.objectStore('syncQueue');
                item.retries = (item.retries || 0) + 1;
                
                if (item.retries < 3) {
                  updateStore.put(item);
                } else {
                  console.error('Max retries reached for item:', item.id);
                  updateStore.delete(item.id);
                }
              }
            }
            
            resolve();
          };
          
          getAllRequest.onerror = () => reject(getAllRequest.error);
        } catch (error) {
          reject(error);
        }
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  } catch (error) {
    console.error('Background sync failed:', error);
    throw error;
  }
}

// Process individual sync items
async function processSyncItem(item) {
  const { operation, entity, data } = item;
  
  // Get auth token from localStorage (if available)
  const clients = await self.clients.matchAll();
  if (clients.length === 0) return;
  
  // Send sync request to Supabase
  let url, method, body;
  
  switch (entity) {
    case 'item':
      if (operation === 'create') {
        url = `${self.location.origin}/api/items`;
        method = 'POST';
        body = JSON.stringify(data);
      } else if (operation === 'update') {
        url = `${self.location.origin}/api/items/${data.id}`;
        method = 'PUT';
        body = JSON.stringify(data);
      } else if (operation === 'delete') {
        url = `${self.location.origin}/api/items/${data.id}`;
        method = 'DELETE';
      }
      break;
      
    case 'category':
      if (operation === 'create') {
        url = `${self.location.origin}/api/categories`;
        method = 'POST';
        body = JSON.stringify(data);
      } else if (operation === 'delete') {
        url = `${self.location.origin}/api/categories/${data.id}`;
        method = 'DELETE';
      }
      break;
  }
  
  if (url) {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
}

// Process offline notifications during background sync
async function processOfflineNotifications() {
  try {
    console.log('Processing offline notifications...');
    
    const dbRequest = indexedDB.open('InventoryTrackerOfflineDB', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        
        try {
          // Get unprocessed notifications
          const transaction = db.transaction(['notifications'], 'readwrite');
          const store = transaction.objectStore('notifications');
          const index = store.index('processed');
          const getRequest = index.getAll(false);
          
          getRequest.onsuccess = async () => {
            const notifications = getRequest.result;
            console.log(`Processing ${notifications.length} offline notifications`);
            
            for (const notification of notifications) {
              try {
                // Show the notification
                await self.registration.showNotification(notification.data.title, {
                  body: notification.data.body,
                  icon: notification.data.icon || NOTIFICATION_CONFIG.icon,
                  badge: notification.data.badge || NOTIFICATION_CONFIG.badge,
                  tag: notification.data.tag || `${notification.type}-${notification.timestamp}`,
                  requireInteraction: notification.data.requireInteraction ?? NOTIFICATION_CONFIG.requireInteraction,
                  vibrate: NOTIFICATION_CONFIG.vibrate,
                  data: notification.data.data,
                  actions: notification.data.actions || getDefaultActions(notification.type)
                });
                
                // Mark as processed
                const updateTransaction = db.transaction(['notifications'], 'readwrite');
                const updateStore = updateTransaction.objectStore('notifications');
                notification.processed = true;
                updateStore.put(notification);
                
                console.log('Processed offline notification:', notification.id);
              } catch (error) {
                console.error('Failed to process offline notification:', notification.id, error);
              }
            }
            
            resolve();
          };
          
          getRequest.onerror = () => reject(getRequest.error);
        } catch (error) {
          reject(error);
        }
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  } catch (error) {
    console.error('Offline notification processing failed:', error);
    throw error;
  }
}

// Push notification event handlers
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('Push payload:', payload);
    
    event.waitUntil(handlePushNotification(payload));
  } catch (error) {
    console.error('Failed to parse push payload:', error);
    
    // Show a generic notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('Inventory Update', {
        body: 'New inventory notification received',
        ...NOTIFICATION_CONFIG
      })
    );
  }
});

// Handle push notification data
async function handlePushNotification(payload) {
  const { type, data, timestamp, userId } = payload;
  
  // Validate payload structure
  if (!type || !data || !data.title || !data.body) {
    console.error('Invalid push notification payload:', payload);
    return;
  }

  // Store notification in IndexedDB for offline processing
  await storeNotificationOffline(payload);

  // Prepare notification options
  const notificationOptions = {
    body: data.body,
    icon: data.icon || NOTIFICATION_CONFIG.icon,
    badge: data.badge || NOTIFICATION_CONFIG.badge,
    image: data.image,
    tag: data.tag || `${type}-${timestamp}`,
    requireInteraction: data.requireInteraction ?? NOTIFICATION_CONFIG.requireInteraction,
    vibrate: NOTIFICATION_CONFIG.vibrate,
    silent: false,
    data: {
      ...data.data,
      type,
      timestamp,
      userId,
      url: data.data?.url || '/dashboard'
    },
    actions: data.actions || getDefaultActions(type)
  };

  // Show notification
  return self.registration.showNotification(data.title, notificationOptions);
}

// Get default actions based on notification type
function getDefaultActions(type) {
  switch (type) {
    case 'low_stock':
      return [
        {
          action: 'view-item',
          title: 'View Item',
          icon: '/icons/view-action.png'
        },
        {
          action: 'restock',
          title: 'Mark Restocked',
          icon: '/icons/add-action.png'
        }
      ];
    case 'stock_update':
      return [
        {
          action: 'view-dashboard',
          title: 'View Dashboard',
          icon: '/icons/dashboard-action.png'
        }
      ];
    case 'system':
      return [
        {
          action: 'view-app',
          title: 'Open App',
          icon: '/icons/app-action.png'
        }
      ];
    default:
      return [
        {
          action: 'view-app',
          title: 'Open App',
          icon: '/icons/app-action.png'
        }
      ];
  }
}

// Store notification in IndexedDB for offline processing
async function storeNotificationOffline(payload) {
  try {
    const dbRequest = indexedDB.open('InventoryTrackerOfflineDB', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const transaction = db.transaction(['notifications'], 'readwrite');
        const store = transaction.objectStore('notifications');
        
        const notificationData = {
          id: `notification_${payload.timestamp}_${Math.random()}`,
          ...payload,
          processed: false,
          created_at: new Date().toISOString()
        };
        
        store.add(notificationData);
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
      
      // Create notifications store if it doesn't exist
      dbRequest.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notificationStore.createIndex('timestamp', 'timestamp', { unique: false });
          notificationStore.createIndex('type', 'type', { unique: false });
          notificationStore.createIndex('userId', 'userId', { unique: false });
          notificationStore.createIndex('processed', 'processed', { unique: false });
        }
      };
    });
  } catch (error) {
    console.error('Failed to store notification offline:', error);
  }
}

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click:', event);
  
  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;
  
  notification.close();

  event.waitUntil(handleNotificationClick(action, data));
});

// Process notification click actions
async function handleNotificationClick(action, data) {
  const url = new URL(data.url || '/dashboard', self.location.origin);
  
  // Handle specific actions
  switch (action) {
    case 'view-item':
      if (data.itemName) {
        url.searchParams.set('search', data.itemName);
      }
      break;
    case 'restock':
      // Send message to client to handle restocking
      if (data.itemName) {
        url.searchParams.set('action', 'restock');
        url.searchParams.set('item', data.itemName);
      }
      break;
    case 'view-dashboard':
      url.pathname = '/dashboard';
      break;
    case 'view-app':
    default:
      // Default action - open the app
      break;
  }

  // Try to focus existing window or open new one
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Look for existing window with the same origin
  for (const client of clients) {
    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
      await client.focus();
      
      // Navigate to the specific URL if different
      if (client.url !== url.href) {
        return client.navigate(url.href);
      }
      return;
    }
  }

  // Open new window if none found
  return self.clients.openWindow(url.href);
}

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal analytics if needed
  const data = event.notification.data || {};
  
  // Could send analytics data here
  console.log('Notification dismissed:', {
    type: data.type,
    timestamp: data.timestamp,
    action: 'dismissed'
  });
});

// Register background sync on message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_SYNC') {
    console.log('Scheduling background sync...');
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register(SYNC_TAGS.DATA_SYNC);
    }
  }
  
  if (event.data && event.data.type === 'SCHEDULE_SYNC_PRO') {
    console.log('Scheduling background sync pro...');
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register(SYNC_TAGS.BACKGROUND_SYNC_PRO);
    }
  }
  
  if (event.data && event.data.type === 'SCHEDULE_PRIORITY_SYNC') {
    console.log('Scheduling priority sync...');
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register(SYNC_TAGS.PRIORITY_SYNC);
    }
  }
  
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION_SYNC') {
    console.log('Scheduling notification sync...');
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register(SYNC_TAGS.NOTIFICATION_SYNC);
    }
  }

  // Handle rich notification actions
  if (event.data && event.data.type === 'NOTIFICATION_ACTION') {
    console.log('Processing notification action:', event.data.action);
    handleNotificationActionFromClient(event.data.action, event.data.notificationData);
  }

  // Handle navigation requests from notifications
  if (event.data && event.data.type === 'NAVIGATE_TO_RESTOCK') {
    handleNavigationRequest('/dashboard?action=restock&item=' + event.data.itemId);
  }

  if (event.data && event.data.type === 'NAVIGATE_TO_EMERGENCY_RESTOCK') {
    handleNavigationRequest('/dashboard?action=emergency-restock&item=' + event.data.itemId);
  }

  if (event.data && event.data.type === 'NAVIGATE_TO') {
    handleNavigationRequest(event.data.url);
  }

  if (event.data && event.data.type === 'UPDATE_APP') {
    handleAppUpdate();
  }
});

// Cache strategies
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'document',
  new workbox.strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Offline fallback
workbox.routing.setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return caches.match(OFFLINE_URL);
  }
  
  return Response.error();
});

// Advanced conflict resolution during sync
async function resolveConflicts() {
  try {
    console.log('Resolving conflicts during sync...');
    
    const dbRequest = indexedDB.open('InventoryTrackerOfflineDB', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        
        try {
          // Get conflict resolution queue
          const transaction = db.transaction(['conflicts'], 'readonly');
          const store = transaction.objectStore('conflicts');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = async () => {
            const conflicts = getAllRequest.result;
            console.log(`Resolving ${conflicts.length} conflicts`);
            
            for (const conflict of conflicts) {
              try {
                // Apply conflict resolution strategy
                const resolved = await applyConflictResolution(conflict);
                
                // Remove from conflicts after resolution
                const deleteTransaction = db.transaction(['conflicts'], 'readwrite');
                const deleteStore = deleteTransaction.objectStore('conflicts');
                deleteStore.delete(conflict.id);
                
                // Notify clients about resolution
                await notifyClientsOfResolution(conflict.id, resolved);
              } catch (error) {
                console.error('Failed to resolve conflict:', conflict.id, error);
              }
            }
            
            resolve();
          };
          
          getAllRequest.onerror = () => reject(getAllRequest.error);
        } catch (error) {
          reject(error);
        }
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  } catch (error) {
    console.error('Conflict resolution failed:', error);
    throw error;
  }
}

// Apply conflict resolution strategy
async function applyConflictResolution(conflict) {
  const { type, localValue, remoteValue, resolution } = conflict;
  
  let resolvedValue;
  
  switch (resolution) {
    case 'keep-local':
      resolvedValue = localValue;
      break;
    case 'keep-remote':
      resolvedValue = remoteValue;
      break;
    case 'merge':
      // Intelligent merge based on data type
      if (typeof localValue === 'number' && typeof remoteValue === 'number') {
        resolvedValue = (localValue + remoteValue) / 2;
      } else if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
        resolvedValue = [...new Set([...localValue, ...remoteValue])];
      } else {
        resolvedValue = remoteValue; // Default to remote
      }
      break;
    default:
      resolvedValue = remoteValue;
  }
  
  return resolvedValue;
}

// Notify clients about conflict resolution
async function notifyClientsOfResolution(conflictId, resolvedValue) {
  const clients = await self.clients.matchAll();
  
  for (const client of clients) {
    client.postMessage({
      type: 'CONFLICT_RESOLVED',
      conflictId,
      resolvedValue,
      timestamp: Date.now()
    });
  }
}

// Predictive caching based on user patterns
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'PREDICTIVE_CACHE') {
    const { predictions } = event.data;
    
    console.log('Starting predictive caching for', predictions.length, 'predictions');
    
    const cache = await caches.open(PREDICTIVE_CACHE_NAME);
    
    for (const prediction of predictions) {
      if (prediction.probability > 0.5) {
        try {
          const url = buildResourceUrl(prediction.action);
          const response = await fetch(url);
          
          if (response.ok) {
            await cache.put(url, response);
            console.log('Cached predicted resource:', url);
          }
        } catch (error) {
          console.error('Failed to cache predicted resource:', error);
        }
      }
    }
  }
  
  if (event.data && event.data.type === 'CLEAR_PREDICTIVE_CACHE') {
    await caches.delete(PREDICTIVE_CACHE_NAME);
    console.log('Predictive cache cleared');
  }
});

// Build resource URL from action
function buildResourceUrl(action) {
  const baseUrl = self.location.origin;
  
  switch (action.resource) {
    case 'item':
      return action.resourceId 
        ? `${baseUrl}/api/items/${action.resourceId}`
        : `${baseUrl}/api/items`;
    case 'category':
      return action.resourceId
        ? `${baseUrl}/api/categories/${action.resourceId}`
        : `${baseUrl}/api/categories`;
    case 'report':
      return `${baseUrl}/api/reports/summary`;
    default:
      return `${baseUrl}/api/${action.resource}`;
  }
}

// Warm cache on activation
self.addEventListener('activate', async (event) => {
  event.waitUntil(warmCache());
});

// Warm cache with frequently accessed resources
async function warmCache() {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    await Promise.all(
      CACHE_CONFIG.warmCachePatterns.map(async (pattern) => {
        const response = await fetch(pattern);
        if (response.ok) {
          await cache.put(pattern, response);
          console.log('Warmed cache with:', pattern);
        }
      })
    );
  } catch (error) {
    console.error('Cache warming failed:', error);
  }
}

// Enhanced network-first strategy with predictive cache fallback
workbox.routing.registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  async ({ event }) => {
    try {
      // Try network first
      const networkResponse = await fetch(event.request);
      
      if (networkResponse.ok) {
        // Cache successful response
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('Network request failed, checking caches');
    }
    
    // Check predictive cache
    const predictiveCache = await caches.open(PREDICTIVE_CACHE_NAME);
    const predictedResponse = await predictiveCache.match(event.request);
    if (predictedResponse) {
      console.log('Serving from predictive cache:', event.request.url);
      return predictedResponse;
    }
    
    // Check regular cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
      console.log('Serving from regular cache:', event.request.url);
      return cachedResponse;
    }
    
    // Return error if all strategies fail
    return new Response('Offline - No cached data available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
);

// Background Sync Pro implementation
async function doBackgroundSyncPro() {
  try {
    console.log('Performing Background Sync Pro...');
    
    const dbRequest = indexedDB.open('InventoryTrackerOfflineDB', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        
        try {
          // Get priority sync queue
          const transaction = db.transaction(['prioritySyncQueue'], 'readonly');
          const store = transaction.objectStore('prioritySyncQueue');
          const index = store.index('priority');
          const getAllRequest = index.getAll(); // Gets all ordered by priority
          
          getAllRequest.onsuccess = async () => {
            const priorityQueue = getAllRequest.result;
            console.log(`Processing ${priorityQueue.length} priority items`);
            
            // Process in batches with concurrency limit
            const batchSize = 3;
            for (let i = 0; i < priorityQueue.length; i += batchSize) {
              const batch = priorityQueue.slice(i, i + batchSize);
              
              await Promise.allSettled(
                batch.map(item => processPrioritySyncItem(item, db))
              );
            }
            
            resolve();
          };
          
          getAllRequest.onerror = () => reject(getAllRequest.error);
        } catch (error) {
          reject(error);
        }
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  } catch (error) {
    console.error('Background Sync Pro failed:', error);
    throw error;
  }
}

// Process priority sync item with advanced features
async function processPrioritySyncItem(item, db) {
  const { operation, entity, data, priority, fieldChanges, checksum } = item;
  
  try {
    // Check for conflicts if differential sync
    if (operation === 'update' && checksum) {
      const conflictDetected = await checkForSyncConflict(entity, data.id, checksum);
      if (conflictDetected) {
        await handleSyncConflict(item, conflictDetected, db);
        return;
      }
    }

    // Perform the sync operation
    await executePrioritySyncOperation(item);
    
    // Remove from priority queue
    const deleteTransaction = db.transaction(['prioritySyncQueue'], 'readwrite');
    const deleteStore = deleteTransaction.objectStore('prioritySyncQueue');
    deleteStore.delete(item.id);
    
    // Update metrics
    await updateSyncMetrics(item, true, db);
    
    console.log('Priority sync completed for:', item.id);
  } catch (error) {
    console.error('Priority sync failed for item:', item.id, error);
    
    // Handle retry logic
    const updateTransaction = db.transaction(['prioritySyncQueue'], 'readwrite');
    const updateStore = updateTransaction.objectStore('prioritySyncQueue');
    
    item.retryCount = (item.retryCount || 0) + 1;
    if (item.retryCount < item.maxRetries) {
      // Schedule retry with exponential backoff
      item.nextRetry = Date.now() + (Math.pow(2, item.retryCount) * 1000);
      updateStore.put(item);
    } else {
      // Max retries reached, move to failed queue
      updateStore.delete(item.id);
      await addToFailedQueue(item, error, db);
    }
    
    await updateSyncMetrics(item, false, db);
  }
}

// Execute priority sync operation
async function executePrioritySyncOperation(item) {
  const { operation, entity, data, fieldChanges } = item;
  
  let url, method, body;
  const baseUrl = self.location.origin;
  
  switch (entity) {
    case 'item':
      url = operation === 'create' ? `${baseUrl}/api/items` : `${baseUrl}/api/items/${data.id}`;
      method = operation === 'create' ? 'POST' : operation === 'update' ? 'PUT' : 'DELETE';
      
      // Use differential sync for updates
      if (operation === 'update' && fieldChanges && fieldChanges.length > 0) {
        const diffData = {};
        fieldChanges.forEach(field => {
          if (data[field] !== undefined) {
            diffData[field] = data[field];
          }
        });
        body = JSON.stringify(diffData);
      } else {
        body = operation !== 'delete' ? JSON.stringify(data) : undefined;
      }
      break;
      
    case 'category':
      url = operation === 'create' ? `${baseUrl}/api/categories` : `${baseUrl}/api/categories/${data.id}`;
      method = operation === 'create' ? 'POST' : operation === 'update' ? 'PUT' : 'DELETE';
      body = operation !== 'delete' ? JSON.stringify(data) : undefined;
      break;
      
    case 'activity':
      url = `${baseUrl}/api/activities`;
      method = 'POST';
      body = JSON.stringify(data);
      break;
      
    default:
      throw new Error(`Unsupported entity type: ${entity}`);
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Sync operation failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Priority sync for high-priority items
async function doPrioritySync() {
  try {
    console.log('Performing priority sync...');
    
    const dbRequest = indexedDB.open('InventoryTrackerOfflineDB', 1);
    
    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = async () => {
        const db = dbRequest.result;
        
        try {
          // Get high priority items only
          const transaction = db.transaction(['prioritySyncQueue'], 'readonly');
          const store = transaction.objectStore('prioritySyncQueue');
          const index = store.index('priority');
          const range = IDBKeyRange.only(1); // High priority only
          const getRequest = index.getAll(range);
          
          getRequest.onsuccess = async () => {
            const highPriorityItems = getRequest.result;
            console.log(`Processing ${highPriorityItems.length} high priority items`);
            
            // Process all high priority items immediately
            await Promise.allSettled(
              highPriorityItems.map(item => processPrioritySyncItem(item, db))
            );
            
            resolve();
          };
          
          getRequest.onerror = () => reject(getRequest.error);
        } catch (error) {
          reject(error);
        }
      };
      
      dbRequest.onerror = () => reject(dbRequest.error);
    });
  } catch (error) {
    console.error('Priority sync failed:', error);
    throw error;
  }
}

// Check for sync conflicts using checksums
async function checkForSyncConflict(entity, entityId, localChecksum) {
  try {
    const baseUrl = self.location.origin;
    const url = `${baseUrl}/api/${entity}s/${entityId}`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const remoteData = await response.json();
    
    // Generate remote checksum
    const remoteChecksum = await generateChecksum(remoteData);
    
    if (localChecksum !== remoteChecksum) {
      return remoteData;
    }
    
    return null;
  } catch (error) {
    console.error('Conflict check failed:', error);
    return null;
  }
}

// Generate checksum for data
async function generateChecksum(data) {
  const str = JSON.stringify(data, Object.keys(data).sort());
  const encoder = new TextEncoder();
  const dataArray = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataArray);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Handle sync conflicts
async function handleSyncConflict(localItem, remoteData, db) {
  console.log('Sync conflict detected for:', localItem.id);
  
  // Store conflict for user resolution
  const conflictTransaction = db.transaction(['conflicts'], 'readwrite');
  const conflictStore = conflictTransaction.objectStore('conflicts');
  
  const conflict = {
    id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    localData: localItem.data,
    remoteData: remoteData,
    entity: localItem.entity,
    entityId: localItem.data.id,
    timestamp: Date.now(),
    resolved: false
  };
  
  conflictStore.add(conflict);
  
  // Notify clients about conflict
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_CONFLICT_DETECTED',
      conflict: conflict
    });
  });
}

// Update sync metrics in IndexedDB
async function updateSyncMetrics(item, success, db) {
  try {
    const transaction = db.transaction(['syncMetrics'], 'readwrite');
    const store = transaction.objectStore('syncMetrics');
    
    const metricsRequest = store.get('global');
    
    metricsRequest.onsuccess = () => {
      let metrics = metricsRequest.result || {
        id: 'global',
        totalOperations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageLatency: 0,
        priorityDistribution: {},
        lastSync: 0,
        backgroundSyncCount: 0
      };
      
      metrics.totalOperations++;
      if (success) {
        metrics.successfulSyncs++;
      } else {
        metrics.failedSyncs++;
      }
      
      metrics.priorityDistribution[item.priority] = 
        (metrics.priorityDistribution[item.priority] || 0) + 1;
      
      metrics.lastSync = Date.now();
      metrics.backgroundSyncCount++;
      
      store.put(metrics);
    };
  } catch (error) {
    console.error('Failed to update sync metrics:', error);
  }
}

// Add failed item to failed queue
async function addToFailedQueue(item, error, db) {
  try {
    const transaction = db.transaction(['failedSyncQueue'], 'readwrite');
    const store = transaction.objectStore('failedSyncQueue');
    
    const failedItem = {
      ...item,
      failedAt: Date.now(),
      error: error.message,
      canRetry: true
    };
    
    store.add(failedItem);
  } catch (error) {
    console.error('Failed to add to failed queue:', error);
  }
}

// Handle navigation requests from notifications
async function handleNavigationRequest(url) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Focus existing window or open new one
  for (const client of clients) {
    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
      await client.focus();
      client.postMessage({
        type: 'NAVIGATE_TO',
        url: url
      });
      return;
    }
  }

  // Open new window if none found
  return self.clients.openWindow(url);
}

// Handle app update requests
async function handleAppUpdate() {
  console.log('Handling app update request');
  
  // Skip waiting and activate new service worker
  self.skipWaiting();
  
  // Notify all clients about the update
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'APP_UPDATED',
      timestamp: Date.now()
    });
  });
}

// Enhanced push notification handler with rich actions
self.addEventListener('push', (event) => {
  console.log('Rich push notification received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('Rich push payload:', payload);
    
    event.waitUntil(handleRichPushNotification(payload));
  } catch (error) {
    console.error('Failed to parse rich push payload:', error);
    
    // Show a generic notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('Inventory Update', {
        body: 'New inventory notification received',
        icon: NOTIFICATION_CONFIG.icon,
        badge: NOTIFICATION_CONFIG.badge,
        actions: [
          { action: 'view-app', title: 'Open App' }
        ]
      })
    );
  }
});

// Handle rich push notifications
async function handleRichPushNotification(payload) {
  const { template, data, priority = 'normal', category = 'general' } = payload;
  
  // Build notification based on template
  let notificationOptions = {
    icon: NOTIFICATION_CONFIG.icon,
    badge: NOTIFICATION_CONFIG.badge,
    tag: `${category}_${data.id || Date.now()}`,
    data: { ...data, template, category, timestamp: Date.now() },
    silent: priority === 'low',
    requireInteraction: priority === 'urgent',
    vibrate: getVibrationPattern(priority)
  };

  // Template-specific configuration
  switch (template) {
    case 'low-stock':
      notificationOptions = {
        ...notificationOptions,
        body: `Only ${data.currentQuantity} units remaining (threshold: ${data.lowStockThreshold})`,
        icon: '/icons/warning-192x192.png',
        actions: [
          { action: 'restock', title: 'Restock Now', icon: '/icons/add.png' },
          { action: 'dismiss', title: 'Dismiss', icon: '/icons/close.png' },
          { action: 'snooze', title: 'Snooze 1hr', icon: '/icons/clock.png' }
        ]
      };
      break;
      
    case 'critical-stock':
      notificationOptions = {
        ...notificationOptions,
        body: `URGENT: Only ${data.currentQuantity} units left! Immediate restocking required.`,
        icon: '/icons/alert-192x192.png',
        requireInteraction: true,
        actions: [
          { action: 'emergency-restock', title: 'Emergency Restock', icon: '/icons/emergency.png' },
          { action: 'view-suppliers', title: 'View Suppliers', icon: '/icons/suppliers.png' },
          { action: 'dismiss', title: 'Acknowledge', icon: '/icons/check.png' }
        ]
      };
      break;
      
    case 'sync-complete':
      notificationOptions = {
        ...notificationOptions,
        body: `${data.itemCount} items and ${data.categoryCount} categories synced successfully`,
        icon: '/icons/sync-192x192.png',
        actions: [
          { action: 'view-changes', title: 'View Changes', icon: '/icons/list.png' },
          { action: 'dismiss', title: 'OK', icon: '/icons/check.png' }
        ]
      };
      break;
      
    default:
      notificationOptions.body = data.body || 'Inventory notification';
  }

  const title = data.title || getDefaultTitle(template, data);
  
  return self.registration.showNotification(title, notificationOptions);
}

// Get vibration pattern based on priority
function getVibrationPattern(priority) {
  switch (priority) {
    case 'urgent': return [200, 100, 200, 100, 200, 100, 200];
    case 'high': return [200, 100, 200];
    case 'normal': return [200];
    case 'low': return [];
    default: return [200];
  }
}

// Get default title for template
function getDefaultTitle(template, data) {
  switch (template) {
    case 'low-stock': return `Low Stock: ${data.itemName}`;
    case 'critical-stock': return `🚨 CRITICAL: ${data.itemName}`;
    case 'sync-complete': return 'Data Synchronized';
    case 'item-added': return 'New Item Added';
    case 'system-update': return 'Update Available';
    default: return 'Inventory Notification';
  }
}

// Enhanced notification click handler for rich actions
self.addEventListener('notificationclick', (event) => {
  console.log('Rich notification click:', event);
  
  const notification = event.notification;
  const data = notification.data || {};
  const action = event.action;
  
  notification.close();

  event.waitUntil(handleRichNotificationClick(action, data));
});

// Handle rich notification clicks
async function handleRichNotificationClick(action, data) {
  console.log('Processing rich notification action:', action, data);
  
  let url = '/dashboard';
  
  switch (action) {
    case 'restock':
      url = `/dashboard?action=restock&item=${data.itemId}`;
      break;
    case 'emergency-restock':
      url = `/dashboard?action=emergency-restock&item=${data.itemId}`;
      // Also mark item as urgent
      await markItemAsUrgent(data.itemId);
      break;
    case 'view-suppliers':
      url = `/dashboard?view=suppliers&item=${data.itemId}`;
      break;
    case 'view-changes':
      url = '/dashboard?view=recent';
      break;
    case 'view-item':
      url = `/dashboard?item=${data.itemId}`;
      break;
    case 'dismiss':
      // Handle dismissal
      await handleDismissAction(data);
      return;
    case 'snooze':
      // Handle snooze
      await handleSnoozeAction(data);
      return;
    default:
      url = data.url || '/dashboard';
  }

  await handleNavigationRequest(url);
}

// Mark item as urgent in local storage
async function markItemAsUrgent(itemId) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'MARK_ITEM_URGENT',
        itemId: itemId,
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Failed to mark item as urgent:', error);
  }
}