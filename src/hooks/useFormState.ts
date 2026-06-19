'use client';

import { useState, useCallback } from 'react';

export function useFormState<T extends Record<string, unknown>>(initial: T) {
    const [formData, setFormData] = useState<T>(initial);

    const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    }, []);

    const setMany = useCallback((updates: Partial<T>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    }, []);

    const reset = useCallback(() => {
        setFormData(initial);
    }, [initial]);

    const handleFieldChange = useCallback(<K extends keyof T>(key: K) => {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            setFormData(prev => ({ ...prev, [key]: e.target.value as T[K] }));
        };
    }, []);

    return { formData, setFormData, setField, setMany, reset, handleFieldChange };
}
