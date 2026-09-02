import React from 'react';
import { Search, X, Plus, Download } from 'lucide-react';
import './ListHeader.css';

export interface FilterOption {
  key: string;
  label: string;
  count?: number;
}

interface ListHeaderProps {
  title: string;
  subtitle?: string;
  badgeCount?: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  activeFilter?: string;
  onFilterSelect?: (key: string) => void;
  onExport?: () => void;
  exportLabel?: string;
  primaryActionLabel?: string;
  primaryActionIcon?: React.ReactNode;
  onPrimaryAction?: () => void;
  secondaryAction?: React.ReactNode;
  customFilters?: React.ReactNode;
}

export const ListHeader: React.FC<ListHeaderProps> = ({
  title,
  subtitle,
  badgeCount,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterOptions,
  activeFilter,
  onFilterSelect,
  onExport,
  exportLabel = 'Export Data',
  primaryActionLabel,
  primaryActionIcon = <Plus size={16} />,
  onPrimaryAction,
  secondaryAction,
  customFilters
}) => {
  return (
    <div className="list-header-wrapper">
      {/* Top Title & Primary Actions Row */}
      <div className="list-header-top">
        <div className="list-title-group">
          <div className="list-title-badge-row">
            <h1 className="list-page-title">{title}</h1>
            {typeof badgeCount === 'number' && (
              <span className="list-count-badge">{badgeCount}</span>
            )}
          </div>
          {subtitle && <p className="list-page-subtitle">{subtitle}</p>}
        </div>

        <div className="list-actions-group">
          {secondaryAction}

          {onExport && (
            <button
              type="button"
              className="list-btn list-btn-outline touch-target"
              onClick={onExport}
              title={exportLabel}
            >
              <Download size={16} />
              <span>{exportLabel}</span>
            </button>
          )}

          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              className="list-btn list-btn-primary touch-target"
              onClick={onPrimaryAction}
            >
              {primaryActionIcon}
              <span>{primaryActionLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="list-toolbar">
        {/* Search Bar with Clear Button */}
        <div className="list-search-bar">
          <Search size={17} className="list-search-icon" />
          <input
            type="text"
            className="list-search-input"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="list-search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Pills / Tabs */}
        {filterOptions && filterOptions.length > 0 && onFilterSelect && (
          <div className="list-filter-tabs">
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`list-filter-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => onFilterSelect(opt.key)}
                >
                  <span>{opt.label}</span>
                  {typeof opt.count === 'number' && (
                    <span className="tab-count-badge">{opt.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {customFilters}
      </div>
    </div>
  );
};
