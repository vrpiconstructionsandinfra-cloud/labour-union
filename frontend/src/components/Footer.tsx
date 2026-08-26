import React from 'react';
import { ShieldCheck, HelpCircle } from 'lucide-react';
import './Footer.css';

interface FooterProps {
  setActiveTab: (tab: string) => void;
  onOpenModal?: (type: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="dashboard-footer">
      <div className="footer-top-row">
        {/* Brand & Mission Column */}
        <div className="footer-brand-col">
          <div className="footer-logo-wrap">
            <div className="footer-logo-icon">
              <ShieldCheck size={20} />
            </div>
            <span className="footer-brand-name">Labor Union Management</span>
          </div>
          <p className="footer-tagline">
            Empowering Workers. Building Stronger Unions. Enterprise resource planning & digital labor operations.
          </p>
        </div>

        {/* Quick Nav Links Column */}
        <div className="footer-nav-col">
          <h4 className="footer-col-title">Quick Navigation</h4>
          <div className="footer-links-grid">
            <button type="button" onClick={() => setActiveTab('sites')}>Working Sites</button>
            <button type="button" onClick={() => setActiveTab('agents')}>Field Agents</button>
            <button type="button" onClick={() => setActiveTab('workers')}>Union Workers</button>
            <button type="button" onClick={() => setActiveTab('attendance')}>Attendance</button>
            <button type="button" onClick={() => setActiveTab('wallet')}>Digital Wallet</button>
            <button type="button" onClick={() => setActiveTab('insurance')}>Insurance Policies</button>
            <button type="button" onClick={() => setActiveTab('tickets')}>Customer Support</button>
          </div>
        </div>

        {/* System Status & Meta Column */}
        <div className="footer-status-col">
          <h4 className="footer-col-title">System Information</h4>
          <div className="status-pill-wrap">
            <span className="status-dot-pulse"></span>
            <span className="status-text">All Systems Operational</span>
          </div>

          <div className="meta-badges-wrap mt-10">
            <span className="meta-badge-tag">Backend API v2.4.0</span>
            <span className="meta-badge-tag">PostgreSQL Live</span>
          </div>
        </div>
      </div>

      <div className="footer-divider"></div>

      {/* Bottom Bar */}
      <div className="footer-bottom-row">
        <div className="footer-copyright">
          © {currentYear} Labor Union Management System. All rights reserved.
        </div>

        <div className="footer-bottom-links">
          <button type="button" onClick={() => setActiveTab('support')}>
            <HelpCircle size={14} /> Help Desk
          </button>
          <span className="footer-link-dot">•</span>
          <button type="button" onClick={() => setActiveTab('settings')}>
            System Security
          </button>
          <span className="footer-link-dot">•</span>
          <button type="button" onClick={() => setActiveTab('settings')}>
            Privacy Policy
          </button>
        </div>
      </div>
    </footer>
  );
};
