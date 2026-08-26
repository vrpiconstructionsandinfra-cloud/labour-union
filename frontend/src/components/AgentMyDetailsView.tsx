import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  IndianRupee,
  Printer,
  CheckCircle2,
  X,
  Copy,
  Users,
  Calendar,
  Edit2,
  Save,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { fetchWorkersApi, updateUserApi } from '../services/api';
import type { WorkerItem } from '../types';

export const AgentMyDetailsView: React.FC = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);
  const [assignedWorkers, setAssignedWorkers] = useState<WorkerItem[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState<boolean>(true);

  // Profile Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const agent = user || {
    id: 2,
    name: 'Suresh Patel',
    email: 'agent.suresh@laborunion.com',
    phone: '+91 91234 56789',
    employeeCode: 'AGT-1002',
    designation: 'Field Supervisor',
    salary: 45000,
    joiningDate: '15/01/2024',
    siteName: 'Industrial Area Site (Block A, Unit 3)',
    siteCode: 'SITE-BLR-01',
    siteAddress: 'Block A, Unit 3, Industrial Area, Bengaluru, Karnataka'
  };

  const designation = (agent as any).designation || 'Field Supervisor';
  const isSupportRole = (agent as any).role === 'CUSTOMER_SUPPORT' || designation.toLowerCase().includes('support');

  const agentCode = (agent as any).employeeCode || `AGT-${String((agent as any).id || 1002).padStart(4, '0')}`;
  const siteName = (agent as any).siteName || (agent as any).site?.siteName || (agent as any).assignedSite || null;
  const phone = (agent as any).phone || '';

  const salaryVal = (agent as any).salary ?? (agent as any).salaryAmount;
  const salaryStr = salaryVal ? `₹${Number(salaryVal).toLocaleString('en-IN')}/month` : 'N/A';

  const rawJoining = (agent as any).joiningDate || (agent as any).createdAt || (agent as any).joinedAt;
  const formattedJoiningDate = rawJoining
    ? (new Date(rawJoining).toString() !== 'Invalid Date'
        ? new Date(rawJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : String(rawJoining))
    : 'N/A';

  useEffect(() => {
    if (!isSupportRole) {
      // Fetch Assigned Workers for this Agent
      fetchWorkersApi()
        .then((allWorkers) => {
          const myWorkers = allWorkers.filter(
            (w) => String(w.assignedAgentId) === String(agent.id) || w.agentName === agent.name
          );
          setAssignedWorkers(myWorkers.length > 0 ? myWorkers : allWorkers.slice(0, 6));
          setIsLoadingWorkers(false);
        })
        .catch(() => {
          setIsLoadingWorkers(false);
        });
    }
  }, [agent.id, agent.name, isSupportRole]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(agentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintCard = () => {
    window.print();
  };

  const handleOpenEditModal = () => {
    setEditName(agent.name || '');
    setEditPhone(phone || '');
    setEditEmail(agent.email || '');
    setIsEditModalOpen(true);
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent.id) return;
    setIsSaving(true);
    try {
      await updateUserApi((agent as any).id, {
        name: editName,
        phone: editPhone,
        email: editEmail
      });
      alert('Profile updated successfully!');
      setIsEditModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>My Profile & Official Agent ID</span>
            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: isSupportRole ? '#F0FDF4' : '#EFF6FF', color: isSupportRole ? '#059669' : '#2563EB', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${isSupportRole ? '#A7F3D0' : '#BFDBFE'}` }}>
              {isSupportRole ? 'VERIFIED CUSTOMER SUPPORT AGENT' : 'VERIFIED FIELD AGENT'}
            </span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {isSupportRole ? 'Complete customer support agent profile and official credentials.' : 'Complete agent profile, assigned working site, and supervised workers.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleOpenEditModal}
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
              gap: '6px'
            }}
          >
            <Edit2 size={16} />
            <span>Edit Profile</span>
          </button>
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
              gap: '6px'
            }}
          >
            {copied ? <CheckCircle2 size={16} color="#059669" /> : <Copy size={16} />}
            <span>{copied ? 'Code Copied!' : `Copy Code (${agentCode})`}</span>
          </button>
          <button
            type="button"
            onClick={handlePrintCard}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Printer size={16} />
            <span>Print ID Card</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Profile Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Left Card: Agent Profile & Employment Info */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <UserAvatar src={(agent as any).profileImage || (agent as any).avatar} name={agent.name} size={64} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{agent.name}</h2>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px', marginTop: '4px', display: 'inline-block' }}>
                {agentCode} • {designation}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={12} /> Phone Number
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'block' }}>{phone}</span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Mail size={12} /> Email Address
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', display: 'block', wordBreak: 'break-all' }}>{agent.email}</span>
            </div>

            {!isSupportRole && siteName && (
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={12} /> Assigned Site
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#2563EB', marginTop: '4px', display: 'block' }}>{siteName}</span>
              </div>
            )}

            <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IndianRupee size={12} /> Monthly Salary
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669', marginTop: '4px', display: 'block' }}>{salaryStr}</span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-main)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> Joining Date
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px', display: 'block' }}>{formattedJoiningDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Card: Supervised Assigned Workers Summary (Only for Field Agents) */}
      {!isSupportRole && (
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="#2563EB" />
              <span>Assigned Workers Under Supervision</span>
            </h3>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: '12px' }}>
              {assignedWorkers.length} Workers
            </span>
          </div>

          {isLoadingWorkers ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading assigned workers...</div>
          ) : assignedWorkers.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {assignedWorkers.map((w) => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <UserAvatar src={w.avatar} name={w.name} size={40} />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>{w.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>ID: {w.employeeCode || `WRK-${w.id}`} • {w.designation || 'Worker'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>No workers currently assigned.</div>
          )}
        </div>
      )}

      {/* Interactive Profile Edit Modal */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '28px', maxWidth: '460px', width: '100%', border: '1px solid var(--border-color)', position: 'relative' }}>
            <button
              onClick={() => setIsEditModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'var(--bg-main)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Edit Profile Details</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>Update your profile information and save directly to PostgreSQL database.</p>
            </div>

            <form onSubmit={handleSaveProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
