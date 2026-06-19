'use client';

import { AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

interface ErrorBannerProps {
    message: string;
    onClose?: () => void;
    className?: string;
}

export function ErrorBanner({ message, onClose, className }: ErrorBannerProps) {
    return (
        <div className={clsx(
            'p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-3 animate-in slide-in-from-top-2',
            'dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400',
            className
        )}>
            <AlertCircle size={20} className="shrink-0" />
            <span className="flex-1">{message}</span>
            {onClose && (
                <button onClick={onClose} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors">
                    <X size={16} />
                </button>
            )}
        </div>
    );
}
