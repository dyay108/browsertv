import React from 'react';

interface GroupItemProps {
  group: string;
  index: number;
  isSelected: boolean;
  count: number;
  onSelect: () => void;
  draggingIndex: number | null;
  setDraggingIndex: (index: number | null) => void;
  draggedOverIndex: number | null;
  setDraggedOverIndex: (index: number | null) => void;
  onDragEnd: (sourceIndex: number, destinationIndex: number) => void;
}

/**
 * Draggable group item in the channel sidebar
 */
const GroupItem: React.FC<GroupItemProps> = ({
  group,
  index,
  isSelected,
  count,
  onSelect,
  draggingIndex,
  setDraggingIndex,
  draggedOverIndex,
  setDraggedOverIndex,
  onDragEnd
}) => {
  // For dragging
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>) => {
    setDraggingIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEndEvent = (e: React.DragEvent<HTMLLIElement>) => {
    setDraggingIndex(null);
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDraggedOverIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDraggedOverIndex(null);
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (sourceIndex !== index) {
      onDragEnd(sourceIndex, index);
    }
  };

  const isDragging = draggingIndex === index;
  const isDraggedOver = draggedOverIndex === index;

  return (
    <li
      className={`group-item ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isDraggedOver ? 'dragged-over' : ''}`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndEvent}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onSelect}
    >
      <div className="group-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drag-handle">
          <line x1="21" y1="10" x2="3" y2="10"></line>
          <line x1="21" y1="6" x2="3" y2="6"></line>
          <line x1="21" y1="14" x2="3" y2="14"></line>
          <line x1="21" y1="18" x2="3" y2="18"></line>
        </svg>
      </div>
      <span className="group-name">{group}</span>
      <div className="group-count">{count !== undefined ? count : '...'}</div>
    </li>
  );
};

export default GroupItem;