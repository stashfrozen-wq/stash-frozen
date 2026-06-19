'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Database, CheckCircle2 } from 'lucide-react';
import { Button, ErrorBanner } from '@/components/ui';

export default function BackupPage() {
    const t = useTranslations('Navigation');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleBackup = useCallback(async () => {
        setIsBackingUp(true);
        setStatus('idle');
        setErrorMessage('');
        
        try {
            const response = await fetch('/api/backup', {
                method: 'GET',
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate backup');
            }
            
            // Trigger file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `stash-backup-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            setStatus('success');
            
            // Reset success message after 5 seconds
            setTimeout(() => {
                setStatus('idle');
            }, 5000);
            
        } catch (error: unknown) {
            console.error('Backup error:', error);
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        } finally {
            setIsBackingUp(false);
        }
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Database className="w-6 h-6 text-primary" />
                    {t('backup')}
                </h1>
                <p className="text-muted-foreground mt-2">
                    Export your data (Invoices, Customers, and Products) as a JSON file for safekeeping.
                </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col items-center text-center max-w-md mx-auto py-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Download className="w-8 h-8 text-primary" />
                    </div>
                    
                    <h2 className="text-xl font-semibold mb-2">Create New Backup</h2>
                    <p className="text-muted-foreground mb-8">
                        This process will export all your current products, customers, and invoices data. 
                        Depending on the size of your database, this might take a few moments.
                    </p>
                    
                    <Button
                        onClick={handleBackup}
                        disabled={isBackingUp}
                        loading={isBackingUp}
                        icon={!isBackingUp ? <Download className="w-5 h-5" /> : undefined}
                        size="lg"
                    >
                        {isBackingUp ? 'Generating Backup...' : 'Download Backup'}
                    </Button>
                    
                    {status === 'success' && (
                        <div className="mt-6 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg border border-green-200">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Backup downloaded successfully!</span>
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <ErrorBanner message={errorMessage} className="mt-6" />
                    )}
                </div>
            </div>
        </div>
    );
}
