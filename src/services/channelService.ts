import { pb } from '../lib/pocketbase';
import { Channel } from '../types/pocketbase-types';
import { coreService, PaginatedResponse, RequestOptions, SearchResponse } from './core';

export const channelService = {
  async createChannel(
    channelData: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>,
    options?: RequestOptions
  ): Promise<Channel> {
    // Generate a unique request key for cancellation
    const requestKey = options?.signal ? `create_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Setup cancellation handler if signal is provided
    if (requestKey && options?.signal) {
      options.signal.addEventListener('abort', () => {
        // Cancel the request when signal is aborted
        pb.cancelRequest(requestKey);
      });
    }
    
    return await pb.collection('channels').create(channelData, {
      requestKey,
    }) as Channel;
  },

  async createChannels(
    channels: Omit<Channel, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName'>[],
    options?: RequestOptions
  ): Promise<Channel[]> {
    const results: Channel[] = [];
    for (const channel of channels) {
      if (options?.signal?.aborted) break;
      
      try {
        // Generate a unique request key for each channel creation
        const requestKey = options?.signal ? `create_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
        
        // Setup cancellation handler if signal is provided
        if (requestKey && options?.signal) {
          const abortHandler = () => {
            // Cancel the request when signal is aborted
            pb.cancelRequest(requestKey);
          };
          
          options.signal.addEventListener('abort', abortHandler);
          
          const result = await pb.collection('channels').create(channel, {
            requestKey,
          }) as Channel;
          
          // Clean up event listener after request completes
          options.signal.removeEventListener('abort', abortHandler);
          
          results.push(result);
        } else {
          // No cancellation needed
          const result = await pb.collection('channels').create(channel) as Channel;
          results.push(result);
        }
      } catch (err) {
        if (!options?.signal?.aborted) {
          console.error('Error creating channel:', err);
        }
      }
    }
    return results;
  },

  async getChannelsByPlaylist(
    playlistId: string, 
    page = 1, 
    perPage = 100,
    options?: RequestOptions
  ): Promise<PaginatedResponse<Channel>> {
    return coreService.getList<Channel>(
      'channels', 
      page, 
      perPage, 
      `playlist="${playlistId}"`,
      undefined,
      options
    );
  },

  async getChannelsByGroup(
    groupId: string, 
    page = 1, 
    perPage = 100,
    options?: RequestOptions
  ): Promise<PaginatedResponse<Channel>> {
    const response = await coreService.getList<any>(
      'channel_groups', 
      page, 
      perPage, 
      `group="${groupId}"`, 
      'channel',
      options
    );

    const items = response.items
      .map(item => item.expand?.channel as Channel || null)
      .filter((channel): channel is Channel => channel !== null);

    return {
      items,
      totalItems: response.totalItems,
      totalPages: response.totalPages
    };
  },

  async searchChannels(
    term: string, 
    playlistId?: string, 
    page = 1, 
    perPage = 100,
    options?: RequestOptions
  ): Promise<SearchResponse<Channel>> {
    const filter = playlistId
      ? `playlist="${playlistId}" && (name~"${term}" || group~"${term}")`
      : `name~"${term}" || group~"${term}"`;

    const response = await coreService.getList<Channel>(
      'channels', 
      page, 
      perPage, 
      filter,
      undefined,
      options
    );
    
    return {
      results: response.items,
      total: response.totalItems
    };
  }
};