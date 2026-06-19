'use client';

import clsx from 'clsx';
import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    primary: 'bg-primary/10 text-primary',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
    return (
        <span className={clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
            variantClasses[variant],
            className
        )}>
            {children}
        </span>
    );
}
