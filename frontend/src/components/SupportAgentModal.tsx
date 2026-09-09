import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Save, Camera, UploadCloud, Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerUserApi, sendEmailVerificationCodeApi, verifyEmailCodeApi } from '../services/api';
import { UserAvatar } from './UserAvatar';
import './SupportAgentModal.css';

interface SupportAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentToEdit?: any | null;
  onSuccess: () => void;
}

export const SupportAgentModal: React.FC<SupportAgentModalProps> = ({
  isOpen,
  onClose,
  agentToEdit,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [designation, setDesignation] = useState('Customer Support Agent');
  const [password, setPassword] = useState('');
  const [salary, setSalary] = useState<number>(45000);
  const [agentAvatar, setAgentAvatar] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo & Camera States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // OTP & Password States
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Support#${randStr}`;
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      stopCamera();
      if (agentToEdit) {
        setName(agentToEdit.name || '');
        setEmail(agentToEdit.email || '');
        setPhone(agentToEdit.phone || '');
        setEmployeeCode(agentToEdit.employeeCode || `CSA-${1000 + Math.floor(Math.random() * 900)}`);
        setDesignation(agentToEdit.designation || 'Customer Support Agent');
        setSalary(agentToEdit.salary || 45000);
        setAgentAvatar(agentToEdit.avatar || '');
        setIsEmailVerified(true);
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setEmployeeCode(`CSA-${1000 + Math.floor(Math.random() * 900)}`);
        setDesignation('Customer Support Agent');
        setPassword(generateTempPassword());
        setSalary(45000);
        setAgentAvatar('');
        setIsEmailVerified(false);
        setVerificationOtp('');
        setOtpSentMessage(null);
        setShowPassword(false);
      }
    } else {
      stopCamera();
    }
  }, [isOpen, agentToEdit]);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 300, height: 300 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Failed to access webcam camera. Please upload a photo file instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setAgentAvatar(dataUrl);
    }
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAgentAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendOtp = async () => {
    if (!email || !email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid support agent email address first.');
      return;
    }
    setIsSendingOtp(true);
    setErrorMsg(null);
    try {
      await sendEmailVerificationCodeApi(email.trim(), name.trim() || 'Support Agent');
      setOtpSentMessage(`Verification code sent to ${email.trim()}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!verificationOtp || verificationOtp.trim().length !== 6) {
      setErrorMsg('Please enter 6-digit verification code.');
      return;
    }
    setIsVerifyingOtp(true);
    setErrorMsg(null);
    try {
      await verifyEmailCodeApi(email.trim(), verificationOtp.trim());
      setIsEmailVerified(true);
      setOtpSentMessage(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !email.trim() || !employeeCode.trim()) {
      setErrorMsg('Please fill in Name, Email, and Agent Code.');
      return;
    }

    if (!agentToEdit && !isEmailVerified) {
      setErrorMsg('Please verify email address with OTP code before registering.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (agentToEdit) {
        alert(`Support Agent ${name} updated successfully!`);
      } else {
        await registerUserApi({
          name: name.trim(),
          email: email.trim(),
          password: password || 'agent123',
          role: 'CUSTOMER_SUPPORT' as any,
          phone: phone.trim() || '+91 9876543210',
          designation: designation || 'Customer Support Agent',
          employeeCode: employeeCode.trim(),
          salary: Number(salary) || 45000,
          avatar: agentAvatar || undefined
        });
        alert(`Support Agent ${name} (${employeeCode}) created successfully! Credentials emailed to ${email.trim()}.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Support Agent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalMarkup = (
    <div className="sam-modal-backdrop" onClick={onClose}>
      <div className="sam-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="sam-header">
          <div className="sam-header-info">
            <div className="sam-header-icon">
              <UserPlus size={20} />
            </div>
            <div>
              <h3>
                {agentToEdit ? 'Edit Support Agent' : 'Add New Support Agent'}
              </h3>
              <p>
                {agentToEdit ? 'Update agent profile and permissions' : 'Create support agent credentials & roster record'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="sam-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="sam-form">
          <div className="sam-body">
            {errorMsg && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Profile Photo Upload / Camera Section */}
            <div>
              <label className="sam-label" style={{ display: 'block', marginBottom: '6px' }}>
                Support Agent Photo
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--bg-main, #F8FAFC)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color, #E2E8F0)' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '2px solid #2563EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {agentAvatar ? (
                    <img src={agentAvatar} alt="Agent Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserAvatar name={name || 'Support Agent'} size={52} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <UploadCloud size={14} />
                      <span>Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>

                    {!isCameraActive ? (
                      <button type="button" onClick={startCamera} style={{ backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Camera size={14} />
                        <span>Take Photo (Camera)</span>
                      </button>
                    ) : (
                      <button type="button" onClick={stopCamera} style={{ backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                        Close Camera
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>Upload Image or Take Live Snapshot</span>
                </div>
              </div>

              {isCameraActive && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', backgroundColor: '#0F172A', padding: '12px', borderRadius: '10px' }}>
                  <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: '240px', height: '180px', borderRadius: '8px', objectFit: 'cover' }} />
                  <button type="button" onClick={captureSnapshot} style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={14} /> Capture Snapshot
                  </button>
                </div>
              )}
            </div>

            <div className="sam-grid-2col">
              <div className="sam-field-group">
                <label className="sam-label">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="sam-input"
                />
              </div>

              <div className="sam-field-group">
                <label className="sam-label">Agent Code *</label>
                <input
                  type="text"
                  required
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g. CSA-1001"
                  className="sam-input"
                  style={{ fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Email Address & Verification Code Row */}
            <div className="sam-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <label className="sam-label" style={{ margin: 0 }}>
                  Email Address *
                </label>
                {isEmailVerified && (
                  <span style={{ color: '#059669', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Email Verified
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  required
                  disabled={isEmailVerified}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setIsEmailVerified(false); setOtpSentMessage(null); }}
                  placeholder="priya.sharma@union.com"
                  className="sam-input"
                  style={{ flex: 1 }}
                />
                {!isEmailVerified && !agentToEdit && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || !email.trim()}
                    style={{
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: isSendingOtp || !email.trim() ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      opacity: isSendingOtp || !email.trim() ? 0.6 : 1,
                      minHeight: '42px'
                    }}
                  >
                    {isSendingOtp ? 'Sending...' : 'Send OTP'}
                  </button>
                )}
              </div>

              {!isEmailVerified && !agentToEdit && otpSentMessage && (
                <div style={{ marginTop: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>{otpSentMessage}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP code"
                      value={verificationOtp}
                      onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #93C5FD', fontSize: '13px', fontWeight: 700, letterSpacing: '3px', textAlign: 'center' }}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifyingOtp || verificationOtp.length !== 6}
                      style={{
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: isVerifyingOtp || verificationOtp.length !== 6 ? 'not-allowed' : 'pointer',
                        minHeight: '38px'
                      }}
                    >
                      {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="sam-grid-2col">
              <div className="sam-field-group">
                <label className="sam-label">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="sam-input"
                />
              </div>

              <div className="sam-field-group">
                <label className="sam-label">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Customer Support Agent"
                  className="sam-input"
                />
              </div>
            </div>

            {!agentToEdit && (
              <div className="sam-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <label className="sam-label" style={{ margin: 0 }}>
                    Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPassword(generateTempPassword())}
                    title="Generate New Auto Temp Password"
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Auto-Generate Temp
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Generated temp password..."
                    className="sam-input"
                    style={{ paddingRight: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-muted, #64748B)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', marginTop: '2px' }}>
                  Auto-generated temp password will be emailed to the support agent for login.
                </span>
              </div>
            )}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sam-footer">
            <button
              type="button"
              onClick={onClose}
              className="sam-btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!agentToEdit && !isEmailVerified)}
              title={!agentToEdit && !isEmailVerified ? "Please verify email address with OTP code before creating support agent" : ""}
              className="sam-btn-submit"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : agentToEdit ? 'Save Changes' : 'Create Support Agent'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : null;
};
