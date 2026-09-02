import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, AlertCircle, Calendar, Edit, Trash2, Shield, DollarSign } from 'lucide-react';
import { fetchInsuranceApi, deleteInsuranceApi } from '../services/api';
import { getSocket } from '../services/socket';
import type { InsurancePolicy } from '../types';
import {
  ListHeader,
  StatusBadge,
  MobileListCard,
  ResponsivePagination,
  ListEmptyState,
  ListLoadingState
} from '../components/common';
import './Pages.css';

interface InsurancePageProps {
  onOpenModal: (type: string) => void;
  onOpenEditInsuranceModal?: (policy: any) => void;
}

const PRESET_FILTERS = [
  { key: 'ALL', label: 'All Dates' },
  { key: 'TODAY', label: 'Today' },
  { key: 'THIS_MONTH', label: 'This Month' }
];

export const InsurancePage: React.FC<InsurancePageProps> = ({
  onOpenModal,
  onOpenEditInsuranceModal
}) => {
  const [summary, setSummary] = useState({
    activePolicies: 0,
    expiringSoon: 0,
    sumInsured: 0,
    coverageRate: 0
  });
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Date Filter & Pagination States
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const loadData = () => {
    setIsLoading(true);
    fetchInsuranceApi()
      .then((data) => {
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.policies) {
          setPolicies(data.policies);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
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

  const handleDeletePolicy = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this enrolled insurance policy?')) return;
    try {
      await deleteInsuranceApi(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete insurance policy');
    }
  };

  const handleSelectPreset = (preset: string) => {
    setActivePreset(preset as any);
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

  const filteredPolicies = policies.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const wName = (p.workerName || '').toLowerCase();
      const pNum = (p.policyNumber || '').toLowerCase();
      const provider = (p.provider || '').toLowerCase();
      if (!wName.includes(term) && !pNum.includes(term) && !provider.includes(term)) {
        return false;
      }
    }

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

  const totalItems = filteredPolicies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedPolicies = filteredPolicies.slice(startIndex, endIndex);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Standardized Header */}
      <ListHeader
        title="Insurance & Union Welfare"
        subtitle="Group health insurance, accident coverage, policy renewals, and claims management."
        badgeCount={totalItems}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search policies by member name, policy number, or provider..."
        filterOptions={PRESET_FILTERS}
        activeFilter={activePreset}
        onFilterSelect={handleSelectPreset}
        primaryActionLabel="Add New Policy"
        primaryActionIcon={<Plus size={16} />}
        onPrimaryAction={() => onOpenModal('add_insurance')}
        customFilters={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600, flexWrap: 'wrap' }}>
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
          </div>
        }
      />

      {/* Metrics Summary Row */}
      <div className="responsive-metrics-grid" style={{ marginBottom: '16px' }}>
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

      {isLoading ? (
        <ListLoadingState message="Loading insurance policies..." rows={5} />
      ) : filteredPolicies.length === 0 ? (
        <ListEmptyState
          isSearchOrFilter={Boolean(searchTerm || filterStartDate || filterEndDate)}
          onClearFilters={() => {
            setSearchTerm('');
            setFilterStartDate('');
            setFilterEndDate('');
            setActivePreset('ALL');
          }}
          primaryActionLabel="Add Policy"
          onPrimaryAction={() => onOpenModal('add_insurance')}
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (≥ 768px) */}
          <div className="table-desktop-view">
            <div className="table-card">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Member</th>
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
                    {paginatedPolicies.map((p) => (
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
                        <td><span className="currency-bold">₹ {p.coverageAmount ? p.coverageAmount.toLocaleString('en-IN') : '5,00,000'}</span></td>
                        <td>₹ {(p as any).premium ? (p as any).premium.toLocaleString('en-IN') : '450'}/mo</td>
                        <td>{p.endDate}</td>
                        <td>
                          <StatusBadge status={p.status} size="sm" />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {onOpenEditInsuranceModal && (
                              <button
                                className="list-btn list-btn-outline touch-target"
                                style={{ padding: '3px 8px', fontSize: '11px', minHeight: '30px' }}
                                onClick={() => onOpenEditInsuranceModal(p)}
                                title="Edit Policy"
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              className="list-btn touch-target"
                              style={{ padding: '3px 8px', fontSize: '11px', minHeight: '30px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                              onClick={() => handleDeletePolicy(p.id)}
                              title="Delete Policy"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="card-mobile-view">
            {paginatedPolicies.map((p) => (
              <MobileListCard
                key={p.id}
                avatarName={p.workerName}
                title={p.workerName}
                subtitle={p.provider}
                idBadge={p.policyNumber}
                status={p.status}
                metaRows={[
                  {
                    label: 'Coverage',
                    value: `₹ ${(p.coverageAmount || 500000).toLocaleString('en-IN')}`,
                    icon: <Shield size={13} color="#2563EB" />
                  },
                  {
                    label: 'Premium',
                    value: `₹ {((p as any).premium || 450).toLocaleString('en-IN')}/mo`,
                    icon: <DollarSign size={13} color="#64748B" />
                  },
                  {
                    label: 'Expires',
                    value: p.endDate,
                    icon: <Calendar size={13} color="#64748B" />
                  }
                ]}
                secondaryActions={[
                  ...(onOpenEditInsuranceModal
                    ? [
                        {
                          label: 'Edit Policy',
                          icon: <Edit size={14} />,
                          onClick: () => onOpenEditInsuranceModal(p)
                        }
                      ]
                    : []),
                  {
                    label: 'Delete Policy',
                    icon: <Trash2 size={14} />,
                    variant: 'danger' as const,
                    onClick: () => handleDeletePolicy(p.id)
                  }
                ]}
              />
            ))}
          </div>

          {/* Responsive Pagination */}
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  );
};
