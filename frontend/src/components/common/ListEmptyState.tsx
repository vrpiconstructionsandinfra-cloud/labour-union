import React from 'react';
import { SearchX, Plus, RefreshCw, Database } from 'lucide-react';

interface ListEmptyStateProps {
  title?: string;
  message?: string;
  isSearchOrFilter?: boolean;
  onClearFilters?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  icon?: React.ReactNode;
}

export const ListEmptyState: React.FC<ListEmptyStateProps> = ({
  title,
  message,
  isSearchOrFilter = false,
  onClearFilters,
  primaryActionLabel,
  onPrimaryAction,
  icon
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: '14px',
        border: '1.5px dashed var(--border-color, #cbd5e1)',
        margin: '16px 0',
        width: '100%'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          color: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          border: '1px solid #bfdbfe'
        }}
      >
        {icon ? icon : isSearchOrFilter ? <SearchX size={26} /> : <Database size={26} />}
      </div>

      <h3
        style={{
          margin: '0 0 6px 0',
          fontSize: '16px',
          fontWeight: 800,
          color: 'var(--text-primary, #0f172a)'
        }}
      >
        {title || (isSearchOrFilter ? 'No matching records found' : 'No records yet')}
      </h3>

      <p
        style={{
          margin: '0 0 18px 0',
          fontSize: '13px',
          color: 'var(--text-secondary, #64748b)',
          maxWidth: '380px'
        }}
      >
        {message ||
          (isSearchOrFilter
            ? 'We could not find any records matching your search query or active filters. Try adjusting or clearing your filters.'
            : 'There are no entries in this section yet. Get started by creating your first record.')}
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {isSearchOrFilter && onClearFilters && (
          <button
            type="button"
            className="list-btn list-btn-outline touch-target"
            onClick={onClearFilters}
          >
            <RefreshCw size={14} />
            <span>Clear Search & Filters</span>
          </button>
        )}

        {primaryActionLabel && onPrimaryAction && (
          <button
            type="button"
            className="list-btn list-btn-primary touch-target"
            onClick={onPrimaryAction}
          >
            <Plus size={15} />
            <span>{primaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
