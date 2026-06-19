'use client';

import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

interface PageHeaderProps {
    icon: LucideIcon;
    title: React.ReactNode;
    actions?: React.ReactNode;
    isRtl?: boolean;
}

export function PageHeader({ icon: Icon, title, actions, isRtl }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-xl shadow-sm">
                    <Icon size={28} />
                </div>
                <div className="text-center">
                    {title}
                </div>
            </div>
            {actions && (
                <div className={clsx('flex items-center gap-2', isRtl && 'flex-row-reverse')}>
                    {actions}
                </div>
            )}
        </div>
    );
}
