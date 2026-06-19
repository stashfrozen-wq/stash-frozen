'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-muted-foreground max-w-md">
                    {error.message || 'Failed to load dashboard data. Please try again.'}
                </p>
            </div>
            <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
                <RefreshCcw className="h-4 w-4" />
                Try again
            </button>
        </div>
    );
}
