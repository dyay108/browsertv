import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  totalItems?: number;
  itemsName?: string;
  loading?: boolean;
}

/**
 * Reusable pagination controls component
 */
const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onNextPage,
  onPrevPage,
  totalItems,
  loading = false
}) => {
  // Don't render if there's only one page or none
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button
        onClick={onPrevPage}
        disabled={currentPage === 1 || loading}
        className="pagination-button prev"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Prev
      </button>
      <span className="pagination-status">
        {totalItems 
          ? `${currentPage}/${totalPages} (${totalItems})`
          : `${currentPage}/${totalPages}`
        }
      </span>
      <button
        onClick={onNextPage}
        disabled={currentPage >= totalPages || loading}
        className="pagination-button next"
      >
        Next
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
};

export default PaginationControls;