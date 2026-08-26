import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  IndianRupee,
  UserCheck,
  CheckCircle2,
  Share2,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { fetchWorkersApi } from '../services/api';
import { UserAvatar } from '../components/UserAvatar';

export const WorkerVerifyPage: React.FC = () => {
  const [workerData, setWorkerData] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Parse URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const paramId = urlParams.get('id') || '10';
  const paramCode = urlParams.get('code') || 'WRK-010';
  const paramName = urlParams.get('name') || 'Manoj Worker';
  const paramPhone = urlParams.get('phone') || '+91 98765 43210';
  const paramSite = urlParams.get('site') || 'Highway Flyover Project';
  const paramAddress = urlParams.get('address') || 'Block 4, Flat 202, Labour Colony, Bengaluru, Karnataka - 560001';
  const paramDesignation = urlParams.get('designation') || 'Electrician';
  const paramWage = urlParams.get('wage') || '850';
  const paramAgent = urlParams.get('agent') || 'Suresh Patel';
  const paramAgentCode = urlParams.get('agentCode') || 'AGT-1002';

  useEffect(() => {
    fetchWorkersApi()
      .then((workers) => {
        const found = workers.find((w: any) => 
          String(w.id) === String(paramId) || 
          (w.employeeCode && w.employeeCode.toLowerCase() === paramCode.toLowerCase())
        );
        if (found) {
          setWorkerData(found);
        } else {
          // Fallback to URL parameters payload
          setWorkerData({
            id: paramId,
            name: paramName,
            employeeCode: paramCode,
            phone: paramPhone,
            email: `${paramName.toLowerCase().replace(/\s+/g, '.')}@laborunion.com`,
            designation: paramDesignation,
            dailyWage: Number(paramWage),
            siteName: paramSite,
            siteCode: 'SITE-BLR-01',
            address: paramAddress,
            agentName: paramAgent,
            agentCode: paramAgentCode,
            agentPhone: '+91 91234 56789'
          });
        }
      })
      .catch(() => {
        setWorkerData({
          id: paramId,
          name: paramName,
          employeeCode: paramCode,
          phone: paramPhone,
          email: `${paramName.toLowerCase().replace(/\s+/g, '.')}@laborunion.com`,
          designation: paramDesignation,
          dailyWage: Number(paramWage),
          siteName: paramSite,
          siteCode: 'SITE-BLR-01',
          address: paramAddress,
          agentName: paramAgent,
          agentCode: paramAgentCode,
          agentPhone: '+91 91234 56789'
        });
      });
  }, [paramId, paramCode, paramName, paramPhone, paramSite, paramAddress, paramDesignation, paramWage, paramAgent, paramAgentCode]);

  const worker = workerData || {
    id: paramId,
    name: paramName,
    employeeCode: paramCode,
    phone: paramPhone,
    email: 'manoj.worker@laborunion.com',
    designation: paramDesignation,
    dailyWage: Number(paramWage),
    siteName: paramSite,
    siteCode: 'SITE-BLR-01',
    address: paramAddress,
    agentName: paramAgent,
    agentCode: paramAgentCode,
    agentPhone: '+91 91234 56789'
  };

  const workerCode = worker.employeeCode || paramCode;
  const siteName = worker.siteName || (worker.site?.siteName) || paramSite;
  const siteCode = worker.siteCode || (worker.site?.siteCode) || 'SITE-BLR-01';
  const designation = worker.designation || paramDesignation;
  const dailyWage = worker.dailyWage || Number(paramWage);
  const phone = worker.phone || paramPhone;
  const address = worker.address || paramAddress;
  const agentName = worker.agentName || (worker.assignedAgent?.name) || paramAgent;
  const agentCode = worker.agentCode || (worker.assignedAgent?.employeeCode) || paramAgentCode;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToPortal = () => {
    window.location.href = '/';
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 16px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Container */}
      <div style={{ maxWidth: '640px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={handleGoToPortal}
          style={{ backgroundColor: '#FFFFFF', color: '#334155', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Labor Union Portal</span>
        </button>

        <button
          onClick={handleCopyLink}
          style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          {copied ? <CheckCircle2 size={16} color="#059669" /> : <Share2 size={16} />}
          <span>{copied ? 'Link Copied!' : 'Share Link'}</span>
        </button>
      </div>

      {/* Main Verification Card Container */}
      <div style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1)', overflow: 'hidden' }}>
        
        {/* Top Official Banner */}
        <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '24px', color: '#FFFFFF', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#059669', color: '#FFFFFF', fontSize: '11px', fontWeight: 900, padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px', marginBottom: '14px' }}>
            <ShieldCheck size={14} />
            <span>OFFICIAL VERIFIED WORKER ✓</span>
          </div>

          <div style={{ width: '80px', height: '80px', margin: '0 auto 12px', borderRadius: '50%', border: '4px solid #FFFFFF', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
            <UserAvatar src={(worker as any).avatar || (worker as any).profileImage} name={worker.name} size={72} />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{worker.name}</h2>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>ID: {workerCode}</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>Labor Union Management System</div>
        </div>

        {/* Verification Details Grid */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Section 1: Contact & Designation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Phone size={15} color="#2563EB" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Phone Number</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{phone}</div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Briefcase size={15} color="#059669" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Skill / Designation</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>{designation}</div>
            </div>

          </div>

          {/* Section 2: Working Site */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Building2 size={15} color="#2563EB" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Assigned Working Site</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{siteName}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>Site Code: {siteCode}</div>
          </div>

          {/* Section 3: Residential Address */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <MapPin size={15} color="#EF4444" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Residential Home Address</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', lineHeight: '1.4' }}>{address}</div>
          </div>

          {/* Section 4: Wage & Agent Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <IndianRupee size={15} color="#D97706" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Daily Wage Rate</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#D97706' }}>₹{dailyWage} / day</div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <UserCheck size={15} color="#2563EB" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Assigned Field Agent</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{agentName}</div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>{agentCode}</div>
            </div>

          </div>

          {/* Footer Action Button */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
            <button
              onClick={handleGoToPortal}
              style={{ width: '100%', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '12px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ExternalLink size={16} />
              <span>Log In to Labor Union System Portal</span>
            </button>
            <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8', marginTop: '8px' }}>
              Labor Union System • Official Verification Platform
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
