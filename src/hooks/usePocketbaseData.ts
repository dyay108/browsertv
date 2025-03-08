import { useState, useEffect } from 'react';
import { pb } from '../lib/pocketbase';
import { RecordModel } from 'pocketbase';

interface PocketbaseDataOptions {
  page?: number;
  perPage?: number;
  filter?: string;
  sort?: string;
  expand?: string;
  autoRefresh?: boolean;
  initialFetch?: boolean;
}

interface PocketbaseDataResponse<T extends RecordModel> {
  data: T[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  totalPages: number;
  refetch: () => Promise<void>;
}

export function usePocketbaseData<T extends RecordModel>(
  collection: string, 
  options: PocketbaseDataOptions = {}
): PocketbaseDataResponse<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  
  const {
    page = 1,
    perPage = 50,
    filter = '',
    sort = '',
    expand = '',
    autoRefresh = false,
    initialFetch = true
  } = options;

  // Fetch data function
  const fetchData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await pb.collection(collection).getList(page, perPage, {
        filter,
        sort,
        expand
      });
      
      setData(result.items as T[]);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch on mount if initialFetch is true
  useEffect(() => {
    if (initialFetch) {
      fetchData();
    }
    
    // Set up real-time updates if autoRefresh is true
    if (autoRefresh) {
      pb.collection(collection).subscribe('*', () => {
        fetchData();
      });
      
      return () => {
        pb.collection(collection).unsubscribe();
      };
    }
  }, [collection, page, perPage, filter, sort, expand]);
  
  return { data, loading, error, totalItems, totalPages, refetch: fetchData };
}