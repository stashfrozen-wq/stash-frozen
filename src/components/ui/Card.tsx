'use client';

import clsx from 'clsx';
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
}

export function Card({ className, hover, ...props }: CardProps) {
    return (
        <div
            className={clsx(
                'bg-card border border-border rounded-2xl shadow-sm',
                hover && 'hover:shadow-lg hover:border-primary/20 transition-all',
                className
            )}
            {...props}
        />
    );
}
