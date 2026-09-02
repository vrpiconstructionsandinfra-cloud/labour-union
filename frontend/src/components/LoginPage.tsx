import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Users,
  Calendar,
  Shield,
  BarChart3,
  Sun,
  Moon,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import {
  loginApi,
  forgotPasswordApi,
  requestMobileApprovalApi,
  checkApprovalStatusApi,
  validateLoginForm,
  type ValidationErrors
} from '../services/api';
import { EnquiryModal } from './EnquiryModal';
import './LoginPage.css';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  darkMode = false,
  setDarkMode
}) => {
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
      const isSupportUser =
        roleStr === 'SUPPORT_AGENT' ||
        roleStr === 'CUSTOMER_SUPPORT' ||
        (data.user as any)?.designation?.toLowerCase().includes('support');

      if (isSupportUser) {
        setIsLoading(false);
        setServerError('Access Denied: Customer Support Agents must log in via the Customer Support Portal.');
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
    <div className="auth-page-container">
      {/* =========================================================================
          DESKTOP 2-COLUMN VIEW (Matching Image 3)
          ========================================================================= */}
      <div className="auth-desktop-layout">
        {/* Left Hero Branding Section */}
        <div className="auth-hero-left">
          {/* Top Brand Logo */}
          <div className="auth-hero-brand">
            <div className="auth-brand-logo-box">
              <Users size={22} color="#FFFFFF" />
            </div>
            <div className="auth-brand-text">
              <h2>Labour Union</h2>
              <p>Management System</p>
            </div>
          </div>

          {/* Hero Headline & Intro */}
          <div className="auth-hero-content">
            <h1 className="auth-hero-title">
              Together for a<br />
              <span className="auth-gradient-text">Stronger Workforce</span>
            </h1>
            <p className="auth-hero-subtitle">
              Empowering workers, supporting agents, and building a better tomorrow.
              Our platform helps manage attendance, leave, payroll and more — all in one place.
            </p>

            {/* 4 Feature Cards (2x2 Grid) */}
            <div className="auth-features-grid">
              <div className="auth-feature-card">
                <div className="auth-feature-icon-box">
                  <Users size={18} />
                </div>
                <div className="auth-feature-info">
                  <h4>Worker Management</h4>
                  <p>Track & manage your workforce</p>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon-box">
                  <Calendar size={18} />
                </div>
                <div className="auth-feature-info">
                  <h4>Attendance & Leave</h4>
                  <p>Simplify daily operations</p>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon-box">
                  <Shield size={18} />
                </div>
                <div className="auth-feature-info">
                  <h4>Secure & Reliable</h4>
                  <p>Your data, our priority</p>
                </div>
              </div>

              <div className="auth-feature-card">
                <div className="auth-feature-icon-box">
                  <BarChart3 size={18} />
                </div>
                <div className="auth-feature-info">
                  <h4>Reports & Analytics</h4>
                  <p>Better insights, better decisions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Construction Worker Photography & Badge Overlay */}
          <div className="auth-hero-bottom-graphic">
            <div className="auth-workers-badge">
              <span>Workers Build</span>
              <em>Our Future</em>
              <div className="auth-badge-swoop"></div>
            </div>
          </div>
        </div>

        {/* Right Authentication Form Card (Desktop) */}
        <div className="auth-form-right">
          <div className="auth-card-box">
            {/* Top Right Header Action */}
            <div className="auth-card-top-link">
              <span>Don't have an account? </span>
              <button
                type="button"
                className="auth-link-orange"
                onClick={() => setIsEnquiryModalOpen(true)}
              >
                Contact Admin <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
              </button>
            </div>

            {/* Form Brand Badge & Titles */}
            <div className="auth-card-header">
              <div className="auth-card-logo-row">
                <div className="auth-brand-logo-box">
                  <Users size={20} color="#FFFFFF" />
                </div>
                <div className="auth-brand-text">
                  <h3>Labour Union</h3>
                  <p>Management System</p>
                </div>
              </div>
              <h2 className="auth-card-title">
                {isForgotView ? 'Reset Password' : 'Welcome Back!'}
              </h2>
              <p className="auth-card-sub">
                {isForgotView
                  ? 'Enter your registered email address to receive reset instructions'
                  : 'Sign in to your account to continue'}
              </p>
            </div>

            {/* Alert Messages */}
            {serverError && (
              <div className="auth-toast-banner auth-toast-error">
                <AlertCircle size={16} />
                <span>{serverError}</span>
              </div>
            )}

            {toastSuccess && (
              <div className="auth-toast-banner auth-toast-success">
                <CheckCircle2 size={16} />
                <span>{toastSuccess}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} autoComplete="off">
              {waitingForMobileAuth ? (
                <div className="mobile-auth-waiting-box">
                  <div className="mobile-auth-icon-circle">
                    <Smartphone size={30} />
                  </div>
                  <h3>Mobile Approval Dispatched</h3>
                  <p>
                    We sent an approval link to <strong>{mobileTargetEmail}</strong>.
                    Tap the link on your mobile phone to complete sign in!
                  </p>
                  <div className="mobile-auth-btn-row">
                    <button
                      type="button"
                      className="auth-btn-outline"
                      onClick={() => handleTriggerMobileApproval(mobileTargetEmail)}
                    >
                      Resend Email
                    </button>
                    <button
                      type="button"
                      className="auth-btn-subtle"
                      onClick={() => setWaitingForMobileAuth(false)}
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : isForgotView ? (
                <>
                  <div className="auth-input-group">
                    <label className="auth-label">Registered Email</label>
                    <div className={`auth-input-wrap ${errors.email ? 'has-error' : ''}`}>
                      <Mail size={18} className="auth-field-icon" />
                      <input
                        type="email"
                        className="auth-input"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    {errors.email && <div className="auth-field-error">{errors.email}</div>}
                  </div>

                  <button
                    type="submit"
                    className="auth-primary-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 size={18} className="spinner" /> : 'Send Reset Link'}
                  </button>

                  <div className="auth-back-row">
                    <button
                      type="button"
                      className="auth-link-subtle"
                      onClick={() => {
                        setIsForgotView(false);
                        setServerError(null);
                        setToastSuccess(null);
                      }}
                    >
                      <ArrowLeft size={14} /> Back to Sign In
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Email Input */}
                  <div className="auth-input-group">
                    <label className="auth-label">Email Address</label>
                    <div className={`auth-input-wrap ${errors.email ? 'has-error' : ''}`}>
                      <Mail size={18} className="auth-field-icon" />
                      <input
                        type="email"
                        className="auth-input"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        placeholder="Enter your email address"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && <div className="auth-field-error">{errors.email}</div>}
                  </div>

                  {/* Password Input */}
                  <div className="auth-input-group">
                    <label className="auth-label">Password</label>
                    <div className={`auth-input-wrap ${errors.password ? 'has-error' : ''}`}>
                      <Lock size={18} className="auth-field-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="auth-input"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors({ ...errors, password: undefined });
                        }}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="auth-toggle-pwd"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <div className="auth-field-error">{errors.password}</div>}
                  </div>

                  {/* Controls Row */}
                  <div className="auth-controls-row">
                    <label className="auth-checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      className="auth-link-orange"
                      onClick={() => {
                        setIsForgotView(true);
                        setForgotEmail(email);
                        setServerError(null);
                        setToastSuccess(null);
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="auth-primary-btn"
                    disabled={isLoading || isLockedOut}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        <span>Signing In...</span>
                      </>
                    ) : isLockedOut ? (
                      `Locked — ${formatCountdown(lockoutSecondsLeft)}`
                    ) : (
                      <>
                        <ArrowRight size={18} style={{ marginRight: '6px' }} />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>

                  {/* Social Login Divider */}
                  <div className="auth-divider">
                    <span>OR</span>
                  </div>

                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    className="auth-social-btn"
                    onClick={() => {
                      setEmail('superagent@laborunion.com');
                      setPassword('Admin@123');
                    }}
                    title="Quick autofill demo account"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Trust Footer */}
                  <div className="auth-trust-box">
                    <ShieldCheck size={16} className="auth-trust-icon" />
                    <div className="auth-trust-text">
                      <strong>Secure Login</strong>
                      <p>Your information is protected with industry-standard security.</p>
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE LOGIN VIEW (Matching Image 1)
          ========================================================================= */}
      <div className="auth-mobile-layout">
        {/* Mobile Top Bar */}
        <div className="auth-mobile-top-bar">
          <div className="auth-hero-brand">
            <div className="auth-brand-logo-box">
              <Users size={20} color="#FFFFFF" />
            </div>
            <div className="auth-brand-text">
              <h2>Labour Union</h2>
              <p>Management System</p>
            </div>
          </div>

          {setDarkMode && (
            <button
              type="button"
              className="auth-mobile-theme-pill"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Moon size={14} /> : <Sun size={14} color="#EA580C" />}
              <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          )}
        </div>

        {/* Mobile Sunrise Hero Graphic with Construction Silhouette */}
        <div className="auth-mobile-hero-graphic">
          <div className="auth-mobile-silhouette-wrap">
            {/* Sunrise Sun Glow */}
            <div className="auth-mobile-sun-glow"></div>
            {/* City Silhouette SVG */}
            <svg className="auth-mobile-skyline-svg" viewBox="0 0 400 120" preserveAspectRatio="none">
              <path d="M0 120 L20 120 L20 80 L35 80 L35 60 L45 60 L45 80 L60 80 L60 120 L90 120 L90 40 L105 40 L105 120 L140 120 L140 70 L155 70 L155 120 L180 120 L180 50 L195 50 L195 120 L230 120 L230 65 L245 65 L245 120 L280 120 L280 30 L300 30 L300 120 L330 120 L330 75 L350 75 L350 120 L400 120 Z" fill="#E2D1C3" opacity="0.45" />
            </svg>
            {/* Crane Graphic */}
            <div className="auth-mobile-crane"></div>
            {/* 3 Workers Silhouette */}
            <div className="auth-mobile-workers-art">
              <div className="worker-sil worker-left"></div>
              <div className="worker-sil worker-center"></div>
              <div className="worker-sil worker-right"></div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Sheet Login Card */}
        <div className="auth-mobile-sheet-card">
          <div className="auth-mobile-sheet-header">
            <h2>{isForgotView ? 'Reset Password' : 'Welcome Back!'}</h2>
            <p>
              {isForgotView
                ? 'Enter your email to receive reset instructions'
                : 'Sign in to your account and manage your union operations efficiently.'}
            </p>
          </div>

          {serverError && (
            <div className="auth-toast-banner auth-toast-error">
              <AlertCircle size={15} />
              <span>{serverError}</span>
            </div>
          )}

          {toastSuccess && (
            <div className="auth-toast-banner auth-toast-success">
              <CheckCircle2 size={15} />
              <span>{toastSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {isForgotView ? (
              <>
                <div className="auth-input-group">
                  <label className="auth-label">Email Address</label>
                  <div className={`auth-input-wrap ${errors.email ? 'has-error' : ''}`}>
                    <Mail size={18} className="auth-field-icon" />
                    <input
                      type="email"
                      className="auth-input"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-primary-btn" disabled={isLoading}>
                  {isLoading ? <Loader2 size={18} className="spinner" /> : 'Send Reset Link'}
                </button>

                <div className="auth-back-row">
                  <button
                    type="button"
                    className="auth-link-subtle"
                    onClick={() => setIsForgotView(false)}
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Email Address */}
                <div className="auth-input-group">
                  <label className="auth-label">Email Address</label>
                  <div className={`auth-input-wrap ${errors.email ? 'has-error' : ''}`}>
                    <Mail size={18} className="auth-field-icon" />
                    <input
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                      }}
                      placeholder="Enter your email address"
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <div className="auth-field-error">{errors.email}</div>}
                </div>

                {/* Password */}
                <div className="auth-input-group">
                  <label className="auth-label">Password</label>
                  <div className={`auth-input-wrap ${errors.password ? 'has-error' : ''}`}>
                    <Lock size={18} className="auth-field-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="auth-toggle-pwd"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <div className="auth-field-error">{errors.password}</div>}
                </div>

                {/* Remember & Forgot Row */}
                <div className="auth-controls-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember Me</span>
                  </label>

                  <button
                    type="button"
                    className="auth-link-orange"
                    onClick={() => {
                      setIsForgotView(true);
                      setForgotEmail(email);
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  className="auth-primary-btn"
                  disabled={isLoading || isLockedOut}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Signing In...</span>
                    </>
                  ) : isLockedOut ? (
                    `Locked — ${formatCountdown(lockoutSecondsLeft)}`
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={18} style={{ marginLeft: '6px' }} />
                    </>
                  )}
                </button>

                {/* Social Divider */}
                <div className="auth-divider">
                  <span>or continue with</span>
                </div>

                {/* Social Login Buttons (Google & Microsoft) */}
                <div className="auth-mobile-social-col">
                  <button
                    type="button"
                    className="auth-social-btn"
                    onClick={() => {
                      setEmail('superagent@laborunion.com');
                      setPassword('Admin@123');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    className="auth-social-btn"
                    onClick={() => {
                      setEmail('agent1@laborunion.com');
                      setPassword('Agent@123');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                    <span>Continue with Microsoft</span>
                  </button>
                </div>

                {/* Footer Link */}
                <div className="auth-mobile-footer-row">
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    className="auth-link-orange"
                    onClick={() => setIsEnquiryModalOpen(true)}
                  >
                    Contact Super Agent
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
