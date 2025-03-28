import { pb } from '../lib/pocketbase';
import { Channel, Favorite } from '../types/pocketbase-types';
import { coreService } from './core';

export const favoriteService = {
  async addToFavorites(channelId: string, playlistId: string): Promise<Favorite> {
    return await pb.collection('favorites').create({
      channel: channelId,
      playlist: playlistId,
      user: coreService.getCurrentUserId(),
    }) as Favorite;
  },

  async removeFromFavorites(channelId: string, playlistId: string): Promise<boolean> {
    const favorites = await coreService.getList<Favorite>('favorites', 1, 1, 
      `channel="${channelId}" && playlist="${playlistId}"`);

    if (favorites.items.length > 0) {
      return await pb.collection('favorites').delete(favorites.items[0].id);
    }
    return false;
  },

  async isChannelFavorite(channelId: string, playlistId: string): Promise<boolean> {
    const count = await coreService.getList<Favorite>('favorites', 1, 1, 
      `channel="${channelId}" && playlist="${playlistId}"`);
    return count.items.length > 0;
  },

  async getFavoriteChannels(playlistId: string, page = 1, perPage = 100): Promise<Channel[]> {
    const result = await coreService.getList<any>('favorites', page, perPage, 
      `playlist="${playlistId}"`, 'channel');

    return result.items
      .map(item => item.expand?.channel as Channel || null)
      .filter((channel): channel is Channel => channel !== null);
  },

  async getFavoriteChannelCount(playlistId: string): Promise<number> {
    const result = await coreService.getList<Favorite>('favorites', 1, 1, 
      `playlist="${playlistId}"`);
    return result.totalItems;
  }
};