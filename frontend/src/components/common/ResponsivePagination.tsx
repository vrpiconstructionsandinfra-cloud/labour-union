import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ResponsivePagination.css';

interface ResponsivePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (perPage: number) => void;
  pageSizeOptions?: number[];
}

export const ResponsivePagination: React.FC<ResponsivePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50, 100]
}) => {
  if (totalItems <= 0) return null;

  const startIdx = (currentPage - 1) * itemsPerPage + 1;
  const endIdx = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="responsive-pagination-container">
      {/* Desktop Meta text */}
      <div className="pagination-desktop-meta">
        <span>
          Showing <strong>{startIdx}</strong>–<strong>{endIdx}</strong> of <strong>{totalItems}</strong> records
        </span>

        {onItemsPerPageChange && (
          <div className="pagination-per-page-select">
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn touch-target"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
          <span className="hide-on-mobile">Previous</span>
        </button>

        <span className="pagination-page-indicator">
          Page <strong>{currentPage}</strong> of <strong>{Math.max(1, totalPages)}</strong>
        </span>

        <button
          type="button"
          className="pagination-btn touch-target"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
        >
          <span className="hide-on-mobile">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
