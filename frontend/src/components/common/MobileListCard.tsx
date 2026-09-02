import React, { useState } from 'react';
import { MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { StatusType } from './StatusBadge';
import { UserAvatar } from '../UserAvatar';
import './MobileListCard.css';

export interface MobileCardMetaRow {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export interface MobileCardAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
}

interface MobileListCardProps {
  avatarName?: string;
  avatarImage?: string | null;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  idBadge?: string;
  status?: StatusType;
  statusLabel?: string;
  metaRows: MobileCardMetaRow[];
  expandableRows?: MobileCardMetaRow[];
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'outline' | 'success' | 'danger';
  };
  secondaryActions?: MobileCardAction[];
  onClick?: () => void;
  className?: string;
}

export const MobileListCard: React.FC<MobileListCardProps> = ({
  avatarName,
  avatarImage,
  icon,
  title,
  subtitle,
  idBadge,
  status,
  statusLabel,
  metaRows,
  expandableRows,
  primaryAction,
  secondaryActions,
  onClick,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <div className={`mobile-list-card ${className}`} onClick={onClick}>
      {/* Top Header Row */}
      <div className="mobile-card-header">
        <div className="mobile-card-identity">
          {avatarName ? (
            <UserAvatar
              name={avatarName}
              src={avatarImage}
              size={40}
              className="mobile-card-avatar"
            />
          ) : icon ? (
            <div className="mobile-card-icon-box">{icon}</div>
          ) : null}

          <div className="mobile-card-title-group">
            <div className="mobile-card-title-row">
              <h3 className="mobile-card-title">{title}</h3>
              {idBadge && <span className="mobile-card-id-badge">{idBadge}</span>}
            </div>
            {subtitle && <span className="mobile-card-subtitle">{subtitle}</span>}
          </div>
        </div>

        <div className="mobile-card-header-actions">
          {status && <StatusBadge status={status} label={statusLabel} size="sm" />}

          {secondaryActions && secondaryActions.length > 0 && (
            <div className="mobile-card-more-menu-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="mobile-card-more-btn touch-target"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                aria-label="More actions"
              >
                <MoreVertical size={16} />
              </button>

              {showMoreMenu && (
                <div className="mobile-card-menu-dropdown animate-fade-in">
                  {secondaryActions.map((action, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`mobile-card-menu-item ${action.variant || 'default'}`}
                      onClick={() => {
                        setShowMoreMenu(false);
                        action.onClick();
                      }}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Metadata Rows */}
      <div className="mobile-card-meta-list">
        {metaRows.map((row, idx) => (
          <div key={idx} className="mobile-card-meta-row">
            <span className="meta-row-label">
              {row.icon}
              <span>{row.label}:</span>
            </span>
            <span className="meta-row-value">{row.value}</span>
          </div>
        ))}

        {/* Expandable Rows */}
        {isExpanded &&
          expandableRows &&
          expandableRows.map((row, idx) => (
            <div key={`exp-${idx}`} className="mobile-card-meta-row expanded-row animate-fade-in">
              <span className="meta-row-label">
                {row.icon}
                <span>{row.label}:</span>
              </span>
              <span className="meta-row-value">{row.value}</span>
            </div>
          ))}
      </div>

      {/* Expand / Collapse Trigger */}
      {expandableRows && expandableRows.length > 0 && (
        <button
          type="button"
          className="mobile-card-expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
        >
          <span>{isExpanded ? 'Less details' : 'More details'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}

      {/* Footer Action */}
      {primaryAction && (
        <div className="mobile-card-footer" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`mobile-card-primary-action-btn ${primaryAction.variant || 'primary'} touch-target`}
            onClick={primaryAction.onClick}
          >
            {primaryAction.icon}
            <span>{primaryAction.label}</span>
          </button>
        </div>
      )}
    </div>
  );
};
