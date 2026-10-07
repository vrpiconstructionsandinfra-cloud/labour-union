import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Check, AlertCircle, Loader2 } from 'lucide-react';
import { fetchAgentsApi, assignAgentsToAdminApi } from '../services/api';
import { UserAvatar } from './UserAvatar';
import type { AgentItem } from '../types';

interface AdminAssignExistingAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminId: number | string;
  adminName: string;
  currentlyAssignedAgentIds: (number | string)[];
}

export const AdminAssignExistingAgentModal: React.FC<AdminAssignExistingAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminId,
  adminName,
  currentlyAssignedAgentIds,
}) => {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedAgentIds([]);
      setSearchTerm('');
      setErrorMsg(null);
      setIsLoading(true);
      fetchAgentsApi()
        .then((data) => {
          setAgents(data || []);
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Failed to fetch field agents');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentIdsSet = new Set(currentlyAssignedAgentIds.map(String));

  const filteredAgents = agents.filter((a) => {
    if ((a as any).role === 'CUSTOMER_SUPPORT') return false;
    const q = searchTerm.toLowerCase();
    const matchesQuery =
      a.name.toLowerCase().includes(q) ||
      (a.employeeCode && a.employeeCode.toLowerCase().includes(q)) ||
      (a.assignedSite && a.assignedSite.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q));
    return matchesQuery;
  });

  const toggleSelect = (idNum: number) => {
    if (selectedAgentIds.includes(idNum)) {
      setSelectedAgentIds((prev) => prev.filter((id) => id !== idNum));
    } else {
      setSelectedAgentIds((prev) => [...prev, idNum]);
    }
  };

  const handleAssign = async () => {
    if (selectedAgentIds.length === 0) {
      setErrorMsg('Please select at least one agent to assign.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await assignAgentsToAdminApi(adminId, selectedAgentIds);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign agents to administrator');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="action-modal-backdrop animate-fade-in" style={{ zIndex: 1100 }}>
      <div
        className="action-modal-card animate-scale-up"
        style={{ maxWidth: '580px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
                Assign Agents Under Admin
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
                Add existing field agents under <strong>{adminName}</strong>'s supervision
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#FEE2E2',
                color: '#DC2626',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #CBD5E1)',
              background: 'var(--bg-card, #FFFFFF)',
            }}
          >
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search by agent name, ID, or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '13.5px',
                background: 'transparent',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Agent list */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '4px',
            }}
          >
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading available field agents...</span>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13.5px' }}>
                No field agents found matching your search.
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const idNum = Number(agent.id);
                const isAlreadyUnderThisAdmin = currentIdsSet.has(String(agent.id));
                const isSelected = selectedAgentIds.includes(idNum);

                return (
                  <div
                    key={agent.id}
                    onClick={() => {
                      if (!isAlreadyUnderThisAdmin) {
                        toggleSelect(idNum);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: isSelected
                        ? '1.5px solid #4F46E5'
                        : '1px solid var(--border-color, #E2E8F0)',
                      background: isAlreadyUnderThisAdmin
                        ? '#F8FAFC'
                        : isSelected
                        ? '#EEF2FF'
                        : 'var(--bg-card, #FFFFFF)',
                      cursor: isAlreadyUnderThisAdmin ? 'default' : 'pointer',
                      opacity: isAlreadyUnderThisAdmin ? 0.6 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <UserAvatar name={agent.name} src={agent.profileImage} size={36} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            {agent.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              color: '#475569',
                            }}
                          >
                            {agent.employeeCode || `AGT-${agent.id}`}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                          Site: {agent.assignedSite || 'Unassigned'} • Workers: {agent.assignedWorkersCount ?? (Array.isArray(agent.assignedWorkers) ? agent.assignedWorkers.length : 0)}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isAlreadyUnderThisAdmin ? (
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#DCFCE7',
                            color: '#15803D',
                          }}
                        >
                          Already Assigned
                        </span>
                      ) : (
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            border: isSelected ? 'none' : '2px solid #CBD5E1',
                            background: isSelected ? '#4F46E5' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          {isSelected && <Check size={14} strokeWidth={3} />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--bg-main, #F8FAFC)',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
          }}
        >
          <button
            type="button"
            className="btn-secondary-admin"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary-admin"
            onClick={handleAssign}
            disabled={isSubmitting || selectedAgentIds.length === 0}
            style={{
              background: '#4F46E5',
              borderColor: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <UserPlus size={15} />
                <span>Assign {selectedAgentIds.length > 0 ? `(${selectedAgentIds.length})` : ''} to Admin</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
