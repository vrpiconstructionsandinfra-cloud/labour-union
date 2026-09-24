import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface ProfileCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoDataUrl: string) => void;
}

export const ProfileCameraCaptureModal: React.FC<ProfileCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPreviewPhoto(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Webcam error:', err);
      setCameraError('Camera access denied or webcam not found. Please allow camera permissions in your browser or upload a file.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const size = Math.min(videoRef.current.videoWidth || 480, videoRef.current.videoHeight || 480);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Center square crop for a round profile image
      const startX = ((videoRef.current.videoWidth || size) - size) / 2;
      const startY = ((videoRef.current.videoHeight || size) - size) / 2;
      ctx.drawImage(videoRef.current, startX, startY, size, size, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setPreviewPhoto(dataUrl);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setPreviewPhoto(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (previewPhoto) {
      onCapture(previewPhoto);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop animate-fade-in" style={{ zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: '16px' }}>
      <div className="modal-dialog animate-scale-up" style={{ width: '100%', maxWidth: '480px', backgroundColor: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1.5px solid #E2E8F0' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Take Profile Photo</h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Capture live photo with your camera</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {cameraError ? (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px', color: '#DC2626', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Camera Unavailable:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#991B1B' }}>{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  style={{ marginTop: '10px', padding: '6px 12px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Retry Camera Access
                </button>
              </div>
            </div>
          ) : previewPhoto ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
              <div style={{ width: '220px', height: '220px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #4F46E5', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.15)' }}>
                <img src={previewPhoto} alt="Snapshot Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: '12.5px', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={16} /> Photo captured successfully!
              </span>
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '280px', backgroundColor: '#0F172A', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              
              {/* Overlay Frame */}
              <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', border: '2px dashed rgba(255, 255, 255, 0.7)', pointerEvents: 'none' }} />

              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0, 0, 0, 0.6)', border: 'none', color: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Switch Camera"
              >
                <RefreshCw size={13} />
                <span>Flip</span>
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 16px', borderRadius: '9px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Cancel
          </button>
          {previewPhoto ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                style={{ padding: '9px 16px', borderRadius: '9px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{ padding: '9px 20px', borderRadius: '9px', border: 'none', backgroundColor: '#4F46E5', color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)' }}
              >
                <Check size={16} />
                <span>Use Photo</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!isCameraActive}
              onClick={captureSnapshot}
              style={{ padding: '9px 22px', borderRadius: '9px', border: 'none', backgroundColor: isCameraActive ? '#4F46E5' : '#94A3B8', color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: isCameraActive ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: isCameraActive ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none' }}
            >
              <Camera size={16} />
              <span>Capture Snapshot</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
