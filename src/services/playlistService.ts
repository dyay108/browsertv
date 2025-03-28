import { pb } from '../lib/pocketbase';
import { Playlist } from '../types/pocketbase-types';
import { coreService } from './core';

export const playlistService = {
  async createPlaylist(name: string, url: string | null = null): Promise<Playlist> {
    return await pb.collection('playlists').create({
      name,
      lastUsed: new Date().toISOString(),
      url,
      user: coreService.getCurrentUserId(),
    }) as Playlist;
  },

  async getPlaylists(): Promise<Playlist[]> {
    // PocketBase rules enforce that users can only see their own playlists
    return coreService.getFullList<Playlist>('playlists', undefined, '-lastUsed');
  },

  async getPlaylist(id: string): Promise<Playlist> {
    return await pb.collection('playlists').getOne(id) as Playlist;
  },

  async updatePlaylistUsage(id: string): Promise<Playlist> {
    return await pb.collection('playlists').update(id, {
      lastUsed: new Date().toISOString(),
    }) as Playlist;
  },

  async deletePlaylist(id: string): Promise<boolean> {
    return await pb.collection('playlists').delete(id);
  },

  async updatePlaylist(id: string, name: string, url: string | null = null): Promise<Playlist> {
    return await pb.collection('playlists').update(id, {
      name,
      lastUsed: new Date().toISOString(),
      url,
    }) as Playlist;
  }
};