'use client';

export type HapticPattern = 
  | 'success'
  | 'warning'
  | 'error'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'notification';

export interface HapticConfig {
  enabled: boolean;
  intensity: 'low' | 'medium' | 'high';
  duration?: number;
  pattern?: number[];
}

const DEFAULT_CONFIG: HapticConfig = {
  enabled: true,
  intensity: 'medium',
  duration: 10
};

// Haptic patterns in milliseconds [vibrate, pause, vibrate, pause, ...]
const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  success: [10, 50, 10],
  warning: [30, 30, 30],
  error: [50, 100, 50, 100, 50],
  light: [10],
  medium: [20],
  heavy: [40],
  selection: [5],
  notification: [25, 50, 25, 50, 25]
};

// Intensity multipliers
const INTENSITY_MULTIPLIERS = {
  low: 0.5,
  medium: 1,
  high: 1.5
};

export class HapticFeedback {
  private config: HapticConfig;
  private isSupported: boolean;
  private vibrationAPI: any;

  constructor(config: Partial<HapticConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isSupported = this.checkSupport();
    this.vibrationAPI = this.getVibrationAPI();
  }

  private checkSupport(): boolean {
    if (typeof window === 'undefined') return false;
    
    // Check for Vibration API
    if ('vibrate' in navigator) return true;
    
    // Check for webkit vibration
    if ('webkitVibrate' in navigator) return true;
    
    // Check for moz vibration
    if ('mozVibrate' in navigator) return true;
    
    return false;
  }

  private getVibrationAPI(): any {
    if (typeof window === 'undefined') return null;
    
    if ('vibrate' in navigator) return navigator.vibrate.bind(navigator);
    if ('webkitVibrate' in navigator) return (navigator as any).webkitVibrate.bind(navigator);
    if ('mozVibrate' in navigator) return (navigator as any).mozVibrate.bind(navigator);
    
    return null;
  }

  /**
   * Trigger haptic feedback with a predefined pattern
   */
  public trigger(pattern: HapticPattern): void {
    if (!this.config.enabled || !this.isSupported || !this.vibrationAPI) {
      console.log(`Haptic feedback triggered: ${pattern} (not supported or disabled)`);
      return;
    }

    const vibrationPattern = this.getAdjustedPattern(pattern);
    
    try {
      this.vibrationAPI(vibrationPattern);
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Trigger custom haptic feedback
   */
  public triggerCustom(pattern: number[] | number): void {
    if (!this.config.enabled || !this.isSupported || !this.vibrationAPI) {
      return;
    }

    const adjustedPattern = Array.isArray(pattern) 
      ? pattern.map(duration => this.adjustDuration(duration))
      : this.adjustDuration(pattern);

    try {
      this.vibrationAPI(adjustedPattern);
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }

  /**
   * Stop any ongoing vibration
   */
  public stop(): void {
    if (this.vibrationAPI) {
      try {
        this.vibrationAPI(0);
      } catch (error) {
        console.error('Failed to stop haptic feedback:', error);
      }
    }
  }

  /**
   * Get adjusted pattern based on intensity
   */
  private getAdjustedPattern(pattern: HapticPattern): number[] {
    const basePattern = HAPTIC_PATTERNS[pattern];
    const multiplier = INTENSITY_MULTIPLIERS[this.config.intensity];
    
    return basePattern.map((duration, index) => {
      // Only adjust vibration durations (odd indices), not pauses
      if (index % 2 === 0) {
        return this.adjustDuration(duration * multiplier);
      }
      return duration;
    });
  }

  /**
   * Adjust duration based on intensity
   */
  private adjustDuration(duration: number): number {
    const multiplier = INTENSITY_MULTIPLIERS[this.config.intensity];
    const adjusted = Math.round(duration * multiplier);
    // Ensure minimum duration of 1ms and maximum of 1000ms
    return Math.max(1, Math.min(1000, adjusted));
  }

  /**
   * Check if haptic feedback is supported
   */
  public get supported(): boolean {
    return this.isSupported;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<HapticConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable haptic feedback
   */
  public enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable haptic feedback
   */
  public disable(): void {
    this.config.enabled = false;
  }

  /**
   * Toggle haptic feedback
   */
  public toggle(): void {
    this.config.enabled = !this.config.enabled;
  }

  /**
   * Get current configuration
   */
  public getConfig(): HapticConfig {
    return { ...this.config };
  }
}

// Singleton instance
let hapticInstance: HapticFeedback | null = null;

/**
 * Get or create haptic feedback instance
 */
export function getHapticFeedback(config?: Partial<HapticConfig>): HapticFeedback {
  if (!hapticInstance) {
    hapticInstance = new HapticFeedback(config);
  } else if (config) {
    hapticInstance.updateConfig(config);
  }
  return hapticInstance;
}

// React hook for haptic feedback
import { useCallback, useEffect, useRef } from 'react';

export function useHapticFeedback(config?: Partial<HapticConfig>) {
  const hapticRef = useRef<HapticFeedback | null>(null);

  useEffect(() => {
    hapticRef.current = getHapticFeedback(config);
  }, []);

  const trigger = useCallback((pattern: HapticPattern) => {
    hapticRef.current?.trigger(pattern);
  }, []);

  const triggerCustom = useCallback((pattern: number[] | number) => {
    hapticRef.current?.triggerCustom(pattern);
  }, []);

  const stop = useCallback(() => {
    hapticRef.current?.stop();
  }, []);

  const updateConfig = useCallback((newConfig: Partial<HapticConfig>) => {
    hapticRef.current?.updateConfig(newConfig);
  }, []);

  return {
    trigger,
    triggerCustom,
    stop,
    updateConfig,
    supported: hapticRef.current?.supported || false,
    enable: () => hapticRef.current?.enable(),
    disable: () => hapticRef.current?.disable(),
    toggle: () => hapticRef.current?.toggle()
  };
}

// Haptic feedback directive for common interactions
export function addHapticToElement(
  element: HTMLElement,
  pattern: HapticPattern = 'selection',
  event: string = 'click'
): () => void {
  const haptic = getHapticFeedback();
  
  const handler = () => {
    haptic.trigger(pattern);
  };
  
  element.addEventListener(event, handler);
  
  // Return cleanup function
  return () => {
    element.removeEventListener(event, handler);
  };
}