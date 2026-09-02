import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Mail, Download, Zap, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SaturdayReportBanner.css';

export const SaturdayReportBanner: React.FC = () => {
  const { token } = useAuth();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [demoMode, setDemoMode] = useState<boolean>(true); // Default demo mode true so Super Agent can test anytime
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  const getEffectiveToken = () => token || localStorage.getItem('token') || '';

  useEffect(() => {
    fetchStatus();
  }, [demoMode, token]);

  const fetchStatus = async () => {
    try {
      const authToken = getEffectiveToken();
      const res = await fetch(`/api/reports/saturday-weekly-status?demo=${demoMode}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsActive(data.active);
        setStatusMessage(data.message);
      } else {
        calculateLocalStatus();
      }
    } catch {
      calculateLocalStatus();
    }
  };

  const calculateLocalStatus = () => {
    if (demoMode) {
      setIsActive(true);
      setStatusMessage('Saturday Weekly Audit Report is available.');
      return;
    }

    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    const active = (day === 6 && hour >= 18) || day === 0 || (day === 1 && hour < 9);
    setIsActive(active);
    setStatusMessage(
      active
        ? 'Saturday Weekly Audit Report is available.'
        : 'Report is available every Saturday 6:00 PM to Monday 9:00 AM.'
    );
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const authToken = getEffectiveToken();
      const response = await fetch(`/api/reports/saturday-weekly-excel?demo=${demoMode}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'Failed to download Saturday Weekly Audit Excel report');
        setIsDownloading(false);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Saturday_Weekly_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Error downloading Excel report: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const authToken = getEffectiveToken();
      const response = await fetch('/api/reports/send-saturday-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setEmailStatus(`Excel report successfully emailed to ${data.details?.emailSentTo || 'Super Agent'}!`);
      } else {
        setEmailStatus(`Failed: ${data.error || 'Could not send email'}`);
      }
    } catch (err: any) {
      setEmailStatus(`Error sending email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
      setTimeout(() => setEmailStatus(null), 6000);
    }
  };

  return (
    <div className={`saturday-audit-card ${isActive ? 'is-active' : ''}`}>
      <div className="saturday-audit-container">
        {/* Left Info: Icon + Title + Status + Description */}
        <div className="saturday-audit-info">
          <div className="saturday-audit-icon-box" aria-hidden="true">
            <FileSpreadsheet size={20} />
          </div>

          <div className="saturday-audit-details">
            <div className="saturday-audit-title-row">
              <h3 className="saturday-audit-title">Saturday Weekly Audit Excel Report</h3>
              
              {isActive ? (
                <span className="saturday-status-pill active" title="Active Window">
                  <span className="saturday-status-dot" />
                  <span>Active · Sat 6 PM – Mon 9 AM</span>
                </span>
              ) : (
                <span className="saturday-status-pill closed" title="Window Closed">
                  <span className="saturday-status-dot" />
                  <span>Closed · Opens Sat 6 PM</span>
                </span>
              )}
            </div>

            <p className="saturday-audit-subtext">
              {statusMessage || 'Available during Sat 6 PM – Mon 9 AM window.'}
            </p>
          </div>
        </div>

        {/* Right Actions: Primary Download + Secondary Email & Demo Toggle */}
        <div className="saturday-audit-actions">
          {/* Primary Action: Download */}
          <button
            type="button"
            className="saturday-btn saturday-btn-primary"
            onClick={handleDownloadExcel}
            disabled={(!isActive && !demoMode) || isDownloading}
            aria-label="Download Saturday Excel Report"
          >
            {isDownloading ? (
              <>
                <Loader2 size={15} className="spinner" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Download Excel</span>
              </>
            )}
          </button>

          {/* Secondary Controls (Combined row on mobile) */}
          <div className="saturday-mobile-secondary-row">
            {/* Secondary Action: Email Report */}
            <button
              type="button"
              className="saturday-btn saturday-btn-secondary"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              aria-label="Email Report to Inbox"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 size={15} className="spinner" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail size={15} color="#2563eb" />
                  <span>Email Report</span>
                </>
              )}
            </button>

            {/* Demo Toggle Control */}
            <button
              type="button"
              className={`saturday-btn saturday-btn-demo ${demoMode ? 'is-on' : ''}`}
              onClick={() => setDemoMode(!demoMode)}
              title="Toggle Demo Mode to test Excel download anytime"
              aria-label="Toggle Demo Mode"
            >
              <Zap size={14} />
              <span>{demoMode ? 'Demo Mode: ON' : 'Demo Mode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Toast / Status Banner */}
      {emailStatus && (
        <div
          className={`saturday-feedback-banner ${emailStatus.includes('successfully') ? 'success' : 'error'}`}
          role="alert"
        >
          <span>{emailStatus}</span>
        </div>
      )}
    </div>
  );
};
