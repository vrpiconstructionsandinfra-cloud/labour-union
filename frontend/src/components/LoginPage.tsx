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
  Smartphone,
  Headset
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
import { FirstTimePasswordModal } from './FirstTimePasswordModal';
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
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState<{ token: string; user: any } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Check for prefilled login identifier on load
  useEffect(() => {
    const prefill = sessionStorage.getItem('prefill_login_identifier');
    if (prefill) {
      setEmail(prefill);
      sessionStorage.removeItem('prefill_login_identifier');
    } else {
      setEmail('');
    }
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

  // Ensure any previous lockout is immediately cleared
  useEffect(() => {
    sessionStorage.removeItem('login_lockout_until');
    sessionStorage.removeItem('login_attempts');
  }, []);

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

  const handleNavigateToSupportLogin = (targetEmailOrEvent?: string | React.MouseEvent) => {
    const emailToPass = typeof targetEmailOrEvent === 'string' ? targetEmailOrEvent : (email || '');
    const query = emailToPass ? `?email=${encodeURIComponent(emailToPass)}` : '';
    window.history.replaceState({}, '', `/support/login${query}`);
    window.dispatchEvent(new Event('popstate'));
  };

  const handleNavigateToAdminLogin = (targetEmailOrEvent?: string | React.MouseEvent) => {
    const emailToPass = typeof targetEmailOrEvent === 'string' ? targetEmailOrEvent : '';
    const query = emailToPass ? `?email=${encodeURIComponent(emailToPass)}` : '';
    const { protocol, host, hostname } = window.location;
    if (hostname.startsWith('admin.')) {
      window.location.href = `${protocol}//${host}/`;
      return;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      window.history.replaceState({}, '', `/admin/login${query}`);
      window.dispatchEvent(new Event('popstate'));
    } else {
      const parts = hostname.split('.');
      const adminDomain = parts.length > 2 ? `admin.${parts.slice(-2).join('.')}` : `admin.${hostname}`;
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `${protocol}//${adminDomain}${port}/${query}`;
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setToastSuccess(null);



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
        setServerError(null);
        setToastSuccess('🎧 Customer Support Agent account detected. Redirecting to Support Portal in 1.5s...');
        setTimeout(() => {
          handleNavigateToSupportLogin(email);
        }, 1500);
        return;
      }

      if (data.user?.mustChangePassword) {
        setIsLoading(false);
        setPendingAuthData(data);
        setShowFirstTimeModal(true);
        return;
      }

      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.removeItem('login_attempts');
      sessionStorage.removeItem('login_lockout_until');

      if (data.user?.role === 'ADMIN') {
        setToastSuccess('🛡️ Administrator account verified! Navigating to Admin Portal...');
      } else {
        setToastSuccess('✔ Sign in successful! Navigating to Dashboard...');
      }

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

      if (errMsg.toLowerCase().includes('customer support') || errMsg.toLowerCase().includes('support portal')) {
        setServerError(null);
        setToastSuccess('🎧 Customer Support Agent account detected. Redirecting to Support Portal in 1.5s...');
        setTimeout(() => {
          handleNavigateToSupportLogin(email);
        }, 1500);
        return;
      }

      setServerError(errMsg);
    }
  };

  const handleFirstTimeSuccess = (updatedUser: any) => {
    if (!pendingAuthData) return;
    const finalUser = {
      ...pendingAuthData.user,
      ...updatedUser,
      mustChangePassword: false,
    };
    sessionStorage.setItem('token', pendingAuthData.token);
    sessionStorage.setItem('user', JSON.stringify(finalUser));
    sessionStorage.removeItem('login_attempts');
    sessionStorage.removeItem('login_lockout_until');
    setShowFirstTimeModal(false);
    setToastSuccess('✔ Password updated successfully! Navigating to Dashboard...');
    setTimeout(() => {
      onLoginSuccess(pendingAuthData.token, finalUser);
    }, 600);
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
                <button
                  type="button"
                  className="auth-support-portal-pill"
                  onClick={handleNavigateToSupportLogin}
                  title="Customer Support Agent Login Portal"
                >
                  <Headset size={14} />
                  <span>Support Login</span>
                </button>
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
                <div className="auth-toast-content">
                  <AlertCircle size={16} className="auth-toast-icon" />
                  <span>{serverError}</span>
                </div>
                {serverError.toLowerCase().includes('support') && (
                  <button
                    type="button"
                    className="auth-toast-action-btn"
                    onClick={handleNavigateToSupportLogin}
                  >
                    Go to Customer Support Login →
                  </button>
                )}
              </div>
            )}

            {toastSuccess && (
              <div className="auth-toast-banner auth-toast-success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{toastSuccess}</span>
                </div>
                {toastSuccess.toLowerCase().includes('support') && (
                  <button
                    type="button"
                    className="auth-toast-action-btn"
                    onClick={() => handleNavigateToSupportLogin(email)}
                    style={{
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginLeft: 'auto'
                    }}
                  >
                    Go Now →
                  </button>
                )}
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
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight size={18} style={{ marginRight: '6px' }} />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>

                  {/* Desktop Enquiry & Support Footer Links */}
                  <div className="auth-desktop-footer-row">
                    <span>Need to register as an Agent or Worker? </span>
                    <button
                      type="button"
                      className="auth-link-orange"
                      onClick={() => setIsEnquiryModalOpen(true)}
                    >
                      Submit an Enquiry
                    </button>
                  </div>

                  <div className="auth-support-footer-row">
                    <span>Customer Support Agent? </span>
                    <button
                      type="button"
                      className="auth-link-orange"
                      onClick={handleNavigateToSupportLogin}
                    >
                      Support Portal Login
                    </button>
                  </div>

                  <div className="auth-support-footer-row" style={{ marginTop: '6px' }}>
                    <span>Super Admin? </span>
                    <button
                      type="button"
                      className="auth-link-orange"
                      style={{ color: '#2563EB', fontWeight: 600 }}
                      onClick={handleNavigateToAdminLogin}
                    >
                      Super Admin Portal Login
                    </button>
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

          <div className="auth-mobile-top-bar-right">
            <button
              type="button"
              className="auth-mobile-support-pill"
              onClick={handleNavigateToSupportLogin}
              title="Customer Support Agent Portal"
            >
              <Headset size={14} />
              <span>Support</span>
            </button>

            {setDarkMode && (
              <button
                type="button"
                className="auth-mobile-theme-pill"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Moon size={14} /> : <Sun size={14} color="#EA580C" />}
                <span>{darkMode ? 'Dark' : 'Light'}</span>
              </button>
            )}
          </div>
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
              <div className="auth-toast-content">
                <AlertCircle size={15} className="auth-toast-icon" />
                <span>{serverError}</span>
              </div>
              {serverError.toLowerCase().includes('support') && (
                <button
                  type="button"
                  className="auth-toast-action-btn"
                  onClick={handleNavigateToSupportLogin}
                >
                  Go to Customer Support Login →
                </button>
              )}
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={18} style={{ marginLeft: '6px' }} />
                    </>
                  )}
                </button>

                {/* Mobile Enquiry & Support Footer Links */}
                <div className="auth-mobile-footer-row">
                  <span>Need to register as an Agent or Worker? </span>
                  <button
                    type="button"
                    className="auth-link-orange"
                    onClick={() => setIsEnquiryModalOpen(true)}
                  >
                    Submit an Enquiry
                  </button>
                </div>

                <div className="auth-support-footer-row mobile-footer-support">
                  <span>Customer Support Agent? </span>
                  <button
                    type="button"
                    className="auth-link-orange"
                    onClick={handleNavigateToSupportLogin}
                  >
                    Support Portal Login
                  </button>
                </div>

                <div className="auth-support-footer-row mobile-footer-support" style={{ marginTop: '6px' }}>
                  <span>Super Admin? </span>
                  <button
                    type="button"
                    className="auth-link-orange"
                    style={{ color: '#2563EB', fontWeight: 600 }}
                    onClick={handleNavigateToAdminLogin}
                  >
                    Super Admin Portal Login
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

      {/* First-Time Login Password Change Security Modal */}
      {showFirstTimeModal && pendingAuthData && (
        <FirstTimePasswordModal
          isOpen={showFirstTimeModal}
          userEmail={pendingAuthData.user?.email}
          userName={pendingAuthData.user?.name}
          userRole={pendingAuthData.user?.role}
          token={pendingAuthData.token}
          onSuccess={handleFirstTimeSuccess}
          onCancel={() => {
            setShowFirstTimeModal(false);
            setPendingAuthData(null);
            setPassword('');
          }}
        />
      )}
    </div>
  );
};
