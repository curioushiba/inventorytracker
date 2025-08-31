"use client"

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Lazy loading component with optimized loading states
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    <span className="ml-2 text-muted-foreground">Loading...</span>
  </div>
)

// Lazy loaded components with proper loading states
export const LazyInventoryDashboard = dynamic(
  () => import('@/components/dashboard/inventory-dashboard').then(mod => ({ default: mod.InventoryDashboard })),
  {
    loading: () => <LoadingSpinner />,
    ssr: true // Enable SSR for better performance
  }
)

export const LazyAddItemForm = dynamic(
  () => import('@/components/inventory/add-item-form').then(mod => ({ default: mod.AddItemForm })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

export const LazyEditItemForm = dynamic(
  () => import('@/components/inventory/edit-item-form').then(mod => ({ default: mod.EditItemForm })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

export const LazyQuantityAdjustment = dynamic(
  () => import('@/components/inventory/quantity-adjustment').then(mod => ({ default: mod.QuantityAdjustment })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

export const LazyCategoryManagement = dynamic(
  () => import('@/components/categories/category-management').then(mod => ({ default: mod.CategoryManagement })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

export const LazyInventoryList = dynamic(
  () => import('@/components/inventory/inventory-list').then(mod => ({ default: mod.InventoryList })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

// Chart components - heavy libraries that benefit from code splitting
export const LazyChart = dynamic(
  () => import('@/components/ui/chart').then(mod => ({ default: mod.ChartContainer })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

// Advanced search interface - only loaded when needed
export const LazySearchInterface = dynamic(
  () => import('@/components/search/search-interface').then(mod => ({ default: mod.SearchInterface })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
)

// PWA components - load on demand
export const LazyPWAComponents = {
  InstallPrompt: dynamic(
    () => import('@/components/pwa/install-prompt').then(mod => ({ default: mod.InstallPrompt })),
    { loading: () => null, ssr: false }
  ),
  UpdateBanner: dynamic(
    () => import('@/components/pwa/update-banner').then(mod => ({ default: mod.UpdateBanner })),
    { loading: () => null, ssr: false }
  ),
  NetworkStatus: dynamic(
    () => import('@/components/pwa/network-status').then(mod => ({ default: mod.NetworkStatus })),
    { loading: () => null, ssr: false }
  ),
  SyncStatus: dynamic(
    () => import('@/components/pwa/sync-status').then(mod => ({ default: mod.SyncStatus })),
    { loading: () => null, ssr: false }
  )
}