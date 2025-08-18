import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert
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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const codeReader = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      stopScanner();
    }

    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, [open]);

  const startScanner = () => {
    if (!open) return;
    
    codeReader.current = new BrowserMultiFormatReader();
    
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            scanBarcode();
          };
        }
      })
      .catch(err => {
        console.error('Camera access error:', err);
        setError('Failed to access camera. Please check camera permissions.');
      });
  };

  const scanBarcode = () => {
    if (!codeReader.current || !videoRef.current) return;

    codeReader.current.decodeFromVideoDevice(
      null,
      videoRef.current,
      (result, err) => {
        if (result) {
          console.log('Barcode detected:', result.text);
          onScan(result.text);
        }
        if (err && err.name !== 'NotFoundException') {
          console.error('Scanning error:', err);
        }
      }
    );
  };

  const stopScanner = () => {
    // Stop the code reader
    if (codeReader.current) {
      codeReader.current.reset();
      codeReader.current = null;
    }
    
    // Stop the video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
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
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Box sx={{ position: 'relative', width: '100%', height: '300px', border: '2px dashed #ccc', borderRadius: 1, overflow: 'hidden' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
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
            pointerEvents: 'none'
          }} />
        </Box>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BarcodeScanner;
