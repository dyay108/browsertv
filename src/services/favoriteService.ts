import { pb } from '../lib/pocketbase';
import { Channel, Favorite } from '../types/pocketbase-types';
import { coreService, RequestOptions } from './core';

export const favoriteService = {
  async addToFavorites(
    channelId: string, 
    playlistId: string,
    options?: RequestOptions
  ): Promise<Favorite> {
    // Generate a unique request key for cancellation
    const requestKey = options?.signal ? `add_favorite_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Setup cancellation handler if signal is provided
    if (requestKey && options?.signal) {
      options.signal.addEventListener('abort', () => {
        // Cancel the request when signal is aborted
        pb.cancelRequest(requestKey);
      });
    }
    
    return await pb.collection('favorites').create({
      channel: channelId,
      playlist: playlistId,
      user: coreService.getCurrentUserId(),
    }, {
      requestKey,
    }) as Favorite;
  },

  async removeFromFavorites(
    channelId: string, 
    playlistId: string,
    options?: RequestOptions
  ): Promise<boolean> {
    const favorites = await coreService.getList<Favorite>(
      'favorites', 
      1, 
      1, 
      `channel="${channelId}" && playlist="${playlistId}"`,
      undefined,
      options
    );

    if (favorites.items.length > 0 && !options?.signal?.aborted) {
      // Generate a unique request key for cancellation
      const requestKey = options?.signal ? `delete_favorite_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
      
      // Setup cancellation handler if signal is provided
      if (requestKey && options?.signal) {
        options.signal.addEventListener('abort', () => {
          // Cancel the request when signal is aborted
          pb.cancelRequest(requestKey);
        });
      }
      
      return await pb.collection('favorites').delete(favorites.items[0].id, {
        requestKey,
      });
    }
    return false;
  },

  async isChannelFavorite(
    channelId: string, 
    playlistId: string,
    options?: RequestOptions
  ): Promise<boolean> {
    const count = await coreService.getList<Favorite>(
      'favorites', 
      1, 
      1, 
      `channel="${channelId}" && playlist="${playlistId}"`,
      undefined,
      options
    );
    return count.items.length > 0;
  },

  async getFavoriteChannels(
    playlistId: string, 
    page = 1, 
    perPage = 100,
    options?: RequestOptions
  ): Promise<Channel[]> {
    const result = await coreService.getList<any>(
      'favorites', 
      page, 
      perPage, 
      `playlist="${playlistId}"`, 
      'channel',
      options
    );

    return result.items
      .map(item => item.expand?.channel as Channel || null)
      .filter((channel): channel is Channel => channel !== null);
  },

  async getFavoriteChannelCount(
    playlistId: string,
    options?: RequestOptions
  ): Promise<number> {
    const result = await coreService.getList<Favorite>(
      'favorites', 
      1, 
      1, 
      `playlist="${playlistId}"`,
      undefined,
      options
    );
    return result.totalItems;
  }
};