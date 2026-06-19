'use client';

import { useCallback } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    icon?: React.ReactNode;
    headerClassName?: string;
    children: React.ReactNode;
    maxWidth?: string;
    closeOnBackdrop?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    headerClassName,
    children,
    maxWidth = 'max-w-lg',
    closeOnBackdrop = true,
}: ModalProps) {
    const handleContentClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            <div
                className={clsx(
                    'bg-card w-full rounded-2xl border border-border shadow-2xl overflow-hidden relative',
                    'animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]',
                    maxWidth
                )}
                onClick={handleContentClick}
            >
                {/* Always-visible, premium close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 text-muted-foreground hover:text-foreground bg-card/85 dark:bg-card/30 hover:bg-secondary border border-border/50 hover:border-border rounded-xl transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background hover:scale-105 active:scale-95 flex items-center justify-center rtl:right-auto rtl:left-4"
                    aria-label="Close modal"
                >
                    <X size={18} className="transition-transform duration-300 hover:rotate-90" />
                </button>

                {(title || icon) && (
                    <div className={clsx('p-6 border-b border-border flex items-center justify-between pr-16 rtl:pl-16 rtl:pr-6', headerClassName)}>
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    {icon}
                                </div>
                            )}
                            <div>
                                {title && <h3 className="text-xl font-bold">{title}</h3>}
                                {subtitle && <p className="text-xs text-muted-foreground font-mono mt-1">{subtitle}</p>}
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}
