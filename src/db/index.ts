import Dexie, { Table } from 'dexie';

// Interfaces for database tables
export interface IPlaylist {
  id?: number;
  name: string;
  lastUsed: Date;
  content: string;
  url?: string;
}

export interface IChannel {
  id: string;           // Unique ID (path from URL)
  name: string;         // Channel name
  url: string;          // Stream URL
  logo: string;         // Logo URL
  group: string;        // Primary group name (for backwards compatibility)
  tvgId?: string;       // TV Guide ID
  tvgName?: string;     // TV Guide name
  playlistId: number;   // Which playlist this channel belongs to
}

export interface IGroup {
  id?: number;          // Auto-generated ID
  name: string;         // Group name
  playlistId: number;   // Which playlist this group belongs to
}

// Junction table to handle many-to-many relationship between channels and groups
export interface IChannelGroup {
  id?: number;          // Auto-generated ID
  channelId: string;    // Reference to channel
  groupId: number;      // Reference to group
}

// Favorite channels
export interface IFavorite {
  id?: number;          // Auto-generated ID
  channelId: string;    // Reference to channel
  playlistId: number;   // Which playlist this favorite belongs to
}

// Group order settings
export interface IGroupOrder {
  id?: number;
  playlistId: number;   // Which playlist these settings belong to
  groups: string[];     // Array of group names in display order
}

export class IPTVDatabase extends Dexie {
  playlists!: Table<IPlaylist, number>;
  channels!: Table<IChannel, string>;
  groups!: Table<IGroup, number>;
  channelGroups!: Table<IChannelGroup, number>;
  favorites!: Table<IFavorite, number>;
  settings!: Table<IGroupOrder, number>;

  constructor() {
    super('IPTVDatabase');
    
    // Define database schema
    this.version(1).stores({
      playlists: '++id, name, lastUsed',
      channels: 'id, name, group, playlistId',
      groups: '++id, name, playlistId, [name+playlistId]',
      channelGroups: '++id, channelId, groupId, [channelId+groupId]',
      settings: '++id, playlistId',
      favorites: '++id, channelId, playlistId, [channelId+playlistId]'
    });
  }

  // Save a new playlist
  async savePlaylist(name: string, content: string, url?: string): Promise<number> {
    return await this.playlists.add({
      name,
      content,
      lastUsed: new Date(),
      url
    });
  }

  // Update last used timestamp
  async updatePlaylistUsage(id: number): Promise<void> {
    await this.playlists.update(id, { lastUsed: new Date() });
  }

  // Get all playlists ordered by last used
  async getRecentPlaylists(): Promise<IPlaylist[]> {
    return await this.playlists.orderBy('lastUsed').reverse().toArray();
  }

  // Delete a playlist and all associated data
  async deletePlaylist(id: number): Promise<void> {
    await this.transaction('rw', [this.playlists, this.channels, this.groups, this.channelGroups, this.settings], async () => {
      // Get all channels for this playlist
      const channels = await this.channels.where('playlistId').equals(id).toArray();
      const channelIds = channels.map(c => c.id);
      
      // Delete all channel-group associations for these channels
      if (channelIds.length > 0) {
        await this.channelGroups.where('channelId').anyOf(channelIds).delete();
      }
      
      // Get all groups for this playlist
      const groups = await this.groups.where('playlistId').equals(id).toArray();
      const groupIds = groups.map(g => g.id!);
      
      // Delete remaining channel-group associations
      if (groupIds.length > 0) {
        await this.channelGroups.where('groupId').anyOf(groupIds).delete();
      }
      
      // Delete groups, channels, settings, and the playlist itself
      await this.groups.where('playlistId').equals(id).delete();
      await this.channels.where('playlistId').equals(id).delete();
      await this.settings.where('playlistId').equals(id).delete();
      await this.playlists.delete(id);
    });
  }

  // Parse and save a playlist
  async parseAndSavePlaylist(content: string, name: string, url?: string): Promise<number> {
    try {
      const playlistId = await this.savePlaylist(name, content, url);
      await this.parseM3UContent(content, playlistId);
      return playlistId;
    } catch (error) {
      console.error("Error parsing and saving playlist:", error);
      throw error;
    }
  }

