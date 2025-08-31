'use client';

import { useEffect, useRef, useCallback } from 'react';

export type GestureType = 
  | 'swipe-left' 
  | 'swipe-right' 
  | 'swipe-up' 
  | 'swipe-down'
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'pinch-in'
  | 'pinch-out'
  | 'rotate';

export interface GestureEvent {
  type: GestureType;
  deltaX?: number;
  deltaY?: number;
  velocity?: number;
  scale?: number;
  rotation?: number;
  target: HTMLElement;
  timestamp: number;
}

export interface GestureConfig {
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  pinchThreshold?: number;
  rotationThreshold?: number;
}

const DEFAULT_CONFIG: GestureConfig = {
  minSwipeDistance: 50,
  maxSwipeTime: 500,
  longPressDelay: 500,
  doubleTapDelay: 300,
  pinchThreshold: 0.2,
  rotationThreshold: 15
};

export class GestureRecognizer {
  private element: HTMLElement;
  private config: GestureConfig;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private lastTapTime = 0;
  private longPressTimer: NodeJS.Timeout | null = null;
  private initialPinchDistance = 0;
  private initialRotation = 0;
  private listeners: Map<GestureType, Set<(event: GestureEvent) => void>> = new Map();
  private isMultiTouch = false;

  constructor(element: HTMLElement, config: GestureConfig = {}) {
    this.element = element;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Touch events
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });

    // Mouse events for desktop testing
    this.element.addEventListener('mousedown', this.handleMouseDown);
    this.element.addEventListener('mousemove', this.handleMouseMove);
    this.element.addEventListener('mouseup', this.handleMouseUp);
  }

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchStartTime = Date.now();
      this.isMultiTouch = false;

      // Start long press timer
      this.longPressTimer = setTimeout(() => {
        this.emit('long-press', {
          type: 'long-press',
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
      }, this.config.longPressDelay);
    } else if (e.touches.length === 2) {
      // Multi-touch for pinch/rotate
      this.isMultiTouch = true;
      this.clearLongPressTimer();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Calculate initial pinch distance
      this.initialPinchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      // Calculate initial rotation
      this.initialRotation = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (this.isMultiTouch && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      // Calculate current pinch distance
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      // Calculate scale
      const scale = currentDistance / this.initialPinchDistance;
      
      // Detect pinch gesture
      if (Math.abs(scale - 1) > this.config.pinchThreshold!) {
        this.emit(scale > 1 ? 'pinch-out' : 'pinch-in', {
          type: scale > 1 ? 'pinch-out' : 'pinch-in',
          scale,
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
      }
      
      // Calculate current rotation
      const currentRotation = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      const rotation = currentRotation - this.initialRotation;
      
      // Detect rotation gesture
      if (Math.abs(rotation) > this.config.rotationThreshold!) {
        this.emit('rotate', {
          type: 'rotate',
          rotation,
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
      }
    } else if (!this.isMultiTouch) {
      // Clear long press timer on move
      this.clearLongPressTimer();
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    this.clearLongPressTimer();
    
    if (this.isMultiTouch) {
      this.isMultiTouch = false;
      return;
    }
    
    const touchEndTime = Date.now();
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;
    const deltaTime = touchEndTime - this.touchStartTime;
    const distance = Math.hypot(deltaX, deltaY);
    
    // Check for swipe
    if (distance > this.config.minSwipeDistance! && deltaTime < this.config.maxSwipeTime!) {
      const velocity = distance / deltaTime;
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        this.emit(deltaX > 0 ? 'swipe-right' : 'swipe-left', {
          type: deltaX > 0 ? 'swipe-right' : 'swipe-left',
          deltaX,
          deltaY,
          velocity,
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
      } else {
        // Vertical swipe
        this.emit(deltaY > 0 ? 'swipe-down' : 'swipe-up', {
          type: deltaY > 0 ? 'swipe-down' : 'swipe-up',
          deltaX,
          deltaY,
          velocity,
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
      }
    } else if (distance < 10 && deltaTime < 200) {
      // Check for tap or double tap
      const timeSinceLastTap = touchEndTime - this.lastTapTime;
      
      if (timeSinceLastTap < this.config.doubleTapDelay!) {
        this.emit('double-tap', {
          type: 'double-tap',
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
        this.lastTapTime = 0;
      } else {
        this.emit('tap', {
          type: 'tap',
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
        this.lastTapTime = touchEndTime;
      }
    }
  };

  private handleTouchCancel = () => {
    this.clearLongPressTimer();
    this.isMultiTouch = false;
  };

  // Mouse event handlers for desktop testing
  private handleMouseDown = (e: MouseEvent) => {
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.touchStartTime = Date.now();
    
    this.longPressTimer = setTimeout(() => {
      this.emit('long-press', {
        type: 'long-press',
        target: e.target as HTMLElement,
        timestamp: Date.now()
      });
    }, this.config.longPressDelay);
  };

  private handleMouseMove = () => {
    this.clearLongPressTimer();
  };

  private handleMouseUp = (e: MouseEvent) => {
    this.clearLongPressTimer();
    
    const deltaX = e.clientX - this.touchStartX;
    const deltaY = e.clientY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    const distance = Math.hypot(deltaX, deltaY);
    
    if (distance < 10 && deltaTime < 200) {
      const timeSinceLastTap = Date.now() - this.lastTapTime;
      
      if (timeSinceLastTap < this.config.doubleTapDelay!) {
        this.emit('double-tap', {
          type: 'double-tap',
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
        this.lastTapTime = 0;
      } else {
        this.emit('tap', {
          type: 'tap',
          target: e.target as HTMLElement,
          timestamp: Date.now()
        });
        this.lastTapTime = Date.now();
      }
    }
  };

  private clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  public on(type: GestureType, callback: (event: GestureEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  public off(type: GestureType, callback: (event: GestureEvent) => void) {
    this.listeners.get(type)?.delete(callback);
  }

  private emit(type: GestureType, event: GestureEvent) {
    this.listeners.get(type)?.forEach(callback => callback(event));
  }

  public destroy() {
    this.clearLongPressTimer();
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    this.element.removeEventListener('mousemove', this.handleMouseMove);
    this.element.removeEventListener('mouseup', this.handleMouseUp);
    this.listeners.clear();
  }
}

// React hook for gesture recognition
export function useGestures(
  ref: React.RefObject<HTMLElement>,
  handlers: Partial<Record<GestureType, (event: GestureEvent) => void>>,
  config?: GestureConfig
) {
  const recognizerRef = useRef<GestureRecognizer | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const recognizer = new GestureRecognizer(ref.current, config);
    recognizerRef.current = recognizer;

    // Register handlers
    Object.entries(handlers).forEach(([type, handler]) => {
      if (handler) {
        recognizer.on(type as GestureType, handler);
      }
    });

    return () => {
      recognizer.destroy();
    };
  }, [ref, handlers, config]);

  return recognizerRef.current;
}