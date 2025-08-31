'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getOfflineDB, isOffline, isIndexedDBSupported } from '@/lib/offline/db';
import { getSyncManager, SyncStatus } from '@/lib/offline/sync-manager';
import { Item, Category } from '@/types/inventory';

interface OfflineContextType {
  isOffline: boolean;
  isSupported: boolean;
  syncStatus: SyncStatus | null;
  cachedItems: Item[];
  cachedCategories: Category[];
  syncNow: () => Promise<void>;
  getCachedItems: () => Promise<Item[]>;
  getCachedCategories: () => Promise<Category[]>;
  saveOfflineItem: (item: Item) => Promise<void>;
  deleteOfflineItem: (id: string) => Promise<void>;
  saveOfflineCategory: (category: Category) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOfflineState, setIsOfflineState] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [cachedItems, setCachedItems] = useState<Item[]>([]);
  const [cachedCategories, setCachedCategories] = useState<Category[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if IndexedDB is supported
    setIsSupported(isIndexedDBSupported());

    if (!isIndexedDBSupported()) {
      console.warn('IndexedDB is not supported in this browser');
      return;
    }

    // Initialize offline detection
    setIsOfflineState(isOffline());

    // Set up event listeners
    const handleOnline = () => setIsOfflineState(false);
    const handleOffline = () => setIsOfflineState(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize sync manager
    const syncManager = getSyncManager();
    
    // Subscribe to sync status updates
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      setSyncStatus(status);
      
      // Refresh cached data after successful sync
      if (status.status === 'synced' && userId) {
        loadCachedData();
      }
    });

    // Try to get user ID from localStorage (if available from auth)
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
      syncManager.initializeOfflineData();
      loadCachedData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [userId]);

  const loadCachedData = async () => {
    if (!userId || !isSupported) return;

    try {
      const db = getOfflineDB();
      const items = await db.getItems(userId);
      const categories = await db.getCategories(userId);
      
      setCachedItems(items);
      setCachedCategories(categories);
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  };

  const syncNow = useCallback(async () => {
    if (!isSupported) return;
    
    const syncManager = getSyncManager();
    await syncManager.syncNow();
  }, [isSupported]);

  const getCachedItems = useCallback(async (): Promise<Item[]> => {
    if (!userId || !isSupported) return [];
    
    const db = getOfflineDB();
    return await db.getItems(userId);
  }, [userId, isSupported]);

  const getCachedCategories = useCallback(async (): Promise<Category[]> => {
    if (!userId || !isSupported) return [];
    
    const db = getOfflineDB();
    return await db.getCategories(userId);
  }, [userId, isSupported]);

  const saveOfflineItem = useCallback(async (item: Item) => {
    if (!isSupported) return;
    
    const db = getOfflineDB();
    await db.saveItem({ ...item, syncStatus: isOfflineState ? 'pending' : 'synced' });
    
    if (isOfflineState) {
      await db.addToSyncQueue({
        operation: 'create',
        entity: 'item',
        data: item
      });
    }
    
    await loadCachedData();
  }, [isSupported, isOfflineState]);

  const deleteOfflineItem = useCallback(async (id: string) => {
    if (!isSupported) return;
    
    const db = getOfflineDB();
    await db.deleteItem(id);
    
    if (isOfflineState) {
      await db.addToSyncQueue({
        operation: 'delete',
        entity: 'item',
        data: { id }
      });
    }
    
    await loadCachedData();
  }, [isSupported, isOfflineState]);

  const saveOfflineCategory = useCallback(async (category: Category) => {
    if (!isSupported) return;
    
    const db = getOfflineDB();
    await db.saveCategory({ ...category, syncStatus: isOfflineState ? 'pending' : 'synced' });
    
    if (isOfflineState) {
      await db.addToSyncQueue({
        operation: 'create',
        entity: 'category',
        data: category
      });
    }
    
    await loadCachedData();
  }, [isSupported, isOfflineState]);

  const value: OfflineContextType = {
    isOffline: isOfflineState,
    isSupported,
    syncStatus,
    cachedItems,
    cachedCategories,
    syncNow,
    getCachedItems,
    getCachedCategories,
    saveOfflineItem,
    deleteOfflineItem,
    saveOfflineCategory
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    // Return a default value during static generation
    return {
      isOffline: false,
      isSupported: false,
      syncStatus: null,
      cachedItems: [],
      cachedCategories: [],
      syncNow: async () => {},
      getCachedItems: async () => [],
      getCachedCategories: async () => [],
      saveOfflineItem: async () => {},
      deleteOfflineItem: async () => {},
      saveOfflineCategory: async () => {}
    };
  }
  return context;
}