'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePaginatedDataResult<T> {
    data: T[];
    loading: boolean;
    error: string | null;
    page: number;
    totalPages: number;
    totalCount: number;
    setPage: (page: number) => void;
    refetch: () => void;
}

export function usePaginatedData<T>(
    fetcher: (page: number, limit: number) => Promise<{
        data: T[];
        totalCount?: number;
        totalPages?: number;
        page?: number;
        pagination?: { total: number; pages: number; current: number };
    }>,
    limit: number = 50,
    deps: unknown[] = []
): UsePaginatedDataResult<T> {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPageState] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const mountedRef = useRef(true);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const fetchData = useCallback(async (pageNum: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetcherRef.current(pageNum, limit);
            if (!mountedRef.current) return;

            setData(result.data || []);
            if (result.pagination) {
                setTotalPages(result.pagination.pages);
                setTotalCount(result.pagination.total);
                setPageState(result.pagination.current);
            } else {
                setTotalPages(result.totalPages || 1);
                setTotalCount(result.totalCount || 0);
                setPageState(result.page || pageNum);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [limit, ...deps]);

    useEffect(() => {
        mountedRef.current = true;
        fetchData(1);
        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    const setPage = useCallback((newPage: number) => {
        fetchData(newPage);
    }, [fetchData]);

    const refetch = useCallback(() => {
        fetchData(page);
    }, [fetchData, page]);

    return { data, loading, error, page, totalPages, totalCount, setPage, refetch };
}
