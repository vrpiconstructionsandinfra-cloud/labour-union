import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Headset,
  ArrowLeft,
  Smartphone,
  Rocket
} from 'lucide-react';
import { loginApi, forgotPasswordApi, requestMobileApprovalApi, checkApprovalStatusApi, validateLoginForm, type ValidationErrors } from '../services/api';
import { EnquiryModal } from './EnquiryModal';
import './LoginPage.css';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess
}) => {
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Force empty fields on load
  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  // Forgot Password View Toggle
  const [isForgotView, setIsForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Mobile Approval States
  const [waitingForMobileAuth, setWaitingForMobileAuth] = useState(false);
  const [authRequestId, setAuthRequestId] = useState<string | null>(null);
  const [mobileTargetEmail, setMobileTargetEmail] = useState<string>('');

  // Validation & Error States
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  // Brute-force lockout state
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return parseInt(sessionStorage.getItem('login_attempts') || '0', 10);
  });
  const [lockoutUntil, setLockoutUntil] = useState<number>(() => {
    return parseInt(sessionStorage.getItem('login_lockout_until') || '0', 10);
  });
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number>(0);

  const isLockedOut = lockoutUntil > Date.now();

  useEffect(() => {
    if (!isLockedOut) {
      setLockoutSecondsLeft(0);
      return;
    }
    const tick = () => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutSecondsLeft(0);
        setLockoutUntil(0);
        setFailedAttempts(0);
        sessionStorage.removeItem('login_lockout_until');
        sessionStorage.removeItem('login_attempts');
      } else {
        setLockoutSecondsLeft(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil, isLockedOut]);

  // Mobile Polling Hook
  useEffect(() => {
    let pollTimer: any = null;
    if (waitingForMobileAuth && authRequestId) {
      pollTimer = setInterval(async () => {
        try {
          const res = await checkApprovalStatusApi(authRequestId);
          if (res.approved && res.token && res.user) {
            clearInterval(pollTimer);
            setWaitingForMobileAuth(false);
            setToastSuccess('✔ Mobile approval received! Logging in...');

            sessionStorage.setItem('token', res.token);
            sessionStorage.setItem('user', JSON.stringify(res.user));
            sessionStorage.removeItem('login_attempts');
            sessionStorage.removeItem('login_lockout_until');

            setTimeout(() => {
              onLoginSuccess(res.token, res.user);
            }, 800);
          } else if (res.status === 'EXPIRED') {
            clearInterval(pollTimer);
            setWaitingForMobileAuth(false);
            setServerError('Mobile approval link expired. Please try signing in again.');
          }
        } catch {
          // Keep polling silently
        }
      }, 2500);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [waitingForMobileAuth, authRequestId, onLoginSuccess]);

  const formatCountdown = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Trigger Mobile Approval Flow
  const handleTriggerMobileApproval = async (targetEmail: string) => {
    setIsLoading(true);
    setServerError(null);
    setToastSuccess(null);
    try {
      const res = await requestMobileApprovalApi(targetEmail);
      setIsLoading(false);
      setAuthRequestId(res.requestId);
      setMobileTargetEmail(targetEmail);
      setWaitingForMobileAuth(true);
      setToastSuccess('Approval email dispatched! Please tap the approval button on your phone.');
    } catch (err: any) {
      setIsLoading(false);
      setServerError(err.message || 'Failed to dispatch mobile approval email');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setToastSuccess(null);

    if (isLockedOut) {
      setServerError(`Account temporarily locked. Please wait ${formatCountdown(lockoutSecondsLeft)}.`);
      return;
    }

    if (isForgotView) {
      if (!forgotEmail || !forgotEmail.trim()) {
        setErrors({ email: 'Please enter your registered email' });
        return;
      }
      setIsLoading(true);
      try {
        await forgotPasswordApi(forgotEmail.trim());
        setIsLoading(false);
        setToastSuccess('Password reset link sent to your registered email!');
      } catch (err: any) {
        setIsLoading(false);
        setServerError(err.message || 'Unable to send password reset email');
      }
      return;
    }

    const validationErrors = validateLoginForm(email, password);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const data = await loginApi(email, password, 'MAIN');

      const roleStr = String(data.user?.role || '');
      const isSupportUser = roleStr === 'SUPPORT_AGENT' || roleStr === 'CUSTOMER_SUPPORT' || (data.user as any)?.designation?.toLowerCase().includes('support');
      if (isSupportUser) {
        setIsLoading(false);
        setServerError('Access Denied: Customer Support Agents must log in via the Customer Support Portal Login page.');
        return;
      }

      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.removeItem('login_attempts');
      sessionStorage.removeItem('login_lockout_until');
      setFailedAttempts(0);
      setLockoutUntil(0);

      setToastSuccess('✔ Sign in successful! Navigating to Dashboard...');

      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess(data.token, data.user);
      }, 800);

    } catch (err: any) {
      setIsLoading(false);
      const errMsg = err.message || 'Invalid credentials';
      const isTransientError =
        errMsg.toLowerCase().includes('database') ||
        errMsg.toLowerCase().includes('connection') ||
        errMsg.toLowerCase().includes('busy') ||
        errMsg.toLowerCase().includes('resuming') ||
        errMsg.toLowerCase().includes('server') ||
        errMsg.toLowerCase().includes('502') ||
        errMsg.toLowerCase().includes('network');

      if (isTransientError) {
        setServerError(errMsg);
        return;
      }

      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      sessionStorage.setItem('login_attempts', String(newAttempts));

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(lockUntil);
        sessionStorage.setItem('login_lockout_until', String(lockUntil));
        setServerError('Too many failed attempts. Your account is locked for 15 minutes.');
      } else {
        const attemptsLeft = MAX_ATTEMPTS - newAttempts;
        setServerError(`${errMsg} — ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`);
      }
    }
  };

  return (
    <div className="wave-login-wrapper">
      <div className="wave-login-card">
        {/* LEFT HERO PANEL (DESKTOP & TOP OF MOBILE) */}
        <div className="wave-hero-panel">
          {/* Subtle Glows */}
          <div className="hero-glow-circle-1" />
          <div className="hero-glow-circle-2" />

          {/* Layered Organic Clouds / Waves Divider */}
          <div className="wave-clouds-divider">
            <svg viewBox="0 0 100 600" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0C30 50 80 80 50 150C20 220 90 280 60 360C30 440 85 500 45 600H100V0H0Z" fill="rgba(255, 255, 255, 0.25)"/>
              <path d="M30 0C60 60 95 120 70 200C45 280 95 340 70 420C45 500 90 540 65 600H100V0H30Z" fill="rgba(255, 255, 255, 0.55)"/>
              <path d="M55 0C80 70 100 130 85 220C70 310 100 370 85 460C70 550 95 570 80 600H100V0H55Z" fill="#FFFFFF"/>
            </svg>
          </div>

          {/* Top Title */}
          <div className="wave-hero-top">
            <span className="wave-hero-welcome">Welcome to</span>
          </div>

          {/* Center Brand Badge */}
          <div className="wave-hero-center">
            <div className="wave-brand-circle">
              <Rocket size={46} color="#1d6bf3" />
            </div>
            <h1 className="wave-brand-title">Labor Union</h1>
            <p className="wave-hero-desc">
              A complete platform to manage working sites, field agents, workers, attendance, and payroll efficiently. Join our community and embark on a seamless journey with us!
            </p>
          </div>

          {/* Bottom Footer Links */}
          <div className="wave-hero-footer">
            <span>TERMS OF SERVICE</span>
            <span className="dot-sep">|</span>
            <span>PRIVACY POLICY</span>
          </div>
        </div>

        {/* RIGHT AUTHENTICATION FORM PANEL */}
        <div className="wave-form-panel">
          <div className="wave-form-header">
            <h2 className="wave-form-title">
              {isForgotView ? 'Reset Password' : 'Sign in to your account'}
            </h2>
            <p className="wave-form-sub">
              {isForgotView
                ? 'Enter your registered email address to receive reset instructions'
                : 'Enter your credentials below to access your dashboard'}
            </p>
          </div>

          {/* Toast Error Alert */}
          {serverError && (
            <div className="wave-toast-banner wave-toast-error">
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          )}

          {/* Toast Success Alert */}
          {toastSuccess && (
            <div className="wave-toast-banner wave-toast-success">
              <CheckCircle2 size={18} />
              <span>{toastSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {waitingForMobileAuth ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    color: '#1d6bf3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    border: '2px solid #BFDBFE'
                  }}
                >
                  <Smartphone size={32} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  Mobile Approval Dispatched
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
                  We sent an authentication email to <strong style={{ color: '#1d6bf3' }}>{mobileTargetEmail}</strong>. Tap the approval button on your phone to sign in automatically!
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="wave-submit-btn"
                    style={{ background: '#EFF6FF', color: '#1d6bf3', border: '1.5px solid #BFDBFE' }}
                    onClick={() => handleTriggerMobileApproval(mobileTargetEmail)}
                  >
                    Resend Email
                  </button>
                  <button
                    type="button"
                    className="wave-submit-btn"
                    style={{ background: '#F1F5F9', color: '#475569', border: '1.5px solid #CBD5E1' }}
                    onClick={() => setWaitingForMobileAuth(false)}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : isForgotView ? (
              <>
                <div className="wave-input-group">
                  <label className="wave-label">Registered Email</label>
                  <div className={`wave-input-wrapper ${errors.email ? 'has-error' : ''}`}>
                    <Mail size={18} className="wave-field-icon" />
                    <input
                      type="email"
                      className="wave-input"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      placeholder="Enter registered email"
                      required
                    />
                  </div>
                  {errors.email && <div className="wave-error-msg"><AlertCircle size={12} /> {errors.email}</div>}
                </div>

                <button
                  type="submit"
                  className="wave-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={18} className="spinner" /> : 'Send Password Reset Link'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button
                    type="button"
                    className="wave-enquiry-link"
                    onClick={() => {
                      setIsForgotView(false);
                      setServerError(null);
                      setToastSuccess(null);
                    }}
                  >
                    <ArrowLeft size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Back to Sign In
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Email Field */}
                <div className="wave-input-group">
                  <label className="wave-label">Email</label>
                  <div className={`wave-input-wrapper ${errors.email ? 'has-error' : ''}`}>
                    <Mail size={18} className="wave-field-icon" />
                    <input
                      type="email"
                      className="wave-input"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      placeholder="Enter email"
                      autoComplete="off"
                    />
                  </div>
                  {errors.email && <div className="wave-error-msg"><AlertCircle size={12} /> {errors.email}</div>}
                </div>

                {/* Password Field */}
                <div className="wave-input-group">
                  <label className="wave-label">Password</label>
                  <div className={`wave-input-wrapper ${errors.password ? 'has-error' : ''}`}>
                    <Lock size={18} className="wave-field-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="wave-input"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      placeholder="Enter Password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="wave-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <div className="wave-error-msg"><AlertCircle size={12} /> {errors.password}</div>}
                </div>

                {/* Controls Row */}
                <div className="wave-controls-row">
                  <label className="wave-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  <a
                    href="#forgot"
                    className="wave-forgot-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsForgotView(true);
                      setForgotEmail(email);
                      setServerError(null);
                      setToastSuccess(null);
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="wave-submit-btn"
                  disabled={isLoading || isLockedOut}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Authenticating...</span>
                    </>
                  ) : isLockedOut ? (
                    `Locked — ${formatCountdown(lockoutSecondsLeft)}`
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Support Portal Direct Button */}
                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="wave-support-redirect-btn"
                    onClick={() => { window.location.href = '/support/login'; }}
                  >
                    <Headset size={16} />
                    <span>Customer Support Portal Login</span>
                  </button>
                </div>

                {/* Enquiry / Registration Row */}
                <div className="wave-enquiry-row">
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    className="wave-enquiry-link"
                    onClick={() => setIsEnquiryModalOpen(true)}
                  >
                    Enquiry now
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Enquiry Form Modal */}
      {isEnquiryModalOpen && (
        <EnquiryModal
          isOpen={isEnquiryModalOpen}
          onClose={() => setIsEnquiryModalOpen(false)}
        />
      )}
    </div>
  );
};
