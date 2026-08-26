import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Clock, CheckCircle2, UploadCloud } from 'lucide-react';
import { markAttendanceApi, fetchSitesApi, fetchWorkerAttendanceApi, verifyFacePhotosApi } from '../services/api';
import type { WorkerItem, SiteItem } from '../types';
import { UserAvatar } from './UserAvatar';
import { calculateFaceMatchScore, validateSingleFacePhoto } from '../utils/faceMatcher';
import './MarkAttendanceModal.css';

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerItem | null;
  mode?: 'CHECK_IN' | 'CHECK_OUT' | 'FULL';
  onSuccess: () => void;
}


export const MarkAttendanceModal: React.FC<MarkAttendanceModalProps> = ({
  isOpen,
  onClose,
  worker,
  mode = 'CHECK_IN',
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [liveStatus, setLiveStatus] = useState<'LOADING' | 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'PRESENT' | 'ABSENT'>('NOT_CHECKED_IN');
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | string>('');
  
  // Status Code: 2 = Full Day, 1 = Half Day, 0 = Absent
  const [statusCode, setStatusCode] = useState<number>(2);

  // Time States
  const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const [checkInTime, setCheckInTime] = useState<string>(nowStr);
  const [checkOutTime, setCheckOutTime] = useState<string>('06:00 PM');

  // Photo Capture States
  const [checkInPhoto, setCheckInPhoto] = useState<string | null>(null);
  const [checkOutPhoto, setCheckOutPhoto] = useState<string | null>(null);
  const [activePhotoTarget, setActivePhotoTarget] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);

  // Camera stream states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Worker Detail States for Form
  const workerDailyWage = worker?.dailyWage || 850;
  const [dailyPay, setDailyPay] = useState<number>(workerDailyWage);
  const [isPayOverridden, setIsPayOverridden] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(true);
  const [matchMessage, setMatchMessage] = useState<string | null>(null);
  const [isMatchEvaluating, setIsMatchEvaluating] = useState<boolean>(false);
  const [checkInFaceValid, setCheckInFaceValid] = useState<boolean>(true);
  const [checkInFaceMessage, setCheckInFaceMessage] = useState<string | null>(null);

  // Evaluate human face detection on Check-In photo
  useEffect(() => {
    if (activeTab === 'CHECK_IN' && checkInPhoto) {
      setIsMatchEvaluating(true);
      validateSingleFacePhoto(checkInPhoto)
        .then((res) => {
          setCheckInFaceValid(res.hasFace);
          setCheckInFaceMessage(res.hasFace ? null : res.message);
          setIsMatchEvaluating(false);
        })
        .catch(() => {
          setCheckInFaceValid(false);
          setCheckInFaceMessage('⚠️ Photo format error. Please capture a clear human face photo.');
          setIsMatchEvaluating(false);
        });
    } else {
      setCheckInFaceValid(true);
      setCheckInFaceMessage(null);
    }
  }, [activeTab, checkInPhoto]);

  // Auto-load existing Check-In photo on open
  useEffect(() => {
    if (isOpen && worker) {
      const existingLog = (worker as any)?.attendanceLog || (worker as any)?.attendance;
      const existingCheckInPhoto = existingLog?.signInPhoto || existingLog?.checkInPhoto || existingLog?.checkInPhotoUrl;
      if (existingCheckInPhoto) {
        setCheckInPhoto(existingCheckInPhoto);
      }
    }
  }, [isOpen, worker]);

  // Compute DeepFace Photo Verification & Similarity Match Score on Check-Out
  useEffect(() => {
    if (activeTab === 'CHECK_OUT' && checkOutPhoto) {
      const refPhoto = checkInPhoto || (worker as any)?.avatar || (worker as any)?.profileImage || (worker as any)?.attendanceLog?.signInPhoto || (worker as any)?.attendanceLog?.checkInPhoto;
      if (refPhoto) {
        setIsMatchEvaluating(true);
        verifyFacePhotosApi(refPhoto, checkOutPhoto)
          .then((res) => {
            const data = res.data || res;
            if (data && data.success !== false) {
              setMatchScore(data.matchPercentage ?? (data.verified ? 95 : 20));
              setIsFaceDetected(true);
              setMatchMessage(data.message || (data.verified ? '✅ Faces matched' : '❌ Check-in and Check-out faces do not match'));
            } else {
              setMatchScore(0);
              setIsFaceDetected(false);
              setMatchMessage(data?.message || '❌ DeepFace face verification failed');
            }
            setIsMatchEvaluating(false);
          })
          .catch(() => {
            // Fallback to local face matcher if API call fails
            calculateFaceMatchScore(refPhoto, checkOutPhoto)
              .then((res) => {
                setMatchScore(res.score);
                setIsFaceDetected(res.faceDetectedInImg2);
                setMatchMessage(res.message);
                setIsMatchEvaluating(false);
              })
              .catch(() => {
                setMatchScore(0);
                setIsFaceDetected(false);
                setMatchMessage('⚠️ Photo verification error. Please capture a clear face photo.');
                setIsMatchEvaluating(false);
              });
          });
      } else {
        setMatchScore(null);
        setIsFaceDetected(true);
        setMatchMessage(null);
      }
    } else {
      setMatchScore(null);
      setIsFaceDetected(true);
      setMatchMessage(null);
    }
  }, [activeTab, checkInPhoto, checkOutPhoto, worker]);

  // Sync mode to activeTab on open and fetch live backend attendance status
  useEffect(() => {
    if (isOpen && worker) {
      const initialTab = mode === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN';
      setActiveTab(initialTab);
      setLiveStatus('LOADING');
      
      fetchSitesApi()
        .then((siteList) => {
          setSites(siteList);
          if (siteList.length > 0) {
            setSelectedSiteId((worker as any).siteId || (worker as any).assignedSiteId || siteList[0].id);
          }
        })
        .catch(() => {});

      const curTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const formatTimeHelper = (rawTime: any) => {
        if (!rawTime || rawTime === '—') return '';
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        return String(rawTime);
      };

      setDailyPay(worker.dailyWage || 850);

      // Fetch live attendance track for this worker from backend
      fetchWorkerAttendanceApi(worker.id)
        .then((logs: any[]) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const todayLog = Array.isArray(logs) ? logs.find((l: any) => {
            if (!l.date) return false;
            const logDateStr = new Date(l.date).toISOString().split('T')[0];
            return logDateStr === todayStr;
          }) : null;

          if (todayLog) {
            const hasCheckIn = !!(todayLog.signInTime || todayLog.checkInTime || todayLog.checkIn || todayLog.signInPhoto);
            const hasCheckOut = !!(todayLog.signOutTime || todayLog.checkOutTime || todayLog.checkOut || todayLog.signOutPhoto);
            const loadedCheckIn = formatTimeHelper(todayLog.signInTime || todayLog.checkInTime || todayLog.checkIn);
            const loadedCheckOut = formatTimeHelper(todayLog.signOutTime || todayLog.checkOutTime || todayLog.checkOut);

            if (loadedCheckIn) setCheckInTime(loadedCheckIn);
            else setCheckInTime(curTimeStr);

            if (loadedCheckOut) setCheckOutTime(loadedCheckOut);
            else setCheckOutTime('06:00 PM');

            if (todayLog.signInPhoto) setCheckInPhoto(todayLog.signInPhoto);
            if (todayLog.signOutPhoto) setCheckOutPhoto(todayLog.signOutPhoto);

            if (hasCheckIn && hasCheckOut) {
              setLiveStatus('PRESENT');
              setActiveTab('CHECK_OUT');
            } else if (hasCheckIn && !hasCheckOut) {
              setLiveStatus('CHECKED_IN');
              setActiveTab('CHECK_OUT');
            } else if (todayLog.status === 'ABSENT') {
              setLiveStatus('ABSENT');
              setActiveTab('CHECK_IN');
            } else {
              setLiveStatus('NOT_CHECKED_IN');
              setActiveTab('CHECK_IN');
            }
          } else {
            const existingLog = (worker as any)?.attendanceLog || (worker as any)?.attendance;
            const existingCheckIn = existingLog?.signInTime || existingLog?.checkInTime || existingLog?.checkIn;
            const existingCheckOut = existingLog?.signOutTime || existingLog?.checkOutTime || existingLog?.checkOut;
            const loadedCheckIn = formatTimeHelper(existingCheckIn);
            const loadedCheckOut = formatTimeHelper(existingCheckOut);

            if (loadedCheckIn) setCheckInTime(loadedCheckIn);
            else setCheckInTime(curTimeStr);

            if (loadedCheckOut) setCheckOutTime(loadedCheckOut);
            else setCheckOutTime('06:00 PM');

            if (existingCheckIn && existingCheckOut) {
              setLiveStatus('PRESENT');
              setActiveTab('CHECK_OUT');
            } else if (existingCheckIn && !existingCheckOut) {
              setLiveStatus('CHECKED_IN');
              setActiveTab('CHECK_OUT');
            } else {
              setLiveStatus('NOT_CHECKED_IN');
              setActiveTab(initialTab);
            }
          }
        })
        .catch(() => {
          setLiveStatus('NOT_CHECKED_IN');
          setActiveTab(initialTab);
        });
    }
  }, [isOpen, worker, mode]);

  // Recalculate Daily Pay based on status code
  useEffect(() => {
    if (!isPayOverridden && worker) {
      const baseWage = worker.dailyWage || 850;
      if (statusCode === 2) {
        setDailyPay(baseWage);
      } else if (statusCode === 1) {
        setDailyPay(Math.round(baseWage / 2));
      } else {
        setDailyPay(0);
      }
    }
  }, [statusCode, worker, isPayOverridden]);

  // Bind camera stream to DOM video element when camera turns active
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => console.warn('Video play error:', err));
    }
  }, [isCameraActive, activePhotoTarget]);

  // Camera Management
  const startCamera = async (target: 'CHECK_IN' | 'CHECK_OUT') => {
    setActivePhotoTarget(target);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Webcam not accessible. Click upload file below to select a photo.');
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
    if (!videoRef.current || !activePhotoTarget) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (activePhotoTarget === 'CHECK_IN') {
        setCheckInPhoto(dataUrl);
      } else {
        setCheckOutPhoto(dataUrl);
      }
      stopCamera();
      setActivePhotoTarget(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'CHECK_IN' | 'CHECK_OUT') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'CHECK_IN') {
          setCheckInPhoto(reader.result as string);
        } else {
          setCheckOutPhoto(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!worker) return;

    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isAgentRole = currentUser?.role === 'AGENT';
    const currentAgentId = currentUser?.id;

    if (isAgentRole && currentAgentId) {
      const workerAgentId = Number((worker as any).assignedAgentId || (worker as any).agentId || (worker as any).assignedAgent?.id);
      if (!workerAgentId || workerAgentId !== Number(currentAgentId)) {
        alert(`Access Denied: Worker ${worker.name} is unassigned or assigned to another agent. Only the assigned agent can mark attendance for this worker.`);
        return;
      }
    }

    if (activeTab === 'CHECK_IN') {
      if (!checkInPhoto) {
        alert('Check-In photo required: Please take or choose a worker face photo before submitting.');
        return;
      }
      if (!checkInFaceValid) {
        alert(checkInFaceMessage || 'Face Verification Failed: No human face detected in photo (glove, hand, wall, or object detected). Please capture a clear photo of the worker\'s face.');
        return;
      }
    }

    if (activeTab === 'CHECK_OUT') {
      const existingLog = (worker as any)?.attendanceLog || (worker as any)?.attendance;
      const refPhoto = checkInPhoto || existingLog?.signInPhoto || existingLog?.checkInPhoto;
      
      if (!refPhoto) {
        alert('Check-In photo required: Morning Check-In photo must be uploaded or captured before Check-Out can complete.');
        return;
      }

      if (!checkOutPhoto) {
        alert('Check-Out photo required: Please take or upload a Check-Out photo.');
        return;
      }

      if (matchScore !== null && (matchScore < 40 || !isFaceDetected)) {
        alert(matchMessage || `DeepFace Face Verification Failed: Check-Out photo similarity is ${matchScore}%. Check-Out photo does not match morning Check-In photo for ${worker.name}!`);
        return;
      }
      if (!isFaceDetected) {
        alert('DeepFace Verification Failed: No human face detected in Check-Out photo. Please capture a clear photo of the worker\'s face.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const isCheckIn = activeTab === 'CHECK_IN';
      const statusString = isCheckIn ? 'PRESENT' : statusCode === 2 ? 'PRESENT' : statusCode === 1 ? 'HALF_DAY' : 'ABSENT';
      const codeToSubmit = isCheckIn ? 2 : statusCode;

      const numericWorkerId = Number(String(worker.id).replace(/\D/g, '')) || Number(worker.id) || 1;

      await markAttendanceApi({
        workerId: numericWorkerId,
        date: todayStr,
        status: statusString,
        statusCode: codeToSubmit,
        checkInTime: checkInTime,
        checkOutTime: isCheckIn ? undefined : checkOutTime,
        checkInPhoto: checkInPhoto || undefined,
        checkOutPhoto: checkOutPhoto || undefined,
        siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
        dailyPay: Number(dailyPay),
        remarks: remarks || `Worker ${isCheckIn ? 'Check-In' : 'Check-Out'} recorded by Agent`
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !worker) return null;

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAgentRole = currentUser?.role === 'AGENT';
  const currentAgentId = currentUser?.id;
  const workerAgentId = Number((worker as any).assignedAgentId || (worker as any).agentId || (worker as any).assignedAgent?.id);
  const isUnassignedToThisAgent = isAgentRole && currentAgentId && (!workerAgentId || workerAgentId !== Number(currentAgentId));

  if (isUnassignedToThisAgent) {
    return (
      <div className="att-modal-backdrop" style={{ zIndex: 1200 }}>
        <div className="att-modal-card" style={{ maxWidth: '480px', width: '92%', borderRadius: '20px', padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '16px', padding: '24px', color: '#DC2626' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <X size={30} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 8px', color: '#991B1B' }}>
              Access Denied: Unassigned Worker
            </h3>
            <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.5, color: '#7F1D1D' }}>
              Worker <strong>{worker.name}</strong> ({worker.employeeCode || `WRK-${worker.id}`}) is unassigned or assigned to another field agent. Only the assigned agent (or Super Agent) can scan or mark attendance.
            </p>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Close & Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const workerCode = worker.employeeCode || `WRK-${String(worker.id).padStart(3, '0')}`;
  const currentPhoto = activeTab === 'CHECK_IN' ? checkInPhoto : checkOutPhoto;

  return (
    <div className="att-modal-backdrop">
      <div className="att-modal-card">
        
        {/* Header Bar matching Register New Worker */}
        <div className="att-header">
          <div className="att-header-title">
            <span>Mark Live Worker Attendance</span>
          </div>

          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="att-header-close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="att-modal-body">
          
          {/* Live Attendance Track Banner */}
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '10px',
              border:
                liveStatus === 'CHECKED_IN'
                  ? '1px solid #BFDBFE'
                  : liveStatus === 'PRESENT'
                  ? '1px solid #A7F3D0'
                  : liveStatus === 'ABSENT'
                  ? '1px solid #FCA5A5'
                  : '1px solid #E2E8F0',
              backgroundColor:
                liveStatus === 'CHECKED_IN'
                  ? '#EFF6FF'
                  : liveStatus === 'PRESENT'
                  ? '#ECFDF5'
                  : liveStatus === 'ABSENT'
                  ? '#FEF2F2'
                  : '#F8FAFC',
              color:
                liveStatus === 'CHECKED_IN'
                  ? '#1E40AF'
                  : liveStatus === 'PRESENT'
                  ? '#065F46'
                  : liveStatus === 'ABSENT'
                  ? '#991B1B'
                  : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800 }}>
                  {liveStatus === 'CHECKED_IN'
                    ? `STATUS: CHECKED IN (Active Shift)`
                    : liveStatus === 'PRESENT'
                    ? `STATUS: PRESENT (Shift Completed)`
                    : liveStatus === 'ABSENT'
                    ? `STATUS: ABSENT`
                    : `STATUS: NOT CHECKED IN (Pending)`}
                </div>
                <div style={{ fontSize: '11.5px', marginTop: '2px', opacity: 0.9 }}>
                  {liveStatus === 'CHECKED_IN'
                    ? `Checked in at ${checkInTime}. Complete shift check-out below.`
                    : liveStatus === 'PRESENT'
                    ? `Shift completed today. Check-In: ${checkInTime} | Check-Out: ${checkOutTime}`
                    : liveStatus === 'ABSENT'
                    ? `Worker is marked absent today.`
                    : `No check-in recorded today. Proceed with Check-In.`}
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Single-Mode Button (Check-In OR Check-Out OR Present) */}
          <div className="att-segment-tabs" style={{ marginBottom: '20px' }}>
            {liveStatus === 'PRESENT' ? (
              <button
                type="button"
                className="att-tab-btn active"
                style={{ width: '100%', cursor: 'default', justifyContent: 'center', backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Present — Shift Completed ({checkInTime} to {checkOutTime})</span>
              </button>
            ) : activeTab === 'CHECK_IN' ? (
              <button
                type="button"
                className="att-tab-btn active"
                style={{ width: '100%', cursor: 'default', justifyContent: 'center' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Check-In</span>
              </button>
            ) : (
              <button
                type="button"
                className="att-tab-btn active"
                style={{ width: '100%', cursor: 'default', justifyContent: 'center', backgroundColor: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' }}
              >
                <Clock className="w-4 h-4" />
                <span>Check-Out</span>
              </button>
            )}
          </div>

          {/* Worker Profile Photo (Camera or Gallery) Card matching Image */}
          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
              Worker Profile Photo (Camera or Gallery)
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {activeTab === 'CHECK_OUT' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Morning Check-In Reference Photo (Left) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #2563EB', position: 'relative' }}>
                      <img
                        src={checkInPhoto || (worker as any)?.avatar || (worker as any)?.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                        alt="Morning Check-In"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>
                      Check-In Photo
                    </span>
                  </div>

                  {/* VS Comparison Badge (Middle) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748B', backgroundColor: '#E2E8F0', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      VS
                    </span>
                  </div>

                  {/* Evening Check-Out Captured Photo (Right) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                      {checkOutPhoto ? (
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: !isFaceDetected || (matchScore !== null && matchScore < 20) ? '2px solid #EF4444' : '2px solid #059669', position: 'relative' }}>
                          <img src={checkOutPhoto} alt="Evening Check-Out" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => setCheckOutPhoto(null)}
                            style={{
                              position: 'absolute',
                              top: '0',
                              right: '0',
                              backgroundColor: '#EF4444',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px'
                            }}
                            title="Remove Photo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed #CBD5E1', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '18px' }}>
                          📷
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: '4px' }}>
                      Check-Out Photo
                    </span>
                  </div>
                </div>
              ) : (
                /* CHECK_IN Mode single avatar */
                <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                  {currentPhoto ? (
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #059669', position: 'relative' }}>
                      <img src={currentPhoto} alt="Worker Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => setCheckInPhoto(null)}
                        style={{
                          position: 'absolute',
                          top: '0',
                          right: '0',
                          backgroundColor: '#EF4444',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px'
                        }}
                        title="Remove Photo"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <UserAvatar src={worker.avatar || (worker as any).profileImage} name={worker.name} size={64} />
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept="image/*"
                    id="att-gallery-input"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileUpload(e, activeTab)}
                  />
                  <button
                    type="button"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#334155',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={() => document.getElementById('att-gallery-input')?.click()}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Choose from Gallery</span>
                  </button>

                  {!isCameraActive || activePhotoTarget !== activeTab ? (
                    <button
                      type="button"
                      style={{
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onClick={() => startCamera(activeTab)}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo (Camera)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      style={{
                        backgroundColor: '#64748B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      onClick={() => { stopCamera(); setActivePhotoTarget(null); }}
                    >
                      Close Camera
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: cameraError ? '#EF4444' : '#64748B', fontWeight: 500 }}>
                  {cameraError || 'Upload photo from phone device gallery or capture live using camera.'}
                </span>
              </div>
            </div>

            {/* Live Viewfinder Card */}
            {isCameraActive && activePhotoTarget === activeTab && (
              <div style={{ marginTop: '14px', backgroundColor: '#0F172A', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover', backgroundColor: '#000' }}
                />
                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    style={{ backgroundColor: '#059669', color: '#FFF', fontSize: '12px', fontWeight: 800, padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    onClick={captureSnapshot}
                  >
                    🔴 Take Snapshot Now
                  </button>
                  <button
                    type="button"
                    style={{ backgroundColor: '#475569', color: '#FFF', fontSize: '12px', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                    onClick={() => { stopCamera(); setActivePhotoTarget(null); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Check-In Face Validation Indicator */}
            {activeTab === 'CHECK_IN' && checkInPhoto && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: checkInFaceValid ? '#F0FDF4' : '#FEF2F2',
                  border: checkInFaceValid ? '1px solid #BBF7D0' : '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: checkInFaceValid ? '#15803D' : '#DC2626'
                    }}
                  >
                    {isMatchEvaluating
                      ? '⚡ Validating Human Face...'
                      : checkInFaceValid
                      ? '✓ Human Face Detected & Verified'
                      : checkInFaceMessage || '⚠️ Face Validation Failed: No human face detected in photo'}
                  </span>
                </div>
              </div>
            )}

            {/* Live DeepFace Photo Match Score Indicator for Check-Out */}
            {activeTab === 'CHECK_OUT' && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: matchScore !== null && matchScore >= 40 && isFaceDetected ? '#F0FDF4' : matchScore !== null ? '#FEF2F2' : '#FFFBEB',
                  border: matchScore !== null && matchScore >= 40 && isFaceDetected ? '1px solid #BBF7D0' : matchScore !== null ? '1px solid #FECACA' : '1px solid #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: matchScore !== null && matchScore >= 40 && isFaceDetected ? '#15803D' : matchScore !== null ? '#DC2626' : '#B45309'
                    }}
                  >
                    {isMatchEvaluating
                      ? '⚡ Running DeepFace Verification...'
                      : checkOutPhoto
                      ? matchMessage || (matchScore !== null && matchScore >= 40 ? '✅ Faces matched' : '⚠️ DeepFace Verification Failed: Face Mismatch')
                      : 'ℹ️ Capture Check-Out photo to run DeepFace verification against morning Check-In photo'}
                  </span>
                </div>
                {matchScore !== null && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: matchScore >= 40 ? '#22C55E' : '#EF4444',
                      color: '#FFF'
                    }}
                  >
                    DeepFace: {matchScore}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Form Fields matching Register New Worker Layout */}

          {/* Worker Full Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Worker Full Name *
            </label>
            <input
              type="text"
              readOnly
              value={worker.name}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#0F172A', fontWeight: 700, fontSize: '13px' }}
            />
          </div>

          {/* Email Address */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Email Address *
            </label>
            <input
              type="email"
              readOnly
              value={worker.email || `${worker.name.toLowerCase().replace(/\s+/g, '.')}@laborunion.com`}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#475569', fontSize: '13px' }}
            />
          </div>

          {/* 2-Column Row: Employee Code | Skill / Designation */}
          <div className="att-form-row-2col">
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Employee Code *
              </label>
              <input
                type="text"
                readOnly
                value={workerCode}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#0F172A', fontWeight: 700, fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Skill / Designation
              </label>
              <input
                type="text"
                readOnly
                value={worker.designation || 'Electrician'}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#334155', fontSize: '13px', fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Assigned Working Site Dropdown */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Assigned Working Site
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '13px', fontWeight: 600 }}
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.siteName} ({site.city || 'Site'})
                </option>
              ))}
            </select>
          </div>

          {/* 2-Column Row: That Day Pay | Time */}
          <div className="att-form-row-2col">
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                That Day Pay (₹) <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>Rate: ₹{worker.dailyWage || 850}/day</span>
              </label>
              <input
                type="number"
                value={dailyPay}
                onChange={(e) => {
                  setDailyPay(Number(e.target.value));
                  setIsPayOverridden(true);
                }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontWeight: 800, fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {activeTab === 'CHECK_IN' ? 'Check-In Time *' : 'Check-Out Time *'}
              </label>
              <input
                type="text"
                value={activeTab === 'CHECK_IN' ? checkInTime : checkOutTime}
                onChange={(e) => activeTab === 'CHECK_IN' ? setCheckInTime(e.target.value) : setCheckOutTime(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#059669', fontWeight: 800, fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Check-Out Mode: Status Code selection */}
          {activeTab === 'CHECK_OUT' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Presence Status Code (1 for Half Day, 2 for Full Day)
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setStatusCode(2); setIsPayOverridden(false); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: statusCode === 2 ? '2px solid #059669' : '1px solid #CBD5E1',
                    backgroundColor: statusCode === 2 ? '#ECFDF5' : '#FFFFFF',
                    color: statusCode === 2 ? '#047857' : '#475569',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  2 - Full Day Present
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusCode(1); setIsPayOverridden(false); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: statusCode === 1 ? '2px solid #D97706' : '1px solid #CBD5E1',
                    backgroundColor: statusCode === 1 ? '#FEF3C7' : '#FFFFFF',
                    color: statusCode === 1 ? '#B45309' : '#475569',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  1 - Half Day Present
                </button>
              </div>
            </div>
          )}

          {/* Remarks / Field Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              Field Remarks / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Shift completed safely. Work verified."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '13px' }}
            />
          </div>

          {/* Footer Action Buttons matching Register Worker */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            {liveStatus === 'PRESENT' ? (
              <button
                type="button"
                disabled
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'not-allowed',
                  opacity: 0.9,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Present (Shift Completed)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 24px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {isSubmitting
                  ? 'Saving...'
                  : activeTab === 'CHECK_IN'
                  ? 'Save Check-In'
                  : 'Save Check-Out'}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
