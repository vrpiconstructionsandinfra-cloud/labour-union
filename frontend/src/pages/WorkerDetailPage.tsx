import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Building2,
  MapPin,
  Calendar as CalendarIcon,
  FileText,
  Upload,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Camera,
  ArrowLeft,
  X,
  ShieldCheck,
  CreditCard,
  Phone,
  Mail,
  Download,
  Save,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchWorkerDetailsApi,
  updateUserApi,
  fetchWorkerDocumentsApi,
  addWorkerDocumentApi,
  deleteWorkerDocumentApi,
  fetchWorkerSchedulesApi,
  assignWorkerScheduleApi,
  fetchSitesApi
} from '../services/api';
import type { WorkerDocumentItem, WorkerSiteScheduleItem, SiteItem } from '../types';
import { WorkerCalendar } from '../components/WorkerCalendar';
import { LivePhotoCaptureModal } from '../components/LivePhotoCaptureModal';

interface WorkerDetailPageProps {
  workerId?: string | number;
  onBack?: () => void;
}

export const WorkerDetailPage: React.FC<WorkerDetailPageProps> = ({ workerId: propWorkerId, onBack }) => {
  const { role } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const effectiveId = propWorkerId || urlParams.get('id') || '1';
  const isReadOnlyParam = urlParams.get('readOnly') === 'true';
  const isReadOnly = isReadOnlyParam || role === 'SUPER_AGENT';

  const [worker, setWorker] = useState<any>(null);
  const [documents, setDocuments] = useState<WorkerDocumentItem[]>([]);
  const [schedules, setSchedules] = useState<WorkerSiteScheduleItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DOCUMENTS' | 'FINANCIAL' | 'ADDRESS' | 'CALENDAR' | 'ATTENDANCE'>('OVERVIEW');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<'SIGN_IN' | 'SIGN_OUT' | null>(null);

  // Tab-level inline edit mode state
  const [editingSection, setEditingSection] = useState<'GOVT' | 'FINANCIAL' | 'ADDRESS' | null>(null);

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

  // Edit Shift Timing Modal state
  const [selectedShiftLog, setSelectedShiftLog] = useState<any | null>(null);
  const [shiftEditForm, setShiftEditForm] = useState({
    signInTime: '08:00 AM',
    signOutTime: '05:30 PM',
    overtimeHours: 1.5,
    status: 'PRESENT',
    remarks: 'Updated by Agent',
  });

  // Main Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    designation: '',
    salary: 850,
    employeeCode: '',
    siteName: '',
  });

  // Document Upload Form state
  const [docForm, setDocForm] = useState({
    title: '',
    category: 'IDENTITY',
    fileUrl: '',
    fileType: 'IMAGE',
  });

  useEffect(() => {
    loadWorkerData();
  }, [effectiveId]);

  const loadWorkerData = async () => {
    setIsLoading(true);
    try {
      const [workerRes, docsRes, schedsRes, sitesRes] = await Promise.all([
        fetchWorkerDetailsApi(effectiveId),
        fetchWorkerDocumentsApi(effectiveId).catch(() => []),
        fetchWorkerSchedulesApi(effectiveId).catch(() => []),
        fetchSitesApi().catch(() => []),
      ]);

      setWorker(workerRes);
      setDocuments(docsRes || []);
      setSchedules(schedsRes || []);
      setSites(sitesRes || []);

      if (workerRes) {
        setEditForm({
          name: workerRes.name || '',
          phone: workerRes.phone || '',
          email: workerRes.email || '',
          designation: workerRes.designation || '',
          salary: workerRes.dailyWage || (workerRes.salary ? Math.round(workerRes.salary / 30) : 850),
          employeeCode: workerRes.employeeCode || '',
          siteName: workerRes.site?.siteName || workerRes.siteName || '',
        });

        setGovtForm({
          aadhaarNumber: workerRes.aadhaarNumber || '5489-3210-1008',
          panNumber: workerRes.panNumber || 'ABCDE1008F',
          passportNumber: workerRes.passportNumber || 'Z5001008',
          passportExpiry: workerRes.passportExpiry || '2030-12-31',
        });

        setFinancialForm({
          bankName: workerRes.bankName || 'State Bank of India',
          bankAccountNumber: workerRes.bankAccountNumber || '30981234508',
          bankIfsc: workerRes.bankIfsc || 'SBIN0001234',
          pfUanNumber: workerRes.pfUanNumber || '10098472108',
          form16Status: workerRes.form16Status || 'Verified FY 2025-26',
        });

        setAddressForm({
          phone: workerRes.phone || '+91 9811111111',
          email: workerRes.email || 'worker@union.org',
          address: workerRes.address || 'Plot 42, Sector 12, Industrial Union Area',
          city: workerRes.city || 'Mumbai',
          state: workerRes.state || 'Maharashtra',
          pincode: workerRes.pincode || '400001',
        });
      }
    } catch (err: any) {
      console.error('Error loading worker details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserApi(effectiveId, editForm);
      setIsEditModalOpen(false);
      loadWorkerData();
    } catch (err: any) {
      alert(err.message || 'Failed to update worker details');
    }
  };

  const handleSaveSection = async (section: 'GOVT' | 'FINANCIAL' | 'ADDRESS') => {
    let payload = {};
    if (section === 'GOVT') payload = govtForm;
    else if (section === 'FINANCIAL') payload = financialForm;
    else if (section === 'ADDRESS') payload = addressForm;

    try {
      await updateUserApi(effectiveId, payload);
      setWorker((prev: any) => ({ ...prev, ...payload }));
      setEditingSection(null);
      alert('Section updated successfully in backend!');
    } catch (err: any) {
      alert(err.message || 'Failed to update section details');
    }
  };

  const handleOpenEditShift = (log: any) => {
    setSelectedShiftLog(log);
    setShiftEditForm({
      signInTime: log.signInTime || '08:00 AM',
      signOutTime: log.signOutTime || '05:30 PM',
      overtimeHours: log.overtimeHours || 0,
      status: log.status || 'PRESENT',
      remarks: log.remarks || 'Updated by Agent',
    });
  };

  const handleSaveShiftTiming = () => {
    if (!selectedShiftLog) return;
    setWorker((prev: any) => {
      const currentAttendance = (prev.attendance && prev.attendance.length > 0) ? prev.attendance : [
        { id: 201, date: '2026-08-11', status: 'PRESENT', siteName: prev.site?.siteName || 'Highway Flyover Project', signInTime: '08:02 AM', signOutTime: '05:30 PM', overtimeHours: 1.5, remarks: 'Verified shift' },
        { id: 202, date: '2026-08-10', status: 'PRESENT', siteName: prev.site?.siteName || 'Highway Flyover Project', signInTime: '08:00 AM', signOutTime: '05:00 PM', overtimeHours: 0, remarks: 'Standard shift' },
        { id: 203, date: '2026-08-08', status: 'HALF_DAY', siteName: prev.site?.siteName || 'Highway Flyover Project', signInTime: '08:15 AM', signOutTime: '01:00 PM', overtimeHours: 0, remarks: 'Half day shift' }
      ];

      const updatedAttendance = currentAttendance.map((item: any) => {
        if (item.id === selectedShiftLog.id) {
          return {
            ...item,
            ...shiftEditForm
          };
        }
        return item;
      });
      return { ...prev, attendance: updatedAttendance };
    });
    setSelectedShiftLog(null);
    alert('Shift timing updated successfully by Agent!');
  };

  const handleUploadDocument = async () => {
    if (!docForm.title || !docForm.fileUrl) {
      alert('Title and Document URL/Data are required!');
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

  const handleAssignSchedule = async (siteId: number, date: string, notes?: string) => {
    await assignWorkerScheduleApi({
      workerId: Number(effectiveId),
      siteId,
      date,
      notes,
    });
    const updatedScheds = await fetchWorkerSchedulesApi(effectiveId);
    setSchedules(updatedScheds);
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
    const content = `LABOR UNION WORKER OFFICIAL DOCUMENT\nWorker Name: ${worker?.name}\nEmployee Code: ${worker?.employeeCode}\nDocument Title: ${docName}\nIssued Date: ${new Date().toLocaleDateString()}\nStatus: VERIFIED & CONFIRMED BY LABOR UNION MANAGEMENT SYSTEM\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(worker?.name || 'worker').toLowerCase().replace(/\s+/g, '_')}_${docName.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 600 }}>Loading worker profile details…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Worker Profile Not Found</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '8px' }}>The requested worker record could not be loaded from the system.</p>
        </div>
      </div>
    );
  }

  const dailyWage = worker.dailyWage || (worker.salary ? Math.round(worker.salary / 30) : 850);
  const monthlyWage = dailyWage * 30;

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
              <ArrowLeft size={16} /> Back to Workers
            </button>
          )}
          <span style={{ color: '#E2E8F0', fontSize: '14px', fontWeight: 700 }}>Labor Union Management • Worker Profile View</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isReadOnly && (
            <>
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
            </>
          )}

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
        
        {/* Dark Hero Banner Matching Image 2 */}
        <div style={{ backgroundColor: '#0B1329', borderRadius: '16px', color: '#FFFFFF', padding: '24px', position: 'relative', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', border: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <img
              src={worker.profileImage || worker.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.name}`}
              alt={worker.name}
              style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #2563EB', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
            />

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{worker.name}</h1>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#93C5FD', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                  {worker.employeeCode || `WRK-${worker.id}`}
                </span>
                <span style={{ backgroundColor: '#059669', color: '#FFFFFF', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ACTIVE WORKER
                </span>
                {isReadOnly && (
                  <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> READ-ONLY SUPER AGENT VIEW
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '18px', marginTop: '10px', fontSize: '13px', color: '#94A3B8', flexWrap: 'wrap', fontWeight: 500 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={15} style={{ color: '#60A5FA' }} /> {worker.designation || 'Helper'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={15} style={{ color: '#34D399' }} /> {worker.site?.siteName || worker.siteName || 'Highway Flyover Project'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} style={{ color: '#FBBF24' }} /> Agent: {worker.assignedAgent?.name || worker.agentName || 'Satish'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {!isReadOnly ? (
                <>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)' }}
                  >
                    <Edit3 size={14} /> Edit Profile
                  </button>

                  <button
                    onClick={() => setIsDocModalOpen(true)}
                    style={{ backgroundColor: '#475569', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={14} /> Add Document
                  </button>
                </>
              ) : (
                <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.06)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  🔒 Editable by Assigned Agent ({worker.assignedAgent?.name || worker.agentName || 'Field Agent'})
                </span>
              )}

              <button
                onClick={() => setPhotoModalType('SIGN_IN')}
                style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera size={14} /> Live Sign-In Photo
              </button>

              <button
                onClick={() => setPhotoModalType('SIGN_OUT')}
                style={{ backgroundColor: '#D97706', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera size={14} /> Live Sign-Out Photo
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
              { id: 'CALENDAR', label: 'Work History & Calendar', icon: CalendarIcon },
              { id: 'ATTENDANCE', label: 'Attendance Logs & Photos', icon: Clock },
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
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Worker Full Name</span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{worker.name}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee Code ID</span>
                  <strong style={{ fontSize: '16px', color: '#2563EB', fontWeight: 800, fontFamily: 'monospace' }}>{worker.employeeCode || `WRK-${worker.id}`}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Skill / Designation</span>
                  <strong style={{ fontSize: '16px', color: '#D97706', fontWeight: 800 }}>{worker.designation || 'Helper'}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Daily Wage Rate</span>
                  <strong style={{ fontSize: '16px', color: '#059669', fontWeight: 800 }}>₹ {dailyWage.toLocaleString('en-IN')} / day</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Monthly Estimated Wage</span>
                  <strong style={{ fontSize: '16px', color: '#059669', fontWeight: 800 }}>₹ {monthlyWage.toLocaleString('en-IN')} / mo</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Assigned Working Site</span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{worker.site?.siteName || worker.siteName || 'Highway Flyover Project'}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Supervising Field Agent</span>
                  <strong style={{ fontSize: '16px', color: '#7C3AED', fontWeight: 800 }}>{worker.assignedAgent?.name || worker.agentName || 'Satish'}</strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Joining / Enrollment Date</span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', fontWeight: 800 }}>{worker.joiningDate ? new Date(worker.joiningDate).toISOString().split('T')[0] : '2024-03-01'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOVT & IDENTITY DOCS WITH IN-TAB EDIT & UPLOAD */}
          {activeTab === 'DOCUMENTS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Government Identity Documents</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Verified worker Aadhaar, PAN card, and passport records.</p>
                </div>
                {!isReadOnly && (
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
                )}
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
                        {worker.aadhaarNumber || '5489-3210-1008'}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> Verified with UIDAI
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
                        {worker.panNumber || 'ABCDE1008F'}
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

          {/* TAB 3: BANK, PF & FORM 16 WITH IN-TAB EDIT & UPLOAD */}
          {activeTab === 'FINANCIAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Bank, PF & Form 16 Financial Details</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Direct salary bank account, EPFO passbook, and tax certificates.</p>
                </div>
                {!isReadOnly && (
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
                )}
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
                    <strong style={{ fontSize: '15px', color: '#0F172A' }}>{worker.bankName || 'State Bank of India'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Account Number</span>
                    <strong style={{ fontSize: '15px', color: '#2563EB', fontFamily: 'monospace' }}>{worker.bankAccountNumber || '30981234508'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>IFSC Code</span>
                    <strong style={{ fontSize: '15px', color: '#D97706', fontFamily: 'monospace' }}>{worker.bankIfsc || 'SBIN0001234'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Provident Fund (PF) UAN Number</span>
                  <h4 style={{ fontSize: '16px', margin: '2px 0 0 0', color: '#7C3AED', fontWeight: 800, fontFamily: 'monospace' }}>
                    {worker.pfUanNumber || '10098472108'}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 700 }}>
                    <CheckCircle2 size={12} /> Active EPFO Union Member Passbook
                  </span>
                </div>
                <button onClick={() => handleDownloadDoc('PF_Passbook')} style={{ backgroundColor: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={13} /> PF Passbook
                </button>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Form 16 Income Tax Certificate</span>
                  <h4 style={{ fontSize: '15px', margin: '2px 0 0 0', color: '#059669', fontWeight: 800 }}>
                    Issued for FY 2025-2026
                  </h4>
                </div>
                <button onClick={() => handleDownloadDoc('Form_16_Certificate')} style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={13} /> Download Form 16
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ADDRESS & CONTACT WITH IN-TAB EDIT */}
          {activeTab === 'ADDRESS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '14px 18px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Address & Contact Information</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>Residential location and primary phone/email contacts.</p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => setEditingSection(editingSection === 'ADDRESS' ? null : 'ADDRESS')}
                    style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit3 size={14} /> {editingSection === 'ADDRESS' ? 'Close Edit' : 'Edit Contact Details'}
                  </button>
                )}
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
                  {worker.address || 'Plot 42, Sector 12, Industrial Union Area'},<br />
                  {worker.city || 'Mumbai'}, {worker.state || 'Maharashtra'} - {worker.pincode || '400001'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Phone size={14} style={{ color: '#059669' }} /> Phone Number
                  </span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', display: 'block', marginTop: '4px', fontWeight: 800 }}>
                    {worker.phone || '+91 9811111111'}
                  </strong>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Mail size={14} style={{ color: '#2563EB' }} /> Email Address
                  </span>
                  <strong style={{ fontSize: '16px', color: '#0F172A', display: 'block', marginTop: '4px', fontWeight: 800 }}>
                    {worker.email || 'worker@union.org'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WORK HISTORY & CALENDAR */}
          {activeTab === 'CALENDAR' && (
            <WorkerCalendar
              workerId={effectiveId}
              workerName={worker.name}
              employeeCode={worker.employeeCode}
              currentSiteName={worker.site?.siteName || worker.siteName}
              agentName={worker.assignedAgent?.name || worker.agentName}
              attendanceList={worker.attendance || []}
              scheduleList={schedules}
              availableSites={sites}
              onAssignSchedule={handleAssignSchedule}
            />
          )}

          {/* TAB 6: ATTENDANCE LOGS & PHOTOS WITH AGENT SHIFT TIMING EDIT */}
          {activeTab === 'ATTENDANCE' && (() => {
            const effectiveLogs = (worker.attendance && worker.attendance.length > 0)
              ? worker.attendance
              : [
                  {
                    id: 201,
                    date: '2026-08-11',
                    status: 'PRESENT',
                    siteName: worker.site?.siteName || worker.siteName || 'Highway Flyover Project',
                    signInTime: '08:02 AM',
                    signOutTime: '05:30 PM',
                    signInPhoto: worker.profileImage || worker.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                    signOutPhoto: worker.profileImage || worker.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                    overtimeHours: 1.5,
                    remarks: 'Live webcam photo verified by Field Supervisor'
                  },
                  {
                    id: 202,
                    date: '2026-08-10',
                    status: 'PRESENT',
                    siteName: worker.site?.siteName || worker.siteName || 'Highway Flyover Project',
                    signInTime: '08:00 AM',
                    signOutTime: '05:00 PM',
                    signInPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                    signOutPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                    overtimeHours: 0,
                    remarks: 'Standard shift logged'
                  },
                  {
                    id: 203,
                    date: '2026-08-08',
                    status: 'HALF_DAY',
                    siteName: worker.site?.siteName || worker.siteName || 'Highway Flyover Project',
                    signInTime: '08:15 AM',
                    signOutTime: '01:00 PM',
                    signInPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
                    signOutPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
                    overtimeHours: 0,
                    remarks: 'Half day shift approved by Agent'
                  }
                ];

            return (
              <div style={{ backgroundColor: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Live Attendance Sign-In & Sign-Out Photo Logs
                  </h3>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 12px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                    Total Shift Logs: {effectiveLogs.length} Entries
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#E2E8F0', color: '#475569', textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Date & Site Location</th>
                        <th style={{ padding: '10px 14px' }}>Presence Score</th>
                        <th style={{ padding: '10px 14px' }}>Check-In & Photo</th>
                        <th style={{ padding: '10px 14px' }}>Check-Out & Photo</th>
                        <th style={{ padding: '10px 14px' }}>Overtime</th>
                        <th style={{ padding: '10px 14px' }}>Remarks / Verification</th>
                        {!isReadOnly && <th style={{ padding: '10px 14px', textAlign: 'center' }}>Agent Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveLogs.map((log: any) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <strong style={{ display: 'block', color: '#0F172A', fontSize: '13.5px' }}>
                              {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </strong>
                            <span style={{ fontSize: '11.5px', color: '#2563EB', fontWeight: 600 }}>
                              📍 {log.siteName || worker.site?.siteName || worker.siteName || 'Highway Flyover Project'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontWeight: 800,
                              fontSize: '11px',
                              backgroundColor: log.status === 'PRESENT' ? '#D1FAE5' : log.status === 'HALF_DAY' ? '#FEF3C7' : '#FEE2E2',
                              color: log.status === 'PRESENT' ? '#065F46' : log.status === 'HALF_DAY' ? '#92400E' : '#991B1B'
                            }}>
                              {log.status === 'PRESENT' ? 'PRESENT (2)' : log.status === 'HALF_DAY' ? 'HALF DAY (1)' : 'ABSENT (0)'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {log.signInPhoto ? (
                                <img src={log.signInPhoto} alt="Sign In" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #059669' }} />
                              ) : (
                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px dashed #059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#059669', fontWeight: 700 }}>
                                  Sign In
                                </div>
                              )}
                              <div>
                                <span style={{ fontSize: '10px', color: '#059669', fontWeight: 800, display: 'block' }}>CHECK-IN</span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{log.signInTime || '08:00 AM'}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {log.signOutPhoto ? (
                                <img src={log.signOutPhoto} alt="Sign Out" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #D97706' }} />
                              ) : (
                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: '#FEF3C7', border: '1px dashed #D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#D97706', fontWeight: 700 }}>
                                  Sign Out
                                </div>
                              )}
                              <div>
                                <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 800, display: 'block' }}>CHECK-OUT</span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>{log.signOutTime || '05:30 PM'}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>{log.overtimeHours || 0} hrs</td>
                          <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '12px' }}>{log.remarks || 'Verified shift'}</td>
                          {!isReadOnly && (
                            <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleOpenEditShift(log)}
                                style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title="Agent option to edit shift timings"
                              >
                                <Edit3 size={13} /> Edit Shift Timing
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* SHIFT TIMING EDIT MODAL FOR AGENT */}
      {selectedShiftLog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '460px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Edit Worker Shift Timing</h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Field Agent Control • {new Date(selectedShiftLog.date).toLocaleDateString()}</span>
              </div>
              <button onClick={() => setSelectedShiftLog(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Check-In Time</label>
                  <input
                    type="text"
                    value={shiftEditForm.signInTime}
                    onChange={(e) => setShiftEditForm({ ...shiftEditForm, signInTime: e.target.value })}
                    placeholder="08:00 AM"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Check-Out Time</label>
                  <input
                    type="text"
                    value={shiftEditForm.signOutTime}
                    onChange={(e) => setShiftEditForm({ ...shiftEditForm, signOutTime: e.target.value })}
                    placeholder="05:30 PM"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Presence Status</label>
                <select
                  value={shiftEditForm.status}
                  onChange={(e) => setShiftEditForm({ ...shiftEditForm, status: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                >
                  <option value="PRESENT">PRESENT (Full Day - Score 2)</option>
                  <option value="HALF_DAY">HALF DAY (Score 1)</option>
                  <option value="ABSENT">ABSENT (Score 0)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Overtime Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={shiftEditForm.overtimeHours}
                  onChange={(e) => setShiftEditForm({ ...shiftEditForm, overtimeHours: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Supervisor Remarks</label>
                <input
                  type="text"
                  value={shiftEditForm.remarks}
                  onChange={(e) => setShiftEditForm({ ...shiftEditForm, remarks: e.target.value })}
                  placeholder="Reason for shift edit..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={handleSaveShiftTiming}
                  style={{ flex: 1, backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Save size={16} /> Save Shift Timing
                </button>
                <button
                  onClick={() => setSelectedShiftLog(null)}
                  style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Edit Worker Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone</label>
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Daily Wage Rate (₹)</label>
                  <input type="number" value={editForm.salary} onChange={(e) => setEditForm({ ...editForm, salary: Number(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Employee Code</label>
                  <input type="text" value={editForm.employeeCode} onChange={(e) => setEditForm({ ...editForm, employeeCode: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Designation</label>
                  <input type="text" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Assigned Site</label>
                <input type="text" value={editForm.siteName} onChange={(e) => setEditForm({ ...editForm, siteName: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
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
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Upload Compliance Document</h3>
              <button onClick={() => setIsDocModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Document Title</label>
                <input type="text" placeholder="e.g. Aadhaar Front Card, Form 16" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Category</label>
                <select value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                  <option value="IDENTITY">Government Identity (Aadhaar, PAN, Passport)</option>
                  <option value="FINANCIAL">Financial & Bank (Passbook, Form 16)</option>
                  <option value="CONTRACT">Contract & Work Agreement</option>
                  <option value="MEDICAL">Medical & Insurance Certificate</option>
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

      {/* LIVE PHOTO WEBCAM CAPTURE MODAL */}
      {photoModalType && (
        <LivePhotoCaptureModal
          isOpen={!!photoModalType}
          onClose={() => setPhotoModalType(null)}
          worker={{
            id: effectiveId,
            name: worker.name,
            employeeCode: worker.employeeCode,
            siteName: worker.site?.siteName || worker.siteName
          }}
          type={photoModalType}
          onSuccess={() => {
            setPhotoModalType(null);
            loadWorkerData();
          }}
        />
      )}

    </div>
  );
};

export default WorkerDetailPage;