  // Parse M3U content and save channels to the database
  async parseM3UContent(content: string, playlistId: number): Promise<void> {
    const channels: IChannel[] = [];
    const groupNames = new Set<string>();
    const channelGroups: { channelId: string; groupNames: string[] }[] = [];
    
    const lines = content.split(/\r?\n/);
    let channelInfo: Partial<IChannel> | null = null;
    let currentGroup = '';
    let currentGroups: string[] = [];
    
    // First pass: Extract channels and their groups
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines or EXTM3U line
      if (!line || line === '#EXTM3U') continue;
      
      // Handle EXTGRP (older format)
      if (line.startsWith('#EXTGRP:')) {
        currentGroup = line.substring(8).trim();
        if (currentGroup) {
          groupNames.add(currentGroup);
          currentGroups = [currentGroup]; // Reset groups for next channel
        }
        continue;
      }
      
      // Parse channel info line
      if (line.startsWith('#EXTINF:')) {
        // Extract attributes
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        const groupMatch = line.match(/group-title="([^"]*)"/i);
        
        // Extract channel name (after the last comma)
        const lastCommaIndex = line.lastIndexOf(',');
        let name = '';
        if (lastCommaIndex !== -1) {
          name = line.substring(lastCommaIndex + 1).trim();
        }
        
        // Handle groups
        let primaryGroup = 'Ungrouped';
        currentGroups = [];
        
        // Check for group-title attribute first
        if (groupMatch && groupMatch[1]) {
          const groups = groupMatch[1].split(';'); // Some M3U files use semicolons to separate multiple groups
          
          // Add all groups to the set and current groups array
          groups.forEach(g => {
            const trimmedGroup = g.trim();
            if (trimmedGroup) {
              groupNames.add(trimmedGroup);
              currentGroups.push(trimmedGroup);
            }
          });
          
          // Use the first group as primary
          if (currentGroups.length > 0) {
            primaryGroup = currentGroups[0];
          }
        } 
        // If no group-title, use the EXTGRP value
        else if (currentGroup) {
          primaryGroup = currentGroup;
          currentGroups = [currentGroup];
        }
        
        // Store channel info
        channelInfo = {
          name,
          tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
          tvgName: tvgNameMatch ? tvgNameMatch[1] : '',
          logo: logoMatch ? logoMatch[1] : '',
          group: primaryGroup, // Store the primary group in the channel object
          playlistId
        };
      }
      // Parse URL line
      else if (channelInfo && !line.startsWith('#') && line.trim()) {
        const url = line.trim();
        
        // Extract file path from URL for ID
        const id = this.extractIdFromUrl(url);
        
        // Create complete channel object
        const channel: IChannel = {
          ...channelInfo as IChannel,
          id,
          url,
          playlistId
        };
        
        channels.push(channel);
        
        // Store channel-group associations
        if (currentGroups.length > 0) {
          channelGroups.push({
            channelId: id,
            groupNames: [...currentGroups] // Create a copy to avoid reference issues
          });
        }
        
        // Reset for next channel
        channelInfo = null;
      }
    }
    
    // Save everything in a transaction
    await this.transaction('rw', [this.channels, this.groups, this.channelGroups, this.settings], async () => {
      // Clear existing data for this playlist
      await this.clearPlaylistData(playlistId);
      
      // Save channels
      if (channels.length > 0) {
        await this.saveChannels(channels);
      }
      
      // Save groups
      const groupsArray = Array.from(groupNames).map(name => ({
        name,
        playlistId
      }));
      
      // Add all groups and get their IDs
      const groupIds = await this.groups.bulkAdd(groupsArray, { allKeys: true }) as number[];
      
      // Create mapping from group name to ID
      const groupNameToId = new Map<string, number>();
      groupsArray.forEach((group, index) => {
        groupNameToId.set(group.name, groupIds[index]);
      });
      
      // Create channel-group associations
      const associations: IChannelGroup[] = [];
      
      for (const { channelId, groupNames } of channelGroups) {
        for (const groupName of groupNames) {
          const groupId = groupNameToId.get(groupName);
          if (groupId) {
            associations.push({ channelId, groupId });
          }
        }
      }
      
      // Save associations
      if (associations.length > 0) {
        await this.channelGroups.bulkAdd(associations);
      }
      
      // Save group order
      await this.saveGroupOrder(Array.from(groupNames), playlistId);
    });
  }

  // Clear all data for a specific playlist
  private async clearPlaylistData(playlistId: number): Promise<void> {
    // Get all channels for this playlist
    const channels = await this.channels.where('playlistId').equals(playlistId).toArray();
    const channelIds = channels.map(c => c.id);
    
    // Delete all channel-group associations for these channels
    if (channelIds.length > 0) {
      await this.channelGroups.where('channelId').anyOf(channelIds).delete();
    }
    
    // Delete groups, channels, and settings
    await this.groups.where('playlistId').equals(playlistId).delete();
    await this.channels.where('playlistId').equals(playlistId).delete();
    await this.settings.where('playlistId').equals(playlistId).delete();
  }

  // Extract ID from URL
  private extractIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove protocol, hostname, port
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        return pathParts.join('/');
      }
    } catch (e) {
      console.warn(`Failed to parse URL for ID extraction: ${url}`);
    }
    
    // Fallback to URL
    return url;
  }

  // Save multiple channels in batches
  async saveChannels(channels: IChannel[]): Promise<void> {
    const batchSize = 1000;
    const totalBatches = Math.ceil(channels.length / batchSize);
    
    console.log(`Saving ${channels.length} channels in ${totalBatches} batches`);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, channels.length);
      const batch = channels.slice(start, end);
      
      console.log(`Saving batch ${i + 1}/${totalBatches} (${batch.length} channels)`);
      await this.channels.bulkPut(batch);
    }
  }

  // Clear all channels
  async clearChannels(): Promise<void> {
    await this.transaction('rw', [this.channels, this.groups, this.channelGroups], async () => {
      await this.channelGroups.clear();
      await this.groups.clear();
      await this.channels.clear();
    });
  }

  // Save group order for a playlist
  async saveGroupOrder(groups: string[], playlistId: number): Promise<number> {
    // Delete any existing settings for this playlist
    await this.settings.where('playlistId').equals(playlistId).delete();
    
    // Save new order
    return await this.settings.add({
      playlistId,
      groups
    });
  }

  // Get group order for a playlist
  async getGroupOrder(playlistId?: number): Promise<string[] | null> {
    if (playlistId === undefined) {
      const setting = await this.settings.toArray();
      if (setting && setting.length > 0) {
        return setting[0].groups;
      }
      return null;
    }
    
    const setting = await this.settings.where('playlistId').equals(playlistId).first();
    return setting ? setting.groups : null;
  }

  // Get all unique groups across all playlists
  async getAllGroups(): Promise<string[]> {
    const groups = await this.groups.toArray();
    const uniqueGroups = new Set<string>();
    
    groups.forEach(group => {
      uniqueGroups.add(group.name);
    });
    
    // Convert set to array without using spread
    return Array.from(uniqueGroups).sort();
  }

  // Get all groups for a specific playlist
  async getGroupsByPlaylist(playlistId: number): Promise<string[]> {
    const groupsInPlaylist = await this.groups.where('playlistId').equals(playlistId).toArray();
    const groupsList = groupsInPlaylist.map(g => g.name);
    
    // Try to get ordered groups
    const orderedGroups = await this.getGroupOrder(playlistId);
    if (orderedGroups) {
      // Filter to only include groups that actually exist
      const existingGroupNames = new Set(groupsList);
      const filteredAndOrdered = orderedGroups.filter(name => existingGroupNames.has(name));
      
      // Add any groups that weren't in the ordered list
      groupsList.forEach(group => {
        if (!filteredAndOrdered.includes(group)) {
          filteredAndOrdered.push(group);
        }
      });
      
      return filteredAndOrdered;
    }
    
    // Fall back to alphabetical
    return groupsList.sort();
  }

  // Get all channels with pagination
  async getAllChannelsPaginated(
    page = 0,
    pageSize = 100
  ): Promise<IChannel[]> {
    const offset = page * pageSize;
    
    console.log(`getAllChannelsPaginated: Loading ALL channels, page ${page}, offset ${offset}, limit ${pageSize}`);
    
    return await this.channels
      .offset(offset)
      .limit(pageSize)
      .toArray();
  }

  // Get channels for a specific group with pagination - handles both playlist filtering and legacy modes
  async getChannelsByGroup(
    group: string, 
    pageOrPlaylistId?: number,
    pageSizeOrPage?: number,
    pageSize?: number
  ): Promise<IChannel[]> {
    // Handle different parameter patterns
    let playlistId: number | undefined = undefined;
    let page = 0;
    let size = 100; // Default page size
    
    // Figure out which parameter pattern is being used
    if (typeof pageOrPlaylistId === 'number') {
      if (pageSize !== undefined) {
        // Format: (group, playlistId, page, pageSize)
        playlistId = pageOrPlaylistId;
        page = pageSizeOrPage || 0;
        size = pageSize;
      } else {
        // Format: (group, page, pageSize)
        page = pageOrPlaylistId;
        size = pageSizeOrPage || 100;
      }
    }
    
    // Special case for "All Channels"
    if (group === "__ALL_CHANNELS__" || group === "") {
      if (playlistId !== undefined) {
        // Get all channels for this playlist
        return this.getAllChannelsByPlaylist(playlistId, page, size);
      } else {
        // Get all channels
        return this.getAllChannelsPaginated(page, size);
      }
    }
    
    const offset = page * size;
    
    // Since we have a junction table, we need a more complex query to get channels by group
    try {
      // First get the group ID
      let groupEntity;
      
      if (playlistId !== undefined) {
        // Get the specific group for this playlist
        groupEntity = await this.groups
          .where('[name+playlistId]')
          .equals([group, playlistId])
          .first();
      } else {
        // Get any group with this name (from any playlist)
        groupEntity = await this.groups
          .where('name')
          .equals(group)
          .first();
      }
      
      if (!groupEntity) {
        // If no group found, try falling back to the direct 'group' field for compatibility
        if (playlistId !== undefined) {
          return await this.channels
            .where('playlistId')
            .equals(playlistId)
            .and(channel => channel.group === group)
            .offset(offset)
            .limit(size)
            .toArray();
        } else {
          return await this.channels
            .where('group')
            .equals(group)
            .offset(offset)
            .limit(size)
            .toArray();
        }
      }
      
      // Get all channel IDs in this group
      const associations = await this.channelGroups
        .where('groupId')
        .equals(groupEntity.id!)
        .toArray();
      
      const channelIds = associations.map(a => a.channelId);
      
      if (channelIds.length === 0) {
        return [];
      }
      
      // Get the actual channels
      let query = this.channels.where('id').anyOf(channelIds);
      
      // Add playlist filter if needed
      if (playlistId !== undefined) {
        query = query.and(channel => channel.playlistId === playlistId);
      }
      
      // Apply pagination (use offset/limit after filtering)
      const allMatchingChannels = await query.toArray();
      return allMatchingChannels.slice(offset, offset + size);
      
    } catch (e) {
      console.error('Error getting channels by group:', e);
      
      // Fall back to using the direct 'group' field for compatibility
      if (playlistId !== undefined) {
        return await this.channels
          .where('playlistId')
          .equals(playlistId)
          .and(channel => channel.group === group)
          .offset(offset)
          .limit(size)
          .toArray();
      } else {
        return await this.channels
          .where('group')
          .equals(group)
          .offset(offset)
          .limit(size)
          .toArray();
      }
    }
  }

  // Get all channels for a playlist with pagination
  async getAllChannelsByPlaylist(playlistId: number, page = 0, pageSize = 100): Promise<IChannel[]> {
    const offset = page * pageSize;
    
    return await this.channels
      .where('playlistId')
      .equals(playlistId)
      .offset(offset)
      .limit(pageSize)
      .toArray();
  }

  // Get channel count by group with optional playlist filtering
  async getChannelCountByGroup(group: string, playlistId?: number): Promise<number> {
    // Special case for "All Channels"
    if (group === "" || group === "__ALL_CHANNELS__") {
      if (playlistId !== undefined) {
        // Get count for specific playlist
        return await this.channels.where('playlistId').equals(playlistId).count();
      } else {
        // Get count for all playlists
        return await this.channels.count();
      }
    }
    
    try {
      // First get the group ID
      let groupEntity;
      
      if (playlistId !== undefined) {
        // Get the specific group for this playlist
        groupEntity = await this.groups
          .where('[name+playlistId]')
          .equals([group, playlistId])
          .first();
      } else {
        // Get any group with this name (from any playlist)
        groupEntity = await this.groups
          .where('name')
          .equals(group)
          .first();
      }
      
      if (!groupEntity) {
        // If no group found, try falling back to the direct 'group' field for compatibility
        if (playlistId !== undefined) {
          return await this.channels
            .where('playlistId')
            .equals(playlistId)
            .and(channel => channel.group === group)
            .count();
        } else {
          return await this.channels
            .where('group')
            .equals(group)
            .count();
        }
      }
      
      // Get all channel IDs in this group
      const associations = await this.channelGroups
        .where('groupId')
        .equals(groupEntity.id!)
        .toArray();
      
      const channelIds = associations.map(a => a.channelId);
      
      if (channelIds.length === 0) {
        return 0;
      }
      
      // Count the actual channels (with playlist filter if needed)
      if (playlistId !== undefined) {
        const matchingChannels = await this.channels
          .where('id')
          .anyOf(channelIds)
          .and(channel => channel.playlistId === playlistId)
          .count();
        
        return matchingChannels;
      } else {
        const matchingChannels = await this.channels
          .where('id')
          .anyOf(channelIds)
          .count();
        
        return matchingChannels;
      }
    } catch (e) {
      console.error('Error getting channel count by group:', e);
      
      // Fall back to using the direct 'group' field for compatibility
      if (playlistId !== undefined) {
        return await this.channels
          .where('playlistId')
          .equals(playlistId)
          .and(channel => channel.group === group)
          .count();
      } else {
        return await this.channels
          .where('group')
          .equals(group)
          .count();
      }
    }
  }
  
  // Get total count of all channels
  async getTotalChannelCount(): Promise<number> {
    return await this.channels.count();
  }

  // Add a channel to favorites
  async addToFavorites(channelId: string, playlistId: number): Promise<number> {
    // Check if already in favorites
    const existing = await this.favorites
      .where('[channelId+playlistId]')
      .equals([channelId, playlistId])
      .first();
    
    if (existing) {
      return existing.id!;
    }
    
    // Add to favorites
    return await this.favorites.add({
      channelId,
      playlistId
    });
  }

  // Remove a channel from favorites
  async removeFromFavorites(channelId: string, playlistId: number): Promise<void> {
    await this.favorites
      .where('[channelId+playlistId]')
      .equals([channelId, playlistId])
      .delete();
  }

  // Check if a channel is in favorites
  async isChannelFavorite(channelId: string, playlistId: number): Promise<boolean> {
    const count = await this.favorites
      .where('[channelId+playlistId]')
      .equals([channelId, playlistId])
      .count();
    return count > 0;
  }

  // Get all favorite channels for a playlist
  async getFavoriteChannels(playlistId: number, page = 0, pageSize = 100): Promise<IChannel[]> {
    const offset = page * pageSize;
    
    // First get favorite channel IDs
    const favorites = await this.favorites
      .where('playlistId')
      .equals(playlistId)
      .toArray();
    
    const channelIds = favorites.map(f => f.channelId);
    
    if (channelIds.length === 0) {
      return [];
    }
    
    // Get the channels in batches
    const BATCH_SIZE = 100;
    let allChannels: IChannel[] = [];
    
    for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
      const batchIds = channelIds.slice(i, i + BATCH_SIZE);
      const batchChannels = await this.channels
        .where('id')
        .anyOf(batchIds)
        .and(channel => channel.playlistId === playlistId)
        .toArray();
      
      allChannels = allChannels.concat(batchChannels);
    }
    
    // Apply pagination
    return allChannels.slice(offset, offset + pageSize);
  }
  
  // Get count of favorite channels
  async getFavoriteChannelCount(playlistId: number): Promise<number> {
    return await this.favorites
      .where('playlistId')
      .equals(playlistId)
      .count();
  }

  // Search channels by name or group with pagination and optimized for large datasets
  async searchChannels(term: string, playlistId?: number, page = 0, pageSize = 100): Promise<{results: IChannel[], total: number}> {
    const lowercaseTerm = term.toLowerCase().trim();
    if (!lowercaseTerm) {
      return {results: [], total: 0};
    }
    
    // Create word-based search by splitting search term into words
    const searchWords = lowercaseTerm.split(/\s+/).filter(word => word.length > 1);
    
    // Calculate offset for pagination
    const offset = page * pageSize;
    const limit = pageSize;
    
    // Use a more performant approach based on whether we have a single word or multiple words
    const isSingleWordSearch = searchWords.length <= 1;
    const searchTerm = isSingleWordSearch ? lowercaseTerm : searchWords[0];
    
    try {
      // First, we'll count total matches to support pagination
      let totalCount = 0;
      
      // PHASE 1: Search channels by name (limited to first 20 characters for performance on prefix)
      // We'll use startsWith for better performance when possible
      let nameQuery;
      
      if (playlistId !== undefined) {
        // Start with playlist filter first (efficient - uses index)
        if (searchTerm.length >= 3) {
          // Create a compound Collection that performs OR between startsWith and includes
          // This prioritizes prefix matches (very fast) but still catches others
          nameQuery = this.channels
            .where('playlistId')
            .equals(playlistId)
            .filter(channel => {
              const name = channel.name.toLowerCase();
              
              if (isSingleWordSearch) {
                // Single word - check if name starts with or includes the term
                return name.startsWith(searchTerm) || name.includes(searchTerm);
              } else {
                // Multiple words - check if ALL words are in the name
                return searchWords.every(word => name.includes(word));
              }
            });
        } else {
          // For very short terms, we need more precise matching to avoid too many results
          nameQuery = this.channels
            .where('playlistId')
            .equals(playlistId)
            .filter(channel => channel.name.toLowerCase().includes(searchTerm));
        }
      } else {
        // If no playlist specified, search all channels
        nameQuery = this.channels
          .filter(channel => {
            const name = channel.name.toLowerCase();
            
            if (isSingleWordSearch) {
              return name.startsWith(searchTerm) || name.includes(searchTerm);
            } else {
              return searchWords.every(word => name.includes(word));
            }
          });
      }
      
      // Get total count first
      totalCount = await nameQuery.count();
      
      // Then get paginated results
      const nameMatches = await nameQuery
        .offset(offset)
        .limit(limit)
        .toArray();
      
      // If we have enough results for this page or it's the last query of multiple queries,
      // return them without running the more expensive group search
      if (nameMatches.length >= pageSize) {
        return {results: nameMatches, total: totalCount};
      }
      
      // PHASE 2: If we need more results, search for matching groups
      // But only if we have room for more results on this page
      const remainingSlots = pageSize - nameMatches.length;
      
      // We'll only do the group search if:
      // 1. We have space for more results in this page
      // 2. We're either on the first page OR we've exhausted name matches
      if (remainingSlots > 0 && (page === 0 || nameMatches.length < pageSize)) {
        // Search for matching groups
        let matchingGroups;
        
        if (playlistId !== undefined) {
          matchingGroups = await this.groups
            .where('playlistId')
            .equals(playlistId)
            .filter(group => group.name.toLowerCase().includes(lowercaseTerm))
            .toArray();
        } else {
          matchingGroups = await this.groups
            .filter(group => group.name.toLowerCase().includes(lowercaseTerm))
            .toArray();
        }
        
        if (matchingGroups.length > 0) {
          // Get the group IDs
          const groupIds = matchingGroups.map(g => g.id!);
          
          // Get channel IDs for these groups
          let channelIds: string[] = [];
          
          // Process in smaller batches if there are many group IDs to prevent performance issues
          const BATCH_SIZE = 50;
          for (let i = 0; i < groupIds.length; i += BATCH_SIZE) {
            const batchIds = groupIds.slice(i, i + BATCH_SIZE);
            const batchChannelAssociations = await this.channelGroups
              .where('groupId')
              .anyOf(batchIds)
              .toArray();
            
            // Add the channel IDs from this batch
            channelIds = channelIds.concat(batchChannelAssociations.map(a => a.channelId));
            
            // If we've already found enough channel IDs, we can stop
            if (channelIds.length > pageSize * 3) break;
          }
          
          // Remove duplicates
          channelIds = Array.from(new Set(channelIds));
          
          if (channelIds.length > 0) {
            
            if (playlistId !== undefined) {
              // We'll process in smaller batches if there are many channel IDs
              const existingIds = new Set(nameMatches.map(c => c.id));
              let groupMatches: IChannel[] = [];
              
              // Process in smaller batches
              for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
                const batchIds = channelIds.slice(i, i + BATCH_SIZE);
                
                const batchMatches = await this.channels
                  .where('playlistId')
                  .equals(playlistId)
                  .and(channel => batchIds.includes(channel.id))
                  .filter(channel => !existingIds.has(channel.id))  // Skip channels we already have
                  .toArray();
                
                groupMatches = groupMatches.concat(batchMatches);
                
                // Add new IDs to our tracking set
                batchMatches.forEach(c => existingIds.add(c.id));
                
                // If we have enough matches with the name results, we can stop
                if (nameMatches.length + groupMatches.length >= limit) break;
              }
              
              // Count total group matches for pagination info
              const groupMatchCount = await this.channels
                .where('playlistId')
                .equals(playlistId)
                .and(channel => channelIds.includes(channel.id))
                .count();
              
              // Add group matches to our total count, but remove duplicates
              const duplicateCount = await this.channels
                .where('playlistId')
                .equals(playlistId)
                .and(channel => channelIds.includes(channel.id) && existingIds.has(channel.id))
                .count();
                
              totalCount += (groupMatchCount - duplicateCount);
              
              // Combine results - we've already filtered out duplicates during the batch process
              const combinedResults = nameMatches.concat(groupMatches.slice(0, remainingSlots));
              
              return {results: combinedResults, total: totalCount};
            } else {
              // Similar approach for when no playlist is specified
              const existingIds = new Set(nameMatches.map(c => c.id));
              let groupMatches: IChannel[] = [];
              
              for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
                const batchIds = channelIds.slice(i, i + BATCH_SIZE);
                
                const batchMatches = await this.channels
                  .where('id')
                  .anyOf(batchIds)
                  .filter(channel => !existingIds.has(channel.id))
                  .toArray();
                
                groupMatches = groupMatches.concat(batchMatches);
                
                // Add new IDs to our tracking set
                batchMatches.forEach(c => existingIds.add(c.id));
                
                // If we have enough matches with the name results, we can stop
                if (nameMatches.length + groupMatches.length >= limit) break;
              }
              
              // Count total group matches for pagination info
              const groupMatchCount = await this.channels
                .where('id')
                .anyOf(channelIds)
                .count();
              
              // Add group matches to our total count, but remove duplicates
              const duplicateCount = await this.channels
                .where('id')
                .anyOf(channelIds)
                .and(channel => existingIds.has(channel.id))
                .count();
                
              totalCount += (groupMatchCount - duplicateCount);
              
              // Combine results
              const combinedResults = nameMatches.concat(groupMatches.slice(0, remainingSlots));
              
              return {results: combinedResults, total: totalCount};
            }
          }
        }
      }
      
      // If we get here, we only have name matches
      return {results: nameMatches, total: totalCount};
      
    } catch (error) {
      console.error('Error in search:', error);
      return {results: [], total: 0};
    }
  }
  async updateExistingPlaylist(
    id: number,
    content: string,
    name: string,
    url?: string
  ): Promise<number> {
    console.log(`Updating existing playlist #${id}: ${name}`);
    
    // Update the playlist entry
    await this.playlists.update(id, {
      name,
      content,
      lastUsed: new Date(),
      url
    });
    
    // Process the content - this will clear existing data and add new data
    await this.parseM3UContent(content, id);
    
    // Return the ID that was updated
    return id;
  };

  async getPlaylistName(id: number) {
    const playlist = await this.playlists.get(id);
    return playlist?.name
  }
}

// Create a database instance
const db = new IPTVDatabase();

export default db;
export { db };