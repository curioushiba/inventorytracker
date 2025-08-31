'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Home,
  Package,
  Tags,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  User,
  Plus,
  Filter,
  Grid3x3,
  List
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useGestures } from '@/lib/touch/gesture-recognizer';
import { useHapticFeedback } from '@/lib/touch/haptic-feedback';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const navigationItems: NavItem[] = [
  { id: 'home', label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/' },
  { id: 'items', label: 'Items', icon: <Package className="w-5 h-5" />, path: '/items' },
  { id: 'categories', label: 'Categories', icon: <Tags className="w-5 h-5" />, path: '/categories' },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, path: '/reports' },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/settings' }
];

export function AdvancedMobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHapticFeedback();

  // Update active tab based on pathname
  useEffect(() => {
    const currentItem = navigationItems.find(item => item.path === pathname);
    if (currentItem) {
      setActiveTab(currentItem.id);
    }
  }, [pathname]);

  // Setup gesture recognition
  useGestures(navRef as React.RefObject<HTMLElement>, {
    'swipe-up': () => {
      setIsDrawerOpen(true);
      trigger('light');
    },
    'swipe-down': () => {
      setIsDrawerOpen(false);
      trigger('light');
    },
    'swipe-left': () => {
      const currentIndex = navigationItems.findIndex(item => item.id === activeTab);
      if (currentIndex < navigationItems.length - 1) {
        const nextItem = navigationItems[currentIndex + 1];
        handleNavigation(nextItem);
      }
    },
    'swipe-right': () => {
      const currentIndex = navigationItems.findIndex(item => item.id === activeTab);
      if (currentIndex > 0) {
        const prevItem = navigationItems[currentIndex - 1];
        handleNavigation(prevItem);
      }
    }
  });

  const handleNavigation = (item: NavItem) => {
    setActiveTab(item.id);
    router.push(item.path);
    trigger('selection');
    setIsDrawerOpen(false);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
    trigger('light');
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
    trigger('selection');
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b 
                    border-gray-200 dark:border-gray-700 lg:hidden">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              setIsDrawerOpen(true);
              trigger('light');
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg 
                     transition-colors touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Inventory Tracker
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSearch}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg 
                       transition-colors touch-manipulation"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg 
                       transition-colors relative touch-manipulation"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 dark:border-gray-700"
            >
              <div className="p-4">
                <input
                  type="search"
                  placeholder="Search inventory..."
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg
                           text-gray-900 dark:text-white placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Bar */}
      <div 
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 
                 border-t border-gray-200 dark:border-gray-700 lg:hidden"
      >
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`flex flex-col items-center justify-center p-2 min-w-[64px] 
                       touch-manipulation transition-all ${
                activeTab === item.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
              aria-label={item.label}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white 
                                 text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 
                           bg-blue-600 dark:bg-blue-400 rounded-t-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Swipe Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 
                      bg-gray-300 dark:bg-gray-600 rounded-full" />
      </div>

      {/* Side Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDrawerOpen(false);
                trigger('light');
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info: PanInfo) => {
                if (info.offset.x < -100) {
                  setIsDrawerOpen(false);
                  trigger('light');
                }
              }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-gray-900 
                       shadow-2xl z-50 lg:hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b 
                          border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 
                              rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Inventory Tracker
                    </h2>
                    <p className="text-xs text-gray-500">PWA Version 2.0</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    trigger('light');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg 
                           transition-colors touch-manipulation"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Section */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full 
                              flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">John Doe</p>
                    <p className="text-sm text-gray-500">john@example.com</p>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="p-4 space-y-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg 
                             transition-colors touch-manipulation ${
                      activeTab === item.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                    aria-current={activeTab === item.id ? 'page' : undefined}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Quick Actions */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => trigger('selection')}
                    className="flex flex-col items-center gap-1 p-3 bg-gray-100 
                             dark:bg-gray-800 rounded-lg hover:bg-gray-200 
                             dark:hover:bg-gray-700 transition-colors touch-manipulation"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs">Add Item</span>
                  </button>
                  <button
                    onClick={toggleViewMode}
                    className="flex flex-col items-center gap-1 p-3 bg-gray-100 
                             dark:bg-gray-800 rounded-lg hover:bg-gray-200 
                             dark:hover:bg-gray-700 transition-colors touch-manipulation"
                  >
                    {viewMode === 'grid' ? (
                      <List className="w-5 h-5" />
                    ) : (
                      <Grid3x3 className="w-5 h-5" />
                    )}
                    <span className="text-xs">View Mode</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          router.push('/items/new');
          trigger('medium');
        }}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-gradient-to-br 
                 from-blue-500 to-purple-500 rounded-full shadow-lg 
                 flex items-center justify-center lg:hidden touch-manipulation"
        aria-label="Add new item"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>
    </>
  );
}