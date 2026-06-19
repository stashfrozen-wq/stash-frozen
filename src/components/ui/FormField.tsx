'use client';

import clsx from 'clsx';
import React from 'react';

interface FormFieldProps {
    label?: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
    return (
        <div className={clsx('space-y-1.5', className)}>
            {label && (
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {children}
            {error && (
                <p className="text-xs text-red-500 font-medium px-1">{error}</p>
            )}
        </div>
    );
}
