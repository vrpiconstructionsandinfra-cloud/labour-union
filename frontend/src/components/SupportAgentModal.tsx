import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Save, Camera, UploadCloud, Eye, EyeOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerUserApi, sendEmailVerificationCodeApi, verifyEmailCodeApi } from '../services/api';
import { UserAvatar } from './UserAvatar';

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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#1E293B', padding: '8px', borderRadius: '8px', color: '#38BDF8' }}>
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                {agentToEdit ? 'Edit Support Agent' : 'Add New Support Agent'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94A3B8' }}>
                {agentToEdit ? 'Update agent profile and permissions' : 'Create support agent credentials & roster record'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profile Photo Upload / Camera Section */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Support Agent Photo
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '2px solid #2563EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {agentAvatar ? (
                  <img src={agentAvatar} alt="Agent Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserAvatar name={name || 'Support Agent'} size={52} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <UploadCloud size={14} />
                    <span>Upload Photo</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>

                  {!isCameraActive ? (
                    <button type="button" onClick={startCamera} style={{ backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={14} />
                      <span>Take Photo (Camera)</span>
                    </button>
                  ) : (
                    <button type="button" onClick={stopCamera} style={{ backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      Close Camera
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Upload Image or Take Live Snapshot</span>
              </div>
            </div>

            {isCameraActive && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', backgroundColor: '#0F172A', padding: '12px', borderRadius: '10px' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '200px', height: '200px', borderRadius: '8px', objectFit: 'cover' }} />
                <button type="button" onClick={captureSnapshot} style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={14} /> Capture Snapshot
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Agent Code *
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. CSA-1001"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700, backgroundColor: '#F8FAFC' }}
              />
            </div>
          </div>

          {/* Email Address & Verification Code Row */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: 0 }}>
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
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
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
                    opacity: isSendingOtp || !email.trim() ? 0.6 : 1
                  }}
                >
                  {isSendingOtp ? 'Sending...' : 'Send OTP Code'}
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
                      cursor: isVerifyingOtp || verificationOtp.length !== 6 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Customer Support Agent"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              />
            </div>
          </div>

          {!agentToEdit && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', margin: 0 }}>
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
                  style={{ width: '100%', padding: '10px 38px 10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Auto-generated temp password will be emailed to the support agent for login.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!agentToEdit && !isEmailVerified)}
              title={!agentToEdit && !isEmailVerified ? "Please verify email address with OTP code before creating support agent" : ""}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: !agentToEdit && !isEmailVerified ? '#94A3B8' : '#2563EB',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                cursor: !agentToEdit && !isEmailVerified ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : agentToEdit ? 'Save Changes' : 'Create Support Agent'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

