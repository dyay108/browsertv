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

// RequestOptions interface for passing AbortSignal and other options
// Options interface for requests with cancellation support
export interface RequestOptions {
  signal?: AbortSignal;
  [key: string]: any;
}

// Generate a unique request key for PocketBase cancellation
function getRequestKey(signal?: AbortSignal): string | undefined {
  if (!signal) return undefined;
  return `request_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Core service helper functions
export const coreService = {
  getCurrentUserId(): string | undefined {
    return pb.authStore.record?.id;
  },
  
  async getList<T>(
    collection: string, 
    page = 1, 
    perPage = 100, 
    filter?: string, 
    expand?: string, 
    options?: RequestOptions
  ): Promise<PaginatedResponse<T>> {
    // Generate a unique request key for cancellation
    const requestKey = getRequestKey(options?.signal);
    
    // Setup cancellation handler if signal is provided
    if (requestKey && options?.signal) {
      options.signal.addEventListener('abort', () => {
        // Cancel the request when signal is aborted
        pb.cancelRequest(requestKey);
      });
    }
    
    const response = await pb.collection(collection).getList(page, perPage, {
      filter,
      expand,
      requestKey, // Pass the request key for potential cancellation
    });
    
    return {
      items: response.items as T[],
      totalItems: response.totalItems,
      totalPages: response.totalPages
    };
  },
  
  async getFullList<T>(
    collection: string, 
    filter?: string, 
    sort?: string, 
    options?: RequestOptions
  ): Promise<T[]> {
    // Generate a unique request key for cancellation
    const requestKey = getRequestKey(options?.signal);
    
    // Setup cancellation handler if signal is provided
    if (requestKey && options?.signal) {
      options.signal.addEventListener('abort', () => {
        // Cancel the request when signal is aborted
        pb.cancelRequest(requestKey);
      });
    }
    
    const records = await pb.collection(collection).getFullList({
      filter,
      sort,
      requestKey, // Pass the request key for potential cancellation
    });
    return records as T[];
  }
};