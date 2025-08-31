export interface BarcodeFormat {
  name: string;
  regex: RegExp;
  checkDigit?: (code: string) => boolean;
  displayName: string;
}

export interface ScanResult {
  format: string;
  rawValue: string;
  displayValue: string;
  isValid: boolean;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: number;
}

export interface ScannerConfig {
  formats: string[];
  continuous: boolean;
  beepOnScan: boolean;
  vibrateOnScan: boolean;
  highlightResults: boolean;
  autoStop: boolean;
  timeout: number;
  quality: 'low' | 'medium' | 'high';
}

export interface CameraConstraints {
  width: { ideal: number; max: number };
  height: { ideal: number; max: number };
  facingMode: 'user' | 'environment';
  focusMode?: 'continuous' | 'single-shot' | 'manual';
  torch?: boolean;
}

class BarcodeScannerManager {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private scanningInterval: number | null = null;
  private isScanning = false;
  private barcodeDetector: any = null;
  
  private config: ScannerConfig = {
    formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'pdf417'],
    continuous: false,
    beepOnScan: true,
    vibrateOnScan: true,
    highlightResults: true,
    autoStop: true,
    timeout: 30000, // 30 seconds
    quality: 'high'
  };

  private barcodeFormats: Map<string, BarcodeFormat> = new Map([
    ['code_128', {
      name: 'code_128',
      regex: /^[0-9A-Za-z\-\.\$\/\+\%\s]+$/,
      displayName: 'Code 128'
    }],
    ['ean_13', {
      name: 'ean_13',
      regex: /^\d{13}$/,
      displayName: 'EAN-13'
    }],
    ['ean_8', {
      name: 'ean_8',
      regex: /^\d{8}$/,
      displayName: 'EAN-8'
    }],
    ['qr_code', {
      name: 'qr_code',
      regex: /.+/,
      displayName: 'QR Code'
    }],
    ['pdf417', {
      name: 'pdf417',
      regex: /.+/,
      displayName: 'PDF417'
    }]
  ]);

  private scanListeners: Set<(result: ScanResult) => void> = new Set();
  private errorListeners: Set<(error: Error) => void> = new Set();

  constructor() {
    this.loadConfiguration();
    this.initializeBarcodeDetector();
  }

  private loadConfiguration() {
    try {
      const stored = localStorage.getItem('barcodeScannerConfig');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load scanner configuration:', error);
    }
  }

  private async initializeBarcodeDetector() {
    if (typeof window === 'undefined') return;

    try {
      // Check for native BarcodeDetector API
      if ('BarcodeDetector' in window) {
        const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
        const formats = this.config.formats.filter(format => 
          supportedFormats.includes(format.toUpperCase())
        );
        
        if (formats.length > 0) {
          this.barcodeDetector = new (window as any).BarcodeDetector({ 
            formats: formats.map(f => f.toUpperCase()) 
          });
          console.log('Native BarcodeDetector initialized with formats:', formats);
        }
      } else {
        // Fallback to JavaScript implementation
        console.log('Using JavaScript barcode detection fallback');
      }
    } catch (error) {
      console.error('Failed to initialize barcode detector:', error);
    }
  }

  public async startScanning(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement,
    constraints?: Partial<CameraConstraints>
  ): Promise<void> {
    if (this.isScanning) {
      throw new Error('Scanner is already active');
    }

    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.context = canvasElement.getContext('2d');

    if (!this.context) {
      throw new Error('Failed to get canvas context');
    }

    try {
      // Request camera access
      const cameraConstraints = this.buildCameraConstraints(constraints);
      this.stream = await navigator.mediaDevices.getUserMedia({ video: cameraConstraints });
      
      // Setup video element
      this.videoElement.srcObject = this.stream;
      this.videoElement.setAttribute('playsinline', 'true');
      
      await new Promise<void>((resolve, reject) => {
        this.videoElement!.onloadedmetadata = () => {
          this.videoElement!.play()
            .then(() => resolve())
            .catch(reject);
        };
      });

      // Start scanning
      this.isScanning = true;
      this.startScanningLoop();
      
      // Auto-stop after timeout
      if (this.config.timeout > 0) {
        setTimeout(() => {
          if (this.isScanning && this.config.autoStop) {
            this.stopScanning();
          }
        }, this.config.timeout);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.handleError(new Error(`Camera access failed: ${errorMessage}`));
      throw error;
    }
  }

  private buildCameraConstraints(constraints?: Partial<CameraConstraints>): CameraConstraints {
    const quality = this.config.quality;
    const baseConstraints: CameraConstraints = {
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
      facingMode: 'environment' // Rear camera for barcode scanning
    };

    // Adjust for quality setting
    switch (quality) {
      case 'low':
        baseConstraints.width = { ideal: 640, max: 640 };
        baseConstraints.height = { ideal: 480, max: 480 };
        break;
      case 'medium':
        baseConstraints.width = { ideal: 1280, max: 1280 };
        baseConstraints.height = { ideal: 720, max: 720 };
        break;
      case 'high':
        // Use base constraints
        break;
    }

    return { ...baseConstraints, ...constraints };
  }

  private startScanningLoop() {
    if (!this.isScanning || !this.videoElement || !this.canvasElement || !this.context) {
      return;
    }

    const scanFrame = async () => {
      if (!this.isScanning) return;

      try {
        await this.scanCurrentFrame();
      } catch (error) {
        console.warn('Frame scan error:', error);
      }

      // Continue scanning if in continuous mode
      if (this.config.continuous && this.isScanning) {
        this.scanningInterval = requestAnimationFrame(scanFrame);
      } else if (this.isScanning) {
        // Single scan mode - try again after delay
        setTimeout(() => {
          if (this.isScanning) {
            this.scanningInterval = requestAnimationFrame(scanFrame);
          }
        }, 100);
      }
    };

    this.scanningInterval = requestAnimationFrame(scanFrame);
  }

  private async scanCurrentFrame(): Promise<void> {
    if (!this.videoElement || !this.canvasElement || !this.context) return;

    const video = this.videoElement;
    const canvas = this.canvasElement;
    const ctx = this.context;

    // Draw current video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Try native barcode detection first
    if (this.barcodeDetector) {
      try {
        const barcodes = await this.barcodeDetector.detect(canvas);
        if (barcodes.length > 0) {
          await this.processBarcodeResults(barcodes);
          return;
        }
      } catch (error) {
        console.warn('Native barcode detection failed:', error);
      }
    }

    // Fallback to JavaScript implementation
    await this.fallbackBarcodeDetection(ctx, canvas);
  }

  private async processBarcodeResults(barcodes: any[]): Promise<void> {
    for (const barcode of barcodes) {
      const format = this.barcodeFormats.get(barcode.format.toLowerCase());
      if (!format) continue;

      const result: ScanResult = {
        format: format.name,
        rawValue: barcode.rawValue,
        displayValue: barcode.displayValue || barcode.rawValue,
        isValid: this.validateBarcode(barcode.rawValue, format),
        confidence: 1.0, // Native detector is typically very accurate
        boundingBox: barcode.boundingBox ? {
          x: barcode.boundingBox.x,
          y: barcode.boundingBox.y,
          width: barcode.boundingBox.width,
          height: barcode.boundingBox.height
        } : undefined,
        timestamp: Date.now()
      };

      await this.handleScanResult(result);
      
      if (!this.config.continuous && this.config.autoStop) {
        this.stopScanning();
        break;
      }
    }
  }

  private async fallbackBarcodeDetection(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): Promise<void> {
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple pattern detection for common formats
    const patterns = this.detectSimplePatterns(imageData);
    
    for (const pattern of patterns) {
      const result: ScanResult = {
        format: pattern.format,
        rawValue: pattern.value,
        displayValue: pattern.value,
        isValid: pattern.isValid,
        confidence: pattern.confidence,
        timestamp: Date.now()
      };

      if (result.confidence > 0.7 && result.isValid) {
        await this.handleScanResult(result);
        
        if (!this.config.continuous && this.config.autoStop) {
          this.stopScanning();
          break;
        }
      }
    }
  }

  private detectSimplePatterns(imageData: ImageData): Array<{
    format: string;
    value: string;
    isValid: boolean;
    confidence: number;
  }> {
    // This is a simplified implementation
    // In a real-world scenario, you'd use a proper barcode detection library
    // like jsQR for QR codes or a comprehensive library like ZXing-js
    
    const results: Array<{
      format: string;
      value: string;
      isValid: boolean;
      confidence: number;
    }> = [];

    // For now, return empty array - would implement actual detection logic
    // or integrate with libraries like:
    // - jsQR for QR codes
    // - ZXing-js for multiple formats
    // - opencv.js for computer vision approach

    return results;
  }

  private validateBarcode(code: string, format: BarcodeFormat): boolean {
    if (!format.regex.test(code)) {
      return false;
    }

    if (format.checkDigit) {
      return format.checkDigit(code);
    }

    return true;
  }

  private static validateEAN13(code: string): boolean {
    if (code.length !== 13) return false;
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[12]);
  }

  private static validateEAN8(code: string): boolean {
    if (code.length !== 8) return false;
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(code[i]);
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(code[7]);
  }

  private async handleScanResult(result: ScanResult): Promise<void> {
    console.log('Barcode detected:', result);

    // Provide feedback
    if (this.config.beepOnScan) {
      this.playBeep();
    }

    if (this.config.vibrateOnScan && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Highlight result on canvas
    if (this.config.highlightResults && result.boundingBox) {
      this.highlightBarcodeOnCanvas(result.boundingBox);
    }

    // Notify listeners
    this.notifyScanListeners(result);

    // Store scan history
    this.addToScanHistory(result);
  }

  private playBeep() {
    try {
      // Create audio context for beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Failed to play beep sound:', error);
    }
  }

  private highlightBarcodeOnCanvas(boundingBox: { x: number; y: number; width: number; height: number }) {
    if (!this.context || !this.canvasElement) return;

    const ctx = this.context;
    
    // Save current context
    ctx.save();
    
    // Draw highlight rectangle
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    
    // Add corner markers
    const cornerSize = 20;
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(boundingBox.x, boundingBox.y + cornerSize);
    ctx.lineTo(boundingBox.x, boundingBox.y);
    ctx.lineTo(boundingBox.x + cornerSize, boundingBox.y);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(boundingBox.x + boundingBox.width - cornerSize, boundingBox.y);
    ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y);
    ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y + cornerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(boundingBox.x, boundingBox.y + boundingBox.height - cornerSize);
    ctx.lineTo(boundingBox.x, boundingBox.y + boundingBox.height);
    ctx.lineTo(boundingBox.x + cornerSize, boundingBox.y + boundingBox.height);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(boundingBox.x + boundingBox.width - cornerSize, boundingBox.y + boundingBox.height);
    ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height);
    ctx.lineTo(boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height - cornerSize);
    ctx.stroke();
    
    // Restore context
    ctx.restore();
    
    // Clear highlight after 2 seconds
    setTimeout(() => {
      if (this.context && this.videoElement) {
        this.context.clearRect(0, 0, this.canvasElement!.width, this.canvasElement!.height);
        this.context.drawImage(this.videoElement, 0, 0);
      }
    }, 2000);
  }

  private addToScanHistory(result: ScanResult) {
    try {
      const history = JSON.parse(localStorage.getItem('barcodeScanHistory') || '[]');
      history.unshift(result);
      
      // Limit history size
      if (history.length > 50) {
        history.splice(50);
      }
      
      localStorage.setItem('barcodeScanHistory', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save scan history:', error);
    }
  }

  public stopScanning(): void {
    this.isScanning = false;

    if (this.scanningInterval) {
      cancelAnimationFrame(this.scanningInterval);
      this.scanningInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    console.log('Barcode scanning stopped');
  }

  public async switchCamera(): Promise<void> {
    if (!this.isScanning) return;

    const currentFacingMode = this.getCurrentFacingMode();
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    // Stop current stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    // Start with new camera
    try {
      const constraints = this.buildCameraConstraints({ facingMode: newFacingMode });
      this.stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
      
      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.handleError(new Error(`Failed to switch camera: ${errorMessage}`));
    }
  }

  private getCurrentFacingMode(): 'user' | 'environment' {
    if (!this.stream) return 'environment';
    
    const videoTrack = this.stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    return settings.facingMode as 'user' | 'environment' || 'environment';
  }

  public async toggleFlashlight(): Promise<boolean> {
    if (!this.stream) return false;

    try {
      const videoTrack = this.stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      
      if ((capabilities as any).torch) {
        const settings = videoTrack.getSettings();
        const newTorchState = !(settings as any).torch;
        
        await videoTrack.applyConstraints({
          advanced: [{ torch: newTorchState } as any]
        });
        
        return newTorchState;
      }
    } catch (error) {
      console.error('Failed to toggle flashlight:', error);
    }
    
    return false;
  }

  // Event listeners
  public onScan(listener: (result: ScanResult) => void): () => void {
    this.scanListeners.add(listener);
    return () => this.scanListeners.delete(listener);
  }

  public onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notifyScanListeners(result: ScanResult) {
    this.scanListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Scan listener error:', error);
      }
    });
  }

  private handleError(error: Error) {
    console.error('Barcode scanner error:', error);
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error listener failed:', listenerError);
      }
    });
  }

  // Utility methods
  public getScanHistory(): ScanResult[] {
    try {
      return JSON.parse(localStorage.getItem('barcodeScanHistory') || '[]');
    } catch (error) {
      console.error('Failed to load scan history:', error);
      return [];
    }
  }

  public clearScanHistory(): void {
    localStorage.removeItem('barcodeScanHistory');
  }

  public updateConfiguration(updates: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...updates };
    localStorage.setItem('barcodeScannerConfig', JSON.stringify(this.config));
  }

  public getConfiguration(): ScannerConfig {
    return { ...this.config };
  }

  public getSupportedFormats(): BarcodeFormat[] {
    return Array.from(this.barcodeFormats.values());
  }

  public async checkCameraPermissions(): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch (error) {
      console.warn('Failed to check camera permissions:', error);
      return 'prompt';
    }
  }

  public async getCameraDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Failed to enumerate camera devices:', error);
      return [];
    }
  }

  // Cleanup
  public destroy(): void {
    this.stopScanning();
    this.scanListeners.clear();
    this.errorListeners.clear();
  }
}

