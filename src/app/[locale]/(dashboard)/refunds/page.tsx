'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCcw, Search, Calendar, FileText, X, AlertTriangle, User } from 'lucide-react';
import { getRefunds } from '@/app/actions/refunds';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { endOfDay } from '@/lib/utils/date';

interface RefundItem {
    id: string;
    product: { name: string; sku: string };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    condition: string;
}

interface Refund {
    id: string;
    invoiceId: string;
    totalAmount: number;
    reason: string | null;
    createdAt: Date;
    user: { name: string | null, username: string };
    invoice: { customerName: string | null, customerPhone: string | null };
    items: RefundItem[];
}

export default function RefundHistoryPage() {
    const t = useTranslations('Refunds');
    const ts = useTranslations('Sales');
    const { locale, isRtl } = useLocale();

    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);

    // Date Filter State
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalServerItems, setTotalServerItems] = useState(0);
    const ITEMS_PER_PAGE = 50;

    const fetchRefunds = useCallback(async () => {
        setLoading(true);
        try {
            const [total, data] = await getRefunds(currentPage, ITEMS_PER_PAGE);
            setTotalServerItems(total);
            setRefunds(data as Refund[]);
        } catch (error) {
            console.error('Failed to fetch refunds:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    const filteredRefunds = refunds.filter(ref => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            ref.invoiceId.toLowerCase().includes(query) ||
            (ref.invoice.customerName && ref.invoice.customerName.toLowerCase().includes(query)) ||
            (ref.user.username.toLowerCase().includes(query)) ||
            (ref.reason && ref.reason.toLowerCase().includes(query))
        );

        const refDate = new Date(ref.createdAt);
        const matchesDate =
            (!startDate || refDate >= new Date(startDate)) &&
            (!endDate || refDate <= endOfDay(endDate));

        return matchesSearch && matchesDate;
    });

    const handleToggleDateFilter = useCallback(() => setShowDateFilter(prev => !prev), []);
    const handleSearchQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), []);
    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value), []);
    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value), []);
    const handleResetFilters = useCallback(() => {
        setStartDate('');
        setEndDate('');
    }, []);
    
    const handleSelectRefundClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) {
            const found = refunds.find(r => r.id === id);
            if (found) setSelectedRefund(found);
        }
    }, [refunds]);

    const handlePrevPage = useCallback(() => {
        setCurrentPage(p => Math.max(1, p - 1));
    }, []);

    const handleNextPage = useCallback(() => {
        setCurrentPage(p => p + 1);
    }, []);
    
    const handleCloseMemoClick = useCallback(() => setSelectedRefund(null), []);
    const handlePrintInvoiceClick = useCallback(() => {
        if (selectedRefund?.invoiceId) {
            window.open(`/invoices/${selectedRefund.invoiceId}/print`, '_blank');
        }
    }, [selectedRefund]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-xl shadow-sm">
                        <RefreshCcw size={28} />
                    </div>
                    <div className={'text-center'}>
                        
                        
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleToggleDateFilter}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 border rounded-xl transition-all font-bold text-sm",
                            showDateFilter ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/20 dark:border-red-800" : "bg-card border-border hover:bg-secondary"
                        )}
                    >
                        <Calendar size={16} />
                        {t('buttons.filterDate')}
                    </button>
                    <button
                        onClick={fetchRefunds}
                        className="p-2 bg-card border border-border hover:bg-secondary rounded-xl transition-colors"
                        title={t('buttons.refresh')}
                    >
                        <Spinner size={20} className={clsx(!loading && "hidden")} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Search className="text-muted-foreground" size={18} />
                <input
                    placeholder={t('filters.search')}
                    className="flex-1 bg-transparent outline-none text-sm"
                    value={searchQuery}
                    onChange={handleSearchQueryChange}
                />
            </div>

            {/* Date Range Inputs */}
            {showDateFilter && (
                <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-2xl border border-border animate-in slide-in-from-top-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">{t('filters.from')}</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            className="bg-secondary/40 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">{t('filters.to')}</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            className="bg-secondary/40 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleResetFilters}
                        className={clsx("text-xs font-bold text-red-500 hover:text-red-600 transition-colors uppercase", isRtl ? "mr-auto" : "ml-auto")}
                    >
                        {t('buttons.reset')}
                    </button>
                </div>
            )}

            {/* Refund List */}
            <div className="grid grid-cols-1 gap-4">
                {loading && refunds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
                        <Spinner size={32} className="mb-4" />
                        <p className="font-medium">{t('list.loading')}</p>
                    </div>
                // eslint-disable-next-line sonarjs/no-nested-conditional
                ) : filteredRefunds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
                        <X size={32} className="mb-4 opacity-20" />
                        <p className="font-medium">{t('list.empty')}</p>
                    </div>
                ) : (
                    filteredRefunds.map(ref => (
                        <div
                            key={ref.id}
                            data-id={ref.id}
                            onClick={handleSelectRefundClick}
                            className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-card border border-border rounded-2xl hover:border-red-200 dark:hover:border-red-900 hover:shadow-lg transition-all cursor-pointer gap-4 relative overflow-hidden"
                        >
                            <div className={clsx("absolute top-0 w-1 h-full bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity", isRtl ? "right-0" : "left-0")} />

                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-xl transition-transform group-hover:scale-110">
                                    <RefreshCcw size={24} />
                                </div>
                                <div className={clsx("space-y-1", 'text-center')}>
                                    <div className="font-black text-lg flex items-center gap-2 uppercase tracking-tight">
                                        {ref.invoice.customerName || t('list.walkIn')}
                                        {ref.reason && <span className="text-[10px] font-bold bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{t('list.withReason')}</span>}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-y-1 gap-x-3 font-medium">
                                        <span className="flex items-center gap-1"><FileText size={12} /> {t('list.invoice')} {ref.invoiceId.slice(0, 8).toUpperCase()}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(ref.createdAt).toLocaleDateString(locale)}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span className="flex items-center gap-1 text-primary"><User size={12} /> @{ref.user.username}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 md:gap-8 justify-between md:justify-end">
                                <div className={'text-center'}>
                                    <div className="text-2xl font-black text-red-600 tabular-nums">
                                        - {ts('currency')} {Number(ref.totalAmount).toLocaleString(locale)}
                                    </div>
                                    <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1">
                                        {t('list.itemsRefunded', { count: ref.items.length.toLocaleString(locale) })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalServerItems > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-sm">
                    <button 
                        disabled={currentPage === 1}
                        onClick={handlePrevPage}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg disabled:opacity-50 text-sm font-bold"
                    >
                        {t('buttons.previous')}
                    </button>
                    <span className="text-sm font-bold text-muted-foreground">
                        Page {currentPage} of {Math.ceil(totalServerItems / ITEMS_PER_PAGE)}
                    </span>
                    <button 
                        disabled={currentPage >= Math.ceil(totalServerItems / ITEMS_PER_PAGE)}
                        onClick={handleNextPage}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg disabled:opacity-50 text-sm font-bold"
                    >
                        {t('buttons.next')}
                    </button>
                </div>
            )}

            {/* Refund Details Modal */}
            {selectedRefund && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-red-50/50 dark:bg-red-950/10">
                            <div className={'text-center'}>
                                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    {t('modal.title')}
                                </h3>
                                <p className="text-[10px] text-muted-foreground font-mono mt-1">REF_ID: {selectedRefund.id}</p>
                            </div>
                            <button onClick={handleCloseMemoClick} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Information Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-secondary/20 rounded-2xl border border-border shadow-sm">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">{t('modal.staff')}</label>
                                    <div className="text-sm font-bold flex items-center gap-2">
                                        <User size={14} className="text-primary" />
                                        @{selectedRefund.user.username}
                                    </div>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-2xl border border-border shadow-sm">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">{t('modal.customer')}</label>
                                    <div className="text-sm font-bold truncate">
                                        {selectedRefund.invoice.customerName || t('modal.customer')}
                                    </div>
                                </div>
                                <div className="p-4 bg-secondary/20 rounded-2xl border border-border shadow-sm col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">{t('modal.date')}</label>
                                    <div className="text-sm font-bold">
                                        {new Date(selectedRefund.createdAt).toLocaleString(locale)}
                                    </div>
                                </div>
                            </div>

                            {/* Reason Box */}
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-sm">
                                <label className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-2 block flex items-center gap-1">
                                    <AlertTriangle size={12} /> {t('modal.reasonTitle')}
                                </label>
                                <p className="text-sm italic text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                                    {selectedRefund.reason || t('modal.noReason')}
                                </p>
                            </div>

                            {/* Items List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <h4 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('modal.returnedItems')}</h4>
                                    <span className="text-[10px] font-bold text-red-500 uppercase">{t('modal.financialReversal')}</span>
                                </div>
                                <div className="border border-border rounded-2xl overflow-hidden shadow-sm bg-card">
                                    <table className="w-full text-sm">
                                        <thead className="bg-secondary/30 text-muted-foreground">
                                            <tr>
                                                <th className={clsx("px-4 py-3 font-black text-[10px] uppercase", 'text-center')}>{t('modal.itemDetails')}</th>
                                                <th className="px-4 py-3 text-center font-black text-[10px] uppercase">{t('modal.condition')}</th>
                                                <th className="px-4 py-3 text-center font-black text-[10px] uppercase">{t('modal.quantity')}</th>
                                                <th className={clsx("px-4 py-3 font-black text-[10px] uppercase", 'text-center')}>{t('modal.price')}</th>
                                                <th className={clsx("px-4 py-3 font-black text-[10px] uppercase", 'text-center')}>{t('modal.total')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {selectedRefund.items.map(item => (
                                                <tr key={item.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="font-bold text-sm tracking-tight">{item.product.name}</div>
                                                        <div className="text-[10px] font-mono text-muted-foreground uppercase">{item.product.sku}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <span className={clsx(
                                                            "text-[10px] font-black px-2 py-0.5 rounded-full border shadow-sm",
                                                            item.condition === 'NEW' ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"
                                                        )}>
                                                            {t(`modal.conditions.${item.condition as 'NEW' | 'DAMAGED'}`)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-center font-mono font-bold">{item.quantity.toLocaleString(locale)}</td>
                                                    <td className={clsx("px-4 py-4 font-mono text-xs", 'text-center')}>{ts('currency')} {item.unitPrice.toLocaleString(locale)}</td>
                                                    <td className={clsx("px-4 py-4 font-mono font-black text-red-600", 'text-center')}>- {ts('currency')} {item.subtotal.toLocaleString(locale)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-red-50/50 dark:bg-red-950/10 font-black border-t-2 border-red-100 dark:border-red-900/50">
                                            <tr>
                                                <td colSpan={4} className={clsx("px-4 py-5 text-xs uppercase tracking-widest text-muted-foreground font-bold", 'text-center')}>{t('modal.grandTotal')}</td>
                                                <td className={clsx("px-4 py-5 text-red-600 text-xl font-black tabular-nums", 'text-center')}>- {ts('currency')} {Number(selectedRefund.totalAmount).toLocaleString(locale)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-secondary/5 flex gap-3">
                            <button
                                onClick={handlePrintInvoiceClick}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-card border border-border rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-secondary transition-all active:scale-95 shadow-sm"
                            >
                                <FileText size={16} />
                                {t('buttons.viewInvoice')}
                            </button>
                            <button
                                onClick={handleCloseMemoClick}
                                className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-primary/20"
                            >
                                {t('buttons.closeMemo')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
