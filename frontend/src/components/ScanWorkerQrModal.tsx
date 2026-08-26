import React, { useState, useRef, useEffect } from 'react';
import { QrCode, X, Camera, Upload, Search, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';
import { fetchWorkersApi } from '../services/api';
import type { WorkerItem } from '../types';

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
        videoRef.current.play();
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #E2E8F0' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#EFF6FF', color: '#2563EB', padding: '10px', borderRadius: '12px' }}>
              <QrCode size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Scan Worker QR Code
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Scan worker's digital ID to immediately mark attendance.
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div style={{ position: 'relative', backgroundColor: '#0F172A', borderRadius: '16px', overflow: 'hidden', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '2px solid #1E293B' }}>
          {isCameraActive ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {/* QR Target Frame Overlay */}
              <div style={{ position: 'absolute', width: '170px', height: '170px', border: '3px solid #2563EB', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '4px solid #60A5FA', borderLeft: '4px solid #60A5FA' }} />
                <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '4px solid #60A5FA', borderRight: '4px solid #60A5FA' }} />
                <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #60A5FA', borderLeft: '4px solid #60A5FA' }} />
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '4px solid #60A5FA', borderRight: '4px solid #60A5FA' }} />
              </div>
              <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: '#EF4444', color: '#FFF', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFF' }} />
                <span>LIVE SCANNER READY</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '20px' }}>
              <Camera size={44} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p style={{ fontSize: '12px', margin: 0 }}>{cameraError || 'Camera feed unavailable'}</p>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Pick Assigned Worker Selector */}
        {assignedWorkers.length > 0 && (
          <div style={{ marginBottom: '16px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '6px' }}>
              ⚡ Quick Select Assigned Worker for Attendance:
            </label>
            <select
              value={selectedWorkerId}
              onChange={(e) => handleSelectWorkerFromDropdown(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '13px', fontWeight: 700 }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
            Or Enter / Paste Worker Code or QR Payload:
          </label>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="e.g. WRK-760, WRK-005, or scan URL..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProcessPayload(manualCode)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}
            />
            <button
              type="button"
              onClick={() => handleProcessPayload(manualCode)}
              disabled={isSearching}
              style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Search size={15} />
              <span>{isSearching ? 'Scanning...' : 'Scan & Load'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
            <label style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={14} />
              <span>Upload Image File</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

