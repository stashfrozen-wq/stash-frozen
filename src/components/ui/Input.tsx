'use client';

import clsx from 'clsx';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, invalid, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={clsx(
                    'w-full p-3 rounded-xl border border-border bg-background text-sm font-bold outline-none',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all',
                    'placeholder:font-normal placeholder:text-muted-foreground',
                    invalid && 'border-red-500 focus:ring-red-500/20',
                    className
                )}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, invalid, ...props }, ref) => {
        return (
            <textarea
                ref={ref}
                className={clsx(
                    'w-full p-3 rounded-xl border border-border bg-background text-sm font-bold outline-none',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all',
                    'placeholder:font-normal placeholder:text-muted-foreground resize-none',
                    invalid && 'border-red-500 focus:ring-red-500/20',
                    className
                )}
                {...props}
            />
        );
    }
);
Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, invalid, children, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={clsx(
                    'w-full p-3 rounded-xl border border-border bg-background text-sm font-bold outline-none',
                    'focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all',
                    invalid && 'border-red-500 focus:ring-red-500/20',
                    className
                )}
                {...props}
            >
                {children}
            </select>
        );
    }
);
Select.displayName = 'Select';
