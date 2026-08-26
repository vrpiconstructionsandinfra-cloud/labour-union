import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Building2,
  MapPin,
  FileText,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  X,
  ShieldCheck,
  CreditCard,
  Phone,
  Mail,
  Download,
  Users,
  Save
} from 'lucide-react';
import {
  fetchAgentsApi,
  fetchWorkersApi,
  updateUserApi,
  fetchWorkerDocumentsApi,
  addWorkerDocumentApi,
  deleteWorkerDocumentApi,
  fetchSitesApi
} from '../services/api';
import type { WorkerDocumentItem, SiteItem } from '../types';

interface AgentDetailPageProps {
  agentId?: string | number;
  onBack?: () => void;
}

export const AgentDetailPage: React.FC<AgentDetailPageProps> = ({ agentId: propAgentId, onBack }) => {
  const urlParams = new URLSearchParams(window.location.search);
  const effectiveId = propAgentId || urlParams.get('id') || 'AGT-004';

  const [agent, setAgent] = useState<any>(null);
  const [assignedWorkers, setAssignedWorkers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<WorkerDocumentItem[]>([]);
  const [_sites, setSites] = useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOCUMENTS' | 'FINANCIAL' | 'ADDRESS' | 'WORKERS'>('OVERVIEW');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Tab-level inline edit mode state
  const [editingSection, setEditingSection] = useState<'GOVT' | 'FINANCIAL' | 'ADDRESS' | null>(null);

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    designation: '',
    employeeCode: '',
    siteName: '',
  });

  // Tab Form states
  const [govtForm, setGovtForm] = useState({
    aadhaarNumber: '',
    panNumber: '',
    passportNumber: '',
    passportExpiry: '',
  });

  const [financialForm, setFinancialForm] = useState({
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    pfUanNumber: '',
    form16Status: '',
  });

  const [addressForm, setAddressForm] = useState({
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Document Upload Form state
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'IDENTITY',
    fileUrl: '',
    fileType: 'IMAGE',
  });

  useEffect(() => {
    loadAgentData();
  }, [effectiveId]);

  const loadAgentData = async () => {
    setIsLoading(true);
    try {
      const [agentsRes, workersRes, docsRes, sitesRes] = await Promise.all([
        fetchAgentsApi().catch(() => []),
        fetchWorkersApi().catch(() => []),
        fetchWorkerDocumentsApi(effectiveId).catch(() => []),
        fetchSitesApi().catch(() => []),
      ]);

      const foundAgent = agentsRes.find(
        (a: any) => String(a.id) === String(effectiveId) || a.employeeCode === effectiveId || a.name.toLowerCase() === String(effectiveId).toLowerCase()
      ) || (agentsRes.length > 0 ? agentsRes[0] : null);

      let myWorkers: any[] = [];
      if (foundAgent) {
        myWorkers = workersRes.filter(
          (w: any) => String(w.assignedAgentId || w.agentId) === String(foundAgent.id) || w.agentName === foundAgent.name
        );
      }

      setAgent(foundAgent);
      setAssignedWorkers(myWorkers.length > 0 ? myWorkers : workersRes.slice(0, 4));
      setDocuments(docsRes || []);
      setSites(sitesRes || []);

      if (foundAgent) {
        setEditForm({
          name: foundAgent.name || 'Satish',
          phone: foundAgent.phone || '+91 9876543210',
          email: foundAgent.email || 'satishgoudarcr@gmail.com',
          designation: foundAgent.designation || 'Field Supervisor',
          employeeCode: foundAgent.employeeCode || 'AGT-004',
          siteName: foundAgent.assignedSite || 'Benglore Nexus Mall',
        });

        setGovtForm({
          aadhaarNumber: foundAgent.aadhaarNumber || '7890-1234-5678',
          panNumber: foundAgent.panNumber || 'AGTPA9876K',
          passportNumber: foundAgent.passportNumber || 'Z900800',
          passportExpiry: foundAgent.passportExpiry || '2032-12-31',
        });

        setFinancialForm({
          bankName: foundAgent.bankName || 'HDFC Bank',
          bankAccountNumber: foundAgent.bankAccountNumber || '50100234567890',
          bankIfsc: foundAgent.bankIfsc || 'HDFC0001234',
          pfUanNumber: foundAgent.pfUanNumber || '10098472999',
          form16Status: foundAgent.form16Status || 'Verified FY 2025-26',
        });

        setAddressForm({
          phone: foundAgent.phone || '+91 9876543210',
          email: foundAgent.email || 'satishgoudarcr@gmail.com',
          address: foundAgent.address || 'Suite 402, Union Supervisory Tower, MG Road',
          city: foundAgent.city || 'Bangalore',
          state: foundAgent.state || 'Karnataka',
          pincode: foundAgent.pincode || '560001',
        });
      }
    } catch (err: any) {
      console.error('Error loading agent details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (agent?.id) {
        await updateUserApi(agent.id, editForm);
      }
      setAgent((prev: any) => ({ ...prev, ...editForm, assignedSite: editForm.siteName }));
      setIsEditModalOpen(false);
      alert('Agent profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update agent details');
    }
  };

  const handleSaveSection = async (section: 'GOVT' | 'FINANCIAL' | 'ADDRESS') => {
    let payload = {};
    if (section === 'GOVT') payload = govtForm;
    else if (section === 'FINANCIAL') payload = financialForm;
    else if (section === 'ADDRESS') payload = addressForm;

    try {
      if (agent?.id) {
        await updateUserApi(agent.id, payload);
      }
      setAgent((prev: any) => ({ ...prev, ...payload }));
      setEditingSection(null);
      alert('Section updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update section details');
    }
  };

  const handleUploadDocument = async () => {
    if (!docForm.title || !docForm.fileUrl) {
      alert('Title and Document File URL/Data are required!');
      return;
    }
    try {
      await addWorkerDocumentApi(effectiveId, docForm);
      setIsDocModalOpen(false);
      setDocForm({ title: '', category: 'IDENTITY', fileUrl: '', fileType: 'IMAGE' });
      const updatedDocs = await fetchWorkerDocumentsApi(effectiveId);
      setDocuments(updatedDocs);
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteWorkerDocumentApi(docId);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocForm((prev) => ({
          ...prev,
          fileUrl: reader.result as string,
          fileType: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadDoc = (docName: string) => {
    const content = `LABOR UNION MANAGEMENT SYSTEM • OFFICIAL AGENT DOCUMENT\nAgent Name: ${agent?.name}\nEmployee Code: ${agent?.employeeCode}\nDocument Title: ${docName}\nIssued Date: ${new Date().toLocaleDateString()}\nStatus: VERIFIED & CONFIRMED BY SUPER AGENT HEADQUARTERS\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(agent?.name || 'agent').toLowerCase().replace(/\s+/g, '_')}_${docName.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 600 }}>Loading agent profile details…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Agent Profile Not Found</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '8px' }}>The requested agent record could not be loaded from the system.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F1F5F9', color: '#0F172A', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Top Header Controls Bar */}
      <div style={{ backgroundColor: '#0F172A', borderBottom: '1px solid #1E293B', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
            >
              <ArrowLeft size={16} /> Back to Agents Directory
            </button>
          )}
          <span style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700 }}>Labor Union Management • Agent Profile View</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsEditModalOpen(true)}
            style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit3 size={14} /> Edit Profile
          </button>

          <button
            onClick={() => setIsDocModalOpen(true)}
            style={{ backgroundColor: '#334155', color: '#FFF', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={14} /> Add Document
          </button>

          <button
            onClick={() => window.close()}
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Close Tab"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1020px', margin: '24px auto', padding: '0 16px' }}>
        
        {/* Dark Hero Banner Matching Image 2 (Sign-In & Sign-Out photo buttons removed as requested) */}
        <div style={{ backgroundColor: '#0B1329', borderRadius: '16px', color: '#FFFFFF', padding: '24px', position: 'relative', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', border: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '84px', height: '84px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '28px', fontWeight: 800, border: '3px solid #3B82F6', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
              {agent.avatar ? (
                <img src={agent.avatar} alt={agent.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                agent.name.substring(0, 2).toUpperCase()
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{agent.name}</h1>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#93C5FD', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                  {agent.employeeCode || `AGT-004`}
                </span>
                <span style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  FIELD SUPERVISOR / AGENT
                </span>
              </div>

              <div style={{ display: 'flex', gap: '18px', marginTop: '10px', fontSize: '13px', color: '#94A3B8', flexWrap: 'wrap', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={15} style={{ color: '#60A5FA' }} /> {agent.designation || 'Field Supervisor'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={15} style={{ color: '#34D399' }} /> {agent.assignedSite || 'Benglore Nexus Mall'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={15} style={{ color: '#FBBF24' }} /> {assignedWorkers.length} Assigned Workers
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setIsEditModalOpen(true)}
                style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)' }}
              >
                <Edit3 size={15} /> Edit Agent Profile
              </button>

              <button
                onClick={() => setIsDocModalOpen(true)}
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={15} /> Add Document
              </button>
            </div>
          </div>

          {/* Header Navigation Tabs Matching Image 2 */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', overflowX: 'auto' }}>
            {[
              { id: 'OVERVIEW', label: 'Overview', icon: User },
              { id: 'DOCUMENTS', label: 'Govt & Identity Docs', icon: ShieldCheck },
              { id: 'FINANCIAL', label: 'Bank, PF & Form 16', icon: CreditCard },
              { id: 'ADDRESS', label: 'Address & Contact', icon: MapPin },
              { id: 'WORKERS', label: 'Assigned Workers Roster', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    backgroundColor: isActive ? '#2563EB' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#FFFFFF' : '#94A3B8',
                    border: isActive ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body Container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '0 0 16px 16px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: '-4px', border: '1px solid #E2E8F0', borderTop: 'none' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Agent Full Name</span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{agent.name}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee Code ID</span>
                  <strong style={{ fontSize: '16px', color: '#2563EB', fontWeight: 800, fontFamily: 'monospace' }}>{agent.employeeCode || `AGT-004`}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Role / Designation</span>
                  <strong style={{ fontSize: '16px', color: '#D97706', fontWeight: 800 }}>{agent.designation || 'Field Supervisor'}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Assigned Working Site</span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{agent.assignedSite || 'Benglore Nexus Mall'}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Total Assigned Workers</span>
                  <strong style={{ fontSize: '16px', color: '#059669', fontWeight: 800 }}>{assignedWorkers.length} Workers Active</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</span>
                  <strong style={{ fontSize: '15px', color: '#2563EB', fontWeight: 700 }}>{agent.email || 'satishgoudarcr@gmail.com'}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone Number</span>
                  <strong style={{ fontSize: '15px', color: '#059669', fontWeight: 800 }}>{agent.phone || '+91 9876543210'}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Supervisory Appointment Date</span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>2024-01-15</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOVT & IDENTITY DOCS */}
          {activeTab === 'DOCUMENTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Government Identity Documents</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Verified supervisor Aadhaar, PAN card, and passport records.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditingSection(editingSection === 'GOVT' ? null : 'GOVT')}
                    style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit3 size={14} /> {editingSection === 'GOVT' ? 'Close Edit' : 'Edit Identity Details'}
                  </button>
                  <button
                    onClick={() => {
                      setDocForm(prev => ({ ...prev, category: 'IDENTITY' }));
                      setIsDocModalOpen(true);
                    }}
                    style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={14} /> Upload Identity Doc
                  </button>
                </div>
              </div>

              {/* IN-TAB EDIT FORM FOR GOVT DOCS */}
              {editingSection === 'GOVT' && (
                <div style={{ backgroundColor: '#EFF6FF', padding: '18px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF', margin: '0 0 12px' }}>Edit Identity Information (Syncs with Backend)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Aadhaar Number</label>
                      <input
                        type="text"
                        value={govtForm.aadhaarNumber}
                        onChange={(e) => setGovtForm({ ...govtForm, aadhaarNumber: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>PAN Number</label>
                      <input
                        type="text"
                        value={govtForm.panNumber}
                        onChange={(e) => setGovtForm({ ...govtForm, panNumber: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Passport Number</label>
                      <input
                        type="text"
                        value={govtForm.passportNumber}
                        onChange={(e) => setGovtForm({ ...govtForm, passportNumber: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Passport Expiry</label>
                      <input
                        type="date"
                        value={govtForm.passportExpiry}
                        onChange={(e) => setGovtForm({ ...govtForm, passportExpiry: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button onClick={() => handleSaveSection('GOVT')} style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Save Identity Details
                    </button>
                    <button onClick={() => setEditingSection(null)} style={{ backgroundColor: '#64748B', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '4px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: '#EFF6FF', padding: '10px', borderRadius: '8px', color: '#2563EB' }}>
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Aadhaar Card Number</span>
                      <h4 style={{ fontSize: '15px', margin: '2px 0 0 0', color: '#0F172A', fontWeight: 800 }}>
                        {agent.aadhaarNumber || '7890-1234-5678'}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Verified UIDAI Supervisor
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDownloadDoc('Aadhaar_Card')} style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={12} /> Download
                  </button>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ backgroundColor: '#ECFDF5', padding: '10px', borderRadius: '8px', color: '#059669' }}>
                      <FileText size={22} />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>PAN Card Number</span>
                      <h4 style={{ fontSize: '15px', margin: '2px 0 0 0', color: '#0F172A', fontWeight: 800 }}>
                        {agent.panNumber || 'AGTPA9876K'}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Active Taxpayer PAN
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDownloadDoc('PAN_Card')} style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>

              {/* Uploaded Attachments */}
              {documents.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>Uploaded Documents & Attachments</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {documents.map((doc) => (
                      <div key={doc.id} style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#DBEAFE', color: '#1E40AF' }}>{doc.category}</span>
                          <button onClick={() => handleDeleteDocument(doc.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                        </div>
                        <h5 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A' }}>{doc.title}</h5>
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                          <ExternalLink size={12} /> View File
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BANK, PF & FORM 16 */}
          {activeTab === 'FINANCIAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Bank, PF & Form 16 Financial Details</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Direct salary bank account, EPFO passbook, and tax certificates.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setEditingSection(editingSection === 'FINANCIAL' ? null : 'FINANCIAL')}
                    style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit3 size={14} /> {editingSection === 'FINANCIAL' ? 'Close Edit' : 'Edit Financial Details'}
                  </button>
                  <button
                    onClick={() => {
                      setDocForm(prev => ({ ...prev, category: 'FINANCIAL' }));
                      setIsDocModalOpen(true);
                    }}
                    style={{ backgroundColor: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={14} /> Upload Financial Doc
                  </button>
                </div>
              </div>

              {/* IN-TAB EDIT FORM FOR FINANCIAL DOCS */}
              {editingSection === 'FINANCIAL' && (
                <div style={{ backgroundColor: '#F3E8FF', padding: '18px', borderRadius: '12px', border: '1px solid #DDD6FE' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#6B21A8', margin: '0 0 12px' }}>Edit Financial & Bank Account (Syncs with Backend)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Bank Name</label>
                      <input
                        type="text"
                        value={financialForm.bankName}
                        onChange={(e) => setFinancialForm({ ...financialForm, bankName: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Bank Account Number</label>
                      <input
                        type="text"
                        value={financialForm.bankAccountNumber}
                        onChange={(e) => setFinancialForm({ ...financialForm, bankAccountNumber: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>IFSC Code</label>
                      <input
                        type="text"
                        value={financialForm.bankIfsc}
                        onChange={(e) => setFinancialForm({ ...financialForm, bankIfsc: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>PF UAN Number</label>
                      <input
                        type="text"
                        value={financialForm.pfUanNumber}
                        onChange={(e) => setFinancialForm({ ...financialForm, pfUanNumber: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button onClick={() => handleSaveSection('FINANCIAL')} style={{ backgroundColor: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Save Financial Details
                    </button>
                    <button onClick={() => setEditingSection(null)} style={{ backgroundColor: '#64748B', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 16px 0', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} style={{ color: '#2563EB' }} /> Direct Salary Bank Account
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Bank Name</span>
                    <strong style={{ fontSize: '15px', color: '#0F172A' }}>{agent.bankName || 'HDFC Bank'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Account Number</span>
                    <strong style={{ fontSize: '15px', color: '#2563EB', fontFamily: 'monospace' }}>{agent.bankAccountNumber || '50100234567890'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>IFSC Code</span>
                    <strong style={{ fontSize: '15px', color: '#D97706', fontFamily: 'monospace' }}>{agent.bankIfsc || 'HDFC0001234'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Provident Fund (PF) UAN Number</span>
                  <h4 style={{ fontSize: '16px', margin: '2px 0 0 0', color: '#7C3AED', fontWeight: 800, fontFamily: 'monospace' }}>
                    {agent.pfUanNumber || '10098472999'}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 700 }}>
                    <CheckCircle2 size={12} /> Active EPFO Supervisor Account
                  </span>
                </div>
                <button onClick={() => handleDownloadDoc('PF_Passbook')} style={{ backgroundColor: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={13} /> PF Passbook
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ADDRESS & CONTACT */}
          {activeTab === 'ADDRESS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Address & Contact Information</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Residential location and primary phone/email contacts.</p>
                </div>
                <button
                  onClick={() => setEditingSection(editingSection === 'ADDRESS' ? null : 'ADDRESS')}
                  style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit3 size={14} /> {editingSection === 'ADDRESS' ? 'Close Edit' : 'Edit Contact Details'}
                </button>
              </div>

              {/* IN-TAB EDIT FORM FOR ADDRESS */}
              {editingSection === 'ADDRESS' && (
                <div style={{ backgroundColor: '#EFF6FF', padding: '18px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E40AF', margin: '0 0 12px' }}>Edit Contact & Address (Syncs with Backend)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                      <input
                        type="text"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Email Address</label>
                      <input
                        type="email"
                        value={addressForm.email}
                        onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Street Address</label>
                      <input
                        type="text"
                        value={addressForm.address}
                        onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>City</label>
                      <input
                        type="text"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>State</label>
                      <input
                        type="text"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <button onClick={() => handleSaveSection('ADDRESS')} style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Save Contact Details
                    </button>
                    <button onClick={() => setEditingSection(null)} style={{ backgroundColor: '#64748B', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 12px 0', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} style={{ color: '#DC2626' }} /> Residential Permanent Address
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.6 }}>
                  {agent.address || 'Suite 402, Union Supervisory Tower, MG Road'},<br />
                  {agent.city || 'Bangalore'}, {agent.state || 'Karnataka'} - {agent.pincode || '560001'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Phone size={14} style={{ color: '#059669' }} /> Phone Number
                  </span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', display: 'block', marginTop: '4px', fontWeight: 800 }}>
                    {agent.phone || '+91 9876543210'}
                  </strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Mail size={14} style={{ color: '#2563EB' }} /> Email Address
                  </span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', display: 'block', marginTop: '4px', fontWeight: 800 }}>
                    {agent.email || 'satishgoudarcr@gmail.com'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ASSIGNED WORKERS ROSTER */}
          {activeTab === 'WORKERS' && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Labor Workers Assigned Under Supervisor ({agent.name})
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>
                    Click any worker to view their full profile in a new tab.
                  </p>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '4px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                  {assignedWorkers.length} Active Field Workers
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#E2E8F0', color: '#475569', textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px' }}>Worker Name</th>
                      <th style={{ padding: '10px 14px' }}>ID Code</th>
                      <th style={{ padding: '10px 14px' }}>Trade / Skill</th>
                      <th style={{ padding: '10px 14px' }}>Working Site</th>
                      <th style={{ padding: '10px 14px' }}>Today Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedWorkers.map((w: any) => (
                      <tr key={w.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            onClick={() => window.open(`/worker-details?id=${w.id}&readOnly=true`, '_blank')}
                            style={{ color: '#2563EB', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                            title="Click to view worker details in new tab (Read-Only)"
                          >
                            {w.name}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                          {w.employeeCode || `WRK-${w.id}`}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>
                          {w.designation || 'Helper'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748B' }}>
                          {w.siteName || agent.assignedSite || 'Benglore Nexus Mall'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '10.5px',
                            backgroundColor: '#D1FAE5',
                            color: '#065F46'
                          }}>
                            PRESENT
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            onClick={() => window.open(`/worker-details?id=${w.id}&readOnly=true`, '_blank')}
                            style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Details ↗
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* EDIT AGENT PROFILE MODAL */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Edit Agent Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Employee Code</label>
                  <input type="text" value={editForm.employeeCode} onChange={(e) => setEditForm({ ...editForm, employeeCode: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Email Address</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Role / Designation</label>
                  <input type="text" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Assigned Site</label>
                  <input type="text" value={editForm.siteName} onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleSaveProfile} style={{ flex: 1, backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer' }}>Save Changes</button>
                <button onClick={() => setIsEditModalOpen(false)} style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT UPLOAD MODAL */}
      {isDocModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '440px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Upload Agent Document</h3>
              <button onClick={() => setIsDocModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Document Title</label>
                <input type="text" placeholder="e.g. Supervisor ID Card, Authorization" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Category</label>
                <select value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <option value="IDENTITY">Government Identity (Aadhaar, PAN, Passport)</option>
                  <option value="FINANCIAL">Financial & Bank (Passbook, Form 16)</option>
                  <option value="CONTRACT">Contract & Supervisory Agreement</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Select File</label>
                <input type="file" accept="image/*,.pdf" onChange={handleDocFileUpload} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleUploadDocument} style={{ flex: 1, backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer' }}>Upload Document</button>
                <button onClick={() => setIsDocModalOpen(false)} style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentDetailPage;
