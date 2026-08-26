import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Mail, Clock, Download, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      setStatusMessage('Saturday Weekly Audit Report is AVAILABLE (Demo Mode Active)');
      return;
    }

    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    const active = (day === 6 && hour >= 18) || day === 0 || (day === 1 && hour < 9);
    setIsActive(active);
    setStatusMessage(
      active
        ? 'Saturday Weekly Audit Report download window is ACTIVE (Sat 6 PM – Mon 9 AM).'
        : 'Saturday Weekly Audit Report is available every Saturday 6:00 PM to Monday 9:00 AM.'
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
        setEmailStatus(`✅ Excel report emailed to ${data.details?.emailSentTo || 'Super Agent'}!`);
      } else {
        setEmailStatus(`❌ Failed: ${data.error || 'Could not send email'}`);
      }
    } catch (err: any) {
      setEmailStatus(`❌ Error sending email: ${err.message}`);
    } finally {
      setIsSendingEmail(false);
      setTimeout(() => setEmailStatus(null), 6000);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        borderRadius: '16px',
        border: isActive ? '2px solid #2563EB' : '1px solid var(--border-color)',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: isActive ? '0 4px 20px rgba(37, 99, 235, 0.12)' : '0 2px 4px rgba(0, 0, 0, 0.04)',
        position: 'relative'
      }}
    >
      {/* Top Banner Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Left Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: isActive ? '#EFF6FF' : 'var(--border-light)',
              border: isActive ? '1px solid #BFDBFE' : '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FileSpreadsheet size={26} color={isActive ? '#2563EB' : '#64748B'} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Saturday Weekly Audit Excel Report
              </h3>
              
              {isActive ? (
                <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '3px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} />
                  <span>WINDOW ACTIVE (Sat 6 PM – Mon 9 AM)</span>
                </span>
              ) : (
                <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', padding: '3px 10px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} />
                  <span>WINDOW CLOSED (Opens Sat 6:00 PM)</span>
                </span>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
              {statusMessage || 'Includes Field Agent details, assigned workers roster, daily wage rates, and Monday-to-Saturday attendance logs.'}
            </p>
          </div>
        </div>

        {/* Right Actions & Demo Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Demo Bypass Toggle */}
          <button
            type="button"
            onClick={() => setDemoMode(!demoMode)}
            style={{
              backgroundColor: demoMode ? '#FFE4E6' : '#F1F5F9',
              color: demoMode ? '#E11D48' : '#64748B',
              border: demoMode ? '1px solid #FECDD3' : '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '7px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Toggle Demo Mode to test Excel download anytime"
          >
            <Zap size={14} />
            <span>{demoMode ? '⚡ Demo Mode: ON' : 'Demo Mode: OFF'}</span>
          </button>

          {/* Send Email Button */}
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Mail size={16} color="#2563EB" />
            <span>{isSendingEmail ? 'Sending Email...' : 'Email Report to Inbox'}</span>
          </button>

          {/* Download Excel Button */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={!isActive && !demoMode}
            style={{
              backgroundColor: isActive || demoMode ? '#2563EB' : '#94A3B8',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isActive || demoMode ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isActive || demoMode ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            <Download size={16} />
            <span>{isDownloading ? 'Generating Excel...' : 'Download Saturday Excel Report'}</span>
          </button>
        </div>
      </div>

      {/* Email Status Alert */}
      {emailStatus && (
        <div style={{ marginTop: '12px', padding: '8px 14px', borderRadius: '8px', backgroundColor: emailStatus.startsWith('✅') ? '#ECFDF5' : '#FEF2F2', border: emailStatus.startsWith('✅') ? '1px solid #A7F3D0' : '1px solid #FCA5A5', color: emailStatus.startsWith('✅') ? '#065F46' : '#991B1B', fontSize: '12.5px', fontWeight: 700 }}>
          {emailStatus}
        </div>
      )}
    </div>
  );
};
