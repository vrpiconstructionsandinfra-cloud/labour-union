import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { updateUserApi, sendVerificationCodeApi, verifyCodeApi } from '../services/api';
import { ProfileCameraCaptureModal } from '../components/ProfileCameraCaptureModal';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  Upload,
  Trash2,
  KeyRound,
  ShieldAlert,
  Check,
  UserCheck,
  ArrowRightLeft,
  X,
  Lock,
  Shield,
  Layers,
  FileCheck
} from 'lucide-react';
import './Pages.css';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_AGENT';

  // Modal & Camera States
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Transfer Form States
  const [newSaName, setNewSaName] = useState('');
  const [newSaPhone, setNewSaPhone] = useState('');
  const [newSaEmail, setNewSaEmail] = useState('');
  const [newSaAddress, setNewSaAddress] = useState('');
  const [newSaAvatar, setNewSaAvatar] = useState<string | null>(null);
  const [newSaPassword, setNewSaPassword] = useState('');
  const [newSaConfirmPassword, setNewSaConfirmPassword] = useState('');

  // Email OTP Verification States
  const [isNewEmailVerified, setIsNewEmailVerified] = useState(false);
  const [verifiedEmailString, setVerifiedEmailString] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpMsg, setOtpMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transfer Action State
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferErrorMsg, setTransferErrorMsg] = useState<string | null>(null);
  const [globalSuccessMsg, setGlobalSuccessMsg] = useState<string | null>(null);

  // Regular Non-SuperAgent States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Sync state on user change
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Lock body scroll when transfer modal is open
  useEffect(() => {
    if (isTransferModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isTransferModalOpen]);

  // OTP Countdown timer
  useEffect(() => {
    let interval: any = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer]);

  // Reset transfer modal form
  const handleOpenTransferModal = () => {
    setNewSaName('');
    setNewSaPhone('');
    setNewSaEmail('');
    setNewSaAddress('');
    setNewSaAvatar(null);
    setNewSaPassword('');
    setNewSaConfirmPassword('');
    setIsNewEmailVerified(false);
    setVerifiedEmailString('');
    setOtpCode('');
    setOtpSent(false);
    setOtpTimer(0);
    setOtpMsg(null);
    setTransferErrorMsg(null);
    setIsTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setIsTransferModalOpen(false);
    setTransferErrorMsg(null);
    setOtpMsg(null);
  };

  const handleNewEmailChange = (val: string) => {
    setNewSaEmail(val);
    const clean = val.trim().toLowerCase();
    if (clean === (verifiedEmailString || '').trim().toLowerCase() && clean.length > 0) {
      setIsNewEmailVerified(true);
      setOtpMsg(null);
    } else {
      setIsNewEmailVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpMsg(null);
    }
  };

  const handleSendOtp = async () => {
    const cleanEmail = newSaEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setOtpMsg({ type: 'error', text: 'Please enter a valid email address first.' });
      return;
    }
    setIsSendingOtp(true);
    setOtpMsg(null);
    try {
      const res = await sendVerificationCodeApi(cleanEmail, newSaName.trim() || 'New Super Agent');
      setOtpSent(true);
      setOtpTimer(60);
      setOtpMsg({ type: 'success', text: res.message || `6-digit verification OTP sent to ${cleanEmail}` });
    } catch (err: any) {
      setOtpMsg({ type: 'error', text: err.message || 'Failed to send verification code. Please check email address.' });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpMsg({ type: 'error', text: 'Please enter the 6-digit OTP code received in email.' });
      return;
    }
    setIsVerifyingOtp(true);
    setOtpMsg(null);
    try {
      await verifyCodeApi(newSaEmail.trim(), otpCode.trim());
      setIsNewEmailVerified(true);
      setVerifiedEmailString(newSaEmail.trim());
      setOtpMsg({ type: 'success', text: '✔ Email address verified successfully!' });
    } catch (err: any) {
      setOtpMsg({ type: 'error', text: err.message || 'Invalid or expired OTP code. Please try again.' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo file size must be less than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setNewSaAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferErrorMsg(null);

    if (!newSaName.trim()) {
      setTransferErrorMsg('New Super Agent Full Name is mandatory.');
      return;
    }
    if (!newSaPhone.trim()) {
      setTransferErrorMsg('New Super Agent Mobile Number is mandatory.');
      return;
    }
    if (!newSaEmail.trim()) {
      setTransferErrorMsg('New Super Agent Email Address is mandatory.');
      return;
    }
    if (!isNewEmailVerified) {
      setTransferErrorMsg('Email verification is mandatory. Please send and verify the 6-digit OTP code before transferring.');
      return;
    }
    if (!newSaPassword || newSaPassword.length < 6) {
      setTransferErrorMsg('New Super Agent login password is required (minimum 6 characters).');
      return;
    }
    if (newSaPassword !== newSaConfirmPassword) {
      setTransferErrorMsg('Password and confirm password do not match.');
      return;
    }

    if (!user?.id) {
      setTransferErrorMsg('User session ID not found. Please log in again.');
      return;
    }

    setIsTransferring(true);
    try {
      const payload: any = {
        name: newSaName.trim(),
        email: newSaEmail.trim(),
        phone: newSaPhone.trim(),
        address: newSaAddress.trim() || undefined,
        avatar: newSaAvatar || undefined,
        profileImage: newSaAvatar || undefined,
        password: newSaPassword
      };

      await updateUserApi(user.id, payload);
      await refreshUser();

      setIsTransferModalOpen(false);
      setGlobalSuccessMsg(`🎉 Super Agent ownership successfully transferred to ${newSaName.trim()}! Master profile and credentials updated.`);
      setTimeout(() => setGlobalSuccessMsg(null), 8000);
    } catch (err: any) {
      setTransferErrorMsg(err.message || 'Failed to transfer Super Agent identity. Please try again.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Regular Non-SuperAgent Profile Handler
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (!name.trim()) {
      setProfileErrorMsg('Full Name is required.');
      return;
    }

    if (!user?.id) return;

    setIsUpdatingProfile(true);
    try {
      await updateUserApi(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      await refreshUser();
      setIsUpdatingProfile(false);
      setProfileSuccessMsg('✔ Profile details updated successfully!');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsUpdatingProfile(false);
      setProfileErrorMsg(err.message || 'Failed to update profile details.');
    }
  };

  // Regular Non-SuperAgent Password Handler
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (!user?.id) return;

    setIsUpdatingPassword(true);
    try {
      await updateUserApi(user.id, {
        currentPassword,
        newPassword,
        confirmPassword
      });
      setIsUpdatingPassword(false);
      setPasswordSuccessMsg('✔ Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsUpdatingPassword(false);
      setPasswordErrorMsg(err.message || 'Failed to update password. Please verify current password.');
    }
  };

  const currentUserIdStr = user?.id ? String(user.id) : '';
  const currentUserNameStr = user?.name ? String(user.name) : 'SA';

  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: '24px 20px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Global Success Notification */}
      {globalSuccessMsg && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1.5px solid #10B981',
          color: '#065F46',
          padding: '16px 20px',
          borderRadius: '14px',
          fontSize: '14px',
          fontWeight: 700,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}>
          <CheckCircle2 size={22} color="#059669" />
          <span>{globalSuccessMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{isSuperAdmin ? 'Super Agent Profile & Master Account' : 'Account Profile & Settings'}</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: isSuperAdmin ? '#EEF2FF' : '#EFF6FF',
              color: isSuperAdmin ? '#4F46E5' : '#2563EB',
              padding: '4px 12px',
              borderRadius: '9999px',
              border: isSuperAdmin ? '1px solid #C7D2FE' : '1px solid #BFDBFE',
              letterSpacing: '0.5px'
            }}>
              {isSuperAdmin ? 'MASTER ROOT ACCESS' : `${user?.role || 'WORKER'} MODE`}
            </span>
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px' }}>
            {isSuperAdmin
              ? 'View active Super Agent credentials and transfer master system ownership with verified identity onboarding.'
              : 'Manage your personal profile information, contact preferences, and account security password.'}
          </p>
        </div>
      </div>

      {isSuperAdmin ? (
        /* ═════════════════════════════════════════════════════════════════════
           SUPER AGENT CLEAN HERO DASHBOARD VIEW
           ═════════════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Hero Card */}
          <div style={{
            background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
            border: '1.5px solid #E2E8F0',
            borderRadius: '20px',
            padding: '32px 28px',
            boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.06)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top decorative accent */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '5px',
              background: 'linear-gradient(90deg, #4F46E5 0%, #6366F1 50%, #38BDF8 100%)'
            }} />

            {/* Hero Header Pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#EEF2FF',
                border: '1px solid #C7D2FE',
                color: '#4338CA',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)' }} />
                <span>Active Master Super Agent</span>
              </div>

              <div style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                System Access: <strong style={{ color: '#0F172A' }}>Unrestricted Root Owner</strong>
              </div>
            </div>

            {/* Profile Information & Action Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '24px',
              borderBottom: '1px solid #E2E8F0',
              paddingBottom: '28px',
              marginBottom: '28px'
            }}>
              {/* Left Profile Avatar & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                  border: '3.5px solid #4F46E5',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(79, 70, 229, 0.2)',
                  flexShrink: 0
                }}>
                  {(user as any)?.avatar || user?.profileImage ? (
                    <img
                      src={(user as any)?.avatar || user?.profileImage}
                      alt={user?.name || 'Super Agent'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '32px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1px' }}>
                      {currentUserNameStr.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>{user?.name || 'Super Agent'}</span>
                    <ShieldCheck size={22} color="#4F46E5" />
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}>
                      {user?.designation || 'Master Administrator'}
                    </span>
                    <span style={{
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Check size={13} />
                      <span>Verified Super Agent</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Prominent Action: Transfer Super Agent */}
              <div>
                <button
                  type="button"
                  onClick={handleOpenTransferModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(79, 70, 229, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.35)';
                  }}
                >
                  <ArrowRightLeft size={18} />
                  <span>Change / Transfer Super Agent</span>
                </button>
              </div>
            </div>

            {/* Profile Metadata Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}>
              {/* Phone Card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Mobile Phone</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user?.phone || 'Not registered'}
                  </div>
                </div>
              </div>

              {/* Email Card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Verified Email</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user?.email || 'admin@laborunion.org'}
                  </div>
                </div>
              </div>

              {/* Address Card */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FAF5FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Official Location</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user?.address || 'Labor Union Headquarters'}
                  </div>
                </div>
              </div>

              {/* Master Root ID */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Master Account ID</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5', marginTop: '2px', fontFamily: 'monospace' }}>
                    #{currentUserIdStr ? currentUserIdStr.slice(0, 8).toUpperCase() : 'SA-ROOT'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security & System Continuity Overview Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {/* Feature 1 */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '22px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                  <Layers size={18} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Zero-Downtime Ownership Transfer
                </h4>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Changing the Super Agent seamlessly transfers master administrative credentials and identity while preserving 100% of all worker rosters, project sites, and audit logs.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '22px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#059669' }}>
                  <ShieldCheck size={18} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Mandatory OTP Email Security
                </h4>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Every Super Agent transfer requires live 6-digit email OTP verification before credentials can be assigned, ensuring bank-grade protection against unauthorized takeovers.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '22px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  <FileCheck size={18} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Live Camera & Photo Upload
                </h4>
              </div>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                Capture instant live webcam snapshots or upload high-resolution identification photos for the new incoming Super Agent with automatic square cropping.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════
           REGULAR PROFILE & PASSWORD CARDS (AGENT / WORKER)
           ═════════════════════════════════════════════════════════════════════ */
        <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Profile Card */}
          <form className="module-card" onSubmit={handleProfileSubmit} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="#2563EB" />
              <span>Personal Profile Details</span>
            </h3>

            {profileSuccessMsg && (
              <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{profileErrorMsg}</span>
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Role / Membership</label>
              <input
                type="text"
                value={user?.role || 'WORKER'}
                readOnly
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '13.5px', fontWeight: 700 }}
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isUpdatingProfile ? <Loader2 size={16} className="spinner" /> : null}
              <span>{isUpdatingProfile ? 'Saving Profile...' : 'Save Profile Details'}</span>
            </button>
          </form>

          {/* Change Password Card */}
          <form className="module-card" onSubmit={handlePasswordSubmit} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#059669" />
              <span>Account Security & Change Password</span>
            </h3>

            {passwordSuccessMsg && (
              <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{passwordErrorMsg}</span>
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Current Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Enter new password (min 6 chars)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Confirm new password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              style={{ backgroundColor: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isUpdatingPassword ? <Loader2 size={16} className="spinner" /> : null}
              <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
         TRANSFER SUPER AGENT MODAL (PORTALED TO DOCUMENT.BODY)
         ═════════════════════════════════════════════════════════════════════ */}
      {isTransferModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 12px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: 'min(90vh, 760px)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: '1.5px solid #E2E8F0',
            overflow: 'hidden',
            margin: 'auto'
          }}>
            
            {/* Modal Header (Fixed) */}
            <div style={{
              flexShrink: 0,
              padding: '18px 22px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#EEF2FF', color: '#4F46E5', display: 'flex' }}>
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Transfer Super Agent Ownership
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                    Onboard new master administrator identity with mandatory OTP verification.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseTransferModal}
                style={{
                  border: 'none',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form id="transfer-sa-form" onSubmit={handleExecuteTransfer} style={{
              flex: '1 1 auto',
              overflowY: 'auto',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              WebkitOverflowScrolling: 'touch'
            }}>
              
              {/* Error Alert */}
              {transferErrorMsg && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1.5px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{transferErrorMsg}</span>
                </div>
              )}

              {/* Profile Photo Picker (Live Camera & File Upload) */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1.5px dashed #CBD5E1',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    backgroundColor: '#EEF2FF',
                    border: '3px solid #4F46E5',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.15)'
                  }}>
                    {newSaAvatar ? (
                      <img src={newSaAvatar} alt="New Super Agent" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '22px', fontWeight: 800, color: '#4F46E5' }}>
                        {(newSaName ? String(newSaName) : 'SA').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      New Super Agent Photo
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                      Webcam capture or upload JPG/PNG (max 5MB)
                    </div>
                  </div>
                </div>

                {/* Photo Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      backgroundColor: '#EEF2FF',
                      color: '#4F46E5',
                      border: '1px solid #C7D2FE',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Camera size={14} />
                    <span>Take Photo</span>
                  </button>

                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}>
                    <Upload size={14} />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {newSaAvatar && (
                    <button
                      type="button"
                      onClick={() => setNewSaAvatar(null)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '7px 10px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Name & Mobile Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    New Super Agent Full Name <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={newSaName}
                      onChange={(e) => setNewSaName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}
                    />
                  </div>
                </div>

                {/* Mobile Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Mobile Phone Number <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                      <Phone size={15} />
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 9876543210"
                      value={newSaPhone}
                      onChange={(e) => setNewSaPhone(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 600, color: '#0F172A' }}
                    />
                  </div>
                </div>
              </div>

              {/* Residential / Office Address */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Residential / Official Office Address
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '10px', color: '#64748B' }}>
                    <MapPin size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 402, Union Heights, Brigade Road, Bengaluru"
                    value={newSaAddress}
                    onChange={(e) => setNewSaAddress(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', color: '#0F172A' }}
                  />
                </div>
              </div>

              {/* Email Address & Mandatory OTP Verification */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  New Super Agent Email (Mandatory OTP Verification) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="e.g. newsuperagent@laborunion.org"
                    value={newSaEmail}
                    onChange={(e) => handleNewEmailChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 34px',
                      borderRadius: '8px',
                      border: isNewEmailVerified ? '1.5px solid #10B981' : '1.5px solid #F59E0B',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF'
                    }}
                  />
                </div>

                {/* Verification Box */}
                {isNewEmailVerified ? (
                  <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#047857', fontSize: '12.5px', fontWeight: 700 }}>
                      <CheckCircle2 size={15} />
                      <span>Email Verified: {newSaEmail}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', backgroundColor: '#D1FAE5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                      ✔ VERIFIED
                    </span>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400E', fontSize: '12px', fontWeight: 700 }}>
                        <ShieldAlert size={15} color="#D97706" style={{ flexShrink: 0 }} />
                        <span>6-Digit email verification OTP required before transfer.</span>
                      </div>
                      <button
                        type="button"
                        disabled={isSendingOtp || otpTimer > 0 || !newSaEmail.trim() || !newSaEmail.includes('@')}
                        onClick={handleSendOtp}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#4F46E5',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '7px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: isSendingOtp || otpTimer > 0 || !newSaEmail.trim() ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          opacity: !newSaEmail.trim() || !newSaEmail.includes('@') ? 0.6 : 1
                        }}
                      >
                        {isSendingOtp ? <Loader2 size={13} className="spinner" /> : <Mail size={13} />}
                        <span>{otpTimer > 0 ? `Resend in ${otpTimer}s` : (otpSent ? 'Resend Code' : 'Send Verification Code')}</span>
                      </button>
                    </div>

                    {otpSent && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', borderTop: '1px dashed #FDE68A', paddingTop: '10px' }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP..."
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          style={{
                            width: '160px',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            border: '1.5px solid #4F46E5',
                            fontSize: '14px',
                            fontWeight: 800,
                            letterSpacing: '3px',
                            textAlign: 'center',
                            color: '#0F172A',
                            backgroundColor: '#FFFFFF'
                          }}
                        />
                        <button
                          type="button"
                          disabled={isVerifyingOtp || otpCode.length < 6}
                          onClick={handleVerifyOtp}
                          style={{
                            padding: '7px 14px',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: isVerifyingOtp || otpCode.length < 6 ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: otpCode.length < 6 ? 0.6 : 1
                          }}
                        >
                          {isVerifyingOtp ? <Loader2 size={13} className="spinner" /> : <Check size={13} />}
                          <span>Verify OTP Code</span>
                        </button>
                      </div>
                    )}

                    {otpMsg && (
                      <div style={{ fontSize: '11.5px', fontWeight: 700, color: otpMsg.type === 'success' ? '#15803D' : '#DC2626' }}>
                        {otpMsg.text}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Login Password & Confirm Password */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    New Login Password <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                      <KeyRound size={15} />
                    </span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters..."
                      value={newSaPassword}
                      onChange={(e) => setNewSaPassword(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    Confirm Password <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                      <Lock size={15} />
                    </span>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Confirm password..."
                      value={newSaConfirmPassword}
                      onChange={(e) => setNewSaConfirmPassword(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Security Transfer Notice */}
              <div style={{
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '11px 14px',
                fontSize: '11.5px',
                color: '#475569',
                lineHeight: '1.4'
              }}>
                <strong style={{ color: '#0F172A' }}>Security & Continuity Guarantee:</strong> Transferring ownership updates active Super Agent credentials and master identity. All existing field agents, registered workers, project sites, and financial audit logs will remain intact with zero data loss.
              </div>
            </form>

            {/* Modal Fixed Footer Actions */}
            <div style={{
              flexShrink: 0,
              padding: '14px 22px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={handleCloseTransferModal}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  border: '1px solid #CBD5E1',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                form="transfer-sa-form"
                disabled={
                  isTransferring ||
                  !isNewEmailVerified ||
                  !newSaName.trim() ||
                  !newSaPhone.trim() ||
                  !newSaPassword ||
                  newSaPassword.length < 6 ||
                  newSaPassword !== newSaConfirmPassword
                }
                style={{
                  padding: '10px 24px',
                  backgroundColor:
                    isNewEmailVerified &&
                    newSaName.trim() &&
                    newSaPhone.trim() &&
                    newSaPassword.length >= 6 &&
                    newSaPassword === newSaConfirmPassword
                      ? '#4F46E5'
                      : '#94A3B8',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '9px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor:
                    isNewEmailVerified &&
                    newSaName.trim() &&
                    newSaPhone.trim() &&
                    newSaPassword.length >= 6 &&
                    newSaPassword === newSaConfirmPassword &&
                    !isTransferring
                      ? 'pointer'
                      : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isNewEmailVerified ? '0 4px 14px rgba(79, 70, 229, 0.25)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isTransferring ? <Loader2 size={15} className="spinner" /> : <UserCheck size={15} />}
                <span>{isTransferring ? 'Transferring Super Agent...' : 'Confirm & Transfer Super Agent'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Profile Camera Capture Modal */}
      <ProfileCameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(photoDataUrl) => setNewSaAvatar(photoDataUrl)}
      />
    </div>
  );
};

export default SettingsPage;
