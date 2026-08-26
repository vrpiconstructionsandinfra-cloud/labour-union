import React, { useEffect, useState } from 'react';
import { ShieldCheck, Building2, Phone, CheckCircle2, ArrowLeft } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';

export const AgentVerifyPage: React.FC = () => {
  const [params, setParams] = useState<{
    id: string;
    code: string;
    name: string;
    phone: string;
    site: string;
    designation: string;
  }>({
    id: '2',
    code: 'AGT-1002',
    name: 'Suresh Patel',
    phone: '+91 91234 56789',
    site: 'Industrial Area Site (Block A, Unit 3)',
    designation: 'Field Supervisor'
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id') || '2';
    const code = urlParams.get('code') || 'AGT-1002';
    const name = urlParams.get('name') || 'Suresh Patel';
    const phone = urlParams.get('phone') || '+91 91234 56789';
    const site = urlParams.get('site') || 'Industrial Area Site (Block A, Unit 3)';
    const designation = urlParams.get('designation') || 'Field Supervisor';

    setParams({ id, code, name, phone, site, designation });
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Container */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', border: '1px solid #E2E8F0', position: 'relative' }}>
        
        {/* Verification Status Header Banner */}
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '16px', padding: '16px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', color: '#FFFFFF', width: '40px', height: '40px', borderRadius: '50%', marginBottom: '8px' }}>
            <CheckCircle2 size={24} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#065F46', margin: '0 0 2px' }}>Verified Labor Union Field Agent</h2>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>Official System Verification Confirmed ✓</span>
        </div>

        {/* Agent Profile Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #F1F5F9' }}>
          <UserAvatar name={params.name} size={72} />
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', marginTop: '12px', marginBottom: '4px' }}>{params.name}</h1>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 12px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
            {params.code} • {params.designation}
          </span>
        </div>

        {/* Official Details List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          
          <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} color="#2563EB" /> Assigned Working Site
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '2px', display: 'block' }}>{params.site}</span>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="#059669" /> Official Contact Phone
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', marginTop: '2px', display: 'block' }}>{params.phone}</span>
          </div>

          <div style={{ backgroundColor: '#F8FAFC', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="#9333EA" /> System Verification Status
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669', marginTop: '2px', display: 'block' }}>Active Authorized Representative</span>
          </div>

        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="/"
            style={{ fontSize: '13px', fontWeight: 800, color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Go to Labor Union Management Portal
          </a>
        </div>

      </div>
    </div>
  );
};
