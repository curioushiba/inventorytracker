'use client';

import { useEffect, useCallback } from 'react';

/**
 * WCAG 2.1 AA Compliance Utilities
 * Provides comprehensive accessibility features including:
 * - Keyboard navigation
 * - Screen reader support
 * - Color contrast validation
 * - Focus management
 * - ARIA attributes
 */

// Color contrast ratios for WCAG AA compliance
const WCAG_AA_CONTRAST_RATIOS = {
  normalText: 4.5,
  largeText: 3,
  ui: 3
};

// Focus trap management
export class FocusTrap {
  private element: HTMLElement;
  private previouslyFocused: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private firstFocusable: HTMLElement | null = null;
  private lastFocusable: HTMLElement | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    this.updateFocusableElements();
    this.trapFocus();
  }

  private updateFocusableElements() {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'audio[controls]',
      'video[controls]',
      '[contenteditable]:not([contenteditable="false"])'
    ];

    this.focusableElements = Array.from(
      this.element.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];

    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  private trapFocus() {
    this.previouslyFocused = document.activeElement as HTMLElement;
    
    if (this.firstFocusable) {
      this.firstFocusable.focus();
    }

    this.element.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === this.firstFocusable) {
          e.preventDefault();
          this.lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === this.lastFocusable) {
          e.preventDefault();
          this.firstFocusable?.focus();
        }
      }
    }

    if (e.key === 'Escape') {
      this.release();
    }
  };

  public release() {
    this.element.removeEventListener('keydown', this.handleKeyDown);
    this.previouslyFocused?.focus();
  }
}

// Skip navigation links for keyboard users
export function createSkipLinks(): HTMLElement {
  const skipNav = document.createElement('div');
  skipNav.className = 'sr-only focus-within:not-sr-only';
  skipNav.innerHTML = `
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <a href="#main-navigation" class="skip-link">Skip to navigation</a>
    <a href="#search" class="skip-link">Skip to search</a>
  `;
  
  // Add styles for skip links
  const style = document.createElement('style');
  style.textContent = `
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 100;
      border-radius: 0 0 4px 0;
    }
    .skip-link:focus {
      top: 0;
    }
  `;
  document.head.appendChild(style);
  
  return skipNav;
}

// Color contrast checker
export function checkColorContrast(
  foreground: string,
  background: string
): { ratio: number; passesAA: boolean; passesAAA: boolean } {
  // Convert hex to RGB
  const getRGB = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Calculate relative luminance
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const sRGB = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
    const adjustedRGB = sRGB.map(val => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * adjustedRGB[0] + 0.7152 * adjustedRGB[1] + 0.0722 * adjustedRGB[2];
  };

  const fgRGB = getRGB(foreground);
  const bgRGB = getRGB(background);
  
  const fgLuminance = getLuminance(fgRGB);
  const bgLuminance = getLuminance(bgRGB);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  const ratio = (lighter + 0.05) / (darker + 0.05);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= WCAG_AA_CONTRAST_RATIOS.normalText,
    passesAAA: ratio >= 7
  };
}

// Announce content to screen readers
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Keyboard navigation manager
export class KeyboardNavigationManager {
  private container: HTMLElement;
  private items: HTMLElement[] = [];
  private currentIndex = -1;

  constructor(container: HTMLElement, itemSelector: string) {
    this.container = container;
    this.updateItems(itemSelector);
    this.setupEventListeners();
  }

  private updateItems(selector: string) {
    this.items = Array.from(this.container.querySelectorAll(selector));
  }

  private setupEventListeners() {
    this.container.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        this.focusNext();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        this.focusPrevious();
        break;
      case 'Home':
        e.preventDefault();
        this.focusFirst();
        break;
      case 'End':
        e.preventDefault();
        this.focusLast();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.activateCurrent();
        break;
    }
  };

  private focusNext() {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    this.items[this.currentIndex]?.focus();
  }

  private focusPrevious() {
    this.currentIndex = this.currentIndex <= 0 ? this.items.length - 1 : this.currentIndex - 1;
    this.items[this.currentIndex]?.focus();
  }

  private focusFirst() {
    this.currentIndex = 0;
    this.items[this.currentIndex]?.focus();
  }

  private focusLast() {
    this.currentIndex = this.items.length - 1;
    this.items[this.currentIndex]?.focus();
  }

  private activateCurrent() {
    this.items[this.currentIndex]?.click();
  }

  public destroy() {
    this.container.removeEventListener('keydown', this.handleKeyDown);
  }
}

// React hooks for accessibility
export function useAccessibility() {
  // Manage focus restoration
  const restoreFocus = useCallback((previousElement: HTMLElement | null) => {
    if (previousElement && document.body.contains(previousElement)) {
      previousElement.focus();
    }
  }, []);

  // Setup skip links
  useEffect(() => {
    const skipLinks = createSkipLinks();
    document.body.insertBefore(skipLinks, document.body.firstChild);
    
    return () => {
      if (document.body.contains(skipLinks)) {
        document.body.removeChild(skipLinks);
      }
    };
  }, []);

  // Announce route changes to screen readers
  const announceRouteChange = useCallback((route: string) => {
    announceToScreenReader(`Navigated to ${route}`, 'polite');
  }, []);

  // Check if user prefers reduced motion
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check if user prefers high contrast
  const prefersHighContrast = useCallback(() => {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }, []);

  return {
    restoreFocus,
    announceRouteChange,
    prefersReducedMotion,
    prefersHighContrast,
    announceToScreenReader,
    checkColorContrast
  };
}

// ARIA utilities
export const aria = {
  // Set loading state
  setLoading: (element: HTMLElement, isLoading: boolean) => {
    element.setAttribute('aria-busy', String(isLoading));
  },

  // Set expanded state
  setExpanded: (element: HTMLElement, isExpanded: boolean) => {
    element.setAttribute('aria-expanded', String(isExpanded));
  },

  // Set selected state
  setSelected: (element: HTMLElement, isSelected: boolean) => {
    element.setAttribute('aria-selected', String(isSelected));
  },

  // Set disabled state
  setDisabled: (element: HTMLElement, isDisabled: boolean) => {
    element.setAttribute('aria-disabled', String(isDisabled));
    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
      element.disabled = isDisabled;
    }
  },

  // Set label
  setLabel: (element: HTMLElement, label: string) => {
    element.setAttribute('aria-label', label);
  },

  // Set description
  setDescription: (element: HTMLElement, description: string) => {
    element.setAttribute('aria-describedby', description);
  },

  // Set live region
  setLive: (element: HTMLElement, priority: 'polite' | 'assertive' | 'off') => {
    element.setAttribute('aria-live', priority);
  },

  // Set role
  setRole: (element: HTMLElement, role: string) => {
    element.setAttribute('role', role);
  }
};

// Accessible modal helper
export function createAccessibleModal(content: HTMLElement, options?: {
  title?: string;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
}) {
  const modal = document.createElement('div');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  if (options?.title) {
    modal.setAttribute('aria-label', options.title);
  }
  
  const focusTrap = new FocusTrap(modal);
  
  if (options?.closeOnEscape) {
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        focusTrap.release();
      }
    });
  }
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  return {
    modal,
    close: () => {
      modal.remove();
      focusTrap.release();
    }
  };
}