// Barcode lookup and validation utilities
export class BarcodeValidator {
  private static productDatabases = {
    upc: 'https://api.upcitemdb.com/prod/trial/lookup',
    ean: 'https://opengtindb.org/',
    isbn: 'https://openlibrary.org/api/books'
  };

  public static async lookupProduct(barcode: string, format: string): Promise<any | null> {
    try {
      // Determine lookup strategy based on format
      let lookupUrl = '';
      
      if (format === 'ean_13' || format === 'ean_8') {
        // Use EAN database
        lookupUrl = `${this.productDatabases.ean}api/product/${barcode}`;
      } else if (format === 'code_128') {
        // Use UPC database
        lookupUrl = `${this.productDatabases.upc}?upc=${barcode}`;
      }

      if (!lookupUrl) return null;

      const response = await fetch(lookupUrl);
      if (response.ok) {
        const data = await response.json();
        return this.normalizeProductData(data, format);
      }
    } catch (error) {
      console.warn('Product lookup failed:', error);
    }
    
    return null;
  }

  private static normalizeProductData(data: any, format: string): any {
    // Normalize different API responses to consistent format
    return {
      name: data.title || data.name || data.product_name || 'Unknown Product',
      description: data.description || data.summary || '',
      brand: data.brand || data.manufacturer || '',
      category: data.category || '',
      imageUrl: data.image || data.images?.[0] || '',
      barcode: data.upc || data.ean || data.gtin || '',
      format
    };
  }

  public static generateRandomBarcode(format: string): string {
    switch (format) {
      case 'ean_13':
        return this.generateEAN13();
      case 'ean_8':
        return this.generateEAN8();
      case 'code_128':
        return this.generateCode128();
      default:
        return Math.random().toString(36).substr(2, 12).toUpperCase();
    }
  }

  private static generateEAN13(): string {
    // Generate 12 random digits
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    // Calculate check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
  }

  private static generateEAN8(): string {
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += Math.floor(Math.random() * 10);
    }
    
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(code[i]);
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
  }

  private static generateCode128(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 12; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

// Singleton instance
let barcodeScannerInstance: BarcodeScannerManager | null = null;

export function getBarcodeScanner(): BarcodeScannerManager {
  if (!barcodeScannerInstance) {
    barcodeScannerInstance = new BarcodeScannerManager();
  }
  return barcodeScannerInstance;
}

// Export for service worker use
export { BarcodeScannerManager };