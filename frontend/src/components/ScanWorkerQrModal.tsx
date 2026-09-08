import React, { useState, useRef, useEffect } from 'react';
import { QrCode, X, Camera, Upload, Search, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import jsQR from 'jsqr';
import { fetchWorkersApi } from '../services/api';
import type { WorkerItem } from '../types';
import './ScanWorkerQrModal.css';

interface ScanWorkerQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkerScanned: (worker: WorkerItem) => void;
}

export const ScanWorkerQrModal: React.FC<ScanWorkerQrModalProps> = ({
  isOpen,
  onClose,
  onWorkerScanned,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [assignedWorkers, setAssignedWorkers] = useState<WorkerItem[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setManualCode('');
      setSelectedWorkerId('');
      
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const isAgentRole = currentUser?.role === 'AGENT';
      const currentAgentId = currentUser?.id;

      fetchWorkersApi()
        .then((wList) => {
          if (isAgentRole && currentAgentId) {
            const filtered = wList.filter(
              (w: any) => Number(w.assignedAgentId || w.agentId || w.assignedAgent?.id) === Number(currentAgentId)
            );
            setAssignedWorkers(filtered);
          } else {
            setAssignedWorkers(wList);
          }
        })
        .catch(() => {});
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
      scanCameraLoop();
    } else {
      if (scanAnimationFrameRef.current) {
        cancelAnimationFrame(scanAnimationFrameRef.current);
      }
    }
  }, [isCameraActive]);

  const scanCameraLoop = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          stopCamera();
          handleProcessPayload(code.data);
          return;
        }
      }
    }
    scanAnimationFrameRef.current = requestAnimationFrame(scanCameraLoop);
  };

  const startCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('QR camera error:', err);
      setCameraError('Webcam feed not accessible. Use QR image upload or worker selector below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanAnimationFrameRef.current) {
      cancelAnimationFrame(scanAnimationFrameRef.current);
      scanAnimationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleProcessPayload = async (rawPayload: string) => {
    const cleanPayload = (rawPayload || '').trim();
    if (!cleanPayload) {
      setErrorMessage('Please enter or scan a valid Worker ID or Employee Code.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);

    try {
      let parsedWorkerId: string | null = null;
      let parsedCode: string | null = null;

      // 1. Try parsing Web Verification URL parameter or JSON QR Payload
      if (cleanPayload.includes('http') || cleanPayload.includes('verifyWorkerId') || cleanPayload.includes('?')) {
        try {
          const url = new URL(cleanPayload);
          parsedWorkerId = url.searchParams.get('verifyWorkerId') || url.searchParams.get('workerId') || url.searchParams.get('id');
          parsedCode = url.searchParams.get('code') || url.searchParams.get('employeeCode');
        } catch {
          const matchVerify = cleanPayload.match(/verifyWorkerId=([^&]+)/) || cleanPayload.match(/workerId=([^&]+)/);
          const matchId = cleanPayload.match(/[?&]id=([^&]+)/);
          const matchCode = cleanPayload.match(/[?&]code=([^&]+)/);
          if (matchVerify) parsedWorkerId = matchVerify[1];
          else if (matchId) parsedWorkerId = matchId[1];
          if (matchCode) parsedCode = matchCode[1];
        }
      }

      if (!parsedWorkerId && !parsedCode) {
        try {
          const json = JSON.parse(cleanPayload);
          if (json.workerId || json.id) parsedWorkerId = String(json.workerId || json.id);
          if (json.employeeCode || json.code) parsedCode = String(json.employeeCode || json.code);
        } catch {
          // Plain text entry
          parsedCode = cleanPayload;
          parsedWorkerId = cleanPayload.replace(/\D/g, '') || null;
        }
      }

      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const isAgentRole = currentUser?.role === 'AGENT';
      const currentAgentId = currentUser?.id;

      const allWorkers = await fetchWorkersApi();
      const matched = allWorkers.find((w: any) => {
        const wIdStr = String(w.id);
        const wCodeNorm = (w.employeeCode || `WRK-${String(w.id).padStart(3, '0')}`).toLowerCase();
        const rawNorm = cleanPayload.toLowerCase();

        return (
          (parsedWorkerId && wIdStr === String(parsedWorkerId)) ||
          (parsedCode && wCodeNorm === String(parsedCode).toLowerCase()) ||
          wCodeNorm === rawNorm ||
          w.name.toLowerCase() === rawNorm ||
          w.name.toLowerCase().includes(rawNorm)
        );
      });

      if (matched) {
        // Enforce strict assigned agent restriction for AGENT role users
        if (isAgentRole && currentAgentId) {
          const workerAgentId = Number((matched as any).assignedAgentId || (matched as any).agentId || (matched as any).assignedAgent?.id);
          if (!workerAgentId || workerAgentId !== Number(currentAgentId)) {
            setErrorMessage(
              `🚫 Access Denied: Worker ${matched.name} (${matched.employeeCode || `WRK-${matched.id}`}) is unassigned or assigned to another agent. Only the assigned agent can scan attendance for this worker.`
            );
            return;
          }
        }

        stopCamera();
        onWorkerScanned(matched);
        onClose();
      } else {
        setErrorMessage(`No registered worker found matching code "${cleanPayload}". Please select assigned worker from dropdown below.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process scanned QR code');
    } finally {
      setIsSearching(false);
    }
  };

  // Decode uploaded image file using jsQR canvas pixel extraction
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearching(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            setManualCode(code.data);
            handleProcessPayload(code.data);
            return;
          }
        }

        // Fallback: If image QR code didn't parse via canvas, check filename for worker code or ID
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const matchWorkerCode = nameWithoutExt.match(/(WRK-\d+|WRK\d+|\d+)/i);
        if (matchWorkerCode) {
          handleProcessPayload(matchWorkerCode[0]);
        } else {
          setErrorMessage(`Could not read QR code from image "${file.name}". Please select assigned worker below or scan with camera.`);
          setIsSearching(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectWorkerFromDropdown = (wId: string) => {
    setSelectedWorkerId(wId);
    if (!wId) return;
    const matched = assignedWorkers.find((w) => String(w.id) === String(wId));
    if (matched) {
      stopCamera();
      onWorkerScanned(matched);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="qr-modal-backdrop">
      <div className="qr-modal-card">
        
        {/* Header */}
        <div className="qr-modal-header">
          <div className="qr-modal-header-left">
            <div className="qr-modal-icon-badge">
              <QrCode size={22} />
            </div>
            <div>
              <h3 className="qr-modal-title">Scan Worker QR Code</h3>
              <p className="qr-modal-subtitle">Scan digital ID or quick-select assigned worker</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { stopCamera(); onClose(); }}
            className="qr-modal-close-btn"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="qr-modal-body">

          {/* Viewfinder Area */}
          <div className="qr-viewfinder-container">
            {isCameraActive ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="qr-video-stream" />
                {/* QR Target Frame Overlay */}
                <div className="qr-target-overlay">
                  <div className="qr-corner top-left" />
                  <div className="qr-corner top-right" />
                  <div className="qr-corner bottom-left" />
                  <div className="qr-corner bottom-right" />
                  <div className="qr-scanline" />
                </div>
                <div className="qr-live-pill">
                  <span className="qr-live-dot" />
                  <span>LIVE SCANNER READY</span>
                </div>
              </>
            ) : (
              <div className="qr-camera-placeholder">
                <Camera size={38} style={{ opacity: 0.6 }} />
                <p>{cameraError || 'Camera feed inactive'}</p>
                <button
                  type="button"
                  className="qr-retry-btn"
                  onClick={startCamera}
                >
                  <RefreshCw size={13} />
                  <span>Start Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="qr-error-alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Pick Assigned Worker Selector */}
          {assignedWorkers.length > 0 && (
            <div className="qr-quick-select-card">
              <label className="qr-quick-label">
                <Zap size={13} color="#EA580C" />
                <span>Quick Select Assigned Worker:</span>
              </label>
              <select
                value={selectedWorkerId}
                onChange={(e) => handleSelectWorkerFromDropdown(e.target.value)}
                className="qr-quick-select"
              >
                <option value="">-- Choose Assigned Worker --</option>
                {assignedWorkers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.employeeCode || `WRK-${w.id}`}) — {w.designation || 'Worker'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual Payload / Code Input Section */}
          <div className="qr-manual-card">
            <label className="qr-manual-label">
              Or Enter Worker Code / QR Payload:
            </label>

            <div className="qr-manual-row">
              <input
                type="text"
                placeholder="e.g. WRK-760, WRK-005, or URL..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProcessPayload(manualCode)}
                className="qr-manual-input"
              />
              <button
                type="button"
                onClick={() => handleProcessPayload(manualCode)}
                disabled={isSearching}
                className="qr-scan-load-btn"
              >
                <Search size={15} />
                <span>{isSearching ? 'Loading...' : 'Scan & Load'}</span>
              </button>
            </div>

            <div className="qr-action-footer">
              <label className="qr-upload-label">
                <Upload size={14} />
                <span>Upload QR Image</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>

              <button
                type="button"
                onClick={() => { stopCamera(); onClose(); }}
                className="qr-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
