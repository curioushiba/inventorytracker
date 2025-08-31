import { useState, useEffect, useCallback, useRef } from 'react';
import { getBarcodeScanner, ScanResult, ScannerConfig, BarcodeValidator } from '@/lib/camera/barcode-scanner';

export interface BarcodeScannerState {
  isSupported: boolean;
  permission: PermissionState;
  isScanning: boolean;
  currentResult: ScanResult | null;
  scanHistory: ScanResult[];
  error: string | null;
  cameraDevices: MediaDeviceInfo[];
  currentDevice: string | null;
  flashlightEnabled: boolean;
  config: ScannerConfig;
}

export function useBarcodeScanner() {
  const [state, setState] = useState<BarcodeScannerState>({
    isSupported: false,
    permission: 'prompt',
    isScanning: false,
    currentResult: null,
    scanHistory: [],
    error: null,
    cameraDevices: [],
    currentDevice: null,
    flashlightEnabled: false,
    config: {
      formats: ['code_128', 'ean_13', 'ean_8', 'qr_code'],
      continuous: false,
      beepOnScan: true,
      vibrateOnScan: true,
      highlightResults: true,
      autoStop: true,
      timeout: 30000,
      quality: 'high'
    }
  });

  const scanner = getBarcodeScanner();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateState = useCallback(async () => {
    try {
      const isSupported = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      const permission = await scanner.checkCameraPermissions();
      const scanHistory = scanner.getScanHistory();
      const cameraDevices = await scanner.getCameraDevices();
      const config = scanner.getConfiguration();

      setState(prev => ({
        ...prev,
        isSupported,
        permission,
        scanHistory,
        cameraDevices,
        config
      }));
    } catch (error) {
      console.error('Failed to update scanner state:', error);
    }
  }, [scanner]);

  useEffect(() => {
    updateState();

    // Set up scan result listener
    const unsubscribeScan = scanner.onScan((result) => {
      setState(prev => ({
        ...prev,
        currentResult: result,
        error: null
      }));
    });

    // Set up error listener
    const unsubscribeError = scanner.onError((error) => {
      setState(prev => ({
        ...prev,
        error: error.message,
        isScanning: false
      }));
    });

    return () => {
      unsubscribeScan();
      unsubscribeError();
    };
  }, [scanner, updateState]);

  const startScanning = useCallback(async (constraints?: any): Promise<void> => {
    if (!videoRef.current || !canvasRef.current) {
      throw new Error('Video and canvas elements are required');
    }

    try {
      setState(prev => ({ ...prev, error: null, isScanning: true }));
      
      await scanner.startScanning(videoRef.current, canvasRef.current, constraints);
      
      setState(prev => ({ ...prev, isScanning: true }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Scanning failed',
        isScanning: false 
      }));
      throw error;
    }
  }, [scanner]);

  const stopScanning = useCallback(() => {
    scanner.stopScanning();
    setState(prev => ({ 
      ...prev, 
      isScanning: false, 
      currentResult: null,
      flashlightEnabled: false 
    }));
  }, [scanner]);

  const switchCamera = useCallback(async () => {
    if (!state.isScanning) return;

    try {
      await scanner.switchCamera();
      const devices = await scanner.getCameraDevices();
      setState(prev => ({ ...prev, cameraDevices: devices }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Camera switch failed' 
      }));
      throw error;
    }
  }, [scanner, state.isScanning]);

  const toggleFlashlight = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await scanner.toggleFlashlight();
      setState(prev => ({ ...prev, flashlightEnabled: enabled }));
      return enabled;
    } catch (error) {
      console.error('Failed to toggle flashlight:', error);
      return false;
    }
  }, [scanner]);

  const updateConfiguration = useCallback((updates: Partial<ScannerConfig>) => {
    scanner.updateConfiguration(updates);
    const newConfig = scanner.getConfiguration();
    setState(prev => ({ ...prev, config: newConfig }));
  }, [scanner]);

  const clearHistory = useCallback(() => {
    scanner.clearScanHistory();
    setState(prev => ({ ...prev, scanHistory: [] }));
  }, [scanner]);

  const validateBarcode = useCallback((code: string, format: string): boolean => {
    // Use the validator from the scanner
    const formats = scanner.getSupportedFormats();
    const barcodeFormat = formats.find(f => f.name === format);
    
    if (!barcodeFormat) return false;
    
    return barcodeFormat.regex.test(code);
  }, [scanner]);

  const lookupProduct = useCallback(async (barcode: string, format: string) => {
    try {
      return await BarcodeValidator.lookupProduct(barcode, format);
    } catch (error) {
      console.error('Product lookup failed:', error);
      return null;
    }
  }, []);

  const generateTestBarcode = useCallback((format: string): string => {
    return BarcodeValidator.generateRandomBarcode(format);
  }, []);

  // Format utilities
  const formatScanResult = useCallback((result: ScanResult) => {
    const format = scanner.getSupportedFormats().find(f => f.name === result.format);
    return {
      ...result,
      formatName: format?.displayName || result.format,
      formattedTime: new Date(result.timestamp).toLocaleString(),
      confidencePercent: Math.round(result.confidence * 100)
    };
  }, [scanner]);

  const getScanStatistics = useCallback(() => {
    const history = state.scanHistory;
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const todayScans = history.filter(scan => scan.timestamp > dayAgo);
    const weekScans = history.filter(scan => scan.timestamp > weekAgo);

    const formatCounts = history.reduce((acc, scan) => {
      acc[scan.format] = (acc[scan.format] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageConfidence = history.length > 0 
      ? history.reduce((sum, scan) => sum + scan.confidence, 0) / history.length 
      : 0;

    return {
      total: history.length,
      today: todayScans.length,
      week: weekScans.length,
      formatBreakdown: formatCounts,
      averageConfidence: Math.round(averageConfidence * 100),
      successRate: history.filter(scan => scan.isValid).length / Math.max(history.length, 1) * 100
    };
  }, [state.scanHistory]);

  const getRecentScans = useCallback((count: number = 10) => {
    return state.scanHistory
      .slice(0, count)
      .map(formatScanResult);
  }, [state.scanHistory, formatScanResult]);

  // Error handling utilities
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const retryLastScan = useCallback(async () => {
    if (state.error && !state.isScanning) {
      try {
        await startScanning();
      } catch (error) {
        console.error('Retry scan failed:', error);
      }
    }
  }, [state.error, state.isScanning, startScanning]);

  return {
    state,
    refs: {
      videoRef,
      canvasRef
    },
    actions: {
      startScanning,
      stopScanning,
      switchCamera,
      toggleFlashlight,
      updateConfiguration,
      clearHistory,
      clearError,
      retryLastScan
    },
    utils: {
      validateBarcode,
      lookupProduct,
      generateTestBarcode,
      formatScanResult,
      getScanStatistics,
      getRecentScans
    },
    permissions: {
      isSupported: () => state.isSupported,
      hasPermission: () => state.permission === 'granted',
      needsPermission: () => state.permission === 'prompt',
      isDenied: () => state.permission === 'denied'
    }
  };
}