import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X, Loader2, Mail, Phone } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import './DeleteConfirmModal.css';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  title: string;
  itemType?: 'agent' | 'support_agent' | 'worker' | 'custom';
  itemName: string;
  itemCode?: string;
  itemRole?: string;
  itemEmail?: string;
  itemPhone?: string;
  itemAvatar?: string;
  warningNote?: string;
  confirmButtonText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  title,
  itemName,
  itemCode,
  itemRole,
  itemEmail,
  itemPhone,
  itemAvatar,
  warningNote,
  confirmButtonText = 'Confirm Delete',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const modalMarkup = (
    <div className="dcm-backdrop animate-fade-in" onClick={() => !isDeleting && onClose()}>
      <div className="dcm-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dcm-header">
          <div className="dcm-header-left">
            <div className="dcm-icon-badge">
              <Trash2 size={20} />
            </div>
            <div className="dcm-title-area">
              <h3>{title}</h3>
              <p>Permanent Deletion Confirmation</p>
            </div>
          </div>
          <button
            type="button"
            className="dcm-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="dcm-body">
          <div className="dcm-user-card">
            <div className="dcm-avatar-wrapper">
              <UserAvatar
                src={itemAvatar}
                name={itemName}
                size={44}
              />
            </div>
            <div className="dcm-user-info">
              <div className="dcm-user-name">{itemName}</div>
              <div className="dcm-badges-row">
                {itemCode && <span className="dcm-code-badge">{itemCode}</span>}
                {itemRole && <span className="dcm-role-badge">{itemRole}</span>}
              </div>
              {(itemPhone || itemEmail) && (
                <div className="dcm-meta-row">
                  {itemPhone && (
                    <span className="dcm-meta-item">
                      <Phone size={12} />
                      {itemPhone}
                    </span>
                  )}
                  {itemEmail && (
                    <span className="dcm-meta-item">
                      <Mail size={12} />
                      {itemEmail}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="dcm-warning-box">
            <AlertTriangle size={18} className="dcm-warning-icon" />
            <div className="dcm-warning-content">
              <div className="dcm-warning-title">Warning & Cascading Effects</div>
              <p className="dcm-warning-text">
                {warningNote || `Are you sure you want to delete ${itemName}? This account and its credentials will be permanently removed from the system.`}
              </p>
              <div className="dcm-irreversible-note">
                • This action cannot be reversed.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="dcm-footer">
          <button
            type="button"
            className="dcm-btn-cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dcm-btn-delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="spinner animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>{confirmButtonText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : null;
};
