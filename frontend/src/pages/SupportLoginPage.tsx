import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../services/api';
import { Headset, Mail, Lock, Eye, EyeOff, CheckSquare, Square, ArrowRight, ShieldCheck, Zap, Activity, Globe, ArrowLeft } from 'lucide-react';
import './SupportLoginPage.css';

interface SupportLoginPageProps {
  onSuccessNavigate?: () => void;
}

export const SupportLoginPage: React.FC<SupportLoginPageProps> = ({ onSuccessNavigate }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(email, password, 'SUPPORT');

      const roleStr = String(res.user?.role || '');
      const isSupportUser = roleStr === 'SUPPORT_AGENT' || roleStr === 'CUSTOMER_SUPPORT' || (res.user as any)?.designation?.toLowerCase().includes('support');

      if (!isSupportUser) {
        setErrorMessage('Access Denied: Super Agents, Field Agents, and Workers must log in via the Main System Login page.');
        setLoading(false);
        return;
      }

      login(res.token, res.user);

      setSuccessMessage('Sign in successful! Redirecting to Support Dashboard...');
      setTimeout(() => {
        if (onSuccessNavigate) {
          onSuccessNavigate();
        } else {
          window.location.href = '/support/dashboard';
        }
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateMainLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="support-login-container">
      {/* Left Branding & Features Panel */}
      <div className="support-login-left">
        <div className="support-left-content">
          <div className="support-brand-badge">
            <div className="support-icon-circle">
              <Headset size={36} color="#2563EB" />
            </div>
            <h1 className="support-brand-title">Customer Support Portal</h1>
            <p className="support-brand-subtitle">
              Log in to your account to manage support tickets and assist users efficiently.
            </p>
          </div>

          <div className="support-features-list">
            <div className="support-feature-item">
              <div className="feature-icon-box">
                <ShieldCheck size={20} color="#2563EB" />
              </div>
              <div className="feature-text">
                <h3>Manage Tickets</h3>
                <p>View, respond and resolve customer support tickets in real-time.</p>
              </div>
            </div>

            <div className="support-feature-item">
              <div className="feature-icon-box">
                <Zap size={20} color="#2563EB" />
              </div>
              <div className="feature-text">
                <h3>Real-time Updates</h3>
                <p>Get instant notifications for new and updated tickets directly from users.</p>
              </div>
            </div>

            <div className="support-feature-item">
              <div className="feature-icon-box">
                <Activity size={20} color="#2563EB" />
              </div>
              <div className="feature-text">
                <h3>Track Performance</h3>
                <p>Monitor your response times and improve overall customer satisfaction.</p>
              </div>
            </div>
          </div>

          <div className="support-agent-illustration">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80"
              alt="Support Agent"
              className="agent-hero-image"
            />
          </div>

          <div className="support-left-footer">
            © 2026 Labor Union Management System. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="support-login-right">
        <div className="support-card-container">
          {/* Top Bar with Main Login Redirect */}
          <div className="support-top-nav-bar">
            <button type="button" className="top-nav-main-login-btn" onClick={handleNavigateMainLogin}>
              <ArrowLeft size={14} />
              <span>Main System Login</span>
            </button>
          </div>

          <div className="support-card-header">
            <h2>Welcome Back!</h2>
            <p>Please sign in to continue</p>
          </div>

          {errorMessage && (
            <div className="support-alert error" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span>{errorMessage}</span>
              {errorMessage.includes('Main System Login') && (
                <button
                  type="button"
                  onClick={handleNavigateMainLogin}
                  style={{
                    marginTop: '4px',
                    padding: '8px 14px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    width: 'fit-content'
                  }}
                >
                  <Globe size={15} /> Go to Main System Login →
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="support-alert success">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="support-login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="support@union.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Forgot Password link kept directly below the password input field */}
              <div className="forgot-password-below-wrapper">
                <a href="/reset-password" className="forgot-link-below">Forgot Password?</a>
              </div>
            </div>

            <div className="form-row remember-me-row">
              <label className="checkbox-label" onClick={() => setRememberMe(!rememberMe)}>
                {rememberMe ? <CheckSquare size={18} className="checkbox-active" /> : <Square size={18} className="checkbox-inactive" />}
                <span>Remember me</span>
              </label>
            </div>

            <button type="submit" className="support-submit-btn" disabled={loading}>
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Prominent Back to Main System Login Action Button */}
          <div className="main-login-redirect-card">
            <button type="button" className="main-login-redirect-btn" onClick={handleNavigateMainLogin}>
              <Globe size={16} />
              <span>Go to Main System Login Page</span>
            </button>
          </div>

          <div className="support-card-footer">
            Need help? <a href="mailto:admin@union.com">Contact Admin</a>
          </div>
        </div>
      </div>
    </div>
  );
};
