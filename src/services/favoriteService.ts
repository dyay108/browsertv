import { pb } from '../lib/pocketbase';
import { Channel } from '../types/pocketbase-types';
import { coreService, RequestOptions } from './core';

export const favoriteService = {
  async addToFavorites(
    channelId: string, 
    playlistId: string,
    options?: RequestOptions
  ): Promise<boolean> {
    // Generate a unique request key for cancellation
    const requestKey = options?.signal ? `update_favorite_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Setup cancellation handler if signal is provided
    if (requestKey && options?.signal) {
      options.signal.addEventListener('abort', () => {
        // Cancel the request when signal is aborted
        pb.cancelRequest(requestKey);
      });
    }
    
    // Update the channel's favorite field to true
    try {
      await pb.collection('channels').update(channelId, {
        favorite: true
      }, {
        requestKey
      });
      return true;
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }
  },

  async removeFromFavorites(
    channelId: string,
    options?: RequestOptions
  ): Promise<boolean> {
    // Generate a unique request key for cancellation
    const requestKey = options?.signal ? `update_favorite_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Setup cancellation handler if signal is provided
    if (requestKey && options?.signal) {
      options.signal.addEventListener('abort', () => {
        // Cancel the request when signal is aborted
        pb.cancelRequest(requestKey);
      });
    }
    
    // Update the channel's favorite field to false
    try {
      await pb.collection('channels').update(channelId, {
        favorite: false
      }, {
        requestKey
      });
      return true;
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }
  },

  async getFavoriteChannels(
    playlistId: string, 
    page = 1, 
    perPage = 100,
    options?: RequestOptions
  ): Promise<Channel[]> {
    return await coreService.getList<Channel>(
      'channels', 
      page, 
      perPage, 
      `playlist="${playlistId}" && favorite=true`, 
      undefined,
      options
    ).then(result => result.items);
  },

  async getFavoriteChannelCount(
    playlistId: string,
    options?: RequestOptions
  ): Promise<number> {
    const result = await coreService.getList<Channel>(
      'channels', 
      1, 
      1, 
      `playlist="${playlistId}" && favorite=true`,
      undefined,
      options
    );
    return result.totalItems;
  }
};