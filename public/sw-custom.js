// Custom Service Worker with Background Sync and Push Notifications
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// Configuration
const CACHE_NAME = 'inventory-tracker-v1';
const OFFLINE_URL = '/offline.html';
const SYNC_TAGS = {
  BACKGROUND_SYNC: 'background-sync',
  DATA_SYNC: 'data-sync',
  NOTIFICATION_SYNC: 'notification-sync'
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
  
  if (event.tag === SYNC_TAGS.NOTIFICATION_SYNC) {
    event.waitUntil(processOfflineNotifications());
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
  
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION_SYNC') {
    console.log('Scheduling notification sync...');
    
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      self.registration.sync.register(SYNC_TAGS.NOTIFICATION_SYNC);
    }
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