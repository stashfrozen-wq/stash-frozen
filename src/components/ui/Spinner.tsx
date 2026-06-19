'use client';

import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface SpinnerProps {
    size?: number;
    className?: string;
    label?: string;
}

export function Spinner({ size = 24, className, label }: SpinnerProps) {
    if (label) {
        return (
            <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
                <Loader2 className="animate-spin text-primary" size={size} />
                <span className="font-bold uppercase text-xs tracking-widest">{label}</span>
            </div>
        );
    }
    return <Loader2 className={clsx('animate-spin text-primary', className)} size={size} />;
}
