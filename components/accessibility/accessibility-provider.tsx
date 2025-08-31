'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  useAccessibility, 
  announceToScreenReader,
  KeyboardNavigationManager,
  aria
} from '@/lib/accessibility/wcag-compliance';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  aria: typeof aria;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { 
    announceRouteChange, 
    prefersReducedMotion, 
    prefersHighContrast 
  } = useAccessibility();

  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    screenReaderMode: false,
    keyboardNavigation: true,
    focusIndicators: true
  });

  // Initialize settings from system preferences and localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings');
    
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      // Use system preferences as defaults
      setSettings(prev => ({
        ...prev,
        highContrast: prefersHighContrast(),
        reducedMotion: prefersReducedMotion()
      }));
    }
  }, [prefersHighContrast, prefersReducedMotion]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    
    // Apply settings to document
    const htmlElement = document.documentElement;
    
    // High contrast mode
    if (settings.highContrast) {
      htmlElement.classList.add('high-contrast');
    } else {
      htmlElement.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      htmlElement.classList.add('reduced-motion');
    } else {
      htmlElement.classList.remove('reduced-motion');
    }
    
    // Large text
    if (settings.largeText) {
      htmlElement.classList.add('large-text');
    } else {
      htmlElement.classList.remove('large-text');
    }
    
    // Focus indicators
    if (settings.focusIndicators) {
      htmlElement.classList.add('focus-indicators');
    } else {
      htmlElement.classList.remove('focus-indicators');
    }
  }, [settings]);

  // Announce route changes
  useEffect(() => {
    if (settings.screenReaderMode) {
      announceRouteChange(pathname);
    }
  }, [pathname, settings.screenReaderMode, announceRouteChange]);

  // Setup keyboard navigation
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return;

    const navManager = new KeyboardNavigationManager(
      mainContent as HTMLElement,
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    return () => {
      navManager.destroy();
    };
  }, [settings.keyboardNavigation]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.screenReaderMode) {
      announceToScreenReader(message, priority);
    }
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, announce, aria }}>
      {children}
      
      {/* Accessibility Settings Panel */}
      <AccessibilitySettingsPanel 
        settings={settings} 
        updateSettings={updateSettings} 
      />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityContext() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within AccessibilityProvider');
  }
  return context;
}

// Accessibility Settings Panel Component
function AccessibilitySettingsPanel({ 
  settings, 
  updateSettings 
}: { 
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Accessibility Quick Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50 p-3 bg-blue-600 text-white rounded-full 
                 shadow-lg hover:bg-blue-700 transition-colors focus:outline-none 
                 focus:ring-4 focus:ring-blue-300"
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
          />
        </svg>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-20 left-4 z-50 w-80 bg-white dark:bg-gray-900 
                   rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
          role="dialog"
          aria-label="Accessibility settings panel"
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Accessibility Settings
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">High Contrast</span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                aria-describedby="high-contrast-desc"
              />
            </label>
            <p id="high-contrast-desc" className="text-xs text-gray-500 -mt-2">
              Increase color contrast for better visibility
            </p>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Reduced Motion</span>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                aria-describedby="reduced-motion-desc"
              />
            </label>
            <p id="reduced-motion-desc" className="text-xs text-gray-500 -mt-2">
              Minimize animations and transitions
            </p>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Large Text</span>
              <input
                type="checkbox"
                checked={settings.largeText}
                onChange={(e) => updateSettings({ largeText: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                aria-describedby="large-text-desc"
              />
            </label>
            <p id="large-text-desc" className="text-xs text-gray-500 -mt-2">
              Increase text size for better readability
            </p>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Screen Reader Mode</span>
              <input
                type="checkbox"
                checked={settings.screenReaderMode}
                onChange={(e) => updateSettings({ screenReaderMode: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                aria-describedby="screen-reader-desc"
              />
            </label>
            <p id="screen-reader-desc" className="text-xs text-gray-500 -mt-2">
              Optimize for screen reader usage
            </p>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Keyboard Navigation</span>
              <input
                type="checkbox"
                checked={settings.keyboardNavigation}
                onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                aria-describedby="keyboard-nav-desc"
              />
            </label>
            <p id="keyboard-nav-desc" className="text-xs text-gray-500 -mt-2">
              Enable arrow key navigation
            </p>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Focus Indicators</span>
              <input
                type="checkbox"
                checked={settings.focusIndicators}
                onChange={(e) => updateSettings({ focusIndicators: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                aria-describedby="focus-indicators-desc"
              />
            </label>
            <p id="focus-indicators-desc" className="text-xs text-gray-500 -mt-2">
              Show clear focus outlines for keyboard navigation
            </p>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 
                     dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}