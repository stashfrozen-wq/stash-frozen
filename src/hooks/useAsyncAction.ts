'use client';

import { useState, useCallback } from 'react';

interface UseAsyncActionResult {
    loading: boolean;
    error: string | null;
    success: boolean;
    data: unknown;
    execute: () => Promise<unknown>;
    reset: () => void;
}

export function useAsyncAction<T = unknown>(
    action: () => Promise<T>
): UseAsyncActionResult & { data: T | null } {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [data, setData] = useState<T | null>(null);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const result = await action();
            setData(result as T);
            setSuccess(true);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [action]);

    const reset = useCallback(() => {
        setLoading(false);
        setError(null);
        setSuccess(false);
        setData(null);
    }, []);

    return { loading, error, success, data, execute, reset };
}
