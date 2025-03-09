import { pb } from '../lib/pocketbase';
import { 
  Playlist, 
  Channel, 
  Group, 
  ChannelGroup, 
  Favorite, 
  GroupOrder 
} from '../types/pocketbase-types';

interface M3UChannelInfo {
  name: string;
  tvgId?: string;
  tvgName?: string;
  logo: string;
  group: string;
  playlist: string;
}

interface ChannelGroupAssociation {
  channelId: string;
  groupNames: string[];
}

// Ensure user is authenticated, throw error if not
function ensureAuthenticated() {
  if (!pb.authStore.isValid || !pb.authStore.record?.id) {
    throw new Error('User is not authenticated');
  }
  return pb.authStore.record.id;
}

export const playlistService = {
  // Create a new playlist
  async createPlaylist(name: string, content: string, url: string | null = null): Promise<Playlist> {
    const userId = ensureAuthenticated();
    
    return await pb.collection('playlists').create({
      name,
      lastUsed: new Date().toISOString(),
      url,
      user: userId,
    }) as Playlist;
  },
  
  // Get all playlists for current user
  async getPlaylists(): Promise<Playlist[]> {
    const userId = ensureAuthenticated();
    
    const records = await pb.collection('playlists').getFullList({
      filter: `user="${userId}"`,
      sort: '-lastUsed',
    });
    return records as Playlist[];
  },
  
  // Get a single playlist
  async getPlaylist(id: string): Promise<Playlist> {
    // PocketBase will enforce the access rule
    return await pb.collection('playlists').getOne(id) as Playlist;
  },
  
  // Update last used timestamp
  async updatePlaylistUsage(id: string): Promise<Playlist> {
    // Check if the user owns this playlist first 
    await this.getPlaylist(id); // Will throw if not accessible
    
    return await pb.collection('playlists').update(id, {
      lastUsed: new Date().toISOString(),
    }) as Playlist;
  },
  
  // Delete a playlist
  async deletePlaylist(id: string): Promise<boolean> {
    // Check if the user owns this playlist first
    await this.getPlaylist(id); // Will throw if not accessible
    
    return await pb.collection('playlists').delete(id);
  },

  // Update existing playlist
  async updatePlaylist(id: string, name: string, content: string, url: string | null = null): Promise<Playlist> {
    // Check if the user owns this playlist first
    await this.getPlaylist(id); // Will throw if not accessible
    
    return await pb.collection('playlists').update(id, {
      name,
      content,
      lastUsed: new Date().toISOString(),
      url,
    }) as Playlist;
  }
};

export const channelService = {
  // Create a channel
  async createChannel(channelData: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>): Promise<Channel> {
    // Verify playlist ownership is already handled by PocketBase rules
    return await pb.collection('channels').create(channelData) as Channel;
  },
  
  // Create multiple channels (batch)
  async createChannels(channels: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>[]): Promise<Channel[]> {
    // PocketBase doesn't have a bulkCreate, so we'll create them one by one
    const results: Channel[] = [];
    for (const channel of channels) {
      try {
        const result = await pb.collection('channels').create(channel) as Channel;
        results.push(result);
      } catch (err) {
        console.error('Error creating channel:', err);
      }
    }
    return results;
  },
  
  // Get channels by playlist
  async getChannelsByPlaylist(playlistId: string, page: number = 1, perPage: number = 100): Promise<{
    items: Channel[];
    totalItems: number;
    totalPages: number;
  }> {
    // PocketBase will enforce access rules
    const response = await pb.collection('channels').getList(page, perPage, {
      filter: `playlist="${playlistId}"`,
    });
    return {
      items: response.items as Channel[],
      totalItems: response.totalItems,
      totalPages: response.totalPages
    };
  },
  
  // Get channels by group
  async getChannelsByGroup(groupId: string, page: number = 1, perPage: number = 100): Promise<Channel[]> {
    // PocketBase will enforce access rules through expand
    const channelGroups = await pb.collection('channel_groups').getFullList({
      filter: `group="${groupId}"`,
      expand: 'channel',
    }) as (ChannelGroup & { expand: { channel: Channel } })[];
    
    // Extract the channels from the expanded data
    return channelGroups.map(cg => cg.expand.channel);
  },
  
  // Search channels
  async searchChannels(term: string, playlistId?: string, page: number = 1, perPage: number = 100): Promise<{
    items: Channel[];
    totalItems: number;
    totalPages: number;
  }> {
    const userId = ensureAuthenticated();
    let filter = '';
    
    if (playlistId) {
      // Search within a specific playlist
      filter = `playlist="${playlistId}" && (name~"${term}" || group~"${term}")`;
    } else {
      // Search across all playlists owned by the user
      filter = `playlist.user.id="${userId}" && (name~"${term}" || group~"${term}")`;
    }
    
    const response = await pb.collection('channels').getList(page, perPage, {
      filter,
    });
    
    return {
      items: response.items as Channel[],
      totalItems: response.totalItems,
      totalPages: response.totalPages
    };
  }
};

