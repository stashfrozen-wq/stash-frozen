'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X, Edit3, Clock, User, TrendingDown, AlertCircle } from 'lucide-react';
import { getPendingReviewInvoices, acceptInvoice, declineInvoice, editInvoice, getReviewerStats } from '@/app/actions/reviews';
import clsx from 'clsx';
import { Spinner, EmptyState, Modal, Button, Textarea } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';

interface ReviewItem {
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    baseSellingPrice: number;
    priceDeviation: number;
    product: { name: string; sku: string; unit?: string | null; category?: { name: string } | null };
}

interface ReviewInvoice {
    id: string;
    date: string | Date;
    totalAmount: number;
    paymentMethod: string;
    customerName: string | null;
    customerPhone: string | null;
    user: { id: string; name: string | null; username: string } | null;
    items: ReviewItem[];
}

export default function ReviewsPage() {
    const t = useTranslations('Reviews');
    const ts = useTranslations('Sales');
    const { locale } = useLocale();

    const [invoices, setInvoices] = useState<ReviewInvoice[]>([]);
    const [stats, setStats] = useState({ pending: 0, accepted: 0, declined: 0 });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [declineModalId, setDeclineModalId] = useState<string | null>(null);
    const [declineReason, setDeclineReason] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pending, statData] = await Promise.all([
                getPendingReviewInvoices(),
                getReviewerStats()
            ]);
            setInvoices(pending as ReviewInvoice[]);
            setStats(statData);
        } catch (err) {
            console.error('Failed to load review invoices', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAccept = useCallback(async (id: string) => {
        setActionLoading(id);
        const res = await acceptInvoice(id);
        if (res.success) {
            await loadData();
        } else {
            alert(res.error || 'Failed to accept');
        }
        setActionLoading(null);
    }, [loadData]);

    const handleDecline = useCallback(async () => {
        if (!declineModalId) return;
        setActionLoading(declineModalId);
        const res = await declineInvoice(declineModalId, declineReason || undefined);
        if (res.success) {
            setDeclineModalId(null);
            setDeclineReason('');
            await loadData();
        } else {
            alert(res.error || 'Failed to decline');
        }
        setActionLoading(null);
    }, [declineModalId, declineReason, loadData]);

    const handleEdit = useCallback(async (id: string) => {
        setActionLoading(id);
        const res = await editInvoice(id);
        if (res.success) {
            window.open(`/sales?editFrom=${id}`, '_blank');
            await loadData();
        } else {
            alert(res.error || 'Failed to open edit');
        }
        setActionLoading(null);
    }, [loadData]);

    const openDeclineModal = useCallback((id: string) => {
        setDeclineModalId(id);
        setDeclineReason('');
    }, []);

    const closeDeclineModal = useCallback(() => {
        setDeclineModalId(null);
        setDeclineReason('');
    }, []);

    const handleAcceptFromEvent = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const invoiceId = e.currentTarget.dataset.invoiceId;
        if (invoiceId) handleAccept(invoiceId);
    }, [handleAccept]);

    const handleDeclineFromEvent = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const invoiceId = e.currentTarget.dataset.invoiceId;
        if (invoiceId) openDeclineModal(invoiceId);
    }, [openDeclineModal]);

    const handleEditFromEvent = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const invoiceId = e.currentTarget.dataset.invoiceId;
        if (invoiceId) handleEdit(invoiceId);
    }, [handleEdit]);

    const handleDeclineReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDeclineReason(e.target.value);
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center p-12">
                    <Spinner size={32} />
                </div>
            );
        }
        if (invoices.length === 0) {
            return <EmptyState icon={Check} title={t('empty')} />;
        }
        return (
            <div className="space-y-4">
                {invoices.map(inv => (
                    <div key={inv.id} className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="p-5 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-amber-50/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                    <AlertCircle size={22} />
                                </div>
                                <div>
                                    <div className="font-bold text-lg">
                                        {inv.customerName || t('walkIn')}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs">#{inv.id.slice(0, 8).toUpperCase()}</span>
                                        <span>•</span>
                                        <User size={12} />
                                        <span>{inv.user?.name || inv.user?.username || '—'}</span>
                                        <span>•</span>
                                        <span>{new Date(inv.date).toLocaleDateString(locale)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="font-black text-xl text-primary">{ts('currency')} {inv.totalAmount.toLocaleString(locale)}</div>
                                    <div className="text-xs text-muted-foreground font-medium">{inv.paymentMethod}</div>
                                </div>
                            </div>
                        </div>

                        {/* Items with price deviation */}
                        <div className="p-5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                                <TrendingDown size={14} className="text-amber-500" />
                                {t('priceChanges')}
                            </div>
                            <div className="space-y-2">
                                {inv.items.map((item, idx) => (
                                    <div key={item.id || idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-muted-foreground tabular-nums">{idx + 1}</span>
                                            <div>
                                                <div className="font-bold text-sm">{item.product.name}</div>
                                                <div className="text-xs text-muted-foreground">{item.product.sku} • {item.quantity} {item.product.unit || ''}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="text-center">
                                                <div className="text-[9px] font-bold uppercase text-muted-foreground">{t('basePrice')}</div>
                                                <div className="font-bold tabular-nums">{ts('currency')} {item.baseSellingPrice.toLocaleString(locale)}</div>
                                            </div>
                                            <div className="text-muted-300">→</div>
                                            <div className="text-center">
                                                <div className="text-[9px] font-bold uppercase text-muted-foreground">{t('overridePrice')}</div>
                                                <div className={clsx("font-bold tabular-nums", item.priceDeviation < 0 ? "text-red-600" : "text-amber-600")}>
                                                    {ts('currency')} {item.unitPrice.toLocaleString(locale)}
                                                </div>
                                            </div>
                                            <div className="text-center min-w-[60px]">
                                                <div className="text-[9px] font-bold uppercase text-muted-foreground">{t('deviation')}</div>
                                                <div className={clsx("font-black tabular-nums text-xs px-2 py-0.5 rounded", item.priceDeviation < 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600")}>
                                                    {item.priceDeviation > 0 ? '+' : ''}{item.priceDeviation.toLocaleString(locale)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 border-t border-border/50 flex flex-wrap gap-2 justify-end bg-secondary/10">
                            <button
                                data-invoice-id={inv.id}
                                onClick={handleAcceptFromEvent}
                                disabled={actionLoading === inv.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 active:scale-95 text-sm"
                            >
                                {actionLoading === inv.id ? <Spinner size={16} /> : <Check size={16} />}
                                {t('accept')}
                            </button>
                            <button
                                data-invoice-id={inv.id}
                                onClick={handleDeclineFromEvent}
                                disabled={actionLoading === inv.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 rounded-xl font-bold transition-all disabled:opacity-50 active:scale-95 text-sm"
                            >
                                <X size={16} />
                                {t('decline')}
                            </button>
                            <button
                                data-invoice-id={inv.id}
                                onClick={handleEditFromEvent}
                                disabled={actionLoading === inv.id}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 rounded-xl font-bold transition-all disabled:opacity-50 active:scale-95 text-sm"
                            >
                                <Edit3 size={16} />
                                {t('edit')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Clock size={20} /></div>
                        <div>
                            <div className="text-2xl font-black tabular-nums">{stats.pending}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('pending')}</div>
                        </div>
                    </div>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-green-100 text-green-600 rounded-xl"><Check size={20} /></div>
                        <div>
                            <div className="text-2xl font-black tabular-nums">{stats.accepted}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('accepted')}</div>
                        </div>
                    </div>
                </div>
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><X size={20} /></div>
                        <div>
                            <div className="text-2xl font-black tabular-nums">{stats.declined}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('declined')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            {renderContent()}

            {/* Decline Modal */}
            <Modal
                isOpen={!!declineModalId}
                onClose={closeDeclineModal}
                title={t('declineTitle')}
                icon={<X size={20} />}
                maxWidth="max-w-md"
                headerClassName="bg-red-50/50 dark:bg-red-950/10"
            >
                <div className="p-6 space-y-4">
                    <Textarea
                        value={declineReason}
                        onChange={handleDeclineReasonChange}
                        placeholder={t('declineReasonPlaceholder')}
                        rows={3}
                        className="focus:ring-red-500/20"
                    />
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={closeDeclineModal}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleDecline}
                            loading={actionLoading === declineModalId}
                        >
                            {t('confirmDecline')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
