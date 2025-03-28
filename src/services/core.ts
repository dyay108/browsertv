import { pb } from '../lib/pocketbase';

export interface PaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
}

// Core service helper functions
export const coreService = {
  getCurrentUserId(): string | undefined {
    return pb.authStore.record?.id;
  },
  
  async getList<T>(collection: string, page = 1, perPage = 100, filter?: string, expand?: string): Promise<PaginatedResponse<T>> {
    const response = await pb.collection(collection).getList(page, perPage, {
      filter,
      expand,
    });
    
    return {
      items: response.items as T[],
      totalItems: response.totalItems,
      totalPages: response.totalPages
    };
  },
  
  async getFullList<T>(collection: string, filter?: string, sort?: string): Promise<T[]> {
    const records = await pb.collection(collection).getFullList({
      filter,
      sort,
    });
    return records as T[];
  }
};