export const groupService = {
  // Create a group
  async createGroup(name: string, playlistId: string): Promise<Group> {
    // Verify the user owns the playlist - handled by PocketBase rules
    return await pb.collection('groups').create({
      name,
      playlist: playlistId,
    }) as Group;
  },
  
  // Get groups by playlist
  async getGroupsByPlaylist(playlistId: string): Promise<Group[]> {
    // PocketBase will enforce access rules
    const records = await pb.collection('groups').getFullList({
      filter: `playlist="${playlistId}"`,
    });
    return records as Group[];
  },
  
  // Save group order
  async saveGroupOrder(groups: string[], playlistId: string): Promise<GroupOrder> {
    // PocketBase will enforce playlist ownership rules
    
    // Check if an order already exists
    const existing = await pb.collection('group_order').getList(1, 1, {
      filter: `playlist="${playlistId}"`,
    });
    
    if (existing.items.length > 0) {
      // Update existing order
      return await pb.collection('group_order').update(existing.items[0].id, {
        groups,
        playlist: playlistId,
      }) as GroupOrder;
    } else {
      // Create new order
      return await pb.collection('group_order').create({
        groups,
        playlist: playlistId,
      }) as GroupOrder;
    }
  },
  
  // Get group order
  async getGroupOrder(playlistId: string): Promise<string[] | null> {
    // PocketBase will enforce access rules
    const order = await pb.collection('group_order').getList(1, 1, {
      filter: `playlist="${playlistId}"`,
    });
    
    return order.items.length > 0 ? (order.items[0] as GroupOrder).groups : null;
  }
};

export const favoriteService = {
  // Add a channel to favorites
  async addFavorite(channelId: string, playlistId: string): Promise<Favorite> {
    const userId = ensureAuthenticated();
    
    return await pb.collection('favorites').create({
      channel: channelId,
      playlist: playlistId,
      user: userId,
    }) as Favorite;
  },
  
  // Remove a channel from favorites
  async removeFavorite(channelId: string, playlistId: string): Promise<boolean> {
    const userId = ensureAuthenticated();
    
    // Find the favorite first
    const favorites = await pb.collection('favorites').getList(1, 1, {
      filter: `channel="${channelId}" && playlist="${playlistId}" && user="${userId}"`,
    });
    
    if (favorites.items.length > 0) {
      return await pb.collection('favorites').delete(favorites.items[0].id);
    }
    
    return false;
  },
  
  // Check if channel is favorite
  async isChannelFavorite(channelId: string, playlistId: string): Promise<boolean> {
    const userId = ensureAuthenticated();
    
    const count = await pb.collection('favorites').getList(1, 1, {
      filter: `channel="${channelId}" && playlist="${playlistId}" && user="${userId}"`,
    });
    
    return count.items.length > 0;
  },
  
  async getFavoriteChannels(playlistId: string, page: number = 1, perPage: number = 100): Promise<Channel[]> {
    const userId = ensureAuthenticated();
    
    // First get the list result
    const result = await pb.collection('favorites').getList(page, perPage, {
      filter: `playlist="${playlistId}" && user="${userId}"`,
      expand: 'channel',
    });
    
    // Now map over the items and extract the expanded channel
    return result.items.map(item => {
      // Make sure expand exists and has a channel property
      if (item.expand && 'channel' in item.expand) {
        return item.expand.channel as Channel;
      }
      return null;
    }).filter((channel): channel is Channel => channel !== null); // Filter out nulls with type guard
  }
}

