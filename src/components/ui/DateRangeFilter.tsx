'use client';

import { useCallback } from 'react';
import clsx from 'clsx';

interface DateRangeFilterProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onClear: () => void;
    isRtl?: boolean;
}

export function DateRangeFilter({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onClear,
    isRtl,
}: DateRangeFilterProps) {
    const handleStartDateChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onStartDateChange(e.target.value);
        },
        [onStartDateChange]
    );

    const handleEndDateChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            onEndDateChange(e.target.value);
        },
        [onEndDateChange]
    );

    return (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-border animate-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">From</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/10 outline-none"
                />
            </div>
            <div className="flex items-center gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">To</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="bg-card border border-border rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/10 outline-none"
                />
            </div>
            <button
                onClick={onClear}
                className={clsx(
                    'text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors',
                    isRtl ? 'mr-auto' : 'ml-auto'
                )}
            >
                Clear
            </button>
        </div>
    );
}
