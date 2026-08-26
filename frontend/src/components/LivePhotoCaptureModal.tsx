import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Upload, UserCheck, UserX } from 'lucide-react';
import { markAttendanceWithPhotosApi } from '../services/api';

interface LivePhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: {
    id: number | string;
    name: string;
    employeeCode?: string;
    siteName?: string;
  };
  type: 'SIGN_IN' | 'SIGN_OUT';
  onSuccess: () => void;
}

export const LivePhotoCaptureModal: React.FC<LivePhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  worker,
  type,
  onSuccess,
}) => {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'PRESENT' | 'HALF_DAY'>('PRESENT');
  const [remarks, setRemarks] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isCameraActive]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Webcam permission denied or not available:', err);
      setCameraError('Live webcam feed not accessible. Please use photo upload fallback below.');
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
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoDataUrl(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhotoDataUrl(null);
    startCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUrl(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!photoDataUrl) {
      alert('Please capture or upload a live profile picture first!');
      return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      await markAttendanceWithPhotosApi({
        workerId: Number(worker.id),
        date: todayStr,
        status: status,
        remarks: remarks || `${type === 'SIGN_IN' ? 'Sign-In' : 'Sign-Out'} live photo captured`,
        signInPhoto: type === 'SIGN_IN' ? photoDataUrl : undefined,
        signOutPhoto: type === 'SIGN_OUT' ? photoDataUrl : undefined,
        signInTime: type === 'SIGN_IN' ? nowIso : undefined,
        signOutTime: type === 'SIGN_OUT' ? nowIso : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${type === 'SIGN_IN' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'}`}>
              {type === 'SIGN_IN' ? <UserCheck className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Live Profile Photo {type === 'SIGN_IN' ? 'Sign-In' : 'Sign-Out'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Worker: <span className="font-semibold text-slate-700 dark:text-slate-200">{worker.name}</span> ({worker.employeeCode || `WRK-${worker.id}`})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Snapshot Viewfinder */}
        <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center mb-4 border border-slate-800 shadow-inner">
          {photoDataUrl ? (
            <img src={photoDataUrl} alt="Live Snapshot" className="w-full h-full object-cover" />
          ) : isCameraActive ? (
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          ) : (
            <div className="p-6 text-center text-slate-400 space-y-2">
              <Camera className="w-12 h-12 mx-auto text-slate-600 animate-pulse" />
              <p className="text-xs text-slate-400">{cameraError || 'Initializing live camera...'}</p>
            </div>
          )}

          {/* Live Camera Badge */}
          {isCameraActive && !photoDataUrl && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>LIVE CAMERA</span>
            </div>
          )}
        </div>

        {/* Action Controls for Photo Capture */}
        <div className="flex items-center justify-center space-x-3 mb-5">
          {!photoDataUrl && isCameraActive && (
            <button
              onClick={captureSnapshot}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl transition shadow-sm hover:shadow"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Photo</span>
            </button>
          )}

          {photoDataUrl && (
            <button
              onClick={retakePhoto}
              className="flex items-center space-x-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retake Photo</span>
            </button>
          )}

          <label className="cursor-pointer flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium px-4 py-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition">
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Presence Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="PRESENT">Full Day Present (2)</option>
                <option value="HALF_DAY">Half Day Present (1)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Assigned Site
              </label>
              <input
                type="text"
                disabled
                value={worker.siteName || 'Default Site'}
                className="w-full bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Agent Remarks / Note
            </label>
            <input
              type="text"
              placeholder="e.g. Arrived on time with safety gear..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !photoDataUrl}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition ${
                photoDataUrl
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25'
                  : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Live Photo...' : `Confirm ${type === 'SIGN_IN' ? 'Sign-In' : 'Sign-Out'}`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
