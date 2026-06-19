'use client';

import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
    primary: 'bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50',
    secondary: 'bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 border border-border',
    danger: 'bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50',
    ghost: 'hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold',
    outline: 'border border-border hover:bg-secondary text-foreground font-semibold',
};

const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-2 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-3 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3.5 text-base rounded-xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, icon, fullWidth, className, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={clsx(
                    'flex items-center justify-center transition-all active:scale-95 outline-none',
                    variantClasses[variant],
                    sizeClasses[size],
                    fullWidth && 'w-full',
                    className
                )}
                {...props}
            >
                {loading ? <Loader2 className="animate-spin" size={size === 'sm' ? 16 : 18} /> : icon}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';
