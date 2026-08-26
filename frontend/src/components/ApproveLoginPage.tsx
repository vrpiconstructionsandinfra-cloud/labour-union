import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { approveLoginTokenApi } from '../services/api';
import './LoginPage.css';

interface ApproveLoginPageProps {
  token: string;
  onApprovalDone?: () => void;
}

export const ApproveLoginPage: React.FC<ApproveLoginPageProps> = ({ token, onApprovalDone }) => {
  const [status, setStatus] = useState<'LOADING' | 'APPROVED' | 'ERROR'>('LOADING');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [approvedUser, setApprovedUser] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setStatus('ERROR');
      setErrorMsg('Invalid or missing authentication token');
      return;
    }

    approveLoginTokenApi(token)
      .then((data) => {
        setStatus('APPROVED');
        setApprovedUser(data.user || null);
        if (onApprovalDone) onApprovalDone();
      })
      .catch((err) => {
        setStatus('ERROR');
        setErrorMsg(err.message || 'Invalid or expired approval link');
      });
  }, [token]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '36px 28px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800 }}>
            LU
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Labor Union Management</span>
        </div>

        {status === 'LOADING' && (
          <div style={{ padding: '30px 0' }}>
            <Loader2 size={40} className="spinner" style={{ color: '#2563EB', margin: '0 auto 16px auto', display: 'block' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>Approving Windows Login...</h3>
            <p style={{ fontSize: '14px', color: '#64748B' }}>Connecting to authentication server...</p>
          </div>
        )}

        {status === 'APPROVED' && (
          <div className="animate-fade-in" style={{ padding: '10px 0' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto', border: '2px solid #A7F3D0' }}>
              <CheckCircle2 size={42} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Login Request Approved!
            </h2>

            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', margin: '16px 0 20px 0' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{approvedUser?.name || 'Authenticated User'}</div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>{approvedUser?.email}</div>
              {approvedUser?.role && (
                <span className="badge badge-approved" style={{ marginTop: '8px', display: 'inline-block' }}>
                  {approvedUser.role}
                </span>
              )}
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, marginBottom: '24px' }}>
              Your Windows browser has automatically logged in. You can now return to your Windows computer or close this tab.
            </p>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#059669', fontWeight: 600, backgroundColor: '#F0FDF4', padding: '8px 16px', borderRadius: '20px' }}>
              <Smartphone size={15} />
              <span>Mobile Authentication Verified</span>
            </div>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="animate-fade-in" style={{ padding: '10px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', border: '2px solid #FCA5A5' }}>
              <AlertCircle size={36} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>Approval Link Expired</h3>
            <p style={{ fontSize: '13.5px', color: '#64748B', marginBottom: '20px' }}>
              {errorMsg || 'This mobile approval link is invalid or has already expired.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
