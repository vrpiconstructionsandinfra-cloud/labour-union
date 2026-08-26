import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, AlertCircle, RotateCw, Calendar, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { fetchInsuranceApi, deleteInsuranceApi } from '../services/api';
import { getSocket } from '../services/socket';
import type { InsurancePolicy } from '../types';
import './Pages.css';

interface InsurancePageProps {
  onOpenModal: (type: string) => void;
  onOpenEditInsuranceModal?: (policy: any) => void;
}

export const InsurancePage: React.FC<InsurancePageProps> = ({ onOpenModal, onOpenEditInsuranceModal }) => {
  const [summary, setSummary] = useState({
    activePolicies: 0,
    expiringSoon: 0,
    sumInsured: 0,
    coverageRate: 0
  });
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date Navigation & Row Limit state
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const loadData = () => {
    fetchInsuranceApi().then((data) => {
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.policies) {
        setPolicies(data.policies);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handleUpdate = () => {
      loadData();
    };

    socket.on('insurance:updated', handleUpdate);
    socket.on('notification', handleUpdate);

    return () => {
      socket.off('insurance:updated', handleUpdate);
      socket.off('notification', handleUpdate);
    };
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDeletePolicy = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this enrolled insurance policy?')) return;
    try {
      await deleteInsuranceApi(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete insurance policy');
    }
  };

  const handleSelectPreset = (preset: 'ALL' | 'TODAY' | 'THIS_MONTH') => {
    setActivePreset(preset);
    setCurrentPage(1);

    if (preset === 'ALL') {
      setFilterStartDate('');
      setFilterEndDate('');
      return;
    }

    const now = new Date();
    if (preset === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setFilterStartDate(firstDay);
      setFilterEndDate(lastDay);
    }
  };

  // Filter policies based on date range
  const filteredPolicies = policies.filter((p) => {
    if (!filterStartDate && !filterEndDate) return true;

    const rawDateStr = (p as any).rawEndDate || (p as any).rawStartDate || p.endDate;
    if (!rawDateStr) return true;

    const pDate = new Date(rawDateStr);
    if (isNaN(pDate.getTime())) return true;

    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      if (pDate < start) return false;
    }

    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (pDate > end) return false;
    }

    return true;
  });

  // Pagination calculation
  const totalPages = rowsPerPage >= 9999 ? 1 : Math.ceil(filteredPolicies.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = rowsPerPage >= 9999 ? filteredPolicies.length : startIndex + rowsPerPage;
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Insurance & Union Welfare</h2>
          <p>Group health insurance, accident coverage, policy renewals, and claims management.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="primary-btn" onClick={() => onOpenModal('add_insurance')}>
            <Plus size={16} />
            <span>Add New Policy</span>
          </button>
          <button
            className="secondary-btn"
            title="Refresh Data"
            aria-label="Refresh Data"
            disabled={isRefreshing}
            onClick={handleManualRefresh}
            style={{ padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RotateCw size={16} className={isRefreshing ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      <div className="stats-row-3">
        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Active Policies</span>
            <ShieldCheck size={18} className="text-green" />
          </div>
          <span className="stat-number">{summary.activePolicies.toLocaleString()}</span>
          <span className="stat-sub">{summary.coverageRate}% Worker Coverage</span>
        </div>
        <div className="stat-box-card border-amber">
          <div className="stat-header">
            <span>Expiring Soon (30 Days)</span>
            <AlertCircle size={18} className="text-amber" />
          </div>
          <span className="stat-number">{summary.expiringSoon.toLocaleString()}</span>
          <span className="stat-sub">Requires Renewal</span>
        </div>
        <div className="stat-box-card border-blue">
          <div className="stat-header">
            <span>Sum Insured Per Worker</span>
            <ShieldCheck size={18} className="text-blue" />
          </div>
          <span className="stat-number">₹ {summary.sumInsured.toLocaleString('en-IN')}</span>
          <span className="stat-sub">Group Term Policy</span>
        </div>
      </div>

      <div className="table-card mt-24">
        {/* Card Header Toolbar with Title, Date Navigation & Row Limit Selector */}
        <div
          className="card-header border-b"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '16px 20px'
          }}
        >
          <h3 className="card-title" style={{ margin: 0 }}>Enrolled Insurance Policies</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Quick Date Presets */}
            <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => handleSelectPreset('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'ALL' ? '#FFFFFF' : 'transparent',
                  color: activePreset === 'ALL' ? '#2563EB' : '#64748B',
                  boxShadow: activePreset === 'ALL' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('TODAY')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'TODAY' ? '#FFFFFF' : 'transparent',
                  color: activePreset === 'TODAY' ? '#2563EB' : '#64748B',
                  boxShadow: activePreset === 'TODAY' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('THIS_MONTH')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'THIS_MONTH' ? '#FFFFFF' : 'transparent',
                  color: activePreset === 'THIS_MONTH' ? '#2563EB' : '#64748B',
                  boxShadow: activePreset === 'THIS_MONTH' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                This Month
              </button>
            </div>

            {/* Custom Date Pickers */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
              <Calendar size={14} color="#64748B" />
              <span>From:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setActivePreset('CUSTOM');
                  setCurrentPage(1);
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              <span>To:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setActivePreset('CUSTOM');
                  setCurrentPage(1);
                }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
              {(filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  onClick={() => handleSelectPreset('ALL')}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '2px 6px' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Row Limit Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
              <span>Show:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <option value={5}>5 rows</option>
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={9999}>All rows</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Member (Worker / Agent)</th>
                <th>Provider</th>
                <th>Policy Number</th>
                <th>Coverage Amount</th>
                <th>Monthly Premium</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPolicies.length > 0 ? (
                paginatedPolicies.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="user-name-bold">{p.workerName}</span>
                          <span
                            className={`badge ${(p as any).workerRole === 'AGENT' ? 'badge-earned' : 'badge-casual'}`}
                            style={{ fontSize: '10px', padding: '2px 6px' }}
                          >
                            {(p as any).workerRole === 'AGENT' ? 'Field Agent' : 'Worker'}
                          </span>
                        </div>
                        <span className="user-sub-email">ID: {p.workerId}</span>
                      </div>
                    </td>
                    <td>{p.provider}</td>
                    <td><span className="code-badge">{p.policyNumber}</span></td>
                    <td><span className="currency-bold">₹ {p.coverageAmount.toLocaleString('en-IN')}</span></td>
                    <td>₹ {p.premiumAmount}/mo</td>
                    <td>{p.endDate}</td>
                    <td><span className="badge badge-approved">{p.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="secondary-btn"
                          style={{ padding: '4px 8px', fontSize: '11px', gap: '4px', display: 'inline-flex', alignItems: 'center' }}
                          title="Edit Policy"
                          onClick={() => onOpenEditInsuranceModal && onOpenEditInsuranceModal(p)}
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          className="secondary-btn"
                          style={{ padding: '4px 8px', fontSize: '11px', color: '#EF4444', borderColor: '#FCA5A5', display: 'inline-flex', alignItems: 'center' }}
                          title="Delete Policy"
                          onClick={() => handleDeletePolicy(p.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No enrolled insurance policy records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer with Pagination Controls */}
        <div
          className="card-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            fontSize: '12.5px',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div>
            Showing {filteredPolicies.length > 0 ? startIndex + 1 : 0} to{' '}
            {Math.min(endIndex, filteredPolicies.length)} of {filteredPolicies.length} entries
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="secondary-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <span style={{ fontWeight: 600, color: '#334155', fontSize: '12px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="secondary-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
