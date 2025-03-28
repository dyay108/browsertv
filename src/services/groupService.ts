import { pb } from '../lib/pocketbase';
import { Group, GroupOrder } from '../types/pocketbase-types';
import { coreService } from './core';

export const groupService = {
  async createGroup(name: string, playlistId: string): Promise<Group> {
    return await pb.collection('groups').create({
      name,
      playlist: playlistId,
    }) as Group;
  },

  async getGroupsByPlaylist(playlistId: string): Promise<Group[]> {
    return coreService.getFullList<Group>('groups', `playlist="${playlistId}"`);
  },

  async saveGroupOrder(groups: string[], playlistId: string): Promise<GroupOrder> {
    const existing = await coreService.getList<GroupOrder>('group_order', 1, 1, `playlist="${playlistId}"`);

    if (existing.items.length > 0) {
      return await pb.collection('group_order').update(existing.items[0].id, {
        groups,
        playlist: playlistId,
      }) as GroupOrder;
    } else {
      return await pb.collection('group_order').create({
        groups,
        playlist: playlistId,
      }) as GroupOrder;
    }
  },

  async getGroupOrder(playlistId: string): Promise<string[] | null> {
    const order = await coreService.getList<GroupOrder>('group_order', 1, 1, `playlist="${playlistId}"`);
    return order.items.length > 0 ? order.items[0].groups : null;
  }
};