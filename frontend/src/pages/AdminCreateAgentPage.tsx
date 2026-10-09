import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  ArrowLeft,
  Briefcase,
  Mail,
  Lock,
  Phone,
  User,
  Building2,
  IndianRupee,
  Loader2,
  Camera,
  UploadCloud,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Shield,
  MapPin,
  Sparkles,
  Info,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { adminCreateAgentApi, fetchSitesApi, fetchAgentsApi } from '../services/api';
import { initiateRazorpayCheckout } from '../utils/razorpay';
import { getAgentRegistrationFee } from '../services/wageConfigService';
import type { SiteItem, AgentItem } from '../types';
import './CreateAdminPage.css';

const DEFAULT_AGENT_DESIGNATIONS = [
  'Field Supervisor',
  'Senior Site Coordinator',
  'Labor Inspector',
  'Safety & Compliance Officer',
  'Assistant Project Coordinator',
];

interface AdminCreateAgentPageProps {
  adminId?: string | number;
  adminName?: string;
  onBack: () => void;
  onSuccess: (newAgent?: any) => void;
}

export const AdminCreateAgentPage: React.FC<AdminCreateAgentPageProps> = ({
  adminId,
  adminName,
  onBack,
  onSuccess,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Agent@123');
  const [confirmPassword, setConfirmPassword] = useState('Agent@123');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [designation, setDesignation] = useState('Field Supervisor');
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');
  const [salary, setSalary] = useState('45000');
  const [siteId, setSiteId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');

  // Registration Fee & Razorpay Payment
  const [registrationFee, setRegistrationFee] = useState<string>(() => {
    try {
      return String(getAgentRegistrationFee() || 1000);
    } catch {
      return '1000';
    }
  });
  const [collectRegistrationFee, setCollectRegistrationFee] = useState(true);

  // Camera capture state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status & Validation
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [existingAgents, setExistingAgents] = useState<AgentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [createdAgent, setCreatedAgent] = useState<any | null>(null);

  // Load sites & auto-generate employee code
  useEffect(() => {
    fetchSitesApi()
      .then((data) => setSites(data || []))
      .catch(() => {});

    fetchAgentsApi()
      .then((agents) => {
        setExistingAgents(agents || []);
        let maxNum = 0;
        (agents || []).forEach((ag) => {
          if (ag.employeeCode) {
            const match = ag.employeeCode.match(/AGT-(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          }
        });
        setEmployeeCode(`AGT-${String(maxNum + 1).padStart(3, '0')}`);
      })
      .catch(() => {
        setEmployeeCode(`AGT-${Date.now().toString().slice(-3)}`);
      });

    return () => {
      stopCamera();
    };
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size cannot exceed 5MB. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfileImage(event.target?.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = async (facingOverride?: 'user' | 'environment' | any) => {
    try {
      setIsCameraActive(true);
      const facing = (facingOverride === 'user' || facingOverride === 'environment') ? facingOverride : cameraFacingMode;
      if (facingOverride === 'user' || facingOverride === 'environment') {
        setCameraFacingMode(facingOverride);
      }
      stopCamera();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: facing } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch {
      setIsCameraActive(false);
      setErrorMessage('Unable to access camera. Please allow camera permissions or upload an image file.');
    }
  };

  const toggleCamera = () => {
    const nextFacing = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setProfileImage(dataUrl);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setConfirmPassword(res);
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Agent Full Name is required.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && existingAgents.some((a) => a.email?.toLowerCase() === cleanEmail)) {
      setErrorMessage(`An agent with email "${cleanEmail}" is already registered. Please use another email.`);
      return;
    }

    if (password && password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const regFeeNum = collectRegistrationFee ? Number(registrationFee) || 0 : 0;
    if (collectRegistrationFee && (isNaN(regFeeNum) || regFeeNum < 0)) {
      setErrorMessage('Please enter a valid registration fee amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalDesignation = (isCustomDesignation ? customDesignation.trim() : designation.trim()) || 'Field Supervisor';
      let razorpayPaymentId: string | undefined = undefined;
      let razorpayOrderId: string | undefined = undefined;

      // Execute Razorpay Standard Checkout if registration fee > 0
      if (collectRegistrationFee && regFeeNum > 0) {
        try {
          const rzpResult = await initiateRazorpayCheckout({
            amount: regFeeNum,
            isINR: true,
            currency: 'INR',
            name: 'Labor Union System',
            description: `Field Agent Registration Fee (${finalDesignation}) - Code: ${employeeCode}`,
            prefill: {
              name: name.trim(),
              email: cleanEmail || undefined,
              contact: phone.trim() || undefined,
            },
            notes: {
              employeeCode: employeeCode.trim(),
              designation: finalDesignation,
              role: 'AGENT',
              adminId: String(adminId || ''),
            },
            themeColor: '#2563EB',
          });

          razorpayPaymentId = rzpResult.payment_id || (rzpResult as any).razorpay_payment_id;
          razorpayOrderId = rzpResult.order_id || (rzpResult as any).razorpay_order_id;
        } catch (paymentErr: any) {
          setIsSubmitting(false);
          setErrorMessage(paymentErr.message || 'Razorpay registration payment failed or was cancelled. Field agent was not registered.');
          return;
        }
      }

      const fullAddress = [address, city, state, pincode].filter(Boolean).join(', ');

      // Add & register agent in backend system ONLY after verified payment
      const res = await adminCreateAgentApi({
        adminId: adminId ? Number(adminId) : undefined,
        name: name.trim(),
        email: cleanEmail || undefined,
        password: password || undefined,
        phone: phone.trim() || undefined,
        employeeCode: employeeCode.trim() || undefined,
        designation: finalDesignation,
        siteId: siteId ? Number(siteId) : undefined,
        salary: salary ? Number(salary) : 45000,
        profileImage: profileImage || undefined,
        address: fullAddress || undefined,
        registrationAmount: regFeeNum,
        paymentMethod: regFeeNum > 0 ? 'RAZORPAY' : 'WAIVED',
        razorpayPaymentId,
        razorpayOrderId,
      });

      setCreatedAgent(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment completed, but failed to register field agent. Please contact system support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('Agent@123');
    setConfirmPassword('Agent@123');
    setPhone('');
    setProfileImage('');
    stopCamera();
    setSiteId('');
    setAddress('');
    setCity('');
    setState('');
    setPincode('');
    setSalary('45000');
    setDesignation('Field Supervisor');
    setIsCustomDesignation(false);
    setCustomDesignation('');
    setRegistrationFee(String(getAgentRegistrationFee() || 1000));
    setCollectRegistrationFee(true);
    setCreatedAgent(null);
    setErrorMessage(null);
    setEmployeeCode(`AGT-${Date.now().toString().slice(-3)}`);
  };

  const selectedSite = sites.find((s) => String(s.id) === String(siteId));
  const effectiveDesignation = isCustomDesignation ? (customDesignation.trim() || 'Field Supervisor') : designation;

  // Success view
  if (createdAgent) {
    return (
      <div className="create-admin-page animate-fade-in">
        <div className="create-admin-success-wrap animate-scale-up" style={{ maxWidth: '640px', margin: '40px auto' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '26px',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.25)',
              margin: '0 auto',
            }}
          >
            <CheckCircle2 size={44} />
          </div>

          <h2 style={{ margin: '20px 0 6px', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Field Agent Successfully Registered!
          </h2>
          <p style={{ margin: '0 auto 24px', fontSize: '14.5px', color: 'var(--text-secondary)', maxWidth: '480px' }}>
            <strong>{createdAgent.name}</strong> has been registered after successful payment verification and assigned under your administration.
          </p>

          <div
            style={{
              width: '100%',
              background: 'var(--bg-main, #F8FAFC)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Agent ID:</span>
              <strong style={{ color: '#0F172A' }}>{createdAgent.employeeCode || `AGT-${createdAgent.id}`}</strong>
            </div>
            {createdAgent.email && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Login Email:</span>
                <strong style={{ color: '#0F172A' }}>{createdAgent.email}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Designation:</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{createdAgent.designation || 'Field Supervisor'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Assigned Site:</span>
              <span style={{ color: '#2563EB', fontWeight: 700 }}>
                {createdAgent.site?.siteName || selectedSite?.siteName || 'Unassigned / Roving'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Monthly Salary:</span>
              <span style={{ color: '#16A34A', fontWeight: 700 }}>
                ₹{(createdAgent.salary || Number(salary) || 45000).toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Registration Fee:</span>
              <span style={{ color: '#16A34A', fontWeight: 700 }}>
                ₹{(createdAgent.registrationAmount || Number(registrationFee) || 1000).toLocaleString('en-IN')} Paid (Razorpay)
              </span>
            </div>
            {createdAgent.razorpayPaymentId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Razorpay Payment ID:</span>
                <code style={{ color: '#1E40AF', fontWeight: 700, background: '#DBEAFE', padding: '2px 8px', borderRadius: '4px' }}>
                  {createdAgent.razorpayPaymentId}
                </code>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '6px', borderTop: '1px dashed var(--border-color, #E2E8F0)' }}>
              <span style={{ color: '#64748B' }}>Supervising Administrator:</span>
              <strong style={{ color: '#1E293B' }}>{adminName || 'Your Jurisdiction'}</strong>
            </div>
          </div>

          {/* Temporary Credentials & Security Notice */}
          <div
            style={{
              width: '100%',
              background: '#EFF6FF',
              border: '1.5px solid #93C5FD',
              borderRadius: '14px',
              padding: '16px 20px',
              textAlign: 'left',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🔐</span>
              <strong style={{ color: '#1E40AF', fontSize: '14.5px' }}>
                Temporary Login Credentials (First-Time Security Policy Active)
              </strong>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #BFDBFE',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '13.5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Username / ID:</span>
                <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                  {createdAgent.email || createdAgent.employeeCode}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Temporary Password:</span>
                <strong style={{ color: '#2563EB', fontFamily: 'monospace', fontSize: '14px' }}>
                  {password}
                </strong>
              </div>
            </div>

            <div
              style={{
                fontSize: '12.5px',
                color: '#1E40AF',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>🛡️</span>
              <span>
                <strong>First-Time Password Change Required:</strong> Upon signing in with this temporary password, the agent will be automatically prompted to set their own permanent password before gaining dashboard access.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn-primary-admin"
              style={{ background: '#2563EB', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
              onClick={() => onSuccess(createdAgent)}
            >
              <ArrowLeft size={16} />
              <span>Back to Field Agents</span>
            </button>
            <button
              className="btn-primary-admin"
              style={{
                background: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
              }}
              onClick={() => {
                sessionStorage.setItem('prefill_login_identifier', createdAgent.email || createdAgent.employeeCode || '');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                window.location.href = '/#login';
                window.location.reload();
              }}
            >
              <span>Go to Login with Temp Credentials</span>
              <ArrowRight size={16} />
            </button>
            <button
              className="btn-secondary-admin"
              onClick={resetForm}
              style={{ padding: '10px 20px' }}
            >
              <Plus size={16} />
              <span>Register Another Agent</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-admin-page animate-fade-in">
      {/* Header & Breadcrumb */}
      <div>
        <button
          type="button"
          className="create-admin-back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={15} />
          <span>Back to Super Admin Portal</span>
        </button>

        <div className="create-admin-header">
          <div className="create-admin-title-wrap">
            <h1>
              <span className="create-admin-title-icon" style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                <Users size={22} />
              </span>
              <span>Register Field Agent</span>
            </h1>
            <p>
              Onboard a field supervisor reporting directly under {adminName ? <strong>{adminName}</strong> : 'your administration'}. They supervise labor crews and record daily site attendance.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          className="animate-shake"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            padding: '14px 18px',
            borderRadius: '12px',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Info size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form Layout */}
      <form onSubmit={handleSubmit} className="create-admin-layout">
        {/* Left Form Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Agent Identification & Profile Photo */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div className="create-admin-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <User size={18} />
              </div>
              <div>
                <h3>Agent Identity & Photo</h3>
                <p>Personal profile and official verification picture</p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            {/* Camera Box if active */}
            {isCameraActive && (
              <div className="admin-camera-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', padding: '0 4px', width: '100%' }}>
                  <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>
                    {cameraFacingMode === 'environment' ? '📷 Back Camera (Rear)' : '👤 Front Camera'}
                  </span>
                  <button
                    type="button"
                    onClick={toggleCamera}
                    style={{ backgroundColor: '#1E293B', color: '#38BDF8', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={11} />
                    <span>Flip</span>
                  </button>
                </div>
                <video ref={videoRef} autoPlay playsInline muted />
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="admin-photo-btn primary"
                    onClick={capturePhoto}
                  >
                    <Check size={14} />
                    <span>Capture Photo</span>
                  </button>
                  <button
                    type="button"
                    className="admin-photo-btn"
                    onClick={toggleCamera}
                    style={{ backgroundColor: '#2563EB', color: '#FFF' }}
                  >
                    <RefreshCw size={12} />
                    <span>{cameraFacingMode === 'user' ? 'Back Camera' : 'Front Camera'}</span>
                  </button>
                  <button
                    type="button"
                    className="admin-photo-btn"
                    onClick={stopCamera}
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {/* Profile Photo Upload / Preview */}
            <div className="admin-photo-section">
              <div className="admin-photo-preview">
                {profileImage ? (
                  <img src={profileImage} alt="Agent Preview" />
                ) : (
                  <div className="admin-photo-placeholder">
                    <User size={26} />
                    <span>NO PHOTO</span>
                  </div>
                )}
              </div>

              <div className="admin-photo-actions-wrap">
                <div>
                  <h4 className="admin-photo-title">Field Supervisor Photo</h4>
                  <p className="admin-photo-subtitle">
                    Upload portrait or capture photo via live camera for ID card generation.
                  </p>
                </div>

                <div className="admin-photo-btns">
                  <button
                    type="button"
                    className="admin-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={14} />
                    <span>{profileImage ? 'Change Photo' : 'Upload Image'}</span>
                  </button>

                  {!isCameraActive && (
                    <button
                      type="button"
                      className="admin-photo-btn"
                      onClick={startCamera}
                    >
                      <Camera size={14} />
                      <span>Snap Photo</span>
                    </button>
                  )}

                  {profileImage && (
                    <button
                      type="button"
                      className="admin-photo-btn danger"
                      onClick={() => setProfileImage('')}
                      title="Remove photo"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="create-admin-grid-2">
              <div className="create-admin-field">
                <label>
                  <span>Agent Full Name</span>
                  <span className="req">*</span>
                </label>
                <div className="create-admin-input-wrap">
                  <User className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh K. Patil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Employee Code</span>
                  <button
                    type="button"
                    onClick={() => setEmployeeCode(`AGT-${Date.now().toString().slice(-4)}`)}
                    title="Generate new ID"
                    style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: 0 }}
                  >
                    <RefreshCw size={14} />
                  </button>
                </label>
                <div className="create-admin-input-wrap">
                  <Briefcase className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. AGT-102"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="create-admin-grid-2">
              <div className="create-admin-field">
                <label>
                  <span>Designation / Title</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCustomDesignation) {
                        setIsCustomDesignation(false);
                        setDesignation(DEFAULT_AGENT_DESIGNATIONS.includes(designation) ? designation : 'Field Supervisor');
                      } else {
                        setIsCustomDesignation(true);
                        setCustomDesignation(DEFAULT_AGENT_DESIGNATIONS.includes(designation) ? '' : designation);
                        setDesignation('');
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0',
                      textDecoration: 'underline',
                    }}
                  >
                    {isCustomDesignation ? '← Select from list' : '+ Custom Designation'}
                  </button>
                </label>

                {isCustomDesignation ? (
                  <div className="create-admin-input-wrap">
                    <Briefcase className="create-admin-input-icon" size={17} />
                    <input
                      type="text"
                      placeholder="Type custom designation (e.g. Senior Site Lead)"
                      value={customDesignation}
                      onChange={(e) => {
                        setCustomDesignation(e.target.value);
                        setDesignation(e.target.value);
                      }}
                      autoFocus
                      className="has-actions"
                      autoComplete="off"
                    />
                    <div className="create-admin-input-actions">
                      <button
                        type="button"
                        className="create-admin-input-btn"
                        onClick={() => {
                          setIsCustomDesignation(false);
                          setDesignation(DEFAULT_AGENT_DESIGNATIONS.includes(designation) ? designation : 'Field Supervisor');
                        }}
                        title="Switch back to list"
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#2563EB',
                          background: '#EFF6FF',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        List
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="create-admin-input-wrap">
                    <Briefcase className="create-admin-input-icon" size={17} />
                    <select
                      value={DEFAULT_AGENT_DESIGNATIONS.includes(designation) ? designation : '__CUSTOM__'}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomDesignation(true);
                          setCustomDesignation('');
                          setDesignation('');
                        } else {
                          setDesignation(e.target.value);
                        }
                      }}
                    >
                      <optgroup label="Standard Designations">
                        {DEFAULT_AGENT_DESIGNATIONS.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Custom Option">
                        <option value="__CUSTOM__">✏️ + Add Custom Designation...</option>
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Phone Number</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Phone className="create-admin-input-icon" size={17} />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Portal Login Credentials */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div className="create-admin-card-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Lock size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>Field Portal Access Credentials</h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    Encrypted Auth
                  </span>
                </div>
                <p style={{ margin: '4px 0 0' }}>Credentials used by the agent to log in and record labor attendance</p>
              </div>
            </div>

            <div className="create-admin-field">
              <label>
                <span>Login Email Address</span>
              </label>
              <div className="create-admin-input-wrap">
                <Mail className="create-admin-input-icon" size={17} />
                <input
                  type="email"
                  placeholder="agent@domain.com (Leave blank for default code login)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="create-admin-grid-2">
              <div className="create-admin-field">
                <label>
                  <span>Initial Password</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Lock className="create-admin-input-icon" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Defaults to Agent@123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="has-actions"
                  />
                  <div className="create-admin-input-actions">
                    <button
                      type="button"
                      className="create-admin-input-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
                      className="create-admin-input-btn"
                      onClick={handleGeneratePassword}
                      title="Generate strong password"
                    >
                      <RefreshCw size={15} />
                    </button>
                    {password && (
                      <button
                        type="button"
                        className="create-admin-input-btn"
                        onClick={handleCopyPassword}
                        title="Copy password"
                      >
                        {copiedPassword ? <Check size={15} color="#16A34A" /> : <Copy size={15} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Confirm Password</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Lock className="create-admin-input-icon" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Site Assignment & Remuneration */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div className="create-admin-card-icon" style={{ background: '#F3E8FF', color: '#9333EA' }}>
                <Building2 size={18} />
              </div>
              <div>
                <h3>Working Site & Remuneration</h3>
                <p>Assign jurisdiction construction site and monthly compensation</p>
              </div>
            </div>

            <div className="create-admin-grid-2">
              <div className="create-admin-field">
                <label>
                  <span>Initial Working Site</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Building2 className="create-admin-input-icon" size={17} />
                  <select
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                  >
                    <option value="">-- Unassigned / Multi-Site Roving --</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.siteName} ({site.siteCode}) • {site.city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Monthly Remuneration (₹)</span>
                </label>
                <div className="create-admin-input-wrap">
                  <IndianRupee className="create-admin-input-icon" size={17} />
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="45000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="create-admin-field">
              <label>
                <span>Territory / Office Address</span>
              </label>
              <div className="create-admin-input-wrap">
                <MapPin className="create-admin-input-icon" size={17} />
                <input
                  type="text"
                  placeholder="e.g. Site Office #2, East Wing"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="create-admin-grid-3">
              <div className="create-admin-field">
                <label><span>City</span></label>
                <div className="create-admin-input-wrap">
                  <MapPin className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. Pune"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="create-admin-field">
                <label><span>State</span></label>
                <div className="create-admin-input-wrap">
                  <MapPin className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
              </div>

              <div className="create-admin-field">
                <label><span>Pincode</span></label>
                <div className="create-admin-input-wrap">
                  <MapPin className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. 411057"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Agent Onboarding Fee & Online Payment Gateway */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div className="create-admin-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <CreditCard size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0 }}>Agent Registration Fee & Onboarding Payment</h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#DCFCE7',
                      color: '#16A34A',
                      padding: '2px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    Razorpay Online Gateway
                  </span>
                </div>
                <p style={{ margin: '4px 0 0' }}>One-time registration fee required before agent credentials and portal access are issued</p>
              </div>
            </div>

            <div className="create-admin-grid-2">
              <div className="create-admin-field">
                <label>
                  <span>Registration Amount (₹)</span>
                  <span className="req">*</span>
                </label>
                <div className="create-admin-input-wrap">
                  <IndianRupee className="create-admin-input-icon" size={17} />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="1000"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                    required
                  />
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Standard union onboarding fee for supervising field agent profile.
                </span>
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Payment Gateway</span>
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-main, #F8FAFC)',
                    border: '1.5px solid #2563EB',
                    height: '42px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="#2563EB" />
                    <strong style={{ fontSize: '13.5px', color: '#1E40AF' }}>Razorpay Payment Gateway</strong>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', background: '#DBEAFE', padding: '2px 8px', borderRadius: '6px' }}>
                    Instant Verification
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                  Supports UPI (GPay, PhonePe, Paytm), Netbanking, Credit & Debit Cards.
                </span>
              </div>
            </div>

            {/* Payment Banner Note */}
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '20px' }}>🔒</div>
              <div style={{ fontSize: '12.5px', color: '#1E40AF', lineHeight: 1.45 }}>
                <strong>Payment Protection:</strong> Clicking below will launch the official Razorpay Checkout modal. The field agent will <strong>only be registered and added to your portal after successful payment verification</strong>.
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="create-admin-actions">
            <button
              type="button"
              className="btn-secondary-admin"
              onClick={onBack}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-admin"
              disabled={isSubmitting}
              style={{
                background: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 26px',
                fontSize: '14.5px',
                fontWeight: 700,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Payment & Registering...</span>
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  <span>Pay ₹{Number(registrationFee || 1000).toLocaleString('en-IN')} & Register Field Agent</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Sidebar: Live Preview Card */}
        <div>
          <div className="create-admin-preview-card animate-fade-in">
            <div className="preview-badge-row">
              <span className="preview-role-pill">
                <Shield size={12} /> Supervised Agent
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.04em' }}>
                {employeeCode || 'AGT-NEW'}
              </span>
            </div>

            <div className="preview-avatar-center">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Avatar"
                  className="preview-avatar-img"
                />
              ) : (
                <div className="preview-avatar-circle">
                  {name ? name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', wordBreak: 'break-word' }}>
                  {name || 'Agent Full Name'}
                </h3>
                <span style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '2px', display: 'inline-block' }}>
                  {effectiveDesignation}
                </span>
              </div>
            </div>

            <div className="preview-details-list">
              <div className="preview-detail-row">
                <span className="preview-detail-label">Assigned Site:</span>
                <span className="preview-detail-value" style={{ color: selectedSite ? '#38BDF8' : '#94A3B8' }}>
                  {selectedSite?.siteName || 'Unassigned / Roving'}
                </span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Reporting Admin:</span>
                <span className="preview-detail-value" style={{ color: '#F1F5F9' }}>
                  {adminName || 'Jurisdiction Admin'}
                </span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Remuneration:</span>
                <span className="preview-detail-value" style={{ color: '#34D399', fontWeight: 700 }}>
                  ₹{Number(salary || 45000).toLocaleString('en-IN')}/mo
                </span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Registration Fee:</span>
                <span className="preview-detail-value" style={{ color: '#60A5FA', fontWeight: 700 }}>
                  ₹{Number(registrationFee || 1000).toLocaleString('en-IN')} (Razorpay)
                </span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Contact:</span>
                <span className="preview-detail-value">
                  {phone || 'Not provided'}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: '6px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '12px',
                color: '#94A3B8',
                lineHeight: 1.45,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA', fontWeight: 700, marginBottom: '4px' }}>
                <Sparkles size={13} />
                <span>Field Powers & Authority</span>
              </div>
              Supervises labor crews, issues attendance logs, and reports progress directly to this administration portal.
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
