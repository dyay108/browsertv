import { useState, useCallback, useEffect } from 'react';
import { channelService, groupService, favoriteService } from '../services/pocketbaseService';
import { Channel, Playlist } from '../types/pocketbase-types';

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
  channels: Channel[];
  
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
 * Custom hook to manage channel groups, selection, and pagination with PocketBase
 * 
 * @param selectedPlaylist The currently selected playlist
 * @param initialGroup Optional initial group to select
 * @returns Object containing group state and management functions
 */
export function useChannelGroups(
  selectedPlaylist: Playlist | null,
  initialGroup = ''
): ChannelGroupsHookResult {
  // Group state
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup);
  const [groupChannelCounts, setGroupChannelCounts] = useState<{ [key: string]: number }>({});
  const [customGroupOrder, setCustomGroupOrder] = useState<string[]>([]);
  const [showGroupsPanel, setShowGroupsPanel] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1); // PocketBase starts pagination at 1
  const [totalPages, setTotalPages] = useState(0);
  const [totalChannelsInGroup, setTotalChannelsInGroup] = useState(0);
  const [channelsPerPage] = useState(100); // 100 channels per page
  const [channels, setChannels] = useState<Channel[]>([]);
  
  // Loading state
  const [loading, setLoading] = useState(true);

  // Function to sort groups alphabetically
  const sortGroupsAlphabetically = useCallback(async () => {
    if (!selectedPlaylist?.id) return;
    
    // Create a new alphabetically sorted array of groups
    const sortedGroups = [...groups].sort();
    setGroups(sortedGroups);
    // Also update the custom order to match the new sorted order
    setCustomGroupOrder(sortedGroups);
    
    // Save the sorted order to PocketBase
    try {
      await groupService.saveGroupOrder(sortedGroups, selectedPlaylist.id);
      console.log('Sorted group order saved to database');
    } catch (error) {
      console.error('Error saving sorted group order:', error);
    }
  }, [groups, selectedPlaylist]);

  // Handle drag-and-drop reordering
  const handleDragEnd = useCallback(async (sourceIndex: number, destinationIndex: number) => {
    if (!selectedPlaylist?.id) return;
    
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
    
    // Save the new order to PocketBase
    try {
      await groupService.saveGroupOrder(currentOrder, selectedPlaylist.id);
      console.log('Group order saved to database');
    } catch (error) {
      console.error('Error saving group order:', error);
    }
  }, [customGroupOrder, groups, selectedPlaylist]);

  // Handler for group selection
  const handleGroupSelect = useCallback((group: string) => {
    // Reset pagination when changing groups
    setCurrentPage(1);

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
    if (currentPage < totalPages) {
      console.log(`Loading next page: ${currentPage} of ${totalPages}`);
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  // Function to load previous page of channels
  const loadPrevPage = useCallback(() => {
    if (currentPage > 1) {
      console.log(`Loading previous page: ${currentPage - 1} of ${totalPages}`);
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);
  
  // Load channels for the selected group with pagination
  useEffect(() => {
    if (selectedPlaylist && selectedGroup !== undefined) {
      const loadChannels = async () => {
        try {
          setLoading(true);
  
          // We need the playlist ID to fetch data
          const playlistId = selectedPlaylist?.id;
          if (!playlistId) {
            setLoading(false);
            return;
          }
          
          let channelsData: { items: Channel[], totalItems: number, totalPages: number } | Channel[];
          
          // Handle different group selections
          if (selectedGroup === '__ALL_CHANNELS__') {
            // Get all channels for this playlist
            channelsData = await channelService.getChannelsByPlaylist(playlistId, currentPage, channelsPerPage);
            
            // Check if we got paginated results or just an array
            if ('items' in channelsData) {
              setChannels(channelsData.items);
              setTotalChannelsInGroup(channelsData.totalItems);
              setTotalPages(channelsData.totalPages);
            } 
            // else {
            //   setChannels(channelsData);
            //   setTotalChannelsInGroup(channelsData.length);
            //   setTotalPages(1);
            // }
          } else if (selectedGroup === 'Favorites') {
            // Get favorite channels
            const favoriteChannels = await favoriteService.getFavoriteChannels(playlistId, currentPage, channelsPerPage);
            setChannels(favoriteChannels);
            
            // For favorites, we might need to do an additional count query if the API doesn't return paginated results
            // This would depend on how your favorites API is set up
            setTotalChannelsInGroup(favoriteChannels.length); // This is an approximation
            setTotalPages(1); // This is also an approximation
          } else {
            // Find the group ID first
            const groupsList = await groupService.getGroupsByPlaylist(playlistId);
            const group = groupsList.find(g => g.name === selectedGroup);
            
            if (group) {
              // Get channels for this specific group
              const groupChannels = await channelService.getChannelsByGroup(group.id, currentPage, channelsPerPage);
              
              // For groups, we might need to handle paginated results differently
              if (Array.isArray(groupChannels)) {
                setChannels(groupChannels);
                setTotalChannelsInGroup(groupChannels.length); // This is an approximation
                setTotalPages(1); // This is also an approximation
              } 
              else if ('items' in groupChannels) {
                setChannels(groupChannels.items);
                setTotalChannelsInGroup(groupChannels.totalItems);
                setTotalPages(groupChannels.totalPages);
              }
            } else {
              // Group not found
              setChannels([]);
              setTotalChannelsInGroup(0);
              setTotalPages(0);
            }
          }
  
          setLoading(false);
        } catch (error) {
          console.error('Error loading channels:', error);
          setLoading(false);
        }
      };
  
      loadChannels();
    }
  }, [selectedPlaylist, selectedGroup, currentPage, channelsPerPage]);

  // Load groups from PocketBase when playlist changes
  useEffect(() => {
    const loadGroupsForCurrentPlaylist = async () => {
      if (!selectedPlaylist?.id) return;

      setLoading(true);
      try {
        // Load groups from PocketBase
        const groupEntities = await groupService.getGroupsByPlaylist(selectedPlaylist.id);
        const groupNames = groupEntities.map(g => g.name);

        // Load group order from PocketBase
        const savedOrder = await groupService.getGroupOrder(selectedPlaylist.id);
        
        // Determine the final group order
        let finalGroups: string[];
        if (savedOrder && savedOrder.length > 0) {
          // Filter saved order to only include existing groups and add any missing groups
          const existingGroupNames = new Set(groupNames);
          const filteredOrder = savedOrder.filter(name => existingGroupNames.has(name));
          
          // Add any groups that were not in the saved order
          groupNames.forEach(groupName => {
            if (!filteredOrder.includes(groupName)) {
              filteredOrder.push(groupName);
            }
          });
          
          finalGroups = filteredOrder;
        } else {
          // No saved order, use alphabetical
          finalGroups = [...groupNames].sort();
        }

        setGroups(finalGroups);
        setCustomGroupOrder(savedOrder || []);

        // If no group is selected, select the first one or "ALL CHANNELS"
        if (!selectedGroup) {
          setSelectedGroup(finalGroups.length > 0 ? finalGroups[0] : '__ALL_CHANNELS__');
        }

        // Calculate channel counts for each group (this might be expensive)
        const counts: { [key: string]: number } = {};
        
        // Get all channels count first
        const allChannelsData = await channelService.getChannelsByPlaylist(selectedPlaylist.id, 1, 1);
        counts[""] = 'totalItems' in allChannelsData ? allChannelsData.totalItems : 0;

        // This part can be expensive and might need optimization
        for (const group of groupEntities) {
          try {
            const groupChannels = await channelService.getChannelsByGroup(group.id);
            counts[group.name] = groupChannels.totalItems//Array.isArray(groupChannels) ? groupChannels.length : 0;
          } catch (error) {
            console.error(`Error getting count for group ${group.name}:`, error);
            counts[group.name] = 0;
          }
        }

        setGroupChannelCounts(counts);
        setLoading(false);
      } catch (error) {
        console.error('Error loading groups for playlist:', error);
        setLoading(false);
      }
    };

    loadGroupsForCurrentPlaylist();
  }, [selectedPlaylist, selectedGroup]);

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