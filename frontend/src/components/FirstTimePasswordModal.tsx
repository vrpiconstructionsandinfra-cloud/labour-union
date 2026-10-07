import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { changeFirstTimePasswordApi } from '../services/api';

interface FirstTimePasswordModalProps {
  isOpen: boolean;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  token: string;
  onSuccess: (updatedUser: any) => void;
  onCancel: () => void;
}

export const FirstTimePasswordModal: React.FC<FirstTimePasswordModalProps> = ({
  isOpen,
  userEmail,
  userName,
  userRole,
  token,
  onSuccess,
  onCancel,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const isMinLength = newPassword.length >= 6;
  const isMatching = newPassword.length > 0 && newPassword === confirmPassword;
  const isValid = isMinLength && isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isMinLength) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (!isMatching) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await changeFirstTimePasswordApi(newPassword, token);
      onSuccess(res.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          color: '#0F172A',
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
            padding: '28px 28px 24px',
            color: '#FFFFFF',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            }}
          >
            <ShieldCheck size={32} color="#FFFFFF" />
          </div>

          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '3px 10px',
              borderRadius: '999px',
              display: 'inline-block',
              marginBottom: '8px',
            }}
          >
            First-Time Login Security
          </span>

          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
            Set Your Permanent Password
          </h2>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.85)',
              lineHeight: 1.45,
            }}
          >
            You are signing in with a temporary password. For safety, please create a new permanent password to continue.
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* User Details Pill */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>{userName || 'Administrator'}</div>
              <div style={{ color: '#64748B', fontSize: '12px' }}>{userEmail}</div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#FEF3C7',
                color: '#B45309',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {userRole === 'ADMIN' ? 'Area Administrator' : userRole || 'User'}
            </span>
          </div>

          {errorMessage && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '18px',
                color: '#B91C1C',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                New Permanent Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 36px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Confirm New Password <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                  }}
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 36px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Validation Checklist */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isMinLength ? '#16A34A' : '#94A3B8' }}>
                <CheckCircle2 size={14} />
                <span>At least 6 characters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isMatching ? '#16A34A' : '#94A3B8' }}>
                <CheckCircle2 size={14} />
                <span>Passwords match</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                Back to Sign In
              </button>

              <button
                type="submit"
                disabled={!isValid || loading}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isValid ? '#2563EB' : '#94A3B8',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: isValid && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isValid ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
                  transition: 'background 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Set Password & Enter</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
