import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { loginApi } from '../services/api';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Users,
  HardHat,
  Building2,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { FirstTimePasswordModal } from '../components/FirstTimePasswordModal';
import './AdminLoginPage.css';

interface AdminLoginPageProps {
  onSuccessNavigate?: () => void;
  onNavigateToMain?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccessNavigate,
  onNavigateToMain,
}) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ token: string; user: any } | null>(null);

  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your administrator email or ID.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(email.trim(), password, 'ADMIN');

      const role = String(res.user?.role || '');
      const isAuthorized = role === 'ADMIN';

      if (!isAuthorized) {
        setErrorMessage(
          'Access Denied: Only Area Administrators can access this portal. Super Agents, field agents, and workers must use the Main Portal.'
        );
        setLoading(false);
        return;
      }

      // Check if this is a first-time login requiring password change
      if (res.user?.mustChangePassword) {
        setPendingAuth(res);
        setShowFirstTimeModal(true);
        setLoading(false);
        return;
      }

      login(res.token, res.user);

      setSuccessMessage('Authentication successful! Initializing Administrator Portal...');
      setTimeout(() => {
        if (onSuccessNavigate) {
          onSuccessNavigate();
        } else {
          // If on admin subdomain, stay on root of subdomain, else switch hash
          window.location.hash = '#admin_portal';
          window.dispatchEvent(new Event('hashchange'));
        }
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid administrator credentials. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeSuccess = (updatedUser: any) => {
    if (!pendingAuth) return;
    const finalUser = {
      ...pendingAuth.user,
      ...updatedUser,
      mustChangePassword: false,
    };
    login(pendingAuth.token, finalUser);
    setShowFirstTimeModal(false);
    setSuccessMessage('Password changed successfully! Entering Administrator Portal...');
    setTimeout(() => {
      if (onSuccessNavigate) {
        onSuccessNavigate();
      } else {
        window.location.hash = '#admin_portal';
        window.dispatchEvent(new Event('hashchange'));
      }
    }, 600);
  };

  const handleReturnToMain = () => {
    if (onNavigateToMain) {
      onNavigateToMain();
      return;
    }
    const hostname = window.location.hostname;
    if (hostname.startsWith('admin.')) {
      // Return to base domain
      const baseHost = hostname.replace(/^admin\./, '');
      const port = window.location.port ? `:${window.location.port}` : '';
      window.location.href = `${window.location.protocol}//${baseHost}${port}/`;
    } else {
      window.history.replaceState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
    }
  };

  return (
    <div className="admin-login-container">
      {/* Left Hero & Hierarchy Feature Highlights */}
      <div className="admin-login-left">
        <div className="admin-left-content">
          <div className="admin-brand-badge">
            <div className="admin-icon-circle">
              <Shield size={38} color="#FFFFFF" />
            </div>
            <div className="admin-badge-pill">
              <Shield size={12} />
              <span>Super Admin Jurisdiction Access</span>
            </div>
            <h1 className="admin-brand-title">Super Admin Portal</h1>
            <p className="admin-brand-subtitle">
              Secure operational console for Super Admins to supervise field agents, monitor labor crews, and inspect working sites.
            </p>
          </div>

          <div className="admin-features-list">
            <div className="admin-feature-item">
              <div className="admin-feature-icon-box">
                <Users size={22} />
              </div>
              <div className="admin-feature-text">
                <h4>Supervise Field Agents</h4>
                <p>Register, assign, and audit field agents under your area command.</p>
              </div>
            </div>

            <div className="admin-feature-item">
              <div className="admin-feature-icon-box">
                <HardHat size={22} />
              </div>
              <div className="admin-feature-text">
                <h4>Live Labor Roster & Attendance</h4>
                <p>Real-time visibility over all workers and daily on-site attendance.</p>
              </div>
            </div>

            <div className="admin-feature-item">
              <div className="admin-feature-icon-box">
                <Building2 size={22} />
              </div>
              <div className="admin-feature-text">
                <h4>Regional Site Allocation</h4>
                <p>Manage project sites and track deployments across construction zones.</p>
              </div>
            </div>
          </div>

          <div className="admin-left-footer">
            <span>© 2026 Labor Union Infrastructure</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
              Secure 256-bit Encrypted Session
            </span>
          </div>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="admin-login-right">
        <div className="admin-form-wrapper">
          <div className="admin-form-header">
            <h2 className="admin-form-title">Super Admin Sign In</h2>
            <p className="admin-form-subtitle">
              Enter your authorized super admin credentials to access your jurisdictional dashboard.
            </p>
          </div>

          {errorMessage && (
            <div className="admin-alert-error animate-fade-in">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="admin-alert-success animate-fade-in">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label className="admin-form-label">Super Admin Email / User ID</label>
              <div className="admin-input-wrapper">
                <Mail size={18} className="admin-input-icon" />
                <input
                  type="email"
                  className="admin-input"
                  placeholder="admin@vrpiconstructions.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Password</label>
              <div className="admin-input-wrapper">
                <Lock size={18} className="admin-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="admin-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="admin-form-options">
              <label className="admin-checkbox-label" onClick={() => setRememberMe(!rememberMe)}>
                {rememberMe ? (
                  <CheckSquare size={17} color="#3B82F6" />
                ) : (
                  <Square size={17} color="#64748B" />
                )}
                <span>Remember this workstation</span>
              </label>
            </div>

            <button
              type="submit"
              className="admin-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Authenticating Administrator...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Administrator</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="admin-footer-links">
            <button
              type="button"
              className="admin-switch-btn"
              onClick={handleReturnToMain}
            >
              <ArrowLeft size={16} />
              <span>Back to Main Union Portal</span>
            </button>
          </div>
        </div>
      </div>

      {/* First-Time Login Password Change Security Modal */}
      {showFirstTimeModal && pendingAuth && (
        <FirstTimePasswordModal
          isOpen={showFirstTimeModal}
          userEmail={pendingAuth.user?.email}
          userName={pendingAuth.user?.name}
          userRole={pendingAuth.user?.role}
          token={pendingAuth.token}
          onSuccess={handleFirstTimeSuccess}
          onCancel={() => {
            setShowFirstTimeModal(false);
            setPendingAuth(null);
            setPassword('');
          }}
        />
      )}
    </div>
  );
};
