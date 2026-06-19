'use client';

import clsx from 'clsx';
import React from 'react';
import { Spinner } from './Spinner';
import { LucideIcon } from 'lucide-react';

interface DataTableProps {
    children: React.ReactNode;
    loading?: boolean;
    loadingColSpan?: number;
    empty?: boolean;
    emptyIcon?: LucideIcon;
    emptyTitle?: string;
    className?: string;
}

export function DataTable({ children, loading, loadingColSpan = 6, empty, emptyIcon, emptyTitle, className }: DataTableProps) {
    const EmptyIcon = emptyIcon;
    return (
        <div className={clsx('rounded-2xl border border-border bg-card shadow-sm overflow-hidden', className)}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-secondary/30 text-muted-foreground border-b border-border">
                        {children}
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading && (
                            <tr>
                                <td colSpan={loadingColSpan} className="px-6 py-12 text-center text-muted-foreground">
                                    <Spinner size={32} label="Loading..." />
                                </td>
                            </tr>
                        )}
                        {!loading && empty && (
                            <tr>
                                <td colSpan={loadingColSpan} className="px-6 py-12 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        {EmptyIcon && <EmptyIcon size={40} className="mb-2 opacity-20" />}
                                        <p className="text-lg font-black uppercase tracking-tight">{emptyTitle || 'No data'}</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

interface ThProps {
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

export function Th({ children, align = 'center', className }: ThProps) {
    return (
        <th className={clsx('px-6 py-4 font-black text-[10px] uppercase tracking-widest', `text-${align}`, className)}>
            {children}
        </th>
    );
}
