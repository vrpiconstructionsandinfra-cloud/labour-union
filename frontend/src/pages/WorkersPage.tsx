import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Phone, MapPin, DollarSign, Eye, Edit, Trash2, UserCheck, Loader2 } from 'lucide-react';
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isSuperAgent = role === 'SUPER_AGENT';

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

  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (!window.confirm(`Are you sure you want to delete worker "${workerName}" from the system?`)) {
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
        primaryActionLabel={!isSuperAgent ? 'Register New Worker' : undefined}
        primaryActionIcon={<Plus size={16} />}
        onPrimaryAction={!isSuperAgent ? () => onOpenModal('add_worker') : undefined}
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
          primaryActionLabel={!isSuperAgent ? 'Register Worker' : undefined}
          onPrimaryAction={!isSuperAgent ? () => onOpenModal('add_worker') : undefined}
        />
      ) : (
        <>
          {/* DESKTOP & TABLET DATA TABLE (≥ 768px) */}
          <div className="table-desktop-view">
            <div className="table-card">
              <div className="table-responsive">
                <table className="custom-table">
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWorkers.map((worker) => {
                      const isAssignedToMe =
                        worker.assignedAgentId === String(user?.id) ||
                        (user?.name && worker.agentName === user.name);

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
                          <td>
                            <div className="action-buttons-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                className="list-btn list-btn-outline touch-target"
                                style={{ padding: '4px 8px', fontSize: '11.5px', minHeight: '32px' }}
                                onClick={() => window.open(`/worker-details?id=${worker.id}`, '_blank')}
                                title="Open full worker details in new tab"
                              >
                                <Eye size={13} />
                                <span>Details ↗</span>
                              </button>

                              {isSuperAgent ? (
                                <span style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>View Only</span>
                              ) : role === 'AGENT' ? (
                                <>
                                  {isAssignedToMe ? (
                                    <button
                                      className="list-btn touch-target"
                                      style={{ padding: '4px 8px', fontSize: '11.5px', minHeight: '32px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                                      disabled={assigningWorkerId === worker.id}
                                      onClick={() => handleUnassignFromMe(worker)}
                                    >
                                      {assigningWorkerId === worker.id ? <Loader2 size={12} className="spinner" /> : 'Unassign'}
                                    </button>
                                  ) : (
                                    <button
                                      className="list-btn list-btn-primary touch-target"
                                      style={{ padding: '4px 8px', fontSize: '11.5px', minHeight: '32px' }}
                                      disabled={assigningWorkerId === worker.id}
                                      onClick={() => handleAssignToMe(worker)}
                                    >
                                      {assigningWorkerId === worker.id ? (
                                        <Loader2 size={12} className="spinner" />
                                      ) : (
                                        <>
                                          <UserPlus size={13} />
                                          <span>Assign</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    className="list-btn list-btn-outline touch-target"
                                    style={{ padding: '4px 8px', fontSize: '11.5px', minHeight: '32px' }}
                                    onClick={() => onOpenEditWorkerModal ? onOpenEditWorkerModal(worker) : onOpenModal('edit_worker')}
                                  >
                                    <Edit size={13} />
                                    <span>Edit</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="list-btn list-btn-outline touch-target"
                                    style={{ padding: '4px 8px', fontSize: '11.5px', minHeight: '32px' }}
                                    onClick={() => onOpenEditWorkerModal ? onOpenEditWorkerModal(worker) : onOpenModal('edit_worker')}
                                  >
                                    <Edit size={13} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    className="list-btn touch-target"
                                    style={{ padding: '4px 8px', fontSize: '11.5px', minHeight: '32px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                                    disabled={deletingId === worker.id}
                                    onClick={() => handleDeleteWorker(worker.id, worker.name)}
                                  >
                                    {deletingId === worker.id ? <Loader2 size={12} className="spinner" /> : <Trash2 size={13} />}
                                  </button>
                                </>
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
                    ...(!isSuperAgent && onOpenEditWorkerModal
                      ? [
                          {
                            label: 'Edit Worker Details',
                            icon: <Edit size={14} />,
                            onClick: () => onOpenEditWorkerModal(worker)
                          }
                        ]
                      : []),
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
                    ...(!isSuperAgent && role !== 'AGENT'
                      ? [
                          {
                            label: 'Delete Worker',
                            icon: <Trash2 size={14} />,
                            variant: 'danger' as const,
                            onClick: () => handleDeleteWorker(worker.id, worker.name)
                          }
                        ]
                      : [])
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
