// Core Service Worker - Essential functionality only
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

const CACHE_NAME = 'inventory-tracker-v1';
const OFFLINE_URL = '/offline.html';

// Essential caching only
const ESSENTIAL_CACHE_CONFIG = {
  maxAge: 24 * 60 * 60, // 1 day
  maxEntries: 50,
  networkTimeoutSeconds: 1
};

// Basic caching strategies
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/_next/static/css/app.css'
      ]);
    })
  );
  self.skipWaiting();
});

// Fast fetch handling
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// Essential background sync only
self.addEventListener('sync', (event) => {
  if (event.tag === 'basic-sync') {
    event.waitUntil(doBasicSync());
  }
});

async function doBasicSync() {
  try {
    // Minimal sync logic
    console.log('Basic sync completed');
  } catch (error) {
    console.error('Basic sync failed:', error);
  }
}