import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Clock,
  UserCheck,
  Users,
  Filter,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { fetchEnquiriesApi, updateEnquiryStatusApi, deleteEnquiryApi, type EnquiryItem } from '../services/api';
import './EnquiriesPage.css';

export const EnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [designationFilter, setDesignationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadEnquiries = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchEnquiriesApi({
        designation: designationFilter,
        status: statusFilter,
        search: searchTerm,
      });
      setEnquiries(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load enquiries');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, [designationFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEnquiries();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateEnquiryStatusApi(id, newStatus);
      setEnquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the enquiry from ${name}?`)) {
      return;
    }
    try {
      await deleteEnquiryApi(id);
      setEnquiries((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete enquiry');
    }
  };

  // Metrics
  const totalCount = enquiries.length;
  const workerCount = enquiries.filter((e) => e.designation === 'WORKER').length;
  const agentCount = enquiries.filter((e) => e.designation === 'AGENT').length;
  const newCount = enquiries.filter((e) => e.status === 'NEW' || e.status === 'PENDING').length;

  return (
    <div className="enquiries-page-container">
      {/* Page Header */}
      <div className="enquiries-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="enquiries-header-icon-box">
              <FileSpreadsheet size={22} color="#2563EB" />
            </div>
            <div>
              <h1 className="enquiries-page-title">Candidate Enquiries</h1>
              <p className="enquiries-page-subtitle">
                Review and follow up with candidate enquiries submitted for Worker and Agent roles.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadEnquiries(true)}
          className="enquiries-refresh-btn"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spinner' : ''} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="enquiries-metrics-grid">
        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap blue">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <span className="metric-label">Total Enquiries</span>
            <h3 className="metric-value">{totalCount}</h3>
          </div>
        </div>

        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap amber">
            <Clock size={20} />
          </div>
          <div>
            <span className="metric-label">New / Action Required</span>
            <h3 className="metric-value">{newCount}</h3>
          </div>
        </div>

        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap cyan">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="metric-label">Worker Enquiries</span>
            <h3 className="metric-value">{workerCount}</h3>
          </div>
        </div>

        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap purple">
            <Users size={20} />
          </div>
          <div>
            <span className="metric-label">Agent Enquiries</span>
            <h3 className="metric-value">{agentCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="enquiries-toolbar">
        <div className="enquiries-search-wrap">
          <Search size={17} color="#64748B" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="enquiries-search-input"
          />
        </div>

        <div className="enquiries-filter-group">
          <div className="select-with-icon">
            <Filter size={15} color="#64748B" />
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="enquiry-filter-select"
            >
              <option value="ALL">All Roles</option>
              <option value="WORKER">Workers Only (👷)</option>
              <option value="AGENT">Agents Only (👔)</option>
            </select>
          </div>

          <div className="select-with-icon">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="enquiry-filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">⚡ New</option>
              <option value="CONTACTED">📞 Contacted</option>
              <option value="CONVERTED">✓ Converted</option>
              <option value="REJECTED">✕ Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="enquiries-error-alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* DESKTOP TABLE VIEW */}
      <div className="table-desktop-view">
        <div className="enquiries-table-card">
          {isLoading ? (
            <div className="enquiries-loading-state">
              <RefreshCw size={28} className="spinner" color="#2563EB" />
              <p>Loading candidate enquiries from database...</p>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="enquiries-empty-state">
              <FileSpreadsheet size={48} color="#94A3B8" />
              <h3>No enquiries found</h3>
              <p>
                {searchTerm || designationFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No candidate enquiries match your filter criteria.'
                  : 'New enquiries submitted from the login page will appear here.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="enquiries-data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Designation</th>
                    <th>Contact Number</th>
                    <th>Email Address</th>
                    <th>Address</th>
                    <th>Submitted On</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((item) => {
                    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="candidate-name-cell">
                            <div className={`candidate-avatar ${item.designation.toLowerCase()}`}>
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="candidate-full-name">{item.name}</span>
                              <span className="candidate-id-sub">Lead #{item.id}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {item.designation === 'AGENT' ? (
                            <span className="designation-badge agent">
                              👔 Field Agent
                            </span>
                          ) : (
                            <span className="designation-badge worker">
                              👷 Union Worker
                            </span>
                          )}
                        </td>

                        <td>
                          <a href={`tel:${item.phone}`} className="contact-link">
                            <Phone size={13} color="#2563EB" />
                            <span>{item.phone}</span>
                          </a>
                        </td>

                        <td>
                          {item.email ? (
                            <a href={`mailto:${item.email}`} className="contact-link">
                              <Mail size={13} color="#64748B" />
                              <span>{item.email}</span>
                            </a>
                          ) : (
                            <span className="text-muted-dash">—</span>
                          )}
                        </td>

                        <td>
                          {item.address ? (
                            <div className="address-text" title={item.address}>
                              <MapPin size={13} color="#64748B" style={{ flexShrink: 0 }} />
                              <span>{item.address}</span>
                            </div>
                          ) : (
                            <span className="text-muted-dash">—</span>
                          )}
                        </td>

                        <td>
                          <div className="date-cell">
                            <Calendar size={13} color="#64748B" />
                            <span>{dateStr}</span>
                          </div>
                        </td>

                        <td>
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className={`status-dropdown-pill ${item.status.toLowerCase()}`}
                          >
                            <option value="NEW">⚡ New</option>
                            <option value="CONTACTED">📞 Contacted</option>
                            <option value="CONVERTED">✓ Converted</option>
                            <option value="REJECTED">✕ Rejected</option>
                          </select>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            className="action-delete-btn"
                            title="Delete Enquiry"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE CARDS VIEW */}
      <div className="card-mobile-view">
        {enquiries.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className={`candidate-avatar ${item.designation.toLowerCase()}`} style={{ width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, backgroundColor: item.designation === 'AGENT' ? '#EDE9FE' : '#DBEAFE', color: item.designation === 'AGENT' ? '#6D28D9' : '#1D4ED8' }}>
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800 }}>{item.name}</h4>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Lead #{item.id}</span>
                </div>
              </div>
              <span className={`designation-badge ${item.designation.toLowerCase()}`}>
                {item.designation === 'AGENT' ? '👔 Agent' : '👷 Worker'}
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-main, #f8fafc)', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
              <a href={`tel:${item.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                <Phone size={13} /> {item.phone}
              </a>
              {item.email && (
                <a href={`mailto:${item.email}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  <Mail size={13} /> {item.email}
                </a>
              )}
              {item.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} /> {item.address}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                className={`status-dropdown-pill ${item.status.toLowerCase()}`}
                style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
              >
                <option value="NEW">⚡ New</option>
                <option value="CONTACTED">📞 Contacted</option>
                <option value="CONVERTED">✓ Converted</option>
                <option value="REJECTED">✕ Rejected</option>
              </select>
              <button
                type="button"
                onClick={() => handleDelete(item.id, item.name)}
                className="list-btn touch-target"
                style={{ padding: '6px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                title="Delete Enquiry"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
