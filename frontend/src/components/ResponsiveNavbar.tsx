import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  X,
  Users,
  Sun,
  Moon,
  LogOut,
  Bell
} from 'lucide-react';
import './ResponsiveNavbar.css';

interface ResponsiveNavbarProps {
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  activeNav?: string;
  onNavSelect?: (nav: string) => void;
  title?: string;
  unreadCount?: number;
}

export const ResponsiveNavbar: React.FC<ResponsiveNavbarProps> = ({
  isMobileMenuOpen,
  onToggleMobileMenu,
  activeNav = 'dashboard',
  onNavSelect,
  title = 'Labor Union Portal',
  unreadCount = 0
}) => {
  const { user, role, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    return document.body.classList.contains('dark-mode') || localStorage.getItem('theme') === 'dark';
  });

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  return (
    <header className="responsive-navbar">
      <div className="navbar-container">
        {/* Left: Brand & Mobile Toggle */}
        <div className="navbar-left">
          <button
            type="button"
            className="navbar-hamburger-btn touch-target"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="navbar-brand" onClick={() => onNavSelect?.('dashboard')} style={{ cursor: 'pointer' }}>
            <div className="navbar-logo-icon">
              <Users size={20} color="#2563EB" />
            </div>
            <div className="navbar-brand-text">
              <span className="navbar-brand-title">Labour Union</span>
              <span className="navbar-brand-sub">{title}</span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="navbar-center-links hide-on-mobile hide-on-tablet">
          <button
            type="button"
            className={`navbar-link-btn ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavSelect?.('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`navbar-link-btn ${activeNav === 'sites' ? 'active' : ''}`}
            onClick={() => onNavSelect?.('sites')}
          >
            Working Sites
          </button>
          <button
            type="button"
            className={`navbar-link-btn ${activeNav === 'agents' ? 'active' : ''}`}
            onClick={() => onNavSelect?.('agents')}
          >
            Field Agents
          </button>
          <button
            type="button"
            className={`navbar-link-btn ${activeNav === 'workers' ? 'active' : ''}`}
            onClick={() => onNavSelect?.('workers')}
          >
            Workers
          </button>
          <button
            type="button"
            className={`navbar-link-btn ${activeNav === 'support' ? 'active' : ''}`}
            onClick={() => onNavSelect?.('support')}
          >
            Support
          </button>
        </nav>

        {/* Right: Actions & Profile */}
        <div className="navbar-right">
          <button
            type="button"
            className="navbar-icon-btn touch-target"
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#64748B" />}
          </button>

          <button
            type="button"
            className="navbar-icon-btn touch-target"
            onClick={() => onNavSelect?.('notifications')}
            title="Notifications"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="navbar-notif-dot" />}
          </button>

          {user && (
            <div className="navbar-user-chip hide-on-mobile">
              <div className="navbar-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="navbar-user-meta">
                <span className="navbar-user-name">{user.name}</span>
                <span className="navbar-user-role">{role || 'USER'}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="navbar-logout-btn touch-target"
            onClick={logout}
            title="Sign Out"
          >
            <LogOut size={16} />
            <span className="hide-on-mobile hide-on-tablet">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
