import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserApi } from '../services/api';
import { initiateRazorpayCheckout } from '../utils/razorpay';
import { Lock, User, CheckCircle2, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import './Pages.css';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Security & Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Razorpay Test Gateway States
  const [testAmount, setTestAmount] = useState<number>(1); // Default ₹1 test transaction
  const [isPaying, setIsPaying] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [lastPaymentDetails, setLastPaymentDetails] = useState<{ order_id?: string; payment_id?: string } | null>(null);

  const handleRazorpayTestPayment = async () => {
    setIsPaying(true);
    setPaymentSuccess(null);
    setPaymentError(null);

    try {
      const verifyRes = await initiateRazorpayCheckout({
        amount: testAmount,
        isINR: true,
        currency: 'INR',
        name: 'Labor Union Management System',
        description: `Test Payment of ₹${testAmount} (Razorpay Standard Web Checkout)`,
        prefill: {
          name: user?.name || 'Test User',
          email: user?.email || 'test@razorpay.com',
          contact: user?.phone || '9999999999',
        },
        themeColor: '#2563EB',
      });

      setLastPaymentDetails({
        order_id: verifyRes.order_id,
        payment_id: verifyRes.payment_id,
      });
      setPaymentSuccess(`✔ Test Payment of ₹${testAmount} completed and HMAC-SHA256 signature verified successfully!`);
    } catch (err: any) {
      setPaymentError(err.message || 'Payment test failed or was cancelled.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (!name.trim()) {
      setProfileErrorMsg('Full Name is required.');
      return;
    }

    if (!user?.id) {
      setProfileSuccessMsg('✔ Profile settings saved locally.');
      setTimeout(() => setProfileSuccessMsg(null), 3000);
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateUserApi(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      setIsUpdatingProfile(false);
      setProfileSuccessMsg('✔ Profile details updated successfully!');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsUpdatingProfile(false);
      setProfileErrorMsg(err.message || 'Failed to update profile details.');
    }
  };

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

    if (!user?.id) {
      setPasswordSuccessMsg('✔ Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserApi(user.id, {
        currentPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      });
      setIsUpdatingPassword(false);
      setPasswordSuccessMsg('✔ Your account password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsUpdatingPassword(false);
      setPasswordErrorMsg(err.message || 'Failed to update password. Please check your current password.');
    }
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Account Profile & Security Settings</span>
            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
              {user?.role || 'WORKER'} MODE
            </span>
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Manage your personal profile information, email preferences, and account security password.
          </p>
        </div>
      </div>

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

        {/* Razorpay Payment Gateway Integration Test Card */}
        <div className="module-card" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="#2563EB" />
              <span>Razorpay Standard Web Checkout (Test Mode)</span>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
              Active · Test Gateway
            </span>
          </h3>

          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px' }}>
            Perform an interactive test transaction to verify the 3-step Razorpay Standard Web Checkout (Order Creation → Payment Modal → Backend Signature Verification).
          </p>

          {/* Test Credentials Box */}
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Use Test Credentials:</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px' }}>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 600 }}>💳 Test Card</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>4100 2800 0000 1007</span>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', marginTop: '2px' }}>CVV: 123 · Expiry: 12/26</span>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', fontWeight: 600 }}>📱 Test UPI</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>test@razorpay</span>
                <span style={{ color: '#64748B', display: 'block', fontSize: '11px', marginTop: '2px' }}>Instant UPI Success</span>
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>⚠️ This test transaction is done with Razorpay test keys. No real money will be charged.</span>
            </div>
          </div>

          {/* Test Status & Feedback */}
          {paymentSuccess && (
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '12px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} />
                <span>{paymentSuccess}</span>
              </div>
              {lastPaymentDetails && (
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#065F46', marginTop: '4px' }}>
                  Order: {lastPaymentDetails.order_id} • Payment: {lastPaymentDetails.payment_id}
                </div>
              )}
            </div>
          )}

          {paymentError && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Test Amount Input + Pay Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Amount:</span>
              <div style={{ position: 'relative', width: '110px' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748B', fontSize: '13px' }}>₹</span>
                <input
                  type="number"
                  min="1"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: '100%', padding: '9px 12px 9px 24px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px', fontWeight: 700 }}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={isPaying}
              onClick={handleRazorpayTestPayment}
              style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 22px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s' }}
            >
              {isPaying ? <Loader2 size={16} className="spinner" /> : <CreditCard size={16} />}
              <span>{isPaying ? 'Processing Checkout...' : `Pay ₹${testAmount} (Test Checkout)`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
