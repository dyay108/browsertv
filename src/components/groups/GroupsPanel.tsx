import React, { useState } from 'react';
import GroupItem from './GroupItem';

interface GroupsPanelProps {
  groups: string[];
  selectedGroup: string;
  onGroupSelect: (group: string) => void;
  groupChannelCounts: { [key: string]: number };
  favoritesCount: number;
  onSortGroups: () => void;
  onDragEnd: (sourceIndex: number, destinationIndex: number) => void;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchTerm: string;
  onClearSearch: () => void;
}

/**
 * Panel that displays group list with drag and drop sorting
 */
const GroupsPanel: React.FC<GroupsPanelProps> = ({
  groups,
  selectedGroup,
  onGroupSelect,
  groupChannelCounts,
  favoritesCount,
  onSortGroups,
  onDragEnd,
}) => {
  // For drag and drop
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  return (
    <div className="groups-panel">
      <div className="group-list-header">
        <h3>Channel Groups</h3>
        <div className="group-count">{groups.length} groups</div>
        <div className="group-sort-controls">
          <button
            className="sort-button"
            onClick={onSortGroups}
            title="Sort groups alphabetically"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l4-4l4 4"></path>
              <path d="M7 5v14"></path>
              <path d="M11 15l2 2l4-4"></path>
              <line x1="17" y1="13" x2="17" y2="19"></line>
            </svg>
            <span>Sort A-Z</span>
          </button>
        </div>
      </div>

      <div className="group-list-container">
        <ul className="group-list">
          {/* Favorites Group */}
          <li
            className={`group-item favorites-group ${selectedGroup === 'Favorites' ? 'selected' : ''}`}
            onClick={() => onGroupSelect('Favorites')}
          >
            <div className="group-icon favorites-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </div>
            <span className="group-name">Favorites</span>
            <div className="group-count">{favoritesCount}</div>
          </li>
          
          {/* All Channels Group */}
          <li
            className={`group-item all-groups ${selectedGroup === '__ALL_CHANNELS__' ? 'selected' : ''}`}
            onClick={() => onGroupSelect('')}
          >
            <div className="group-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                <polyline points="17 2 12 7 7 2"></polyline>
              </svg>
            </div>
            <span className="group-name">All Channels</span>
            <div className="group-count">{groupChannelCounts[""] !== undefined ? groupChannelCounts[""] : '...'}</div>
          </li>
        </ul>

        {/* Custom draggable groups list */}
        <div className="draggable-container">
          <ul className="group-list draggable">
            {groups.map((group, index) => (
              <GroupItem
                key={group}
                group={group}
                index={index}
                isSelected={selectedGroup === group}
                count={groupChannelCounts[group]}
                onSelect={() => onGroupSelect(group)}
                draggingIndex={draggingIndex}
                setDraggingIndex={setDraggingIndex}
                draggedOverIndex={draggedOverIndex}
                setDraggedOverIndex={setDraggedOverIndex}
                onDragEnd={onDragEnd}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GroupsPanel;