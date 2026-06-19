'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    danger?: boolean;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    loading,
    danger = true,
}: ConfirmDialogProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={<AlertTriangle size={20} />}
            maxWidth="max-w-md"
            headerClassName={danger ? 'bg-red-50/50 dark:bg-red-950/10' : ''}
        >
            <div className="p-6 space-y-6">
                <p className="text-sm text-muted-foreground">{message}</p>
                <div className="flex gap-3">
                    <Button variant="outline" fullWidth onClick={onClose}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={danger ? 'danger' : 'primary'}
                        fullWidth
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
