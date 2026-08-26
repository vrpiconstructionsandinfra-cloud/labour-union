import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { resetPasswordApi } from '../services/api';
import './LoginPage.css';

interface ResetPasswordPageProps {
  token: string;
  onResetSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token,
  onResetSuccess
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your new password');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPasswordApi(token, newPassword);
      setIsLoading(false);
      setSuccessMsg(res.message || '✔ Password reset successfully! Redirecting to login page...');

      // Clear any previous cached token to force fresh login with new password
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setTimeout(() => {
        onResetSuccess();
      }, 1800);

    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to reset password. Token may be invalid or expired.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-hero-panel">
        <div className="hero-overlay-gradient"></div>
        <div className="hero-bg-image"></div>
        <div className="hero-content">
          <div className="hero-brand">
            <div className="brand-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15C10.9391 15 9.92172 15.4214 9.17157 16.1716C8.42143 16.9217 8 17.9391 8 19V21" stroke="white" strokeWidth="2"/>
                <path d="M12 11C13.6569 11 15 9.65685 15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8C9 9.65685 10.3431 11 12 11Z" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <div className="brand-title-wrap">
              <h2>Labor Union</h2>
              <p>Management System</p>
            </div>
          </div>
          <div className="hero-headline-wrap mt-24">
            <h1>Reset Your Password<br /><span className="headline-blue">Secure Account Access</span></h1>
            <p className="hero-subtitle">Update your credentials to maintain full control and security over your Labor Union portal.</p>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card-container">
          <div className="login-card animate-fade-in">
            <div className="card-top-icon-circle">
              <Lock size={24} color="#2563EB" />
            </div>

            <h2 className="card-heading">Set New Password</h2>
            <p className="card-subheading">Enter and confirm your new account password below</p>

            {errorMsg && (
              <div className="toast-banner toast-error animate-fade-in mb-12">
                <AlertCircle size={18} className="toast-icon" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="toast-banner toast-success animate-fade-in mb-12">
                <CheckCircle2 size={18} className="toast-icon" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label>New Password</label>
                <div className="input-field-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Confirm New Password</label>
                <div className="input-field-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button type="submit" className="sign-in-btn mt-12" disabled={isLoading}>
                {isLoading ? (
                  <span className="btn-loading-content">
                    <Loader2 size={18} className="spinner" /> Updating Password...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>

              <button
                type="button"
                className="social-btn mt-12"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
                onClick={onResetSuccess}
              >
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
