import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  IndianRupee,
  Printer,
  Share2,
  CheckCircle2,
  Edit3,
  Save,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { updateUserApi } from '../services/api';

export const WorkerMyDetailsView: React.FC = () => {
  const { user, role } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const initialWorker = user || {
    id: 10,
    name: 'Manoj Worker',
    email: 'manoj.worker@laborunion.com',
    phone: '+91 98765 43210',
    employeeCode: 'WRK-010',
    designation: 'Electrician',
    dailyWage: 850,
    address: 'Block 4, Flat 202, Labour Colony, Bengaluru, Karnataka - 560001',
    siteName: 'Highway Flyover Project',
    siteCode: 'SITE-BLR-01'
  };

  const isWorkerRole = role === 'WORKER';
  const isSuperAgent = role === 'SUPER_AGENT';
  const isAgent = role === 'AGENT';

  const defaultPrefix = isSuperAgent ? 'SA' : isAgent ? 'AGT' : 'WRK';
  const workerCode = (initialWorker as any).employeeCode || `${defaultPrefix}-${String((initialWorker as any).id || 1).padStart(3, '0')}`;
  
  // Local Profile Editable States
  const [name, setName] = useState<string>(initialWorker.name || '');
  const [phone, setPhone] = useState<string>((initialWorker as any).phone || '+91 98765 43210');
  const [email, setEmail] = useState<string>(initialWorker.email || '');
  const [designation, setDesignation] = useState<string>(
    (initialWorker as any).designation || (isSuperAgent ? 'Union President' : isAgent ? 'Field Agent' : 'Electrician')
  );
  const [address, setAddress] = useState<string>(
    (initialWorker as any).address || 'Block 4, Flat 202, Labour Colony, Bengaluru, Karnataka - 560001'
  );

  const dailyWage = (initialWorker as any).dailyWage || 850;
  const roleBadgeStr = isSuperAgent ? 'SUPER ADMIN' : isAgent ? 'FIELD AGENT' : 'VERIFIED WORKER';
  const cardTitleStr = isSuperAgent ? 'OFFICIAL ADMIN ID' : isAgent ? 'OFFICIAL AGENT ID' : 'OFFICIAL WORKER ID';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email Address cannot be empty');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateUserApi((initialWorker as any).id || 1, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        designation: designation.trim(),
        address: address.trim()
      });

      // Update Auth local storage & trigger live app header update
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const updated = {
          ...parsed,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          designation: designation.trim(),
          address: address.trim()
        };
        localStorage.setItem('user', JSON.stringify(updated));
      }

      window.dispatchEvent(new Event('user:updated'));
      window.dispatchEvent(new Event('refresh-data'));

      setIsSaving(false);
      setIsEditing(false);
      setSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsSaving(false);
      setErrorMsg(err.message || 'Failed to update profile details');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Toast Notifications */}
      {errorMsg && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <span>My Profile & {isSuperAgent ? 'Personal Details' : isAgent ? 'Digital Agent ID' : 'Digital Worker ID'}</span>
            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: 'var(--color-workers-bg)', color: '#2563EB', padding: '4px 10px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
              {roleBadgeStr}
            </span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Complete personal details, designation, contact info, and official identity record.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {copied ? <CheckCircle2 size={16} color="#059669" /> : <Share2 size={16} />}
            <span>{copied ? 'Code Copied!' : 'Copy ID Code'}</span>
          </button>

          {!isSuperAgent && !isEditing && (
            <button
              type="button"
              onClick={handlePrintCard}
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Printer size={16} />
              <span>Print ID Card</span>
            </button>
          )}

          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setErrorMsg(null);
                  setName(initialWorker.name || '');
                  setPhone((initialWorker as any).phone || '');
                  setEmail(initialWorker.email || '');
                  setDesignation((initialWorker as any).designation || '');
                  setAddress((initialWorker as any).address || '');
                }}
                disabled={isSaving}
                style={{
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSaving}
                style={{
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isSaving ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Edit3 size={16} />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isSuperAgent ? '1fr' : 'minmax(320px, 360px) 1fr', gap: '24px' }}>
        
        {/* Left Column: Official Digital Worker/Agent ID Card (Hidden for Super Agent) */}
        {!isSuperAgent && (
          <div>
            <div
              style={{
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                borderRadius: '20px',
                padding: '24px',
                color: '#FFFFFF',
                boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #334155'
              }}
            >
              {/* ID Card Decorative Top Strip */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'linear-gradient(90deg, #2563EB, #059669, #D97706)' }} />

              {/* Header / Brand */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: '#94A3B8', textTransform: 'uppercase' }}>
                    LABOR UNION SYSTEM
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                    {cardTitleStr}
                  </h3>
                </div>
                <div style={{ backgroundColor: '#2563EB', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>
                  {workerCode}
                </div>
              </div>

              {/* Avatar & Key Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <UserAvatar
                  src={(initialWorker as any).avatar || (initialWorker as any).profileImage}
                  name={name || initialWorker.name}
                  size={64}
                />
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>{name || initialWorker.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    <Briefcase size={14} color="#60A5FA" />
                    <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600 }}>{designation}</span>
                  </div>
                </div>
              </div>

              {/* Scannable Attendance & Verification QR Code Section */}
              <div style={{ marginBottom: '20px', backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '14px', color: '#0F172A' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${window.location.origin}/?verifyWorkerId=${(initialWorker as any).id || 10}&agentId=${(initialWorker as any).assignedAgentId || (initialWorker as any).agentId || ''}&code=${workerCode}`)}`}
                    alt="Worker Attendance QR Code"
                    style={{ width: '96px', height: '96px', borderRadius: '8px', border: '1px solid #CBD5E1', flexShrink: 0 }}
                  />
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      ATTENDANCE QR CODE
                    </span>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: '2px 0 4px' }}>
                      Scan for Public Verification
                    </h4>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: 0, lineHeight: 1.3 }}>
                      Scan with any camera to view worker identity & assigned agent.
                    </p>
                    <a
                      href={`/?verifyWorkerId=${(initialWorker as any).id || 10}&agentId=${(initialWorker as any).assignedAgentId || (initialWorker as any).agentId || ''}&code=${workerCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '6px', textDecoration: 'none' }}
                    >
                      <span>Preview Public Verification ↗</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', borderTop: '1px solid #334155', paddingTop: '14px' }}>
                <span>Issued by: Labor Union Org</span>
                <span>Status: Active ✓</span>
              </div>

            </div>
          </div>
        )}

        {/* Right Column: Personal Information Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Personal Details */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="#2563EB" />
              <span>Personal Information</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13.5px' }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{name}</div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  User ID / Code
                </label>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#2563EB' }}>{workerCode}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13.5px' }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="var(--text-secondary)" />
                    <span>{phone}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13.5px' }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} color="var(--text-secondary)" />
                    <span>{email}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Role / Designation
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13.5px' }}
                  />
                ) : (
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>{designation}</div>
                )}
              </div>

              {isWorkerRole && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Daily Wage Rate
                  </label>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <IndianRupee size={14} />
                    <span>{dailyWage} / day</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Residential Home Address
              </label>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}
                />
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <MapPin size={15} color="#EF4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{address}</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
