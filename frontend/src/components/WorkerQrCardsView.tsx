import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  Search,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Building2,
  Phone,
  UserPlus,
  RefreshCw,
  Zap,
  Check,
  AlertCircle,
  Users
} from 'lucide-react';
import { fetchWorkersApi, fetchSitesApi, fetchAttendanceLogsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { getSocket } from '../services/socket';
import type { WorkerItem, SiteItem } from '../types';
import './WorkerQrCardsView.css';

interface WorkerQrCardsViewProps {
  onOpenModal?: (modalType: string) => void;
  onOpenQrScanner?: () => void;
}

export const WorkerQrCardsView: React.FC<WorkerQrCardsViewProps> = ({
  onOpenModal,
  onOpenQrScanner,
}) => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CHECKED_IN' | 'PENDING_CHECKIN' | 'COMPLETED'>('ALL');

  // Attendance Modal state
  const [selectedWorkerForAttendance, setSelectedWorkerForAttendance] = useState<WorkerItem | null>(null);
  const [attendanceModalMode, setAttendanceModalMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);

  // Single Worker Print / Preview Modal State
  const [previewWorker, setPreviewWorker] = useState<WorkerItem | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [workersList, sitesList, attendanceRes] = await Promise.all([
        fetchWorkersApi().catch(() => []),
        fetchSitesApi().catch(() => []),
        fetchAttendanceLogsApi().catch(() => [])
      ]);

      const logs = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes.logs || []);
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogMap = new Map<string, any>();

      logs.forEach((log: any) => {
        const logDateStr = log.date ? (typeof log.date === 'string' ? log.date.split('T')[0] : new Date(log.date).toISOString().split('T')[0]) : '';
        if (logDateStr === todayStr || !log.date) {
          if (log.workerId) todayLogMap.set(String(log.workerId), log);
          if (log.workerName) todayLogMap.set(log.workerName.toLowerCase(), log);
        }
      });

      setSites(sitesList);
      setAttendanceMap(todayLogMap);

      // Filter strictly for this logged-in agent's assigned workers
      const currentAgentId = user?.id;
      const myAssignedWorkers = workersList.filter((w: any) => {
        const workerAgentId = Number(w.assignedAgentId || w.agentId || w.assignedAgent?.id);
        return Boolean(currentAgentId && workerAgentId === Number(currentAgentId));
      });

      setWorkers(myAssignedWorkers);
    } catch (err) {
      console.error('Failed to load Worker QR Cards data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handleRefresh = () => {
      loadData();
    };

    socket.on('attendance:updated', handleRefresh);
    socket.on('user:registered', handleRefresh);
    socket.on('user:updated', handleRefresh);

    return () => {
      socket.off('attendance:updated', handleRefresh);
      socket.off('user:registered', handleRefresh);
      socket.off('user:updated', handleRefresh);
    };
  }, [user?.id]);

  // Map Site Name by Site ID
  const siteNameMap = useMemo(() => {
    const map = new Map<number | string, string>();
    sites.forEach((s) => map.set(s.id, s.siteName));
    return map;
  }, [sites]);

  // Enrich workers with today's live status
  const enrichedWorkers = useMemo(() => {
    return workers.map((w: any) => {
      const log = attendanceMap.get(String(w.id)) || attendanceMap.get((w.name || '').toLowerCase());
      const hasCheckedIn = Boolean(log && (log.checkInTime || log.signInTime || log.status === 'PRESENT' || log.status === 'HALF_DAY'));
      const hasCheckedOut = Boolean(log && (log.checkOutTime || log.signOutTime));
      const todayStatus = hasCheckedIn ? (log.status || 'PRESENT') : 'ABSENT';
      const siteName = (w.siteId && siteNameMap.get(w.siteId)) || (w.assignedSite) || 'Assigned Project Site';

      return {
        ...w,
        siteName,
        todayStatus,
        hasCheckedIn,
        hasCheckedOut,
        attendanceLog: log
      };
    });
  }, [workers, attendanceMap, siteNameMap]);

  // Filtered workers based on search & filter tabs
  const filteredWorkers = useMemo(() => {
    return enrichedWorkers.filter((w: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.employeeCode && w.employeeCode.toLowerCase().includes(q)) ||
        (w.designation && w.designation.toLowerCase().includes(q)) ||
        (w.siteName && w.siteName.toLowerCase().includes(q)) ||
        (w.phone && w.phone.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterStatus === 'CHECKED_IN') {
        return w.hasCheckedIn && !w.hasCheckedOut;
      }
      if (filterStatus === 'PENDING_CHECKIN') {
        return !w.hasCheckedIn;
      }
      if (filterStatus === 'COMPLETED') {
        return w.hasCheckedIn && w.hasCheckedOut;
      }
      return true;
    });
  }, [enrichedWorkers, searchQuery, filterStatus]);

  // Summary Metrics
  const totalAssigned = enrichedWorkers.length;
  const checkedInCount = enrichedWorkers.filter((w: any) => w.hasCheckedIn && !w.hasCheckedOut).length;
  const completedCount = enrichedWorkers.filter((w: any) => w.hasCheckedIn && w.hasCheckedOut).length;
  const pendingCheckInCount = enrichedWorkers.filter((w: any) => !w.hasCheckedIn).length;

  // Handle Smart Attendance Action on Worker Card
  const handleSmartAttendanceAction = (worker: any) => {
    const todayFormatted = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    if (worker.hasCheckedIn && worker.hasCheckedOut) {
      alert(
        `Worker ${worker.name} (ID: ${worker.employeeCode || `WRK-${worker.id}`}) has already completed both Check-In and Check-Out for today (${todayFormatted}).`
      );
      return;
    }

    if (worker.hasCheckedIn && !worker.hasCheckedOut) {
      setSelectedWorkerForAttendance(worker);
      setAttendanceModalMode('CHECK_OUT');
      setIsAttendanceModalOpen(true);
      return;
    }

    // Not checked in yet -> Check-In mode
    setSelectedWorkerForAttendance(worker);
    setAttendanceModalMode('CHECK_IN');
    setIsAttendanceModalOpen(true);
  };

  // Helper to generate QR Data Payload
  const getQrPayload = (w: any) => {
    return JSON.stringify({
      id: w.id,
      workerId: w.id,
      employeeCode: w.employeeCode || `WRK-${w.id}`,
      name: w.name,
      role: 'WORKER',
      assignedAgentId: user?.id,
      timestamp: Date.now()
    });
  };

  const getQrImageUrl = (w: any) => {
    const payload = getQrPayload(w);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payload)}`;
  };

  // Download QR Code image with canvas worker card branding
  const handleDownloadQrCard = async (worker: any) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 800);

      // Header Gradient
      const grad = ctx.createLinearGradient(0, 0, 600, 0);
      grad.addColorStop(0, '#1E3A8A');
      grad.addColorStop(1, '#2563EB');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 600, 140);

      // Header Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('LABOR UNION MANAGEMENT', 30, 60);

      ctx.fillStyle = '#BFDBFE';
      ctx.font = '16px sans-serif';
      ctx.fillText('Official Worker Digital QR ID Card', 30, 95);

      // Worker Details
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(worker.name || 'Worker Name', 30, 200);

      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`Code: ${worker.employeeCode || `WRK-${worker.id}`}`, 30, 235);

      ctx.fillStyle = '#475569';
      ctx.font = '15px sans-serif';
      ctx.fillText(`Trade: ${worker.designation || 'Worker'}`, 30, 270);
      ctx.fillText(`Site: ${worker.siteName || 'Assigned Site'}`, 30, 300);
      ctx.fillText(`Supervisor Agent: ${user?.name || 'Assigned Field Agent'}`, 30, 330);
      ctx.fillText(`Contact: ${worker.phone || 'N/A'}`, 30, 360);

      // Separator line
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, 390);
      ctx.lineTo(570, 390);
      ctx.stroke();

      // Load and draw QR code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = getQrImageUrl(worker);

      qrImg.onload = () => {
        // QR Border Box
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(160, 420, 280, 280);
        ctx.strokeStyle = '#CBD5E1';
        ctx.strokeRect(160, 420, 280, 280);

        ctx.drawImage(qrImg, 190, 450, 220, 220);

        // Scan Instruction Footer
        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Scan with Field Agent QR Attendance Scanner to Check-In / Check-Out', 300, 740);

        // Trigger download
        const link = document.createElement('a');
        link.download = `QR-Card-${worker.employeeCode || `WRK-${worker.id}`}-${worker.name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };

      qrImg.onerror = () => {
        // Fallback: direct download link
        const link = document.createElement('a');
        link.download = `Worker-QR-${worker.employeeCode || worker.id}.png`;
        link.href = getQrImageUrl(worker);
        link.target = '_blank';
        link.click();
      };
    } catch (err) {
      console.error('Download QR card failed:', err);
    }
  };

  const handlePrintWorkerCard = (worker: any) => {
    setPreviewWorker(worker);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (user?.role !== 'AGENT') {
    return (
      <div className="worker-qr-view" style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ maxWidth: '500px', margin: '40px auto', padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            The Worker QR Cards & Attendance Roster is exclusively available for Field Agents to manage their assigned workers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="worker-qr-view">
      
      {/* Top Header Card */}
      <div className="worker-qr-header">
        <div className="worker-qr-title-group">
          <h1>
            <QrCode size={24} color="#2563EB" />
            <span>Worker QR Cards & Attendance Roster</span>
          </h1>
          <p>
            Instant QR identity cards and state-aware check-in/out for your assigned workers.
          </p>
        </div>

        <div className="worker-qr-actions-row">
          <button
            type="button"
            className="secondary-btn"
            onClick={loadData}
            title="Refresh Live Data"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>

          {onOpenQrScanner && (
            <button
              type="button"
              className="primary-btn"
              onClick={onOpenQrScanner}
              style={{
                backgroundColor: '#2563EB',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <QrCode size={16} />
              <span>Scan QR Code</span>
            </button>
          )}

          {onOpenModal && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => onOpenModal('add_worker')}
              style={{
                backgroundColor: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <UserPlus size={16} />
              <span>Register New Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Stats */}
      <div className="worker-qr-stats-grid">
        <div className="worker-qr-stat-card">
          <div className="worker-qr-stat-info">
            <h4>Total Assigned</h4>
            <div className="stat-number">{totalAssigned}</div>
          </div>
          <div className="worker-qr-stat-icon" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <Users size={22} />
          </div>
        </div>

        <div className="worker-qr-stat-card">
          <div className="worker-qr-stat-info">
            <h4>Checked In Today</h4>
            <div className="stat-number" style={{ color: '#D97706' }}>{checkedInCount}</div>
          </div>
          <div className="worker-qr-stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="worker-qr-stat-card">
          <div className="worker-qr-stat-info">
            <h4>Completed Shifts</h4>
            <div className="stat-number" style={{ color: '#15803D' }}>{completedCount}</div>
          </div>
          <div className="worker-qr-stat-icon" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="worker-qr-stat-card">
          <div className="worker-qr-stat-info">
            <h4>Pending Check-In</h4>
            <div className="stat-number" style={{ color: '#DC2626' }}>{pendingCheckInCount}</div>
          </div>
          <div className="worker-qr-stat-icon" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <AlertCircle size={22} />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="worker-qr-toolbar">
        <div className="worker-qr-search-wrap">
          <Search size={16} className="worker-qr-search-icon" />
          <input
            type="text"
            placeholder="Search by worker name, ID code, trade, site..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="worker-qr-filter-pills">
          <button
            type="button"
            className={`filter-pill-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All Assigned ({totalAssigned})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterStatus === 'PENDING_CHECKIN' ? 'active' : ''}`}
            onClick={() => setFilterStatus('PENDING_CHECKIN')}
          >
            Pending Check-In ({pendingCheckInCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterStatus === 'CHECKED_IN' ? 'active' : ''}`}
            onClick={() => setFilterStatus('CHECKED_IN')}
          >
            Checked In ({checkedInCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterStatus === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setFilterStatus('COMPLETED')}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Worker QR Cards Grid */}
      {filteredWorkers.length > 0 ? (
        <div className="worker-qr-grid">
          {filteredWorkers.map((w: any) => {
            const isCompleted = w.hasCheckedIn && w.hasCheckedOut;
            const isCheckedIn = w.hasCheckedIn && !w.hasCheckedOut;

            return (
              <div key={w.id} className="worker-qr-card">
                
                {/* Top Banner with Avatar, Name, Code */}
                <div className="worker-qr-card-top">
                  <div className="worker-qr-card-top-left">
                    <div className="worker-qr-avatar-frame">
                      <UserAvatar src={w.avatar || w.profileImage} name={w.name} size={48} />
                    </div>
                    <div className="worker-qr-name-block">
                      <h3 className="worker-qr-worker-name" title={w.name}>{w.name}</h3>
                      <p className="worker-qr-designation">{w.designation || 'General Worker'}</p>
                    </div>
                  </div>
                  <div className="worker-qr-code-badge">
                    {w.employeeCode || `WRK-${w.id}`}
                  </div>
                </div>

                {/* Card Body */}
                <div className="worker-qr-card-body">
                  
                  {/* Meta Details */}
                  <div className="worker-qr-meta-list">
                    <div className="worker-qr-meta-item">
                      <Building2 size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
                      <span>Site: <strong>{w.siteName}</strong></span>
                    </div>
                    <div className="worker-qr-meta-item">
                      <Phone size={13} style={{ color: '#059669', flexShrink: 0 }} />
                      <span>Phone: <strong>{w.phone || 'N/A'}</strong></span>
                    </div>
                  </div>

                  {/* QR Code Frame */}
                  <div className="worker-qr-display-box">
                    <img
                      src={getQrImageUrl(w)}
                      alt={`QR Code for ${w.name}`}
                      className="worker-qr-code-img"
                      loading="lazy"
                    />
                    <div className="worker-qr-scan-hint">
                      <Zap size={12} color="#EA580C" />
                      <span>ID: {w.employeeCode || `WRK-${w.id}`}</span>
                    </div>
                  </div>

                  {/* Today Status Row */}
                  <div className="worker-qr-status-row">
                    <span style={{ color: 'var(--text-secondary, #64748b)' }}>Today's Shift:</span>
                    {isCompleted ? (
                      <span className="worker-qr-status-pill present">
                        <Check size={12} /> Shift Completed
                      </span>
                    ) : isCheckedIn ? (
                      <span className="worker-qr-status-pill checked-in">
                        <Clock size={12} /> Working (Checked In)
                      </span>
                    ) : (
                      <span className="worker-qr-status-pill absent">
                        <AlertCircle size={12} /> Not Checked In
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="worker-qr-card-footer">
                  <button
                    type="button"
                    className="worker-qr-action-btn btn-outline"
                    onClick={() => handleDownloadQrCard(w)}
                    title="Download high-resolution QR ID badge"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    className="worker-qr-action-btn btn-outline"
                    onClick={() => handlePrintWorkerCard(w)}
                    title="Print ID Card"
                  >
                    <Printer size={13} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    className={`worker-qr-action-btn ${
                      isCompleted ? 'btn-outline' : isCheckedIn ? 'btn-warning' : 'btn-success'
                    }`}
                    onClick={() => handleSmartAttendanceAction(w)}
                    title={
                      isCompleted
                        ? 'Shift completed for today'
                        : isCheckedIn
                        ? 'Mark Check-Out for this worker'
                        : 'Mark Check-In for this worker'
                    }
                  >
                    {isCompleted ? (
                      <>
                        <Check size={13} />
                        <span>Completed</span>
                      </>
                    ) : isCheckedIn ? (
                      <>
                        <Clock size={13} />
                        <span>Check-Out</span>
                      </>
                    ) : (
                      <>
                        <Zap size={13} />
                        <span>Check-In</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="worker-qr-empty-state">
          <div className="worker-qr-empty-icon">
            <QrCode size={32} />
          </div>
          <h3>{searchQuery ? 'No Matching Workers Found' : 'No Workers Assigned Yet'}</h3>
          <p>
            {searchQuery
              ? `No assigned workers matched "${searchQuery}". Try a different search term or clear the filter.`
              : 'Register a new worker or ask the supervisor to assign workers to your agent account to view their digital QR cards.'}
          </p>
          {onOpenModal && !searchQuery && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => onOpenModal('add_worker')}
              style={{ backgroundColor: '#059669', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <UserPlus size={16} />
              <span>Register New Worker</span>
            </button>
          )}
        </div>
      )}

      {/* Attendance Modal */}
      {isAttendanceModalOpen && selectedWorkerForAttendance && (
        <MarkAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => {
            setIsAttendanceModalOpen(false);
            setSelectedWorkerForAttendance(null);
          }}
          worker={selectedWorkerForAttendance}
          mode={attendanceModalMode}
          onSuccess={() => {
            setIsAttendanceModalOpen(false);
            setSelectedWorkerForAttendance(null);
            loadData();
          }}
        />
      )}

      {/* Printable QR Card Hidden Section */}
      {previewWorker && (
        <div className="printable-qr-section" style={{ display: 'none' }}>
          <div style={{ width: '350px', padding: '24px', border: '2px solid #000', borderRadius: '12px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>LABOR UNION MANAGEMENT</h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#666' }}>WORKER DIGITAL ID</p>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>{previewWorker.name}</h3>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>ID: {previewWorker.employeeCode || `WRK-${previewWorker.id}`}</p>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>Trade: {previewWorker.designation || 'Worker'}</p>
            <img
              src={getQrImageUrl(previewWorker)}
              alt="QR Code"
              style={{ width: '180px', height: '180px', margin: '0 auto 12px auto' }}
            />
            <p style={{ fontSize: '11px', color: '#555' }}>Assigned Agent: {user?.name || 'Field Agent'}</p>
          </div>
        </div>
      )}

    </div>
  );
};
