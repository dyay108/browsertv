import { pb } from '../lib/pocketbase';
import { Channel } from '../types/pocketbase-types';
import { coreService, PaginatedResponse, SearchResponse } from './core';

export const channelService = {
  async createChannel(channelData: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>): Promise<Channel> {
    return await pb.collection('channels').create(channelData) as Channel;
  },

  async createChannels(channels: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>[]): Promise<Channel[]> {
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

  async getChannelsByPlaylist(playlistId: string, page = 1, perPage = 100): Promise<PaginatedResponse<Channel>> {
    return coreService.getList<Channel>('channels', page, perPage, `playlist="${playlistId}"`);
  },

  async getChannelsByGroup(groupId: string, page = 1, perPage = 100): Promise<PaginatedResponse<Channel>> {
    const response = await coreService.getList<any>('channel_groups', page, perPage, `group="${groupId}"`, 'channel');

    const items = response.items
      .map(item => item.expand?.channel as Channel || null)
      .filter((channel): channel is Channel => channel !== null);

    return {
      items,
      totalItems: response.totalItems,
      totalPages: response.totalPages
    };
  },

  async searchChannels(term: string, playlistId?: string, page = 1, perPage = 100): Promise<SearchResponse<Channel>> {
    const filter = playlistId
      ? `playlist="${playlistId}" && (name~"${term}" || group~"${term}")`
      : `name~"${term}" || group~"${term}"`;

    const response = await coreService.getList<Channel>('channels', page, perPage, filter);
    
    return {
      results: response.items,
      total: response.totalItems
    };
  }
};