'use client';

import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={clsx('text-center p-16 text-muted-foreground bg-card rounded-2xl border border-border', className)}>
            <Icon size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold text-lg">{title}</p>
            {description && <p className="text-sm mt-1">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
