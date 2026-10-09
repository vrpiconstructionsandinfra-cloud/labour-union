import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Shield,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Briefcase,
  IndianRupee,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserPlus,
  Users,
  Search,
  Building2,
  ExternalLink,
  X,
  Camera,
  UploadCloud,
  Trash2,
  Image as ImageIcon,
  Receipt,
  CreditCard
} from 'lucide-react';
import { createAdminApi, fetchAgentsApi, fetchAdminsApi } from '../services/api';
import type { AgentItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { getAdminRegistrationFee, fetchWageConfigApi } from '../services/wageConfigService';
import { initiateRazorpayCheckout } from '../utils/razorpay';
import './CreateAdminPage.css';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Delhi NCR',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const DEFAULT_DESIGNATIONS = [
  'Regional Administrator',
  'Area Project Director',
  'Senior Operations Manager',
  'Zonal Construction Lead',
];

interface CreateAdminPageProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAdminPortal?: (adminId: string | number) => void;
  onSuccess?: () => void;
}

export const CreateAdminPage: React.FC<CreateAdminPageProps> = ({
  onNavigateTab,
  onOpenAdminPortal,
  onSuccess
}) => {
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [designation, setDesignation] = useState('Regional Administrator');
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [customDesignation, setCustomDesignation] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isCustomState, setIsCustomState] = useState(false);
  const [customState, setCustomState] = useState('');
  const [pincode, setPincode] = useState('');
  const [salary, setSalary] = useState('65000');
  const [adminRegFee, setAdminRegFee] = useState<number>(getAdminRegistrationFee());
  const [collectRegFee, setCollectRegFee] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'DIRECT_PAID' | 'BANK_TRANSFER' | 'CASH_OFFLINE' | 'WAIVED'>('DIRECT_PAID');

  // Agent Assignment State
  const [availableAgents, setAvailableAgents] = useState<AgentItem[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Status & Validation
  const [existingAdmins, setExistingAdmins] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<any | null>(null);

  // Auto-generate employee code on load
  useEffect(() => {
    fetchAdminsApi()
      .then((admins) => {
        setExistingAdmins(admins || []);
        let maxNum = 0;
        (admins || []).forEach((a) => {
          if (a.employeeCode) {
            const match = a.employeeCode.match(/ADM-(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
            }
          }
        });
        setEmployeeCode(`ADM-${String(maxNum + 1).padStart(3, '0')}`);
      })
      .catch(() => {
        setEmployeeCode(`ADM-${Date.now().toString().slice(-3)}`);
      });

    // Load agents for optional initial assignment
    setIsLoadingAgents(true);
    fetchAgentsApi()
      .then((agents) => {
        const fieldAgents = (agents || []).filter(
          (a) => (a as any).role !== 'CUSTOMER_SUPPORT'
        );
        setAvailableAgents(fieldAgents);
      })
      .catch(() => {})
      .finally(() => setIsLoadingAgents(false));

    fetchWageConfigApi().then((cfg) => {
      if (cfg && typeof cfg.adminRegistrationFee === 'number') {
        setAdminRegFee(cfg.adminRegistrationFee);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
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
          audio: false
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

  const handleToggleAgent = (agentId: number) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Full Name is required.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('A valid login email address is required.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required for administrator login.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (existingAdmins.some((a) => a.email?.toLowerCase() === cleanEmail)) {
      setErrorMessage(`An administrator with email "${cleanEmail}" is already registered. Please use another email address.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const fullAddress = [address, city, state, pincode].filter(Boolean).join(', ');
      const effectiveRegFee = collectRegFee ? Number(adminRegFee) || 0 : 0;
      const effectivePaymentMethod = effectiveRegFee > 0 ? paymentMethod : 'WAIVED';

      let razorpayPaymentId: string | undefined = undefined;
      let razorpayOrderId: string | undefined = undefined;

      const finalDesignation = (isCustomDesignation ? customDesignation.trim() : designation.trim()) || 'Regional Administrator';

      const isOnlinePayment = collectRegFee && effectiveRegFee > 0 && effectivePaymentMethod === 'DIRECT_PAID';

      // Execute Razorpay Standard Checkout if registration fee is applicable
      if (isOnlinePayment) {
        try {
          const rzpResult = await initiateRazorpayCheckout({
            amount: effectiveRegFee,
            isINR: true,
            currency: 'INR',
            name: 'Labor Union System',
            description: `Area Administrator Onboarding Fee (${finalDesignation}) - ID: ${employeeCode}`,
            prefill: {
              name: name.trim(),
              email: cleanEmail,
              contact: phone.trim() || undefined,
            },
            notes: {
              employeeCode: employeeCode.trim(),
              designation: finalDesignation,
              role: 'ADMIN',
            },
            themeColor: '#2563EB',
          });

          razorpayPaymentId = rzpResult.payment_id || (rzpResult as any).razorpay_payment_id;
          razorpayOrderId = rzpResult.order_id || (rzpResult as any).razorpay_order_id;
        } catch (paymentErr: any) {
          setIsSubmitting(false);
          setErrorMessage(paymentErr.message || 'Razorpay registration payment failed or was cancelled.');
          return;
        }
      }

      // Add & register administrator in backend system after verified payment
      const newAdmin = await createAdminApi({
        name: name.trim(),
        email: cleanEmail,
        password,
        phone: phone.trim() || undefined,
        employeeCode: employeeCode.trim() || undefined,
        designation: finalDesignation,
        address: fullAddress || undefined,
        salary: salary ? Number(salary) : 65000,
        profileImage: profileImage || undefined,
        agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
        registrationAmount: effectiveRegFee,
        paymentMethod: effectivePaymentMethod,
        razorpayPaymentId,
        razorpayOrderId,
      });

      // Update existing admins list in state
      setExistingAdmins((prev) => [...prev, newAdmin]);
      // Display registration confirmation & receipt screen
      setCreatedAdmin(newAdmin);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment completed, but failed to create administrator. Please contact system support.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhone('');
    setProfileImage('');
    stopCamera();
    setAddress('');
    setCity('');
    setState('');
    setIsCustomState(false);
    setCustomState('');
    setIsCustomDesignation(false);
    setCustomDesignation('');
    setDesignation('Regional Administrator');
    setPincode('');
    setAdminRegFee(getAdminRegistrationFee());
    setCollectRegFee(true);
    setPaymentMethod('DIRECT_PAID');
    setSelectedAgentIds([]);
    setAgentSearch('');
    setCreatedAdmin(null);
    setErrorMessage(null);
  };

  const filteredAgents = availableAgents.filter((a) => {
    const q = agentSearch.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.employeeCode && a.employeeCode.toLowerCase().includes(q)) ||
      (a.assignedSite && a.assignedSite.toLowerCase().includes(q))
    );
  });

  // Success Confirmation Screen
  if (createdAdmin) {
    return (
      <div className="create-admin-page animate-fade-in">
        <div
          className="create-admin-card"
          style={{
            maxWidth: '680px',
            margin: '40px auto',
            padding: '36px',
            textAlign: 'center',
            alignItems: 'center',
          }}
        >
          {createdAdmin.profileImage ? (
            <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto' }}>
              <img
                src={createdAdmin.profileImage}
                alt={createdAdmin.name}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '24px',
                  objectFit: 'cover',
                  border: '3px solid #22C55E',
                  boxShadow: '0 8px 24px rgba(22, 163, 74, 0.25)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#16A34A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF',
                }}
              >
                <CheckCircle2 size={16} />
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '24px',
                background: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(22, 163, 74, 0.2)',
              }}
            >
              <CheckCircle2 size={40} />
            </div>
          )}

          <h2 style={{ margin: '16px 0 6px', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Administrator Successfully Created!
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '14.5px', color: 'var(--text-secondary)', maxWidth: '480px' }}>
            <strong>{createdAdmin.name}</strong> has been enrolled as an Area Administrator. They can now log in and monitor field agents under their jurisdiction.
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
              <span style={{ color: '#64748B' }}>Admin ID:</span>
              <strong style={{ color: '#0F172A' }}>{createdAdmin.employeeCode || `ADM-${createdAdmin.id}`}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Login Email:</span>
              <strong style={{ color: '#0F172A' }}>{createdAdmin.email}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Designation:</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{createdAdmin.designation || 'Regional Administrator'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Assigned Agents:</span>
              <span style={{ color: '#2563EB', fontWeight: 700 }}>
                {selectedAgentIds.length} Field Agent{selectedAgentIds.length === 1 ? '' : 's'} Assigned
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Registration Fee:</span>
              <span style={{ color: adminRegFee === 0 ? '#16A34A' : '#0F172A', fontWeight: 600 }}>
                {adminRegFee === 0 ? 'Free / Waived' : `₹${adminRegFee.toLocaleString('en-IN')}`}
              </span>
            </div>
            {createdAdmin.razorpayPaymentId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Razorpay Payment ID:</span>
                <code style={{ color: '#1E293B', background: '#E2E8F0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>
                  {createdAdmin.razorpayPaymentId}
                </code>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '4px', borderTop: '1px dashed var(--border-color, #E2E8F0)' }}>
              <span style={{ color: '#64748B' }}>Portal Credentials:</span>
              <span style={{ color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✉️ Temporary (Password Change Enforced)</span>
              </span>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '10px',
              padding: '12px 16px',
              textAlign: 'left',
              fontSize: '13px',
              color: '#1E40AF',
              lineHeight: 1.5,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '18px' }}>📬</span>
            <span>
              Credentials with temporary password and direct login link have been dispatched to <strong>{createdAdmin.email}</strong>. The admin will be prompted to set a permanent password upon first login.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              className="btn-secondary-admin"
              onClick={() => {
                if (onSuccess) {
                  onSuccess();
                } else if (onNavigateTab) {
                  onNavigateTab('admins');
                }
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Super Admins</span>
            </button>

            {onOpenAdminPortal && (
              <button
                className="btn-primary-admin"
                style={{ background: '#2563EB', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => {
                  if (onSuccess) onSuccess();
                  onOpenAdminPortal(createdAdmin.id);
                }}
              >
                <ExternalLink size={16} />
                <span>Open {createdAdmin.name}'s Portal</span>
              </button>
            )}

            <button
              className="btn-secondary-admin"
              onClick={resetForm}
            >
              <UserPlus size={16} />
              <span>Add Another Super Admin</span>
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
          onClick={() => onNavigateTab && onNavigateTab('admins')}
        >
          <ArrowLeft size={15} />
          <span>Back to Super Admins</span>
        </button>

        <div className="create-admin-header">
          <div className="create-admin-title-wrap">
            <h1>
              <span className="create-admin-title-icon">
                <Shield size={22} />
              </span>
              <span>Register New Super Admin</span>
            </h1>
            <p>
              Add a super admin to supervise field agents, oversee construction sites, and monitor daily labor attendance.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '12px',
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main 2-Column Form Layout */}
      <form onSubmit={handleSubmit} className="create-admin-layout" autoComplete="off">
        {/* Left Column: Form Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card 1: Official Identity */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div className="create-admin-card-icon">
                <User size={18} />
              </div>
              <div>
                <h3>Administrator Identity</h3>
                <p>Personal and identification details for official records</p>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/png, image/jpeg, image/jpg, image/webp"
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
                    <Camera size={14} />
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

            {/* Photo Upload Section */}
            <div className="admin-photo-section">
              <div className="admin-photo-preview">
                {profileImage ? (
                  <img src={profileImage} alt="Admin Preview" />
                ) : (
                  <div className="admin-photo-placeholder">
                    <ImageIcon size={22} />
                    <span>No Photo</span>
                  </div>
                )}
              </div>

              <div className="admin-photo-actions-wrap">
                <div>
                  <h4 className="admin-photo-title">Profile Photo (Optional)</h4>
                  <p className="admin-photo-subtitle">
                    Upload a passport-size photo or take a snapshot for ID badge verification (PNG, JPG up to 5MB)
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

                  <button
                    type="button"
                    className="admin-photo-btn"
                    onClick={startCamera}
                  >
                    <Camera size={14} />
                    <span>Snap Photo</span>
                  </button>

                  {profileImage && (
                    <button
                      type="button"
                      className="admin-photo-btn danger"
                      onClick={() => setProfileImage('')}
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
                  <span>Full Name</span>
                  <span className="req">*</span>
                </label>
                <div className="create-admin-input-wrap">
                  <User className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Phone Number</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Phone className="create-admin-input-icon" size={17} />
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="create-admin-grid-2">
              <div className="create-admin-field">
                <label>
                  <span>Employee Code / Admin ID</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Shield className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. ADM-002"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className="create-admin-input-btn"
                    title="Generate Code"
                    onClick={() => setEmployeeCode(`ADM-${Date.now().toString().slice(-4)}`)}
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Designation / Title</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCustomDesignation) {
                        setIsCustomDesignation(false);
                        setDesignation(DEFAULT_DESIGNATIONS.includes(designation) ? designation : 'Regional Administrator');
                      } else {
                        setIsCustomDesignation(true);
                        setCustomDesignation(DEFAULT_DESIGNATIONS.includes(designation) ? '' : designation);
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
                      placeholder="Type custom designation / title"
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
                          setDesignation(DEFAULT_DESIGNATIONS.includes(designation) ? designation : 'Regional Administrator');
                        }}
                        title="Switch back to designation dropdown"
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
                      value={DEFAULT_DESIGNATIONS.includes(designation) ? designation : '__CUSTOM__'}
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
                        {DEFAULT_DESIGNATIONS.map((title) => (
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
            </div>
          </div>

          {/* Card 2: Login Credentials & Portal Access */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div
                className="create-admin-card-icon"
                style={{ background: '#FEF3C7', color: '#D97706' }}
              >
                <Lock size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>Portal Login Credentials</h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#EFF6FF',
                      color: '#1D4ED8',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid #BFDBFE'
                    }}
                  >
                    Email Delivery + 1st Login Reset
                  </span>
                </div>
                <p style={{ margin: '4px 0 0' }}>
                  Temporary credentials will be sent to the administrator's email. Password change is enforced on first login.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '12.5px',
                color: '#15803D',
                marginBottom: '16px'
              }}
            >
              <span style={{ fontSize: '16px' }}>✉️</span>
              <div>
                <strong>Automatic Onboarding Delivery:</strong> An email containing their Admin Code, login URL, and temporary password will be delivered upon registration.
              </div>
            </div>

            <div className="create-admin-field">
              <label>
                <span>Login Email</span>
                <span className="req">*</span>
              </label>
              <div className="create-admin-input-wrap">
                <Mail className="create-admin-input-icon" size={17} />
                <input
                  type="email"
                  required
                  placeholder="admin.name@construction.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  name="new_admin_login_email"
                />
              </div>
            </div>

            <div className="create-admin-grid-2">
              <div className="create-admin-field">
                <label>
                  <span>Temporary Password</span>
                  <span className="req">*</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Lock className="create-admin-input-icon" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="has-actions"
                    autoComplete="new-password"
                    name="new_admin_portal_password"
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
                  <span>Confirm Temporary Password</span>
                  <span className="req">*</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Lock className="create-admin-input-icon" size={17} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    name="new_admin_confirm_password"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Jurisdiction & Financials */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div
                className="create-admin-card-icon"
                style={{ background: '#F3E8FF', color: '#9333EA' }}
              >
                <MapPin size={18} />
              </div>
              <div>
                <h3>Jurisdiction & Compensation</h3>
                <p>Regional territory office and monthly remuneration</p>
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
                  placeholder="e.g. Metro Construction HQ, Sector 4"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="create-admin-grid-3">
              <div className="create-admin-field">
                <label>
                  <span>City</span>
                </label>
                <div className="create-admin-input-wrap">
                  <Building2 className="create-admin-input-icon" size={17} />
                  <input
                    type="text"
                    placeholder="e.g. Pune"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="create-admin-field">
                <label>
                  <span>State</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCustomState) {
                        setIsCustomState(false);
                        setState(INDIAN_STATES.includes(state) ? state : '');
                      } else {
                        setIsCustomState(true);
                        setCustomState(INDIAN_STATES.includes(state) ? '' : state);
                        setState('');
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
                    {isCustomState ? '← Select from list' : '+ Custom State'}
                  </button>
                </label>

                {isCustomState ? (
                  <div className="create-admin-input-wrap">
                    <MapPin className="create-admin-input-icon" size={17} />
                    <input
                      type="text"
                      placeholder="Type custom state or territory name"
                      value={customState}
                      onChange={(e) => {
                        setCustomState(e.target.value);
                        setState(e.target.value);
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
                          setIsCustomState(false);
                          setState(INDIAN_STATES.includes(state) ? state : '');
                        }}
                        title="Switch back to state dropdown"
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
                    <MapPin className="create-admin-input-icon" size={17} />
                    <select
                      value={state === '' ? '' : (INDIAN_STATES.includes(state) ? state : '__CUSTOM__')}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomState(true);
                          setCustomState('');
                          setState('');
                        } else {
                          setState(e.target.value);
                        }
                      }}
                    >
                      <option value="">-- Select State --</option>
                      <optgroup label="Popular States">
                        <option value="Telangana">Telangana</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Delhi NCR">Delhi NCR</option>
                      </optgroup>
                      <optgroup label="All States & Union Territories">
                        {INDIAN_STATES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Custom Option">
                        <option value="__CUSTOM__">✏️ + Add Custom State...</option>
                      </optgroup>
                    </select>
                  </div>
                )}
              </div>

              <div className="create-admin-field">
                <label>
                  <span>Monthly Salary (₹)</span>
                </label>
                <div className="create-admin-input-wrap">
                  <IndianRupee className="create-admin-input-icon" size={17} />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="65000"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Optional Initial Agents Assignment */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div
                className="create-admin-card-icon"
                style={{ background: '#DCFCE7', color: '#16A34A' }}
              >
                <Users size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <h3>Assign Field Agents Under Supervision (Optional)</h3>
                <p>Select field agents who will report directly to this Administrator</p>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: selectedAgentIds.length > 0 ? '#EFF6FF' : '#F1F5F9',
                  color: selectedAgentIds.length > 0 ? '#2563EB' : '#64748B',
                }}
              >
                {selectedAgentIds.length} Selected
              </span>
            </div>

            {/* Agent Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #CBD5E1)',
                background: 'var(--bg-card, #FFFFFF)',
              }}
            >
              <Search size={16} color="#94A3B8" />
              <input
                type="search"
                name="agent_search_query_prevent_autofill"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-form-type="other"
                placeholder="Search agents by name, ID, or site..."
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                }}
              />
              {agentSearch && (
                <button
                  type="button"
                  onClick={() => setAgentSearch('')}
                  title="Clear search"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Agents List */}
            <div className="agent-select-list">
              {isLoadingAgents ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                  <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                  <span>Loading agents...</span>
                </div>
              ) : filteredAgents.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No available field agents found.
                </div>
              ) : (
                filteredAgents.map((agent) => {
                  const idNum = Number(agent.id);
                  const isSelected = selectedAgentIds.includes(idNum);

                  return (
                    <div
                      key={agent.id}
                      className={`agent-select-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleAgent(idNum)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserAvatar name={agent.name} src={agent.profileImage} size={34} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {agent.name}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#F1F5F9',
                                color: '#475569',
                              }}
                            >
                              {agent.employeeCode || `AGT-${agent.id}`}
                            </span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                            Site: {agent.assignedSite || 'Unassigned'} • Laborers: {agent.assignedWorkersCount || 0}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          border: isSelected ? 'none' : '2px solid #CBD5E1',
                          background: isSelected ? '#2563EB' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                        }}
                      >
                        {isSelected && <Check size={14} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Card 5: Administrator Registration Fee & Union Onboarding */}
          <div className="create-admin-card">
            <div className="create-admin-card-header">
              <div
                className="create-admin-card-icon"
                style={{ background: '#ECFDF5', color: '#059669' }}
              >
                <Receipt size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>Administrator Registration Fee</h3>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: collectRegFee && adminRegFee > 0 ? '#DCFCE7' : '#FEF3C7',
                      color: collectRegFee && adminRegFee > 0 ? '#15803D' : '#B45309',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: collectRegFee && adminRegFee > 0 ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                    }}
                  >
                    {collectRegFee && adminRegFee > 0 ? `₹${Number(adminRegFee).toLocaleString('en-IN')} Applicable` : 'Waived / Free'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0' }}>
                  Union administrative onboarding charge and verified payment mode
                </p>
              </div>

              {/* Toggle to collect or waive */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={collectRegFee}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCollectRegFee(checked);
                    if (!checked) {
                      setAdminRegFee(0);
                      setPaymentMethod('WAIVED');
                    } else {
                      setAdminRegFee(getAdminRegistrationFee() || 2500);
                      setPaymentMethod('DIRECT_PAID');
                    }
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                />
                <span>Collect Fee</span>
              </label>
            </div>

            {collectRegFee ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        required={collectRegFee}
                        placeholder="e.g. 2500"
                        value={adminRegFee}
                        onChange={(e) => setAdminRegFee(Number(e.target.value) || 0)}
                        style={{ fontWeight: 700, fontSize: '15px' }}
                      />
                    </div>
                  </div>

                  <div className="create-admin-field">
                    <label>
                      <span>Payment Method / Mode</span>
                      <span className="req">*</span>
                    </label>
                    <div className="create-admin-input-wrap">
                      <CreditCard className="create-admin-input-icon" size={17} />
                      <select
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                        style={{ width: '100%', fontWeight: 600 }}
                      >
                        <option value="DIRECT_PAID">Direct Online (Razorpay / UPI / NetBanking)</option>
                        <option value="BANK_TRANSFER">Direct Bank Transfer / NEFT / IMPS</option>
                        <option value="CASH_OFFLINE">Cash / Corporate Direct Deposit</option>
                        <option value="WAIVED">Corporate Exemption (Waived)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preset Fast Selection Pills */}
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '8px' }}>
                    Quick Fee Presets:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      { label: '₹2,500 (Master Standard)', amount: 2500 },
                      { label: '₹5,000 (Metropolitan HQ)', amount: 5000 },
                      { label: '₹1,500 (Zonal Area)', amount: 1500 },
                      { label: '₹1,000 (Introductory)', amount: 1000 },
                    ].map((preset) => (
                      <button
                        key={preset.amount}
                        type="button"
                        onClick={() => {
                          setAdminRegFee(preset.amount);
                          setCollectRegFee(true);
                          if (paymentMethod === 'WAIVED') setPaymentMethod('DIRECT_PAID');
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: adminRegFee === preset.amount ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                          background: adminRegFee === preset.amount ? '#EFF6FF' : '#F8FAFC',
                          color: adminRegFee === preset.amount ? '#1D4ED8' : '#334155',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setAdminRegFee(0);
                        setCollectRegFee(false);
                        setPaymentMethod('WAIVED');
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: !collectRegFee || adminRegFee === 0 ? '1.5px solid #D97706' : '1px solid #CBD5E1',
                        background: !collectRegFee || adminRegFee === 0 ? '#FEF3C7' : '#F8FAFC',
                        color: !collectRegFee || adminRegFee === 0 ? '#92400E' : '#334155',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Waive Fee (₹0 Free)
                    </button>
                  </div>
                </div>

                {/* Razorpay Online Verification Notice */}
                <div
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12.5px',
                    color: '#1E40AF',
                    lineHeight: 1.5,
                  }}
                >
                  <Receipt size={20} style={{ flexShrink: 0, color: '#2563EB' }} />
                  <div>
                    <strong>Mandatory Payment Verification:</strong> Clicking <em>"Pay & Register"</em> opens the official <strong>Razorpay Checkout</strong> (UPI, Cards, NetBanking). The administrator is only registered in the system after successful payment verification.
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: '#92400E',
                }}
              >
                <span>🏷️</span>
                <span>
                  <strong>Registration Fee Waived:</strong> This Area Administrator account will be registered free of charge without any required onboarding payment.
                </span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="create-admin-actions">
            <button
              type="button"
              className="btn-secondary-admin"
              onClick={() => onNavigateTab && onNavigateTab('admins')}
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
                padding: '10px 24px',
                fontSize: '14.5px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Payment & Registration...</span>
                </>
              ) : collectRegFee && Number(adminRegFee) > 0 ? (
                <>
                  <Shield size={16} />
                  <span>Pay ₹{Number(adminRegFee).toLocaleString('en-IN')} & Register Administrator</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Register Administrator (Waived)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Summary / Badge Preview */}
        <div>
          <div className="create-admin-preview-card">
            <div className="preview-badge-row">
              <span className="preview-role-pill">
                <Shield size={12} />
                <span>Area Admin</span>
              </span>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                {employeeCode || 'ADM-00X'}
              </span>
            </div>

            <div className="preview-avatar-center">
              {profileImage ? (
                <img src={profileImage} alt={name || 'Administrator'} className="preview-avatar-img" />
              ) : (
                <div className="preview-avatar-circle">
                  {name ? name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>
                  {name || 'New Administrator'}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
                  {designation}
                </p>
              </div>
            </div>

            <div className="preview-details-list">
              <div className="preview-detail-row">
                <span className="preview-detail-label">Email:</span>
                <span className="preview-detail-value">{email || 'Not provided'}</span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Phone:</span>
                <span className="preview-detail-value">{phone || 'Not provided'}</span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Jurisdiction:</span>
                <span className="preview-detail-value">
                  {city ? `${city}, ${state}` : state}
                </span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Monthly Salary:</span>
                <span className="preview-detail-value">
                  ₹{Number(salary || 0).toLocaleString()}
                </span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Registration Fee:</span>
                <span className="preview-detail-value" style={{ color: adminRegFee === 0 ? '#4ADE80' : '#FCD34D' }}>
                  {adminRegFee === 0 ? 'Free / Waived' : `₹${adminRegFee.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="preview-detail-row">
                <span className="preview-detail-label">Supervised Agents:</span>
                <span className="preview-detail-value" style={{ color: '#93C5FD' }}>
                  {selectedAgentIds.length} Agents
                </span>
              </div>
            </div>

            {/* Hierarchy Tree Node Indicator */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '12px',
                color: '#CBD5E1',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, color: '#93C5FD', marginBottom: '4px' }}>
                Organizational Position:
              </div>
              <div>Super Admin → <strong>{name || 'This Admin'}</strong> → {selectedAgentIds.length} Agents → Laborers</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
