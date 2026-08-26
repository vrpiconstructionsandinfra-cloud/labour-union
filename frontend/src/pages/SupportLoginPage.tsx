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

          <div className="support-divider">
            <span>or continue with</span>
          </div>

          <div className="social-auth-grid">
            <button
              type="button"
              className="social-btn"
              onClick={() => alert('Google authentication single sign-on.')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google
            </button>

            <button
              type="button"
              className="social-btn"
              onClick={() => alert('Microsoft authentication single sign-on.')}
            >
              <svg width="18" height="18" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H1z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H1z"/>
              </svg>
              Microsoft
            </button>
          </div>

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
