import { useState, useCallback, useEffect } from 'react';
import { db, IChannel, IPlaylist } from '../db';

interface ChannelGroupsHookResult {
  // Group state
  groups: string[];
  selectedGroup: string;
  groupChannelCounts: { [key: string]: number };
  customGroupOrder: string[];
  showGroupsPanel: boolean;
  
  // Pagination state
  currentPage: number;
  totalPages: number;
  totalChannelsInGroup: number;
  channelsPerPage: number;
  channels: IChannel[];
  
  // Group management functions
  setSelectedGroup: (group: string) => void;
  handleGroupSelect: (group: string) => void;
  sortGroupsAlphabetically: () => Promise<void>;
  handleDragEnd: (sourceIndex: number, destinationIndex: number) => Promise<void>;
  setCustomGroupOrder: (order: string[]) => void;
  setShowGroupsPanel: (show: boolean) => void;
  
  // Pagination functions
  loadNextPage: () => void;
  loadPrevPage: () => void;
  
  // Loading state
  loading: boolean;
}

/**
 * Custom hook to manage channel groups, selection, and pagination
 * 
 * @param selectedPlaylist The currently selected playlist
 * @param initialGroup Optional initial group to select
 * @returns Object containing group state and management functions
 */
export function useChannelGroups(
  selectedPlaylist: IPlaylist | null,
  initialGroup = ''
): ChannelGroupsHookResult {
  // Group state
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [groupChannelCounts, setGroupChannelCounts] = useState<{ [key: string]: number }>({});
  const [customGroupOrder, setCustomGroupOrder] = useState<string[]>([]);
  const [showGroupsPanel, setShowGroupsPanel] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalChannelsInGroup, setTotalChannelsInGroup] = useState(0);
  const [channelsPerPage] = useState(100); // 100 channels per page
  const [channels, setChannels] = useState<IChannel[]>([]);
  
  // Loading state
  const [loading, setLoading] = useState(false);

  // Function to sort groups alphabetically
  const sortGroupsAlphabetically = useCallback(async () => {
    // Create a new alphabetically sorted array of groups
    const sortedGroups = [...groups].sort();
    setGroups(sortedGroups);
    // We also update the custom order to match the new sorted order
    setCustomGroupOrder(sortedGroups);
    
    // Save the sorted order to database
    try {
      // If we have a selected playlist, pass its ID to saveGroupOrder
      if (selectedPlaylist?.id) {
        await db.saveGroupOrder(sortedGroups, selectedPlaylist.id);
      }
      console.log('Sorted group order saved to database');
    } catch (error) {
      console.error('Error saving sorted group order:', error);
    }
  }, [groups, selectedPlaylist]);

  // Handle drag-and-drop reordering
  const handleDragEnd = useCallback(async (sourceIndex: number, destinationIndex: number) => {
    // Skip if no change
    if (sourceIndex === destinationIndex) {
      return;
    }
    
    // If custom group order is empty, initialize it from current groups first
    const currentOrder = customGroupOrder.length > 0 
      ? [...customGroupOrder] 
      : [...groups];
    
    // Now reorder
    const [movedGroup] = currentOrder.splice(sourceIndex, 1);
    currentOrder.splice(destinationIndex, 0, movedGroup);
    
    // Update both the custom order and the displayed groups
    setCustomGroupOrder(currentOrder);
    setGroups(currentOrder);
    
    // Save the new order to the database for persistence
    try {
      // If we have a selected playlist, pass its ID to saveGroupOrder
      if (selectedPlaylist?.id) {
        await db.saveGroupOrder(currentOrder, selectedPlaylist.id);
      }
      console.log('Group order saved to database');
    } catch (error) {
      console.error('Error saving group order:', error);
    }
  }, [customGroupOrder, groups, selectedPlaylist]);

  // Handler for group selection
  const handleGroupSelect = useCallback((group: string) => {
    // Reset pagination when changing groups
    setCurrentPage(0);

    if (group === '') {
      console.log(`Selected ALL CHANNELS (empty string)`);
      // Set a special marker for All Channels to differentiate from actual groups
      setSelectedGroup('__ALL_CHANNELS__');
    } else if (group === 'Favorites') {
      console.log('Selected Favorites');
      setSelectedGroup('Favorites');
    } else {
      console.log(`Selected specific group: "${group}"`);
      setSelectedGroup(group);
    }

    setShowGroupsPanel(false); // Show channels panel
  }, []);
  
  // Function to load next page of channels
  const loadNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      console.log(`Loading next page: ${currentPage + 1} of ${totalPages}`);
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  // Function to load previous page of channels
  const loadPrevPage = useCallback(() => {
    if (currentPage > 0) {
      console.log(`Loading previous page: ${currentPage - 1} of ${totalPages}`);
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage, totalPages]);
  
  // Load channels for the selected group with pagination
  useEffect(() => {
    if (selectedPlaylist && selectedGroup !== undefined) {
      const loadChannels = async () => {
        try {
          setLoading(true);
  
          // We need to know which playlist we're working with
          const currentPlaylistId = selectedPlaylist?.id;
          if (!currentPlaylistId) {
            setLoading(false);
            return;
          }
  
          // Get channel count for pagination
          const totalCount = await db.getChannelCountByGroup(
            selectedGroup === '__ALL_CHANNELS__' ? '' : selectedGroup,
            currentPlaylistId
          );
  
          setTotalChannelsInGroup(totalCount);
          const pages = Math.ceil(totalCount / channelsPerPage);
          setTotalPages(pages);
  
          // Get channels for this group and playlist
          const channelsForGroup = await db.getChannelsByGroup(
            selectedGroup === '__ALL_CHANNELS__' ? '' : selectedGroup,
            currentPlaylistId,
            currentPage,
            channelsPerPage
          );
  
          setChannels(channelsForGroup);
          setLoading(false);
        } catch (error) {
          console.error('Error loading channels:', error);
          setLoading(false);
        }
      };
  
      loadChannels();
    }
  }, [selectedPlaylist, selectedGroup, currentPage, channelsPerPage]);

  // Load groups from database when playlist changes
  useEffect(() => {
    const loadGroupsForCurrentPlaylist = async () => {
      if (!selectedPlaylist?.id) return;

      try {
        // Load groups from the database with proper ordering
        const playlistGroups = await db.getGroupsByPlaylist(selectedPlaylist.id);

        if (playlistGroups.length > 0) {
          setGroups(playlistGroups);

          // If no group is selected, select the first one
          if (!selectedGroup && playlistGroups.length > 0) {
            setSelectedGroup(playlistGroups[0]);
          }

          // Load channel counts for each group
          const counts: { [key: string]: number } = {};

          // First get count for "All Channels"
          const allChannelsCount = await db.getChannelCountByGroup('', selectedPlaylist.id);
          counts[""] = allChannelsCount;

          // Then get counts for each group
          for (const group of playlistGroups) {
            const groupCount = await db.getChannelCountByGroup(group, selectedPlaylist.id);
            counts[group] = groupCount;
          }

          setGroupChannelCounts(counts);
        }
      } catch (error) {
        console.error('Error loading groups for playlist:', error);
      }
    };

    loadGroupsForCurrentPlaylist();
  }, [selectedPlaylist, selectedGroup]);

  // Load saved group order from database
  useEffect(() => {
    const loadSavedGroupOrder = async () => {
      setLoading(true);
      try {
        if (selectedPlaylist?.id) {
          // Load playlist-specific group order
          const savedOrder = await db.getGroupOrder(selectedPlaylist.id);
          if (savedOrder && savedOrder.length > 0) {
            setLoading(false);
            console.log('Loaded saved group order for playlist from database');
            setCustomGroupOrder(savedOrder);
          }
        }
      } catch (error) {
        console.error('Error loading saved group order:', error);
      }
    };
    
    loadSavedGroupOrder();
  }, [selectedPlaylist]);

  return {
    groups,
    selectedGroup,
    groupChannelCounts,
    customGroupOrder,
    showGroupsPanel,
    currentPage,
    totalPages,
    totalChannelsInGroup,
    channelsPerPage,
    channels,
    setSelectedGroup,
    handleGroupSelect,
    sortGroupsAlphabetically,
    handleDragEnd,
    setCustomGroupOrder,
    setShowGroupsPanel,
    loadNextPage,
    loadPrevPage,
    loading
  };
}