import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Phone, MapPin, DollarSign, Eye, Edit, Trash2, UserCheck, Loader2, MoreVertical } from 'lucide-react';
import { fetchWorkersApi, deleteUserApi, assignWorkerToAgentApi, removeWorkerFromAgentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { WorkerItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { WorkerDetailsModal } from '../components/WorkerDetailsModal';
import {
  ListHeader,
  StatusBadge,
  MobileListCard,
  ResponsivePagination,
  ListEmptyState,
  ListLoadingState
} from '../components/common';
import './Pages.css';

interface WorkersPageProps {
  onOpenModal: (type: string) => void;
  onOpenEditWorkerModal?: (worker: WorkerItem) => void;
  onNavigateTab?: (tab: string) => void;
  refreshTrigger?: number;
}

const SKILL_OPTIONS = [
  { key: 'ALL', label: 'All Trades' },
  { key: 'Mason', label: 'Mason' },
  { key: 'Electrician', label: 'Electrician' },
  { key: 'Welder', label: 'Welder' },
  { key: 'Helper', label: 'Helper' },
  { key: 'Carpenter', label: 'Carpenter' },
  { key: 'Plumber', label: 'Plumber' }
];

export const WorkersPage: React.FC<WorkersPageProps> = ({
  onOpenModal,
  onOpenEditWorkerModal,
  onNavigateTab,
  refreshTrigger
}) => {
  const { user, role } = useAuth();
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningWorkerId, setAssigningWorkerId] = useState<string | null>(null);
  const [selectedWorkerForDetails, setSelectedWorkerForDetails] = useState<WorkerItem | null>(null);
  const [openMenuWorkerId, setOpenMenuWorkerId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadWorkers = () => {
    setIsLoading(true);
    fetchWorkersApi()
      .then((data) => setWorkers(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadWorkers();
  }, [refreshTrigger, role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, skillFilter, itemsPerPage]);

  // Close 3-dots action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.worker-action-menu-container')) {
        setOpenMenuWorkerId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (!window.confirm(`Are you sure you want to delete worker "${workerName}" from the system? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(workerId);
    try {
      await deleteUserApi(workerId);
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete worker');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssignToMe = async (worker: WorkerItem) => {
    if (!user?.id) return;
    setAssigningWorkerId(worker.id);
    try {
      await assignWorkerToAgentApi(worker.id, user.id);
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to assign worker to your account');
    } finally {
      setAssigningWorkerId(null);
    }
  };

  const handleUnassignFromMe = async (worker: WorkerItem) => {
    if (!window.confirm(`Are you sure you want to unassign "${worker.name}" from your agent account?`)) return;
    setAssigningWorkerId(worker.id);
    try {
      await removeWorkerFromAgentApi(worker.id);
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to unassign worker');
    } finally {
      setAssigningWorkerId(null);
    }
  };

  const filtered = workers.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      w.name.toLowerCase().includes(term) ||
      (w.employeeCode || '').toLowerCase().includes(term) ||
      (w.designation || '').toLowerCase().includes(term) ||
      (w.siteName || '').toLowerCase().includes(term) ||
      (w.phone || '').includes(term);

    const matchesSkill =
      skillFilter === 'ALL' ||
      (w.designation || '').toLowerCase().includes(skillFilter.toLowerCase());

    return matchesSearch && matchesSkill;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedWorkers = filtered.slice(startIndex, endIndex);

  const getPageTitle = () => {
    if (role === 'AGENT') return 'Workers Directory';
    if (role === 'WORKER') return 'My Team Workers';
    return 'All Union Workers Directory';
  };

  const getPageSubtitle = () => {
    if (role === 'AGENT') return 'Directory of registered labor union workers under your direct field agent supervision.';
    if (role === 'WORKER') return 'Directory of labor union workers assigned to your site supervisor.';
    return 'Enterprise roster of registered union workforce, assigned field agents, and site allocations.';
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Standardized Header */}
      <ListHeader
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        badgeCount={totalItems}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by worker name, code, designation, site..."
        filterOptions={SKILL_OPTIONS}
        activeFilter={skillFilter}
        onFilterSelect={setSkillFilter}
        primaryActionLabel="Register New Worker"
        primaryActionIcon={<Plus size={16} />}
        onPrimaryAction={() => onNavigateTab ? onNavigateTab('register_worker') : onOpenModal('add_worker')}
      />

      {isLoading ? (
        <ListLoadingState message="Loading worker directory..." rows={6} />
      ) : filtered.length === 0 ? (
        <ListEmptyState
          isSearchOrFilter={Boolean(searchTerm || skillFilter !== 'ALL')}
          onClearFilters={() => {
            setSearchTerm('');
            setSkillFilter('ALL');
          }}
          primaryActionLabel="Register Worker"
          onPrimaryAction={() => onNavigateTab ? onNavigateTab('register_worker') : onOpenModal('add_worker')}
        />
      ) : (
        <>
          {/* DESKTOP & TABLET DATA TABLE (≥ 768px) */}
          <div className="table-desktop-view">
            <div className="table-card" style={{ minHeight: '340px' }}>
              <div className="table-responsive" style={{ overflow: 'visible' }}>
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Employee ID</th>
                      <th>Contact Info</th>
                      <th>Designation</th>
                      <th>Site Allocated</th>
                      <th>Assigned Agent</th>
                      <th>Daily Wage</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center', width: '90px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWorkers.map((worker, index) => {
                      const isAssignedToMe =
                        worker.assignedAgentId === String(user?.id) ||
                        (user?.name && worker.agentName === user.name);
                      
                      const isNearBottom = index >= paginatedWorkers.length - 2 && paginatedWorkers.length > 2;

                      return (
                        <tr key={worker.id}>
                          <td>
                            <div
                              className="table-user-cell"
                              onClick={() => window.open(`/worker-details?id=${worker.id}`, '_blank')}
                              style={{ cursor: 'pointer' }}
                              title="Click to view complete worker profile"
                            >
                              <UserAvatar src={worker.avatar} name={worker.name} size={36} />
                              <div>
                                <span className="user-name-bold" style={{ color: '#2563EB', textDecoration: 'underline' }}>
                                  {worker.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="code-badge">{worker.employeeCode || 'W-PENDING'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>
                                ✉️ {worker.email}
                              </span>
                              <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>
                                📞 {worker.phone || '+91 9811111111'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="badge badge-casual">{worker.designation || 'General'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <MapPin size={13} color="#64748B" />
                              <span>{worker.siteName || 'Unassigned Site'}</span>
                            </div>
                          </td>
                          <td>
                            <span className="user-name-bold">{worker.agentName || 'None'}</span>
                          </td>
                          <td>
                            <span className="currency-bold">₹ {worker.dailyWage || 0}/day</span>
                          </td>
                          <td>
                            <StatusBadge status={worker.status || 'ACTIVE'} size="sm" />
                          </td>
                          <td style={{ textAlign: 'center', position: 'relative' }}>
                            {/* 3-Dots Action Menu Container */}
                            <div className="worker-action-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                type="button"
                                className="touch-target"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuWorkerId((prev) => (prev === worker.id ? null : worker.id));
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '8px',
                                  backgroundColor: openMenuWorkerId === worker.id ? '#EEF2FF' : '#F8FAFC',
                                  border: openMenuWorkerId === worker.id ? '1.5px solid #6366F1' : '1px solid #CBD5E1',
                                  color: openMenuWorkerId === worker.id ? '#4F46E5' : '#475569',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                                title="Worker Actions (View, Edit, Delete)"
                              >
                                <MoreVertical size={17} />
                              </button>

                              {/* 3-Dots Dropdown Popup */}
                              {openMenuWorkerId === worker.id && (
                                <div
                                  className="worker-action-dropdown animate-fade-in"
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    ...(isNearBottom ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                                    minWidth: '175px',
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '12px',
                                    border: '1.5px solid #E2E8F0',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    padding: '6px',
                                    zIndex: 9999,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    textAlign: 'left'
                                  }}
                                >
                                  {/* 1. View Details Option */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuWorkerId(null);
                                      window.open(`/worker-details?id=${worker.id}`, '_blank');
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '9px',
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      borderRadius: '8px',
                                      backgroundColor: 'transparent',
                                      color: '#1E293B',
                                      fontSize: '12.5px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'background-color 0.15s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    <Eye size={15} color="#2563EB" />
                                    <span>View Details</span>
                                  </button>

                                  {/* 2. Edit Worker Option */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuWorkerId(null);
                                      if (onOpenEditWorkerModal) {
                                        onOpenEditWorkerModal(worker);
                                      } else {
                                        onOpenModal('edit_worker');
                                      }
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '9px',
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      borderRadius: '8px',
                                      backgroundColor: 'transparent',
                                      color: '#1E293B',
                                      fontSize: '12.5px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'background-color 0.15s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    <Edit size={15} color="#059669" />
                                    <span>Edit Worker</span>
                                  </button>

                                  {/* 3. Assign / Unassign for Field Agent */}
                                  {role === 'AGENT' && (
                                    isAssignedToMe ? (
                                      <button
                                        type="button"
                                        disabled={assigningWorkerId === worker.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuWorkerId(null);
                                          handleUnassignFromMe(worker);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '9px',
                                          width: '100%',
                                          padding: '8px 12px',
                                          border: 'none',
                                          borderRadius: '8px',
                                          backgroundColor: 'transparent',
                                          color: '#D97706',
                                          fontSize: '12.5px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFBEB')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <UserCheck size={15} color="#D97706" />
                                        <span>{assigningWorkerId === worker.id ? 'Unassigning...' : 'Unassign from Me'}</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={assigningWorkerId === worker.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuWorkerId(null);
                                          handleAssignToMe(worker);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '9px',
                                          width: '100%',
                                          padding: '8px 12px',
                                          border: 'none',
                                          borderRadius: '8px',
                                          backgroundColor: 'transparent',
                                          color: '#2563EB',
                                          fontSize: '12.5px',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        <UserPlus size={15} color="#2563EB" />
                                        <span>{assigningWorkerId === worker.id ? 'Assigning...' : 'Assign to Me'}</span>
                                      </button>
                                    )
                                  )}

                                  <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />

                                  {/* 4. Delete Worker Option (Super Agent, Agent, Customer Support, etc.) */}
                                  <button
                                    type="button"
                                    disabled={deletingId === worker.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuWorkerId(null);
                                      handleDeleteWorker(worker.id, worker.name);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '9px',
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      borderRadius: '8px',
                                      backgroundColor: 'transparent',
                                      color: '#DC2626',
                                      fontSize: '12.5px',
                                      fontWeight: 700,
                                      cursor: deletingId === worker.id ? 'not-allowed' : 'pointer',
                                      transition: 'background-color 0.15s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    {deletingId === worker.id ? (
                                      <Loader2 size={15} className="spinner" />
                                    ) : (
                                      <Trash2 size={15} color="#DC2626" />
                                    )}
                                    <span>{deletingId === worker.id ? 'Deleting...' : 'Delete Worker'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="card-mobile-view">
            {paginatedWorkers.map((worker) => {
              const isAssignedToMe =
                worker.assignedAgentId === String(user?.id) ||
                (user?.name && worker.agentName === user.name);

              return (
                <MobileListCard
                  key={worker.id}
                  avatarName={worker.name}
                  avatarImage={worker.avatar}
                  title={worker.name}
                  subtitle={worker.designation || 'Union Worker'}
                  idBadge={worker.employeeCode || 'W-PEND'}
                  status={worker.status || 'ACTIVE'}
                  metaRows={[
                    {
                      label: 'Site',
                      value: worker.siteName || 'Unassigned',
                      icon: <MapPin size={13} color="#64748B" />
                    },
                    {
                      label: 'Phone',
                      value: worker.phone || '+91 9811111111',
                      icon: <Phone size={13} color="#64748B" />
                    },
                    {
                      label: 'Wage',
                      value: `₹ ${worker.dailyWage || 0}/day`,
                      icon: <DollarSign size={13} color="#64748B" />
                    }
                  ]}
                  expandableRows={[
                    { label: 'Email', value: worker.email },
                    { label: 'Assigned Agent', value: worker.agentName || 'None' }
                  ]}
                  primaryAction={{
                    label: 'View Full Profile',
                    icon: <Eye size={15} />,
                    onClick: () => window.open(`/worker-details?id=${worker.id}`, '_blank'),
                    variant: 'primary'
                  }}
                  secondaryActions={[
                    {
                      label: 'Edit Worker Details',
                      icon: <Edit size={14} />,
                      onClick: () => onOpenEditWorkerModal ? onOpenEditWorkerModal(worker) : onOpenModal('edit_worker')
                    },
                    ...(role === 'AGENT'
                      ? isAssignedToMe
                        ? [
                            {
                              label: 'Unassign Worker',
                              icon: <UserCheck size={14} />,
                              variant: 'danger' as const,
                              onClick: () => handleUnassignFromMe(worker)
                            }
                          ]
                        : [
                            {
                              label: 'Assign to Me',
                              icon: <UserPlus size={14} />,
                              onClick: () => handleAssignToMe(worker)
                            }
                          ]
                      : []),
                    {
                      label: 'Delete Worker',
                      icon: <Trash2 size={14} />,
                      variant: 'danger' as const,
                      onClick: () => handleDeleteWorker(worker.id, worker.name)
                    }
                  ]}
                />
              );
            })}
          </div>

          {/* Unified Responsive Pagination */}
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

      {/* Worker Detailed Profile Modal */}
      <WorkerDetailsModal
        isOpen={!!selectedWorkerForDetails}
        onClose={() => setSelectedWorkerForDetails(null)}
        worker={selectedWorkerForDetails}
        onEdit={onOpenEditWorkerModal}
      />
    </div>
  );
};

export default WorkersPage;
