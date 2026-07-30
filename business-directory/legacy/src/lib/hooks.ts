import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// Hook for managing URL query parameters
export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback((key: string) => {
    return searchParams.get(key);
  }, [searchParams]);

  const setParam = useCallback((key: string, value: string | null) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const setParams = useCallback((params: Record<string, string | null>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '') {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams;
    });
  }, [setSearchParams]);

  return { getParam, setParam, setParams, searchParams };
}

// Hook for async operations with loading and error states
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

// Hook for RTL-aware styling
export function useRTL() {
  const { locale } = useUIStore();
  const isRTL = locale === 'ar';
  
  return {
    isRTL,
    dir: isRTL ? 'rtl' : 'ltr',
    // RTL-aware margin/padding helpers
    ml: (value: string) => isRTL ? `mr-${value}` : `ml-${value}`,
    mr: (value: string) => isRTL ? `ml-${value}` : `mr-${value}`,
    pl: (value: string) => isRTL ? `pr-${value}` : `pl-${value}`,
    pr: (value: string) => isRTL ? `pl-${value}` : `pr-${value}`,
    // RTL-aware positioning
    left: (value: string) => isRTL ? `right-${value}` : `left-${value}`,
    right: (value: string) => isRTL ? `left-${value}` : `right-${value}`,
  };
}

// Import useUIStore here to avoid circular dependency
import { useUIStore } from '@/store/uiSlice';