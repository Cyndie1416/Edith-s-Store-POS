import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { QrCodeScanner } from '@mui/icons-material';
import { BrowserMultiFormatReader } from '@zxing/library';

const BarcodeScanner = ({ 
  open, 
  onClose, 
  onScan, 
  title = "Barcode Scanner",
  description = "Point your camera at a barcode to scan.",
  showAlert = false,
  alertMessage = ""
}) => {
  // Component version for debugging
  console.log('BarcodeScanner version 1.6.0 loaded at:', new Date().toISOString());
  console.log('🔧 Enhanced debugging and fallback mechanisms');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const codeReader = useRef(null);
  const streamRef = useRef(null);
  const scanningIntervalRef = useRef(null);
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');

  // Enhanced cleanup function
  const stopScanner = () => {
    console.log('🛑 Stopping barcode scanner...');
    setIsScanning(false);
    setIsLoading(false);
    setScanAttempts(0);
    setDebugInfo('');
    
    // Clear scanning interval
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
      scanningIntervalRef.current = null;
    }
    
    // Stop the code reader
    if (codeReader.current) {
      try {
        codeReader.current.reset();
        codeReader.current = null;
        console.log('✅ Code reader stopped');
      } catch (err) {
        console.warn('Warning: Error stopping code reader:', err);
      }
    }
    
    // Stop the video stream
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          track.stop();
          console.log('✅ Video track stopped:', track.kind);
        });
        streamRef.current = null;
        console.log('✅ Video stream stopped');
      } catch (err) {
        console.warn('Warning: Error stopping video stream:', err);
      }
    }
    
    // Clear video element
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Force reload to clear any cached video
        console.log('✅ Video element cleared');
      } catch (err) {
        console.warn('Warning: Error clearing video element:', err);
      }
    }
  };

  useEffect(() => {
    if (open) {
      console.log('🚀 Starting barcode scanner...');
      startScanner();
    } else {
      console.log('🛑 Barcode scanner dialog closed, stopping scanner...');
      stopScanner();
    }

    // Cleanup on unmount or when open changes
    return () => {
      console.log('🧹 Cleanup: Stopping scanner on unmount/change');
      stopScanner();
    };
  }, [open]);

  // Additional cleanup when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, ensuring camera is stopped');
      stopScanner();
    };
  }, []);

  const startScanner = () => {
    if (!open) {
      console.log('❌ Scanner not started: dialog not open');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setDebugInfo('Initializing scanner...');
    
    // Stop any existing scanner first
    stopScanner();
    
    // Simplified camera access check - allow for localhost and local network IPs
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLocalNetwork = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
    const isSecureContext = window.location.protocol === 'https:';
    
    // Check if mediaDevices is available
    console.log('🔍 Checking mediaDevices availability:');
    console.log('  navigator.mediaDevices:', !!navigator.mediaDevices);
    console.log('  navigator.mediaDevices.getUserMedia:', !!navigator.mediaDevices?.getUserMedia);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('❌ mediaDevices not available');
      setError('Camera access is not available. This feature requires HTTPS or localhost.');
      setIsLoading(false);
      return;
    }
    
    // Try to access camera directly - let the browser handle the security
    console.log('🎯 Attempting direct camera access...');
    setDebugInfo('Requesting camera access...');
    
    console.log('✅ mediaDevices is available');
    
    // Debug logging
    console.log('Camera access check:', {
      hostname,
      protocol: window.location.protocol,
      isSecureContext,
      isLocalhost,
      isLocalNetwork,
      willAllowCamera: isSecureContext || isLocalhost || isLocalNetwork
    });
    
    // Create new code reader instance
    try {
      codeReader.current = new BrowserMultiFormatReader();
      console.log('✅ Code reader created successfully');
      setDebugInfo('Code reader initialized, requesting camera...');
    } catch (err) {
      console.error('❌ Failed to create code reader:', err);
      setError('Failed to initialize barcode scanner. Please refresh the page and try again.');
      setIsLoading(false);
      return;
    }
    
    // Try different camera configurations
    const cameraConfigs = [
      {
        facingMode: 'environment',
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        aspectRatio: { ideal: 16/9 }
      },
      {
        facingMode: 'environment',
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 }
      },
      {
        facingMode: 'user',
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 }
      }
    ];
    
    const tryCameraConfig = (configIndex = 0) => {
      if (configIndex >= cameraConfigs.length) {
        setError('Failed to access camera with any configuration. Please check camera permissions.');
        setIsLoading(false);
        return;
      }
      
      const config = cameraConfigs[configIndex];
      console.log(`🎥 Trying camera config ${configIndex + 1}:`, config);
      setDebugInfo(`Trying camera configuration ${configIndex + 1}...`);
      
      navigator.mediaDevices.getUserMedia({ video: config })
        .then(stream => {
          if (!open) {
            // Dialog was closed while getting camera access
            console.log('❌ Dialog closed while getting camera access, stopping stream');
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          
          streamRef.current = stream;
          setIsScanning(true);
          setIsLoading(false);
          setDebugInfo('Camera active, starting scan...');
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              console.log('✅ Video metadata loaded, starting scan...');
              setDebugInfo('Video ready, scanning for barcodes...');
              // Start scanning immediately when video is ready
              if (open && isScanning) {
                console.log('🚀 Starting barcode scanning...');
                // Add a small delay to ensure video is fully playing
                setTimeout(() => {
                  if (open && isScanning) {
                    scanBarcode();
                  }
                }, 500);
              }
            };
            videoRef.current.onplay = () => {
              console.log('▶️ Video started playing, ensuring scan is active...');
              setDebugInfo('Video playing, scanning active...');
              // Ensure scanning is active when video plays
              if (open && isScanning && codeReader.current) {
                setTimeout(() => {
                  if (open && isScanning) {
                    console.log('🔄 Ensuring scan is active...');
                    scanBarcode();
                  }
                }, 1000);
              }
            };
            videoRef.current.onerror = (err) => {
              console.error('❌ Video error:', err);
              setError('Video stream error. Please try again.');
              setIsLoading(false);
            };
          }
          console.log('✅ Camera access granted and video stream started');
        })
        .catch(err => {
          console.error(`Camera access error with config ${configIndex + 1}:`, err);
          if (configIndex < cameraConfigs.length - 1) {
            // Try next configuration
            setTimeout(() => tryCameraConfig(configIndex + 1), 500);
          } else {
            // All configurations failed
            setIsScanning(false);
            setIsLoading(false);
            if (err.name === 'NotAllowedError') {
              setError('Camera access denied. Please allow camera permissions and try again.');
            } else if (err.name === 'NotFoundError') {
              setError('No camera found. Please connect a camera and try again.');
            } else if (err.name === 'NotSupportedError') {
              setError('Camera access is not supported in this browser.');
            } else {
              setError('Failed to access camera. Please check camera permissions and try again.');
            }
          }
        });
    };
    
    // Start with first configuration
    tryCameraConfig();
  };

  const scanBarcode = () => {
    if (!codeReader.current || !videoRef.current || !open || !isScanning) {
      console.log('❌ Cannot start scanning: missing dependencies or scanner stopped');
      console.log('  codeReader:', !!codeReader.current);
      console.log('  videoRef:', !!videoRef.current);
      console.log('  open:', open);
      console.log('  isScanning:', isScanning);
      return;
    }

    console.log('🔍 Starting barcode scanning...');
    setDebugInfo('Scanning for barcodes...');
    
    try {
      // Use a more robust scanning approach
      codeReader.current.decodeFromVideoDevice(
        null, // Use default camera
        videoRef.current,
        (result, err) => {
          if (result && open && isScanning) {
            console.log('✅ Barcode detected:', result.text);
            console.log('Barcode format:', result.format);
            setDebugInfo(`Detected: ${result.text} (${result.format})`);
            onScan(result.text);
            // Stop scanning after successful scan
            stopScanner();
          }
          if (err) {
            if (err.name !== 'NotFoundException') {
              console.error('Scanning error:', err);
              setScanAttempts(prev => prev + 1);
              
              // Update debug info with error count
              setDebugInfo(`Scanning... (attempts: ${scanAttempts + 1})`);
              
              // If too many errors, show a helpful message
              if (scanAttempts > 10) {
                setError('Having trouble detecting barcodes. Try adjusting the lighting or barcode position.');
              }
            }
          }
        }
      );
      
      console.log('✅ Video device scanning started');
      
      // Also try continuous scanning with canvas
      startContinuousScanning();
      
    } catch (err) {
      console.error('❌ Error starting barcode scan:', err);
      setError('Failed to start barcode scanning. Please try again.');
    }
  };

  const startContinuousScanning = () => {
    if (!canvasRef.current || !videoRef.current || !isScanning) {
      console.log('❌ Cannot start continuous scanning: missing dependencies');
      return;
    }
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    console.log('🎨 Starting continuous canvas scanning...');
    
    const scanFrame = () => {
      if (!isScanning || !open) {
        console.log('🛑 Continuous scanning stopped');
        return;
      }
      
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Try to decode from canvas
        codeReader.current.decodeFromCanvas(canvas, (result, err) => {
          if (result && open && isScanning) {
            console.log('✅ Barcode detected from canvas:', result.text);
            setDebugInfo(`Canvas detected: ${result.text}`);
            onScan(result.text);
            stopScanner();
          }
        });
        
        // Continue scanning
        if (isScanning && open) {
          scanningIntervalRef.current = setTimeout(scanFrame, 100); // Scan every 100ms
        }
      } catch (err) {
        console.warn('Canvas scanning error:', err);
        // Continue scanning even if there's an error
        if (isScanning && open) {
          scanningIntervalRef.current = setTimeout(scanFrame, 200);
        }
      }
    };
    
    // Start continuous scanning
    scanFrame();
  };

  const handleClose = () => {
    console.log('🛑 Barcode scanner dialog closing...');
    stopScanner();
    setManualInput('');
    setShowManualInput(false);
    setError('');
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      handleClose();
    }
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    setError('');
  };

  const retryScanner = () => {
    console.log('🔄 Retrying scanner...');
    setError('');
    setScanAttempts(0);
    setDebugInfo('');
    startScanner();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeScanner />
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        {showAlert && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button 
              size="small" 
              onClick={retryScanner} 
              sx={{ ml: 1 }}
              disabled={isLoading}
            >
              Retry
            </Button>
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        
        {showManualInput ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" color="primary" sx={{ mb: 2, textAlign: 'center' }}>
              📝 Manual Barcode Input
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Since camera access isn't available on this network, please enter the barcode manually:
            </Typography>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter barcode number..."
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #1976d2',
                borderRadius: '8px',
                fontSize: '18px',
                textAlign: 'center',
                backgroundColor: '#f5f5f5'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualSubmit();
                }
              }}
              autoFocus
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Press Enter to submit
            </Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', width: '100%', height: '300px', border: '2px dashed #ccc', borderRadius: 1, overflow: 'hidden' }}>
            {isLoading && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                zIndex: 10
              }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Starting camera...
                </Typography>
              </Box>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '100px',
              border: '2px solid #1976d2',
              borderRadius: 1,
              pointerEvents: 'none',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)'
            }} />
            {isScanning && (
              <Box sx={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                🔍 Scanning...
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              right: '10px',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              Position barcode within the blue frame
            </Typography>
          </Box>
        )}
        
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={toggleManualInput} variant="text" color="primary">
          {showManualInput ? 'Try Camera' : 'Manual Input'}
        </Button>
        {showManualInput && (
          <Button onClick={handleManualSubmit} variant="contained" color="primary" disabled={!manualInput.trim()}>
            Scan Barcode
          </Button>
        )}
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
