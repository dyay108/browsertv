import { pb } from '../lib/pocketbase';
import { Group, GroupOrder } from '../types/pocketbase-types';
import { coreService, RequestOptions } from './core';

export const groupService = {
  async createGroup(
    name: string, 
    playlistId: string,
    options?: RequestOptions
  ): Promise<Group> {
    // Generate a unique request key for cancellation
    const requestKey = options?.signal ? `create_group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    // Setup cancellation handler if signal is provided
    if (requestKey && options?.signal) {
      options.signal.addEventListener('abort', () => {
        // Cancel the request when signal is aborted
        pb.cancelRequest(requestKey);
      });
    }
    
    return await pb.collection('groups').create({
      name,
      playlist: playlistId,
    }, {
      requestKey,
    }) as Group;
  },

  async getGroupsByPlaylist(
    playlistId: string,
    options?: RequestOptions
  ): Promise<Group[]> {
    return coreService.getFullList<Group>(
      'groups', 
      `playlist="${playlistId}"`,
      undefined,
      options
    );
  },

  async saveGroupOrder(
    groups: string[], 
    playlistId: string,
    options?: RequestOptions
  ): Promise<GroupOrder> {
    const existing = await coreService.getList<GroupOrder>(
      'group_order', 
      1, 
      1, 
      `playlist="${playlistId}"`,
      undefined,
      options
    );

    if (existing.items.length > 0 && !options?.signal?.aborted) {
      // Generate a unique request key for update operation
      const requestKey = options?.signal ? `update_group_order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
      
      // Setup cancellation handler if signal is provided
      if (requestKey && options?.signal) {
        options.signal.addEventListener('abort', () => {
          // Cancel the request when signal is aborted
          pb.cancelRequest(requestKey);
        });
      }
      
      return await pb.collection('group_order').update(existing.items[0].id, {
        groups,
        playlist: playlistId,
      }, {
        requestKey,
      }) as GroupOrder;
    } else if (!options?.signal?.aborted) {
      // Generate a unique request key for create operation
      const requestKey = options?.signal ? `create_group_order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;
      
      // Setup cancellation handler if signal is provided
      if (requestKey && options?.signal) {
        options.signal.addEventListener('abort', () => {
          // Cancel the request when signal is aborted
          pb.cancelRequest(requestKey);
        });
      }
      
      return await pb.collection('group_order').create({
        groups,
        playlist: playlistId,
      }, {
        requestKey,
      }) as GroupOrder;
    } else {
      // Return a placeholder if the operation was aborted
      return { id: '', groups, playlist: playlistId } as GroupOrder;
    }
  },

  async getGroupOrder(
    playlistId: string,
    options?: RequestOptions
  ): Promise<string[] | null> {
    const order = await coreService.getList<GroupOrder>(
      'group_order', 
      1, 
      1, 
      `playlist="${playlistId}"`,
      undefined,
      options
    );
    return order.items.length > 0 ? order.items[0].groups : null;
  }
};