import React, { useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  ShieldCheck,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Headset
} from 'lucide-react';
import { loginApi, forgotPasswordApi, requestMobileApprovalApi, checkApprovalStatusApi, validateLoginForm, type ValidationErrors } from '../services/api';
import './LoginPage.css';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  darkMode,
  setDarkMode
}) => {
  const [email, setEmail] = useState('satishgoudarcr@gmail.com');
  const [password, setPassword] = useState('satish@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [language, setLanguage] = useState('English');
  const [showLangDropdown, setShowLangDropdown] = useState(false);

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

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Polling for mobile approval completion
  React.useEffect(() => {
    if (!waitingForMobileAuth || !authRequestId) return;

    const interval = setInterval(async () => {
      try {
        const res = await checkApprovalStatusApi(authRequestId);
        if (res.status === 'APPROVED' && res.token && res.user) {
          clearInterval(interval);
          setToastSuccess('✔ Mobile Approval Confirmed! Signing into Windows automatically...');
          sessionStorage.setItem('token', res.token);
          sessionStorage.setItem('user', JSON.stringify(res.user));
          setTimeout(() => {
            onLoginSuccess(res.token, res.user);
          }, 800);
        }
      } catch (err) {
        console.error('Error checking approval status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [waitingForMobileAuth, authRequestId, onLoginSuccess]);

  const handleTriggerMobileApproval = async (targetEmail: string) => {
    if (!targetEmail || !/\S+@\S+\.\S+/.test(targetEmail)) {
      setErrors({ email: 'Please enter a valid registered email address' });
      return;
    }

    setIsLoading(true);
    setServerError(null);
    setToastSuccess(null);

    try {
      const res = await requestMobileApprovalApi(targetEmail.trim());
      setIsLoading(false);
      setAuthRequestId(res.authRequestId);
      setMobileTargetEmail(res.email);
      setWaitingForMobileAuth(true);
    } catch (err: any) {
      setIsLoading(false);
      setServerError(err.message || 'Failed to send mobile authentication email');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setToastSuccess(null);

    if (isForgotView) {
      if (!forgotEmail || !/\S+@\S+\.\S+/.test(forgotEmail)) {
        setErrors({ email: 'Please enter a valid registered email address' });
        return;
      }

      setIsLoading(true);
      try {
        const res = await forgotPasswordApi(forgotEmail.trim());
        setIsLoading(false);
        setToastSuccess(res.message || '✔ Password reset link sent! Check your email inbox on your mobile device or browser.');
      } catch (err: any) {
        setIsLoading(false);
        setServerError(err.message || 'Failed to send password reset email');
      }
      return;
    }

    // Step 1: Check lockout
    if (isLockedOut) {
      setServerError(`Too many failed attempts. Please wait ${formatCountdown(lockoutSecondsLeft)}.`);
      return;
    }

    // Step 2: Frontend Validation
    const validationErrors = validateLoginForm(email, password);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Step 3: Trigger POST /api/auth/login
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

      // Step 4: Success — clear lockout counters
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
      // Step 5: Handle failed login — increment attempt counter
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
        setServerError(`${err.message || 'Invalid credentials'} — ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`);
      }
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setServerError(null);
    setIsLoading(true);
    setTimeout(() => {
      const mockToken = `token-social-${provider}-${Date.now()}`;
      const mockUser = {
        id: 'usr_social',
        name: 'Super Agent',
        email: `super.agent@${provider.toLowerCase()}.com`,
        role: 'SUPER_AGENT'
      };
      sessionStorage.setItem('token', mockToken);
      sessionStorage.setItem('user', JSON.stringify(mockUser));
      setIsLoading(false);
      onLoginSuccess(mockToken, mockUser);
    }, 600);
  };

  return (
    <div className="login-container">
      {/* Left Hero Panel */}
      <div className="login-hero-panel">
        <div className="hero-overlay-gradient"></div>
        <div className="hero-bg-image"></div>
        <div className="hero-dot-pattern top-dots"></div>
        <div className="hero-dot-pattern bottom-dots"></div>

        <div className="hero-content">
          {/* Brand Header */}
          <div className="hero-brand">
            <div className="brand-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15C10.9391 15 9.92172 15.4214 9.17157 16.1716C8.42143 16.9217 8 17.9391 8 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11C13.6569 11 15 9.65685 15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8C9 9.65685 10.3431 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 5.13C17.8631 5.35049 18.6282 5.85244 19.1733 6.55589C19.7185 7.25934 20.0145 8.12353 20.0145 9.0145C20.0145 9.90547 19.7185 10.7697 19.1733 11.4731C18.6282 12.1766 17.8631 12.6785 17 12.9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 21V19C2.0007 18.1137 2.29562 17.2528 2.83863 16.5523C3.38164 15.8519 4.14187 15.3516 5 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 5.13C6.13692 5.35049 5.37177 5.85244 4.82665 6.55589C4.28153 7.25934 3.98555 8.12353 3.98555 9.0145C3.98555 9.90547 4.28153 10.7697 4.82665 11.4731C5.37177 12.1766 6.13692 12.6785 7 12.9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="brand-title-wrap">
              <h2>Labor Union</h2>
              <p>Management System</p>
            </div>
          </div>

          {/* Main Headline */}
          <div className="hero-headline-wrap">
            <h1>
              Empowering Workers.<br />
              <span className="headline-blue">Building Stronger Unions.</span>
            </h1>
            <p className="hero-subtitle">
              A complete platform to manage sites, agents, workers, attendance, payroll, leaves, and more efficiently.
            </p>
          </div>

          {/* Feature List */}
          <div className="hero-features-list">
            <div className="feature-item">
              <div className="feature-icon-box">
                <Users size={18} />
              </div>
              <div className="feature-text">
                <h4>Role Based Access</h4>
                <p>Super Agent, Agent & Worker</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <BarChart3 size={18} />
              </div>
              <div className="feature-text">
                <h4>Real-time Dashboard</h4>
                <p>Get insights and analytics in real-time</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <ShieldCheck size={18} />
              </div>
              <div className="feature-text">
                <h4>Secure & Reliable</h4>
                <p>Enterprise grade security with JWT</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-box">
                <Smartphone size={18} />
              </div>
              <div className="feature-text">
                <h4>Responsive Design</h4>
                <p>Works perfectly on all devices</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="login-form-panel">
        {/* Top Controls Header */}
        <div className="login-top-controls">
          {/* Dark / Light Toggle Pill */}
          <div
            className="theme-toggle-pill"
            onClick={() => setDarkMode(prev => !prev)}
            title="Toggle theme"
          >
            <Sun size={15} className={!darkMode ? 'active-icon' : ''} />
            <Moon size={15} className={darkMode ? 'active-icon' : ''} />
          </div>

          {/* Language Selector */}
          <div className="language-selector-wrap">
            <button
              className="lang-btn"
              onClick={() => setShowLangDropdown(prev => !prev)}
            >
              <Globe size={16} />
              <span>{language}</span>
              <ChevronDown size={14} />
            </button>
            {showLangDropdown && (
              <div className="lang-dropdown">
                <button onClick={() => { setLanguage('English'); setShowLangDropdown(false); }}>English</button>
                <button onClick={() => { setLanguage('Spanish'); setShowLangDropdown(false); }}>Español</button>
                <button onClick={() => { setLanguage('Hindi'); setShowLangDropdown(false); }}>हिन्दी</button>
              </div>
            )}
          </div>
        </div>

        {/* Center Login Card */}
        <div className="login-card-container">
          <div className="login-card">
            {/* Top Card Icon */}
            <div className="card-top-icon-circle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15C10.9391 15 9.92172 15.4214 9.17157 16.1716C8.42143 16.9217 8 17.9391 8 19V21" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11C13.6569 11 15 9.65685 15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8C9 9.65685 10.3431 11 12 11Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 5.13C17.8631 5.35049 18.6282 5.85244 19.1733 6.55589C19.7185 7.25934 20.0145 8.12353 20.0145 9.0145C20.0145 9.90547 19.7185 10.7697 19.1733 11.4731C18.6282 12.1766 17.8631 12.6785 17 12.9" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h2 className="card-heading">{isForgotView ? 'Reset Password' : 'Welcome Back!'}</h2>
            <p className="card-subheading">
              {isForgotView
                ? 'Enter your registered email address to receive reset instructions'
                : 'Sign in to your account to continue'}
            </p>

            {/* Server Toast Error Banner */}
            {serverError && (
              <div className="toast-banner toast-error animate-fade-in" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                  <AlertCircle size={18} className="toast-icon" />
                  <span>{serverError}</span>
                </div>
                {serverError.includes('Customer Support Portal') && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/support/login'; }}
                    style={{
                      marginTop: '4px',
                      padding: '8px 14px',
                      backgroundColor: '#1E40AF',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(30, 64, 175, 0.2)'
                    }}
                  >
                    <Headset size={15} /> Go to Customer Support Portal Login →
                  </button>
                )}
              </div>
            )}

            {/* Toast Success Banner */}
            {toastSuccess && (
              <div className="toast-banner toast-success animate-fade-in">
                <CheckCircle2 size={18} className="toast-icon" />
                <span>{toastSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              {waitingForMobileAuth ? (
                <div className="animate-fade-in" style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: '#EEF2FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                      border: '2px solid #BFDBFE'
                    }}
                  >
                    <Smartphone size={32} />
                  </div>

                  <h3 style={{ fontSize: '19px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                    Mobile Email Approval Sent
                  </h3>

                  <p style={{ fontSize: '13.5px', color: '#64748B', marginBottom: '16px' }}>
                    We sent an authentication email to <strong style={{ color: '#2563EB' }}>{mobileTargetEmail}</strong>
                  </p>

                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontSize: '13px',
                      color: '#334155',
                      marginBottom: '20px'
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>Instructions for Mobile Device:</div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#2563EB' }}>1.</span>
                      <span>Open your email inbox on your mobile phone / tablet.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, color: '#2563EB' }}>2.</span>
                      <span>Tap the green <strong style={{ color: '#059669' }}>"APPROVE LOGIN ON WINDOWS"</strong> button.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#2563EB' }}>3.</span>
                      <span>This Windows browser will automatically sign in instantly!</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Loader2 size={16} className="spinner" style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB' }}>
                      Awaiting Mobile Approval...
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                      onClick={() => handleTriggerMobileApproval(mobileTargetEmail)}
                      disabled={isLoading}
                    >
                      Resend Email
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                      onClick={() => {
                        setWaitingForMobileAuth(false);
                        setIsForgotView(false);
                        setAuthRequestId(null);
                        setServerError(null);
                        setToastSuccess(null);
                      }}
                    >
                      Cancel / Back
                    </button>
                  </div>
                </div>
              ) : isForgotView ? (
                <>
                  <div className="input-group">
                    <label>Registered Email Address</label>
                    <div className={`input-field-wrap ${errors.email ? 'has-error' : ''}`}>
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        placeholder="e.g. agent@laborunion.com"
                      />
                    </div>
                    {errors.email && (
                      <span className="field-error-text">
                        <AlertCircle size={12} /> {errors.email}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="sign-in-btn mt-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={18} className="spinner" />
                        Sending Mobile Approval Email...
                      </span>
                    ) : (
                      'Send Mobile Login Approval Email'
                    )}
                  </button>

                  <button
                    type="button"
                    className="social-btn mt-12"
                    style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
                    onClick={() => {
                      setIsForgotView(false);
                      setServerError(null);
                      setToastSuccess(null);
                      setErrors({});
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Sign In</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Email Input */}
                  <div className="input-group">
                    <label>Email Address</label>
                    <div className={`input-field-wrap ${errors.email ? 'has-error' : ''}`}>
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        placeholder="admin@test.com"
                      />
                    </div>
                    {errors.email && (
                      <span className="field-error-text">
                        <AlertCircle size={12} /> {errors.email}
                      </span>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="input-group">
                    <label>Password</label>
                    <div className={`input-field-wrap ${errors.password ? 'has-error' : ''}`}>
                      <Lock size={18} className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors({ ...errors, password: undefined });
                        }}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <a
                        href="#forgot"
                        className="forgot-pass-link"
                        style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
                        onClick={(e) => {
                          e.preventDefault();
                          setIsForgotView(true);
                          setForgotEmail(email);
                          setServerError(null);
                          setToastSuccess(null);
                          setErrors({});
                        }}
                      >
                        Forgot Password?
                      </a>
                    </div>

                    {errors.password && (
                      <span className="field-error-text">
                        <AlertCircle size={12} /> {errors.password}
                      </span>
                    )}
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="remember-me-row">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span className="checkbox-text">Remember me</span>
                    </label>
                  </div>

                  {/* Brute-force Lockout Banner */}
                  {isLockedOut && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                      border: '1.5px solid #fca5a5',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      marginBottom: '16px',
                    }}>
                      <span style={{ fontSize: '20px', lineHeight: 1 }}>🔒</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                          Too Many Failed Attempts
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#b91c1c', lineHeight: 1.5 }}>
                          Login is temporarily locked. Please try again in{' '}
                          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCountdown(lockoutSecondsLeft)}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Primary Sign In Button */}
                  <button
                    type="submit"
                    id="login-submit-btn"
                    className="sign-in-btn"
                    disabled={isLoading || isLockedOut}
                    style={isLockedOut ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                  >
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={18} className="spinner" />
                        Authenticating...
                      </span>
                    ) : isLockedOut ? (
                      `Locked — ${formatCountdown(lockoutSecondsLeft)}`
                    ) : (
                      'Sign In'
                    )}
                  </button>


                  {/* Divider */}
                  <div className="divider-row">
                    <span>or continue with</span>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="social-buttons-grid">
                    <button
                      type="button"
                      className="social-btn google-btn"
                      onClick={() => handleSocialLogin('Google')}
                      disabled={isLoading}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      className="social-btn microsoft-btn"
                      onClick={() => handleSocialLogin('Microsoft')}
                      disabled={isLoading}
                    >
                      <svg width="18" height="18" viewBox="0 0 23 23">
                        <path fill="#f35325" d="M1 1h10v10H1z"/>
                        <path fill="#81bc06" d="M12 1h10v10H12z"/>
                        <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                        <path fill="#ffba08" d="M12 12h10v10H12z"/>
                      </svg>
                      <span>Microsoft</span>
                    </button>
                  </div>

                  {/* Bottom Register Link */}
                  <div className="register-link-row">
                    <span>Don't have an account? </span>
                    <a href="#register" className="register-link" onClick={(e) => e.preventDefault()}>
                      Register now
                    </a>
                  </div>

                  {/* Customer Support Portal Navigation Button */}
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = '/support/login';
                      }}
                      style={{
                        width: '100%',
                        padding: '11px 16px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: '12px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                        e.currentTarget.style.borderColor = '#93c5fd';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                        e.currentTarget.style.borderColor = '#bfdbfe';
                      }}
                    >
                      <Headset size={18} color="#2563eb" />
                      <span>Customer Support Portal Login</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Footer Copyright */}
          <footer className="login-footer">
            <p>© 2025 Labor Union Management System. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </div>
  );
};
