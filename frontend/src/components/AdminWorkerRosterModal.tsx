import React, { useState, useEffect } from 'react';
import { X, HardHat, Search, Phone, CheckCircle2, Clock, AlertCircle, Building2, IndianRupee } from 'lucide-react';
import type { AdminWorkerItem } from '../types';
import { UserAvatar } from './UserAvatar';

interface AdminWorkerRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentName: string;
  agentCode: string;
  agentSiteName?: string;
  workers: AdminWorkerItem[];
}

export const AdminWorkerRosterModal: React.FC<AdminWorkerRosterModalProps> = ({
  isOpen,
  onClose,
  agentName,
  agentCode,
  agentSiteName,
  workers,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWorkers, setFilteredWorkers] = useState<AdminWorkerItem[]>(workers);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredWorkers(workers);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredWorkers(
        workers.filter(
          (w) =>
            w.name.toLowerCase().includes(q) ||
            w.employeeCode.toLowerCase().includes(q) ||
            w.designation.toLowerCase().includes(q) ||
            (w.phone && w.phone.includes(q))
        )
      );
    }
  }, [searchTerm, workers]);

  if (!isOpen) return null;

  const presentCount = workers.filter((w) => w.todayAttendance === 'PRESENT').length;

  return (
    <div className="action-modal-backdrop animate-fade-in" style={{ zIndex: 1150 }}>
      <div
        className="action-modal-card animate-scale-up"
        style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="action-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color, #E2E8F0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <HardHat size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
                  Workers Roster — {agentName}
                </h3>
                <span
                  style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {agentCode}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--text-secondary, #64748B)' }}>
                Assigned Site: <strong>{agentSiteName || 'Unassigned'}</strong> • Total Labor: <strong>{workers.length}</strong> • Present Today: <strong style={{ color: '#059669' }}>{presentCount}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="action-modal-close-btn"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '14px 24px', background: 'var(--bg-main, #F8FAFC)', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
          <div className="search-input-wrap" style={{ background: 'var(--bg-card, #FFFFFF)' }}>
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search labor by worker name, code, designation, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Workers List / Table */}
        <div style={{ overflow: 'auto', flex: 1, padding: '0 24px', WebkitOverflowScrolling: 'touch' }}>
          {filteredWorkers.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748B' }}>
              <HardHat size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>No workers assigned under this agent yet</p>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px' }}>
                Field agents register and maintain their labor crew on-site
              </p>
            </div>
          ) : (
            <table className="worker-roster-table">
              <thead>
                <tr>
                  <th>Worker Name & Code</th>
                  <th>Trade / Designation</th>
                  <th>Contact</th>
                  <th>Site</th>
                  <th>Daily Wage</th>
                  <th>Today Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => {
                  const isPresent = worker.todayAttendance === 'PRESENT';
                  return (
                    <tr key={worker.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <UserAvatar
                            name={worker.name}
                            src={worker.profileImage}
                            size={34}
                          />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary, #0F172A)' }}>
                              {worker.name}
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748B)', fontFamily: 'monospace' }}>
                              {worker.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, fontSize: '12.5px' }}>
                          {worker.designation || 'General Worker'}
                        </span>
                      </td>
                      <td>
                        {worker.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px' }}>
                            <Phone size={13} color="#64748B" />
                            <span>{worker.phone}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#475569' }}>
                          <Building2 size={13} color="#94A3B8" />
                          <span>{worker.siteName || agentSiteName || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600, fontSize: '12.5px' }}>
                          <IndianRupee size={12} />
                          <span>{worker.salary ? worker.salary.toLocaleString() : '850'}/day</span>
                        </div>
                      </td>
                      <td>
                        {isPresent ? (
                          <span className="attendance-pill present">
                            <CheckCircle2 size={12} />
                            <span>Present</span>
                            {worker.checkInTime && (
                              <span style={{ fontSize: '10.5px', opacity: 0.8, marginLeft: '4px' }}>
                                ({new Date(worker.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                            )}
                          </span>
                        ) : worker.todayAttendance === 'ABSENT' ? (
                          <span className="attendance-pill absent">
                            <AlertCircle size={12} />
                            <span>Absent</span>
                          </span>
                        ) : (
                          <span className="attendance-pill unmarked">
                            <Clock size={12} />
                            <span>Not Marked</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-main, #F8FAFC)',
          }}
        >
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748B)' }}>
            Showing {filteredWorkers.length} of {workers.length} workers under {agentName}
          </span>
          <button type="button" className="btn-secondary-admin" onClick={onClose}>
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
};
