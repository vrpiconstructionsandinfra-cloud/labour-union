import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  User,
  CreditCard,
  Building2,
  DollarSign,
  Receipt,
  IndianRupee,
  Camera,
  UploadCloud,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  UserCheck,
  Sliders,
  Lock
} from 'lucide-react';
import {
  registerUserApi,
  fetchSitesApi,
  fetchAgentsApi,
  fetchWorkersApi
} from '../services/api';
import {
  getWageConfig,
  fetchWageConfigApi,
  getTradeWage,
  subscribeWageConfig,
  type WageConfigData
} from '../services/wageConfigService';
import { initiateRazorpayCheckout } from '../utils/razorpay';
import { useAuth } from '../context/AuthContext';
import type { SiteItem, AgentItem } from '../types';
import './RegisterWorkerPage.css';

interface RegisterWorkerPageProps {
  onNavigateTab?: (tab: string) => void;
  onSuccess?: () => void;
}

export const RegisterWorkerPage: React.FC<RegisterWorkerPageProps> = ({
  onNavigateTab,
  onSuccess
}) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_AGENT';

  // Wage Master Configuration State
  const [wageConfig, setWageConfig] = useState<WageConfigData>(getWageConfig());

  // Basic Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [designation, setDesignation] = useState('Mason / Carpenter');

  // Sites & Agent Selection
  const [sitesList, setSitesList] = useState<SiteItem[]>([]);
  const [agentsList, setAgentsList] = useState<AgentItem[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Worker Photo & Camera
  const [workerAvatar, setWorkerAvatar] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Wage & Compensation Structure
  const [wageType, setWageType] = useState<'DAILY' | 'MONTHLY'>('DAILY');
  const [dailyWageRate, setDailyWageRate] = useState('850');
  const [monthlySalaryRate, setMonthlySalaryRate] = useState('25500');

  // Registration & Onboarding Payment (Razorpay ONLY)
  const [collectRegistrationFee, setCollectRegistrationFee] = useState(true);
  const [registrationFee, setRegistrationFee] = useState('500');

  // Banking & Address
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [address, setAddress] = useState('');

  // Form State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdWorkerDetails, setCreatedWorkerDetails] = useState<any>(null);

  const generateAutoPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Worker#${randStr}`;
  };

  const loadDependenciesAndCode = async () => {
    try {
      const [sites, agents, workers, config] = await Promise.all([
        fetchSitesApi().catch(() => []),
        fetchAgentsApi().catch(() => []),
        fetchWorkersApi().catch(() => []),
        fetchWageConfigApi().catch(() => getWageConfig())
      ]);

      setSitesList(sites || []);
      setAgentsList(agents || []);
      if (config) {
        setWageConfig(config);
        setRegistrationFee(String(config.registrationFee || 500));
        setCollectRegistrationFee(config.isRegistrationFeeMandatory !== false);

        // Pick the first trade or Mason
        const firstTrade = config.tradeWages?.[0] || { name: 'Mason / Carpenter', dailyWage: 850, monthlyWage: 25500 };
        setDesignation(firstTrade.name);
        setDailyWageRate(String(firstTrade.dailyWage));
        setMonthlySalaryRate(String(firstTrade.monthlyWage || firstTrade.dailyWage * 30));
      }

      if (sites && sites.length > 0) {
        setSelectedSiteId(String(sites[0].id));
      }

      // Auto compute fresh employee code
      const existingNums = (workers || [])
        .map((w: any) => Number(String(w.employeeCode || w.id).replace(/\D/g, '')))
        .filter((n: number) => !isNaN(n) && n > 0);
      const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : (workers || []).length;
      const freshCode = `WRK-${(maxNum + 1).toString().padStart(3, '0')}`;
      setEmployeeCode(freshCode);
      setPassword(generateAutoPassword());
    } catch (err) {
      console.error('Failed to load initial registration data:', err);
    }
  };

  useEffect(() => {
    loadDependenciesAndCode();

    const unsubscribe = subscribeWageConfig((updatedConfig) => {
      setWageConfig(updatedConfig);
      setRegistrationFee(String(updatedConfig.registrationFee || 500));
    });

    return () => {
      unsubscribe();
      stopCamera();
    };
  }, []);

  const handleDesignationChange = (val: string) => {
    setDesignation(val);
    const wageInfo = getTradeWage(val);
    setDailyWageRate(String(wageInfo.dailyWage));
    setMonthlySalaryRate(String(wageInfo.monthlyWage));
  };

  // Camera Handlers
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setIsCameraActive(false);
      setErrorMsg('Unable to access camera. Please allow camera permissions or upload photo.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 360, 360);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setWorkerAvatar(dataUrl);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size cannot exceed 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setWorkerAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Form Validations
    if (!name.trim()) {
      setErrorMsg('Worker full name is required');
      return;
    }

    if (!employeeCode.trim()) {
      setErrorMsg('Worker Employee Code is required');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    const regFeeNum = collectRegistrationFee ? Number(registrationFee) : 0;
    if (collectRegistrationFee && (isNaN(regFeeNum) || regFeeNum <= 0)) {
      setErrorMsg('Please enter a valid registration fee amount');
      return;
    }

    setIsLoading(true);

    try {
      let razorpayPaymentId: string | undefined = undefined;
      let razorpayOrderId: string | undefined = undefined;

      // Execute Razorpay Standard Checkout
      if (collectRegistrationFee && regFeeNum > 0) {
        try {
          const rzpResult = await initiateRazorpayCheckout({
            amount: regFeeNum,
            isINR: true,
            currency: 'INR',
            name: 'Labor Union System',
            description: `Worker Union Onboarding Fee (${designation}) - Code: ${employeeCode}`,
            prefill: {
              name: name.trim(),
              email: email.trim() || 'worker@union.org',
              contact: phone.trim() || '9876543210'
            },
            notes: {
              employeeCode: employeeCode.trim(),
              designation: designation,
              siteId: selectedSiteId || ''
            },
            themeColor: '#2563EB'
          });

          razorpayPaymentId = rzpResult.payment_id;
          razorpayOrderId = rzpResult.order_id;
        } catch (paymentErr: any) {
          setIsLoading(false);
          setErrorMsg(paymentErr.message || 'Razorpay registration payment failed or was cancelled.');
          return;
        }
      }

      // Compute salary value based on wage type
      const dailyVal = Number(dailyWageRate) || 850;
      const salaryVal = wageType === 'DAILY' ? dailyVal * 30 : Number(monthlySalaryRate) || 25500;

      // Register worker via Backend API
      await registerUserApi({
        name: name.trim(),
        email: email.trim() || undefined,
        password: password,
        role: 'WORKER',
        phone: phone.trim() || undefined,
        designation: designation,
        employeeCode: employeeCode.trim(),
        salary: salaryVal,
        siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
        assignedAgentId: selectedAgentId ? Number(selectedAgentId) : undefined,
        avatar: workerAvatar || undefined,
        bankAccountNo: bankAccountNo.trim() || undefined,
        ifscCode: ifscCode.trim() || undefined,
        address: address.trim() || undefined,
        registrationAmount: regFeeNum,
        paymentMethod: regFeeNum > 0 ? 'RAZORPAY' : 'WAIVED',
        razorpayPaymentId: razorpayPaymentId,
        razorpayOrderId: razorpayOrderId,
      });

      setIsLoading(false);
      setIsSuccess(true);
      setCreatedWorkerDetails({
        name: name.trim(),
        employeeCode: employeeCode.trim(),
        designation,
        dailyWage: dailyVal,
        salary: salaryVal,
        registrationAmount: regFeeNum,
        razorpayPaymentId,
        siteName: sitesList.find((s) => String(s.id) === selectedSiteId)?.siteName || 'Direct HQ',
        phone: phone.trim() || 'N/A'
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Worker registration failed. Please check form details.');
    }
  };

  const handleResetForAnother = () => {
    setIsSuccess(false);
    setCreatedWorkerDetails(null);
    setName('');
    setEmail('');
    setPhone('');
    setWorkerAvatar('');
    setBankAccountNo('');
    setIfscCode('');
    setAddress('');
    loadDependenciesAndCode();
  };

  // Whether field agent wage is strictly fixed by Super Admin
  const isAgentWageLocked = !isSuperAdmin;

  if (isSuccess) {
    return (
      <div className="register-worker-page animate-fade-in">
        <div className="reg-success-card">
          <div className="reg-success-icon-wrap">
            <CheckCircle2 size={42} color="#16A34A" />
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
            Worker Registered Successfully!
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', maxWidth: '520px', margin: '0 auto 24px' }}>
            The new worker profile, trade rate schedule, and Razorpay onboarding record have been activated in the system.
          </p>

          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', maxWidth: '500px', margin: '0 auto 24px', textAlign: 'left', fontSize: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div><span style={{ color: '#64748B' }}>Worker Name:</span> <strong>{createdWorkerDetails?.name}</strong></div>
              <div><span style={{ color: '#64748B' }}>Worker ID:</span> <strong style={{ color: '#2563EB' }}>{createdWorkerDetails?.employeeCode}</strong></div>
              <div><span style={{ color: '#64748B' }}>Trade Skill:</span> <strong>{createdWorkerDetails?.designation}</strong></div>
              <div><span style={{ color: '#64748B' }}>Daily Wage:</span> <strong>₹{createdWorkerDetails?.dailyWage}/day</strong></div>
              <div><span style={{ color: '#64748B' }}>Assigned Site:</span> <strong>{createdWorkerDetails?.siteName}</strong></div>
              <div><span style={{ color: '#64748B' }}>Phone:</span> <strong>{createdWorkerDetails?.phone}</strong></div>
              <div><span style={{ color: '#64748B' }}>Reg Payment:</span> <strong style={{ color: '#2563EB' }}>{createdWorkerDetails?.registrationAmount > 0 ? `₹${createdWorkerDetails?.registrationAmount} (Razorpay Paid)` : 'None'}</strong></div>
              {createdWorkerDetails?.razorpayPaymentId && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: '#64748B' }}>Razorpay Payment ID:</span> <code style={{ color: '#1E293B', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>{createdWorkerDetails?.razorpayPaymentId}</code>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="reg-btn-submit"
              onClick={() => onNavigateTab ? onNavigateTab('workers') : undefined}
            >
              <UserCheck size={16} /> Go to Workers Directory
            </button>
            <button
              type="button"
              className="reg-btn-cancel"
              onClick={handleResetForAnother}
            >
              + Register Another Worker
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-worker-page animate-fade-in">
      {/* Header Area */}
      <div className="reg-page-header">
        <button
          type="button"
          className="reg-back-btn"
          onClick={() => onNavigateTab ? onNavigateTab('workers') : undefined}
        >
          <ArrowLeft size={16} /> Back to Workers Directory
        </button>

        <div className="reg-header-content">
          <div className="reg-title-wrap">
            <h1>
              <UserCheck size={26} color="#2563EB" />
              Register New Worker
            </h1>
            <p>
              Enroll construction labor with Super Admin controlled wage rates, trade designations, and Razorpay onboarding fee.
            </p>
          </div>

          <div className="reg-badge-hq">
            <ShieldCheck size={15} />
            <span>{isSuperAdmin ? 'Super Admin Master Control' : 'Field Agent Registration Portal'}</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="reg-error-banner">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="reg-form-grid">
          {/* LEFT COLUMN: Identity & Assignment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Card 1: Worker Profile & Credentials */}
            <div className="reg-card">
              <div className="reg-card-header">
                <div className="reg-card-title">
                  <div className="reg-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <h3>Worker Identity & Credentials</h3>
                    <p>Personal profile photo, phone, and system login</p>
                  </div>
                </div>
              </div>

              {/* Photo Area */}
              <div className="reg-photo-section">
                {workerAvatar ? (
                  <img src={workerAvatar} alt="Worker Avatar" className="reg-avatar-preview" />
                ) : (
                  <div className="reg-avatar-placeholder">
                    <Camera size={22} />
                    <span>NO PHOTO</span>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Worker ID Card Photo
                  </div>
                  <div className="reg-photo-actions">
                    <button
                      type="button"
                      className="reg-photo-btn primary"
                      onClick={startCamera}
                    >
                      <Camera size={14} /> Snap Photo
                    </button>
                    <label className="reg-photo-btn">
                      <UploadCloud size={14} /> Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </label>
                    {workerAvatar && (
                      <button
                        type="button"
                        className="reg-photo-btn danger"
                        onClick={() => setWorkerAvatar('')}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isCameraActive && (
                <div style={{ background: '#0F172A', padding: '14px', borderRadius: '14px', marginBottom: '18px', textAlign: 'center' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', maxHeight: '240px', borderRadius: '10px', objectFit: 'cover' }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      style={{ background: '#16A34A', color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Capture Snapshot
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      style={{ background: '#334155', color: '#FFF', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="reg-field-group">
                <label>Worker Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="reg-row">
                <div className="reg-field-group">
                  <label>Mobile Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="reg-field-group">
                  <label>Email Address (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="reg-row">
                <div className="reg-field-group">
                  <label>Worker Employee Code *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      required
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="e.g. WRK-001"
                      style={{ fontWeight: 800, letterSpacing: '0.5px' }}
                    />
                    <button
                      type="button"
                      className="reg-photo-btn"
                      onClick={() => {
                        const rand = Math.floor(100 + Math.random() * 900);
                        setEmployeeCode(`WRK-${rand}`);
                      }}
                      title="Generate new random code"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="reg-field-group">
                  <label>Initial Login Password *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password..."
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Trade & Site Assignment */}
            <div className="reg-card">
              <div className="reg-card-header">
                <div className="reg-card-title">
                  <div className="reg-card-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3>Trade & Site Assignment</h3>
                    <p>Designation skill, working site, and agent management</p>
                  </div>
                </div>
              </div>

              <div className="reg-field-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ margin: 0 }}>Skill / Trade Designation *</label>
                  <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sliders size={12} /> Governed by Super Admin Master
                  </span>
                </div>

                <select
                  value={designation}
                  onChange={(e) => handleDesignationChange(e.target.value)}
                >
                  {wageConfig.tradeWages.map((t) => (
                    <option key={t.id || t.name} value={t.name}>
                      {t.name} (Standard: ₹{t.dailyWage}/day · ₹{(t.monthlyWage || t.dailyWage * 30).toLocaleString('en-IN')}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="reg-row">
                <div className="reg-field-group">
                  <label>Assigned Working Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                  >
                    <option value="">-- Select Working Site --</option>
                    {sitesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteName} ({s.siteCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="reg-field-group">
                  <label>Managing Field Agent</label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                  >
                    <option value="">-- Direct HQ Oversight (Unassigned) --</option>
                    {agentsList.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.employeeCode || `AGT-${ag.id}`})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Wage & Payment Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Card 3: Wage & Payment Rate Structure */}
            <div className="reg-card">
              <div className="reg-card-header">
                <div className="reg-card-title">
                  <div className="reg-card-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <h3>Wage & Compensation Structure</h3>
                    <p>Daily wage rates, overtime basis, and payroll salary</p>
                  </div>
                </div>

                <div className="reg-wage-toggle">
                  <button
                    type="button"
                    className={`reg-wage-tab ${wageType === 'DAILY' ? 'active' : 'inactive'}`}
                    onClick={() => {
                      setWageType('DAILY');
                      const d = Number(dailyWageRate) || 850;
                      setMonthlySalaryRate(String(d * 30));
                    }}
                  >
                    Daily Wage (₹/day)
                  </button>
                  <button
                    type="button"
                    className={`reg-wage-tab ${wageType === 'MONTHLY' ? 'active' : 'inactive'}`}
                    onClick={() => {
                      setWageType('MONTHLY');
                      const m = Number(monthlySalaryRate) || 25500;
                      setDailyWageRate(String(Math.round(m / 30)));
                    }}
                  >
                    Monthly Salary (₹/mo)
                  </button>
                </div>
              </div>

              <div className="reg-row">
                {wageType === 'DAILY' ? (
                  <div className="reg-field-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>Daily Wage Rate (₹ / Day) *</label>
                      {isAgentWageLocked ? (
                        <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                          <Lock size={12} /> Fixed by Super Admin
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>
                          Super Admin Editable
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '12px', fontWeight: 800, color: '#64748B' }}>₹</span>
                      <input
                        type="number"
                        min="100"
                        max="100000"
                        required
                        readOnly={isAgentWageLocked}
                        placeholder="e.g. 850"
                        value={dailyWageRate}
                        onChange={(e) => {
                          if (!isAgentWageLocked) {
                            const val = e.target.value;
                            setDailyWageRate(val);
                            const num = Number(val) || 0;
                            setMonthlySalaryRate(String(num * 30));
                          }
                        }}
                        style={{
                          paddingLeft: '28px',
                          fontSize: '15px',
                          fontWeight: 700,
                          backgroundColor: isAgentWageLocked ? '#F8FAFC' : '#FFFFFF',
                          borderColor: isAgentWageLocked ? '#E2E8F0' : '#2563EB',
                          cursor: isAgentWageLocked ? 'not-allowed' : 'text',
                          color: '#0F172A'
                        }}
                      />
                    </div>
                    {isAgentWageLocked && (
                      <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                        Standard daily wage rate fixed by Super Admin master policy for {designation}. Field agents cannot alter this amount.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="reg-field-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>Monthly Fixed Salary (₹ / Month) *</label>
                      {isAgentWageLocked ? (
                        <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                          <Lock size={12} /> Fixed by Super Admin
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>
                          Super Admin Editable
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '12px', fontWeight: 800, color: '#64748B' }}>₹</span>
                      <input
                        type="number"
                        min="1000"
                        max="1000000"
                        required
                        readOnly={isAgentWageLocked}
                        placeholder="e.g. 25500"
                        value={monthlySalaryRate}
                        onChange={(e) => {
                          if (!isAgentWageLocked) {
                            const val = e.target.value;
                            setMonthlySalaryRate(val);
                            const num = Number(val) || 0;
                            setDailyWageRate(String(Math.round(num / 30)));
                          }
                        }}
                        style={{
                          paddingLeft: '28px',
                          fontSize: '15px',
                          fontWeight: 700,
                          backgroundColor: isAgentWageLocked ? '#F8FAFC' : '#FFFFFF',
                          borderColor: isAgentWageLocked ? '#E2E8F0' : '#2563EB',
                          cursor: isAgentWageLocked ? 'not-allowed' : 'text',
                          color: '#0F172A'
                        }}
                      />
                    </div>
                    {isAgentWageLocked && (
                      <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                        Monthly salary basis fixed by Super Admin master policy for {designation}.
                      </span>
                    )}
                  </div>
                )}

                <div className="reg-field-group">
                  <label style={{ color: '#64748B' }}>
                    {wageType === 'DAILY' ? 'Monthly Projection (30 Days)' : 'Daily Rate Equivalent'}
                  </label>
                  <div className="reg-wage-preview-box">
                    <span style={{ fontSize: '12.5px', color: '#166534', fontWeight: 600 }}>Gross Basis:</span>
                    <span className="reg-wage-preview-val">
                      {wageType === 'DAILY'
                        ? `₹ ${(Number(dailyWageRate || 0) * 30).toLocaleString('en-IN')} / mo`
                        : `₹ ${(Number(dailyWageRate || 0)).toLocaleString('en-IN')} / day`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Standard Role Presets from Super Admin Master */}
              <div style={{ marginTop: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>
                  Super Admin Master Wage Rates:
                </span>
                <div className="reg-presets-list">
                  {wageConfig.tradeWages.map((trade) => (
                    <button
                      key={trade.id || trade.name}
                      type="button"
                      disabled={isAgentWageLocked}
                      className={`reg-preset-pill ${Number(dailyWageRate) === trade.dailyWage ? 'active' : ''}`}
                      onClick={() => {
                        setDesignation(trade.name);
                        setDailyWageRate(String(trade.dailyWage));
                        setMonthlySalaryRate(String(trade.monthlyWage || trade.dailyWage * 30));
                      }}
                    >
                      {trade.name.split('/')[0].trim()} (₹{trade.dailyWage})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 4: Registration & Union Onboarding Payment - RAZORPAY ONLY */}
            <div className="reg-card">
              <div className="reg-card-header">
                <div className="reg-card-title">
                  <div className="reg-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3>Registration & Union Onboarding Payment</h3>
                    <p>Processed exclusively via secure Razorpay Online Payment Gateway</p>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: (!isSuperAdmin && wageConfig.isRegistrationFeeMandatory) ? 'not-allowed' : 'pointer', margin: 0, fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={collectRegistrationFee}
                    disabled={!isSuperAdmin && wageConfig.isRegistrationFeeMandatory}
                    onChange={(e) => setCollectRegistrationFee(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: (!isSuperAdmin && wageConfig.isRegistrationFeeMandatory) ? 'not-allowed' : 'pointer', accentColor: '#2563EB' }}
                  />
                  <span>Collect Payment</span>
                  {!isSuperAdmin && wageConfig.isRegistrationFeeMandatory && (
                    <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>(Mandatory)</span>
                  )}
                </label>
              </div>

              {collectRegistrationFee ? (
                <>
                  <div className="reg-row" style={{ marginBottom: '14px' }}>
                    <div className="reg-field-group">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ margin: 0 }}>Registration Amount (₹) *</label>
                        {!isSuperAdmin ? (
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '6px', border: '1px solid #FECACA' }}>
                            <Lock size={12} /> Fixed by Super Admin
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>
                            Super Admin Master Fee: ₹{wageConfig.registrationFee}
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '12px', fontWeight: 800, color: '#64748B' }}>₹</span>
                        <input
                          type="number"
                          min="1"
                          required
                          readOnly={!isSuperAdmin}
                          placeholder="e.g. 500"
                          value={registrationFee}
                          onChange={(e) => isSuperAdmin && setRegistrationFee(e.target.value)}
                          style={{
                            paddingLeft: '28px',
                            fontSize: '15px',
                            fontWeight: 700,
                            backgroundColor: !isSuperAdmin ? '#F8FAFC' : '#FFFFFF',
                            borderColor: !isSuperAdmin ? '#E2E8F0' : '#2563EB',
                            cursor: !isSuperAdmin ? 'not-allowed' : 'text',
                            color: '#0F172A'
                          }}
                        />
                      </div>
                      {!isSuperAdmin && (
                        <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                          Standard onboarding fee fixed by Super Admin policy. Field agents cannot alter this amount.
                        </span>
                      )}
                    </div>

                    <div className="reg-field-group">
                      <label>Payment Gateway</label>
                      <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: '10px', border: '1.5px solid #2563EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DollarSign size={18} color="#2563EB" />
                          <span style={{ fontWeight: 800, color: '#1E40AF', fontSize: '13.5px' }}>Razorpay Gateway</span>
                        </div>
                        <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1D4ED8', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          SECURE 256-BIT
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="reg-gateway-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <ShieldCheck size={18} color="#2563EB" />
                      <strong style={{ color: '#1E3A8A', fontSize: '13px' }}>Live Razorpay Checkout Integration</strong>
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#1D4ED8', fontWeight: 700 }}>Auto Instant Receipt</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#3B82F6', lineHeight: '1.4' }}>
                      Clicking <strong>Register & Pay via Razorpay</strong> opens the official Razorpay checkout modal supporting <strong>UPI, Google Pay, PhonePe, Debit/Credit Cards, and Netbanking</strong>.
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ background: '#F1F5F9', padding: '12px 16px', borderRadius: '10px', color: '#64748B', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>Registration payment is waived for this worker. Profile will be registered directly without checkout.</span>
                </div>
              )}
            </div>

            {/* Card 5: Bank Details & Address */}
            <div className="reg-card">
              <div className="reg-card-header">
                <div className="reg-card-title">
                  <div className="reg-card-icon" style={{ background: '#FDF2F8', color: '#DB2777' }}>
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3>Bank Account & Address (Optional)</h3>
                    <p>Direct wage disbursements and emergency residential address</p>
                  </div>
                </div>
              </div>

              <div className="reg-row">
                <div className="reg-field-group">
                  <label>Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789012"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                  />
                </div>

                <div className="reg-field-group">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001234"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="reg-field-group">
                <label>Permanent Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Village/Town, District, State, Pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="reg-submit-bar">
              <button
                type="button"
                className="reg-btn-cancel"
                onClick={() => onNavigateTab ? onNavigateTab('workers') : undefined}
                disabled={isLoading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="reg-btn-submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="spinner" />
                    <span>Processing Registration...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={18} />
                    <span>
                      {collectRegistrationFee && Number(registrationFee) > 0
                        ? `Register & Pay ₹${registrationFee} via Razorpay`
                        : 'Complete Worker Registration'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
