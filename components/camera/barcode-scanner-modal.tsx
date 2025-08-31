'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, CameraOff, Flashlight, FlashlightOff, RotateCcw, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { BarcodeValidator } from '@/lib/camera/barcode-scanner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: { format: string; value: string; productInfo?: any }) => void;
  title?: string;
  description?: string;
  enableProductLookup?: boolean;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanResult,
  title = "Scan Barcode",
  description = "Position the barcode within the camera view",
  enableProductLookup = true
}: BarcodeScannerModalProps) {
  const {
    state,
    refs: { videoRef, canvasRef },
    actions: { startScanning, stopScanning, switchCamera, toggleFlashlight, clearError },
    utils: { formatScanResult, lookupProduct },
    permissions: { isSupported, hasPermission, needsPermission }
  } = useBarcodeScanner();

  const [isInitializing, setIsInitializing] = useState(false);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  const handleClose = useCallback(() => {
    if (state.isScanning) {
      stopScanning();
    }
    setProductInfo(null);
    setIsLoadingProduct(false);
    clearError();
    onClose();
  }, [state.isScanning, stopScanning, clearError, onClose]);

  const initializeScanner = useCallback(async () => {
    if (isInitializing || state.isScanning) return;

    setIsInitializing(true);
    clearError();

    try {
      await startScanning({
        facingMode: 'environment', // Use rear camera for barcode scanning
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 }
      });
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, state.isScanning, clearError, startScanning]);

  const handleScanSuccess = useCallback(async (result: any) => {
    console.log('Barcode scanned:', result);

    let productData = null;

    // Lookup product information if enabled
    if (enableProductLookup && result.isValid) {
      setIsLoadingProduct(true);
      try {
        productData = await lookupProduct(result.rawValue, result.format);
      } catch (error) {
        console.warn('Product lookup failed:', error);
      } finally {
        setIsLoadingProduct(false);
      }
    }

    setProductInfo(productData);

    // Pass result to parent component
    onScanResult({
      format: result.format,
      value: result.rawValue,
      productInfo: productData
    });

    // Auto-close after successful scan unless in continuous mode
    if (!state.config.continuous) {
      setTimeout(() => {
        handleClose();
      }, 2000);
    }
  }, [enableProductLookup, lookupProduct, onScanResult, state.config.continuous, handleClose]);

  useEffect(() => {
    if (isOpen && isSupported()) {
      if (needsPermission()) {
        // Permission will be requested when startScanning is called
      } else if (hasPermission()) {
        initializeScanner();
      }
    }

    return () => {
      if (state.isScanning) {
        stopScanning();
      }
    };
  }, [isOpen, isSupported, needsPermission, hasPermission, initializeScanner, state.isScanning, stopScanning]);

  useEffect(() => {
    // Handle scan results
    if (state.currentResult && state.currentResult.isValid) {
      handleScanSuccess(state.currentResult);
    }
  }, [state.currentResult, handleScanSuccess]);

  const handleCameraSwitch = async () => {
    try {
      await switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };

  const handleFlashlightToggle = async () => {
    try {
      await toggleFlashlight();
    } catch (error) {
      console.error('Failed to toggle flashlight:', error);
    }
  };

  const renderScannerContent = () => {
    if (!isSupported()) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Camera access is not supported on this device or browser.
          </p>
        </div>
      );
    }

    if (needsPermission() || state.permission === 'denied') {
      return (
        <div className="text-center py-8">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Camera access is required for barcode scanning.
          </p>
          <Button onClick={initializeScanner} disabled={isInitializing}>
            {isInitializing ? 'Requesting Access...' : 'Enable Camera'}
          </Button>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-sm text-red-600 mb-4">{state.error}</p>
          <Button onClick={initializeScanner} variant="outline">
            Try Again
          </Button>
        </div>
      );
    }

    return (
      <div className="relative">
        {/* Camera controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCameraSwitch}
              disabled={!state.isScanning}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleFlashlightToggle}
              disabled={!state.isScanning}
            >
              {state.flashlightEnabled ? (
                <FlashlightOff className="h-4 w-4" />
              ) : (
                <Flashlight className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Badge variant={state.isScanning ? "default" : "secondary"}>
            {state.isScanning ? "Scanning..." : "Not Scanning"}
          </Badge>
        </div>

        {/* Camera view */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ mixBlendMode: 'overlay' }}
          />
          
          {/* Scanning overlay */}
          {state.isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-green-500 border-dashed rounded-lg w-64 h-32 animate-pulse">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-green-500"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-green-500"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-green-500"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-green-500"></div>
              </div>
            </div>
          )}
          
          {/* Result overlay */}
          {state.currentResult && (
            <div className="absolute bottom-4 left-4 right-4">
              <Card className="bg-green-500/90 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <div>
                      <p className="font-semibold">{formatScanResult(state.currentResult).formatName}</p>
                      <p className="text-sm opacity-90">{state.currentResult.displayValue}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Product information */}
        {isLoadingProduct && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">Looking up product information...</p>
          </div>
        )}

        {productInfo && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                {productInfo.imageUrl && (
                  <img 
                    src={productInfo.imageUrl} 
                    alt={productInfo.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{productInfo.name}</h4>
                  {productInfo.brand && (
                    <p className="text-sm text-muted-foreground">{productInfo.brand}</p>
                  )}
                  {productInfo.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {productInfo.description}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Start scanning button */}
        {!state.isScanning && !isInitializing && hasPermission() && (
          <div className="mt-4 text-center">
            <Button onClick={initializeScanner}>
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        {renderScannerContent()}

        {/* Scanner settings */}
        {state.isScanning && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Supported formats:</span>
              <span>{state.config.formats.join(', ')}</span>
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Camera devices:</span>
              <span>{state.cameraDevices.length} available</span>
            </div>

          </div>
        )}

        {/* Recent scans */}
        {state.scanHistory.length > 0 && !state.isScanning && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Recent Scans</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {state.scanHistory.slice(0, 3).map((scan, index) => {
                const formatted = formatScanResult(scan);
                return (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                    <div>
                      <span className="font-medium">{formatted.formatName}</span>
                      <span className="text-muted-foreground ml-2">{scan.displayValue}</span>
                    </div>
                    <Badge variant={scan.isValid ? "default" : "destructive"} className="text-xs">
                      {formatted.confidencePercent}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 mt-4">
          {state.isScanning && (
            <Button variant="destructive" onClick={stopScanning}>
              <CameraOff className="h-4 w-4 mr-2" />
              Stop Scanning
            </Button>
          )}
          
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}