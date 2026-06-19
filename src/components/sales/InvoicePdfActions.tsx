'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Download, Loader2 } from 'lucide-react';

interface InvoicePdfActionsProps {
    invoiceId: string;
    disabled?: boolean;
}

export default function InvoicePdfActions({ invoiceId, disabled = false }: InvoicePdfActionsProps) {
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const res = await fetch(`/api/invoices/${invoiceId}/pdf?download=1`);
            if (!res.ok) throw new Error('Failed to generate PDF');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${invoiceId.slice(-6).toUpperCase()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('PDF download error:', err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full max-w-md">
            <button
                onClick={handleDownload}
                disabled={downloading || disabled}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg hover:opacity-90 shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {downloading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    <Download size={24} />
                )}
                {isRtl
                    ? downloading ? 'جاري تحميل الفاتورة...' : 'تحميل الفاتورة'
                    : downloading ? 'Downloading...' : 'Download Invoice'}
            </button>
        </div>
    );
}