// Helper to parse M3U content
export const parseM3UContent = async (content: string, playlistId: string): Promise<number> => {
  const userId = ensureAuthenticated();
  
  // Verify playlist ownership first
  await playlistService.getPlaylist(playlistId);
  
  const channels: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>[] = [];
  const groupNames = new Set<string>();
  const channelGroups: ChannelGroupAssociation[] = [];
  
  const lines = content.split(/\r?\n/);
  let channelInfo: Partial<M3UChannelInfo> | null = null;
  let currentGroup = '';
  let currentGroups: string[] = [];
  
  // Parse channels and groups from M3U content
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or EXTM3U line
    if (!line || line === '#EXTM3U') continue;
    
    // Process EXTGRP
    if (line.startsWith('#EXTGRP:')) {
      currentGroup = line.substring(8).trim();
      if (currentGroup) {
        groupNames.add(currentGroup);
        currentGroups = [currentGroup];
      }
      continue;
    }
    
    // Parse channel info
    if (line.startsWith('#EXTINF:')) {
      // Extract attributes
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      
      // Extract name
      const lastCommaIndex = line.lastIndexOf(',');
      let name = '';
      if (lastCommaIndex !== -1) {
        name = line.substring(lastCommaIndex + 1).trim();
      }
      
      // Handle groups
      let primaryGroup = 'Ungrouped';
      currentGroups = [];
      
      if (groupMatch && groupMatch[1]) {
        const groups = groupMatch[1].split(';');
        
        groups.forEach(g => {
          const trimmedGroup = g.trim();
          if (trimmedGroup) {
            groupNames.add(trimmedGroup);
            currentGroups.push(trimmedGroup);
          }
        });
        
        if (currentGroups.length > 0) {
          primaryGroup = currentGroups[0];
        }
      } else if (currentGroup) {
        primaryGroup = currentGroup;
        currentGroups = [currentGroup];
      }
      
      // Store channel info
      channelInfo = {
        name,
        tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
        tvgName: tvgNameMatch ? tvgNameMatch[1] : '',
        logo: logoMatch ? logoMatch[1] : '',
        group: primaryGroup,
        playlist: playlistId
      };
    }
    // Parse URL line
    else if (channelInfo && !line.startsWith('#') && line.trim()) {
      const url = line.trim();
      
      // Extract file path from URL for ID
      const id = extractIdFromUrl(url);
      
      // Create channel object
      const channel = {
        name: channelInfo.name,
        url,
        logo: channelInfo.logo || '',
        group: channelInfo.group,
        tvgId: channelInfo.tvgId || '',
        tvgName: channelInfo.tvgName || '',
        playlist: playlistId
      };
      
      channels.push(channel);
      
      // Remember channel-group associations
      if (currentGroups.length > 0) {
        channelGroups.push({
          channelId: id,
          groupNames: [...currentGroups]
        });
      }
      
      // Reset
      channelInfo = null;
    }
  }
  
  // First, clear existing channels for this playlist
  const existingChannels = await pb.collection('channels').getFullList({
    filter: `playlist="${playlistId}"`,
  });
  
  for (const channel of existingChannels) {
    await pb.collection('channels').delete(channel.id);
  }
  
  // Create the groups
  // Process them sequentially to maintain order
  const groupMap = new Map<string, string>();
  groupNames.forEach(async (groupName) => {
    try {
      const group = await groupService.createGroup(groupName, playlistId);
      groupMap.set(groupName, group.id);
    } catch (error) {
      console.error(`Error creating group ${groupName}:`, error);
    }
  });
  
  // Save the group order
  await groupService.saveGroupOrder(Array.from(groupNames), playlistId);
  
  // Create the channels
  for (const channel of channels) {
    try {
      const savedChannel = await channelService.createChannel(channel);
      
      // Find the channel-group associations
      const association = channelGroups.find(cg => cg.channelId === extractIdFromUrl(channel.url));
      if (association) {
        for (const groupName of association.groupNames) {
          const groupId = groupMap.get(groupName);
          if (groupId) {
            // Create channel-group association
            await pb.collection('channel_groups').create({
              channel: savedChannel.id,
              group: groupId
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error creating channel ${channel.name}:`, error);
    }
  }
  
  return channels.length;
};

// Helper function to extract ID from URL
const extractIdFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      return pathParts.join('/');
    }
  } catch (e) {
    console.warn(`Failed to parse URL for ID extraction: ${url}`);
  }
  
  return url;
};