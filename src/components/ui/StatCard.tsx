'use client';

import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

type ColorScheme = 'primary' | 'green' | 'red' | 'blue' | 'amber' | 'purple' | 'slate';

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    currency?: string;
    color?: ColorScheme;
    isRtl?: boolean;
    loading?: boolean;
}

const colorClasses: Record<ColorScheme, { icon: string; value: string; hover: string }> = {
    primary: { icon: 'bg-primary/10 text-primary', value: 'text-primary', hover: 'hover:border-primary/50' },
    green: { icon: 'bg-green-50 text-green-600 dark:bg-green-950/20', value: 'text-green-600', hover: 'hover:border-green-500/50' },
    red: { icon: 'bg-red-50 text-red-600 dark:bg-red-950/20', value: 'text-red-600', hover: 'hover:border-red-500/50' },
    blue: { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20', value: 'text-blue-600', hover: 'hover:border-blue-500/50' },
    amber: { icon: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20', value: 'text-amber-600', hover: 'hover:border-amber-500/50' },
    purple: { icon: 'bg-purple-50 text-purple-600 dark:bg-purple-950/20', value: 'text-purple-600', hover: 'hover:border-purple-500/50' },
    slate: { icon: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30', value: 'text-slate-600', hover: 'hover:border-slate-500/50' },
};

export function StatCard({ icon: Icon, label, value, currency, color = 'primary', isRtl, loading }: StatCardProps) {
    const c = colorClasses[color];
    return (
        <div className={clsx('bg-card border border-border rounded-2xl p-6 shadow-sm group transition-all', c.hover)}>
            <div className="flex items-center gap-3 mb-2">
                <div className={clsx('p-2 rounded-lg group-hover:scale-110 transition-transform', c.icon)}>
                    <Icon size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
            </div>
            <div className={clsx('text-3xl font-black tabular-nums flex items-center gap-2', c.value, isRtl && 'flex-row-reverse')}>
                {currency && <span className="text-sm font-bold opacity-60">{currency}</span>}
                <span>{loading ? '...' : value}</span>
            </div>
        </div>
    );
}
