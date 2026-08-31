import React from 'react';
import { ResponsiveLayout } from '../components/ResponsiveLayout';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  HardHat,
  Building2,
  ShieldCheck,
  Calendar,
  Wallet,
  Headphones,
  ArrowRight
} from 'lucide-react';
import './Home.css';

interface HomeProps {
  onNavigate?: (route: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  return (
    <ResponsiveLayout activeNav="home" onNavSelect={onNavigate} title="Platform Portal">
      <div className="home-page-wrapper">
        {/* Hero Section */}
        <section className="home-hero-card">
          <div className="home-hero-content">
            <div className="home-hero-badge">
              <ShieldCheck size={16} color="#2563EB" />
              <span>Official Labor Union & Workforce Operating System</span>
            </div>
            <h1 className="home-hero-title text-fluid-h1">
              Empowering Workers. <br />
              <span className="gradient-text">Building Stronger Unions.</span>
            </h1>
            <p className="home-hero-subtitle text-fluid-body">
              A comprehensive, real-time platform designed to streamline construction site allocations, field agent workflows, daily digital attendance, fair payroll distribution, and worker support.
            </p>

            <div className="home-hero-actions">
              {user ? (
                <button
                  type="button"
                  className="home-primary-btn touch-target"
                  onClick={() => onNavigate?.('dashboard')}
                >
                  <span>Go to My Dashboard</span>
                  <ArrowRight size={18} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="home-primary-btn touch-target"
                    onClick={() => onNavigate?.('login')}
                  >
                    <span>Sign In to System</span>
                    <ArrowRight size={18} />
                  </button>
                  <button
                    type="button"
                    className="home-secondary-btn touch-target"
                    onClick={() => onNavigate?.('support-login')}
                  >
                    <Headphones size={18} />
                    <span>Customer Support Portal</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="home-hero-stats-panel hide-on-mobile">
            <div className="hero-stat-box">
              <span className="hero-stat-num">100%</span>
              <span className="hero-stat-label">Transparent Digital Attendance</span>
            </div>
            <div className="hero-stat-box">
              <span className="hero-stat-num">24 / 7</span>
              <span className="hero-stat-label">Emergency Ticket Resolution</span>
            </div>
            <div className="hero-stat-box">
              <span className="hero-stat-num">Direct</span>
              <span className="hero-stat-label">Wage & Wallet Disbursements</span>
            </div>
          </div>
        </section>

        {/* Feature Grid (Responsive 1-col mobile, 2-col tablet, 4-col desktop) */}
        <section className="home-features-section">
          <div className="home-section-header">
            <h2 className="text-fluid-h2">Core Union Management Modules</h2>
            <p className="text-fluid-body text-muted">
              Built with role-based access control for Super Agents, Field Agents, Workers, and Support Teams.
            </p>
          </div>

          <div className="home-features-grid">
            <div className="home-feature-card" onClick={() => onNavigate?.('sites')}>
              <div className="feature-icon-box blue">
                <Building2 size={24} />
              </div>
              <h3>Working Site Operations</h3>
              <p>Allocate construction sites to field agents with duration in days, progress tracking, and company contact metadata.</p>
              <span className="feature-link">View Sites →</span>
            </div>

            <div className="home-feature-card" onClick={() => onNavigate?.('agents')}>
              <div className="feature-icon-box purple">
                <Users size={24} />
              </div>
              <h3>Field Agent Network</h3>
              <p>Manage agent baskets, assign site durations, verify registrations, and track worker teams under each supervisor.</p>
              <span className="feature-link">View Agents →</span>
            </div>

            <div className="home-feature-card" onClick={() => onNavigate?.('workers')}>
              <div className="feature-icon-box green">
                <HardHat size={24} />
              </div>
              <h3>Worker Rosters & Verification</h3>
              <p>Public QR verification, daily wage rates, trade designations, and active site deployment schedules.</p>
              <span className="feature-link">View Workers →</span>
            </div>

            <div className="home-feature-card" onClick={() => onNavigate?.('attendance')}>
              <div className="feature-icon-box amber">
                <Calendar size={24} />
              </div>
              <h3>Digital Attendance & Geotagging</h3>
              <p>Face capture, site check-in stamps, overtime calculation, and instant daily status syncing.</p>
              <span className="feature-link">View Attendance →</span>
            </div>

            <div className="home-feature-card" onClick={() => onNavigate?.('payroll')}>
              <div className="feature-icon-box cyan">
                <Wallet size={24} />
              </div>
              <h3>Payroll & Wage Disbursements</h3>
              <p>Automated salary generation, digital wallet top-ups, and bank transfer transaction histories.</p>
              <span className="feature-link">View Payroll →</span>
            </div>

            <div className="home-feature-card" onClick={() => onNavigate?.('support')}>
              <div className="feature-icon-box red">
                <Headphones size={24} />
              </div>
              <h3>Customer Support & Helpdesk</h3>
              <p>Real-time ticket chat, equipment requests, safety notifications, and Saturday audit reports.</p>
              <span className="feature-link">View Support →</span>
            </div>
          </div>
        </section>
      </div>
    </ResponsiveLayout>
  );
};
