'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Filter, Search, Calendar, Printer, Download } from 'lucide-react';
import { getInvoices } from '@/app/actions/invoices';
import { printElement } from '@/components/ui/PrintExport';
import RefundModal from '@/components/RefundModal';
import clsx from 'clsx';
import { getProducts } from '@/app/actions/sales';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import { Invoice } from './types';
import { Spinner } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import { getCurrentUser } from '@/app/actions/permissions';

export default function InvoicesPage() {
    const t = useTranslations('Invoices');
    const ts = useTranslations('Sales');
    const { locale } = useLocale();
    
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);
    
    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;
    
    // Products for adding new items
    const [availableProducts, setAvailableProducts] = useState<Array<{ id: string, name: string, sku: string, baseSellingPrice?: number }>>([]);

    // Date Filter State
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchInvoices = useCallback(async (pageNum = page) => {
        setLoading(true);
        try {
            const response = await getInvoices(pageNum, limit);
            // Type cast response.data to Invoice[]
            setInvoices(response.data as unknown as Invoice[]);
            setTotalPages(response.totalPages);
            setPage(response.page);
        } catch (error) {
            console.error("Failed to fetch invoices", error);
        } finally {
            setLoading(false);
        }
    }, [page, limit]);

    useEffect(() => {
        getCurrentUser().then(user => {
            if (user) setUserRole(user.role);
        });
        fetchInvoices(1);
        getProducts().then(setAvailableProducts);
    }, [fetchInvoices]);

    const handleUpdate = useCallback(() => {
        fetchInvoices(page);
        setSelectedInvoice(null);
    }, [fetchInvoices, page]);

    const handlePrintReport = useCallback(() => {
        const dateRangeStr = startDate || endDate ? `<p>${t('report.period', { start: startDate || 'Start', end: endDate || 'Now' })}</p>` : '';
        printElement(t('report.title'), 'print-invoice-list', dateRangeStr, locale);
    }, [startDate, endDate, t, locale]);

    const handleDownloadZip = useCallback(() => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        window.open(`/api/invoices/export-zip?${params.toString()}`, '_blank');
    }, [startDate, endDate]);

    const handleToggleDateFilter = useCallback(() => setShowDateFilter(prev => !prev), []);
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), []);
    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value), []);
    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value), []);
    const handleClearDateFilter = useCallback(() => {
        setStartDate('');
        setEndDate('');
    }, []);

    const handleSelectInvoice = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        const inv = invoices.find(i => i.id === id);
        if (inv) {
            setSelectedInvoice(inv);
        }
    }, [invoices]);

    const handlePrevPage = useCallback(() => {
        setPage(p => Math.max(1, p - 1));
    }, []);

    const handleNextPage = useCallback(() => {
        setPage(p => Math.min(totalPages, p + 1));
    }, [totalPages]);

    const handlePrintIconClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        window.open(`/invoices/${id}/print`, '_blank');
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedInvoice(null);
    }, []);
    
    const handleOpenRefundModal = useCallback(() => setShowRefundModal(true), []);
    const handleCloseRefundModal = useCallback(() => setShowRefundModal(false), []);
    
    const handleRefundSuccess = useCallback(() => {
        setShowRefundModal(false);
        setSelectedInvoice(null);
        fetchInvoices();
    }, [fetchInvoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = (
                inv.id.toLowerCase().includes(query) ||
                (inv.customerName && inv.customerName.toLowerCase().includes(query)) ||
                (inv.user?.username && inv.user.username.toLowerCase().includes(query))
            );

            const invDate = new Date(inv.date);
            const matchesDate =
                (!startDate || invDate >= new Date(startDate)) &&
                (!endDate || invDate <= new Date(new Date(endDate).setHours(23, 59, 59)));

            return matchesSearch && matchesDate;
        });
    }, [invoices, searchQuery, startDate, endDate]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                
                <div className="flex gap-2">
                    <button
                        onClick={handleToggleDateFilter}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors",
                            showDateFilter ? "bg-secondary border-primary" : "border-border hover:bg-secondary"
                        )}
                    >
                        <Calendar size={16} />
                        {t('dateRange')}
                    </button>
                    <button
                        onClick={handleDownloadZip}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg border border-border"
                    >
                        <Download size={16} />
                        {t('downloadZip', { defaultValue: 'Download ZIP' })}
                    </button>
                    <button
                        onClick={handlePrintReport}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                    >
                        <Printer size={16} />
                        {t('exportReport')}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="sticky top-0 z-20 flex items-center gap-4 bg-card/90 backdrop-blur-md p-4 rounded-xl border border-border shadow-sm mb-2">
                <Search className="text-muted-foreground" size={18} />
                <input
                    placeholder={t('searchPlaceholder')}
                    className="flex-1 bg-transparent outline-none font-medium"
                    value={searchQuery}
                    onChange={handleSearchChange}
                />
                <button className="p-2 hover:bg-secondary rounded">
                    <Filter size={18} />
                </button>
            </div>

            {/* Date Range Inputs */}
            {showDateFilter && (
                <div className="flex flex-wrap items-center gap-4 p-4 bg-secondary/20 rounded-xl border border-border animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">{t('from')}</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">{t('to')}</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <button
                        onClick={handleClearDateFilter}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                    >
                        {t('clearFilter')}
                    </button>
                </div>
            )}

            {/* List */}
            <div className="space-y-4">
                {loading && (
                    <div className="flex justify-center p-12 text-muted-foreground">
                        <Spinner size={32} className="mr-2" />
                    </div>
                )}
                {!loading && filteredInvoices.length === 0 && (
                    <div className="text-center p-12 text-muted-foreground font-medium bg-card rounded-xl border border-border/50">
                        {t('noResults')}
                    </div>
                )}
                {!loading && filteredInvoices.length > 0 && (
                    filteredInvoices.map(inv => (
                        <div
                            key={inv.id}
                            data-id={inv.id}
                            onClick={handleSelectInvoice}
                            className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-card border border-border/50 rounded-2xl hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group gap-4"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/5 rounded-xl text-primary group-hover:scale-110 transition-transform group-hover:bg-primary/10">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-lg">
                                        {inv.customerName || (inv.user ? `${inv.user.username}` : t('walkInCustomer'))}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex gap-2 items-center">
                                        <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs"># {inv.id.slice(0, 8).toUpperCase()}</span>
                                        <span>•</span>
                                        <div className="flex flex-col gap-0.5 leading-none">
                                            <span>{new Date(inv.date).toLocaleDateString(locale)}</span>
                                            <span className="text-[10px] opacity-70" dir="ltr">{new Date(inv.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={clsx("flex items-center gap-4 md:gap-8 justify-between w-full md:w-auto", locale === 'ar' ? "md:justify-start" : "md:justify-end")}>
                                <div className={clsx('text-center')}>
                                    <div className="font-black text-xl text-primary">{ts('currency')} {Number(inv.totalAmount).toLocaleString(locale)}</div>
                                    <div className="text-xs text-muted-foreground font-medium">{inv.paymentMethod}</div>
                                </div>

                                <div className={clsx("px-3 py-1.5 rounded-lg text-xs font-bold uppercase border shadow-sm",
                                    inv.status === 'PENDING_REVIEW' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                    inv.status === 'DECLINED' && "bg-red-500/10 text-red-600 border-red-500/20",
                                    Number(inv.currentBalance) > 0 && "bg-red-500/10 text-red-600 border-red-500/20",
                                    (!inv.status || inv.status === 'ACCEPTED') && Number(inv.currentBalance) <= 0 && "bg-green-500/10 text-green-600 border-green-500/20"
                                )}>
                                    {inv.status === 'PENDING_REVIEW' ? t('statusPending', { defaultValue: 'Pending' }) :
                                     inv.status === 'DECLINED' ? t('statusDeclined', { defaultValue: 'Declined' }) :
                                     Number(inv.currentBalance) > 0 ? t('statusDebt', { defaultValue: 'Debt' }) :
                                     t('paid')}
                                </div>

                                <button
                                    data-id={inv.id}
                                    onClick={handlePrintIconClick}
                                    disabled={inv.status === 'PENDING_REVIEW' && userRole === 'SALESPERSON'}
                                    className="p-2 bg-secondary/50 hover:bg-primary hover:text-primary-foreground rounded-xl text-muted-foreground transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 disabled:opacity-30 disabled:hover:bg-secondary/50 disabled:hover:text-muted-foreground"
                                    title={inv.status === 'PENDING_REVIEW' && userRole === 'SALESPERSON' ? t('details.cannotPrintPending', { defaultValue: 'Cannot print pending invoice' }) : t('printTooltip')}
                                >
                                    <Printer size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                        onClick={handlePrevPage}
                        disabled={page === 1 || loading}
                        className="px-4 py-2 border rounded-lg hover:bg-secondary disabled:opacity-50"
                    >
                        {t('previousPage', { defaultValue: 'Previous' })}
                    </button>
                    <span className="font-medium text-sm text-muted-foreground">
                        {t('pageOf', { current: page, total: totalPages, defaultValue: `Page ${page} of ${totalPages}` })}
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={page === totalPages || loading}
                        className="px-4 py-2 border rounded-lg hover:bg-secondary disabled:opacity-50"
                    >
                        {t('nextPage', { defaultValue: 'Next' })}
                    </button>
                </div>
            )}

            {/* Details Modal */}
            {selectedInvoice && (
                <InvoiceDetailsModal
                    invoice={selectedInvoice}
                    availableProducts={availableProducts}
                    onClose={handleCloseModal}
                    onUpdate={handleUpdate}
                    onOpenRefund={handleOpenRefundModal}
                    userRole={userRole}
                />
            )}

            {/* Refund Modal */}
            {showRefundModal && selectedInvoice && (
                <RefundModal
                    invoice={selectedInvoice}
                    onClose={handleCloseRefundModal}
                    onSuccess={handleRefundSuccess}
                />
            )}

            {/* Hidden Print Content */}
            <div id="print-invoice-list" className="hidden">
                <style>{`
                    @media print {
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: ${locale === 'ar' ? 'right' : 'left'}; }
                        th { background-color: #f5f5f5; font-weight: bold; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        .font-bold { font-weight: bold; }
                    }
                `}</style>
                <div className="mb-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <h1 className="text-xl font-bold">{t('report.title')}</h1>
                    <p className="text-sm text-gray-500">{t('report.generatedOn', { date: new Date().toLocaleString(locale) })}</p>
                </div>
                <table dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <thead>
                        <tr>
                            <th>{t('details.date')}</th>
                            <th>{t('details.id')}</th>
                            <th>{t('details.buyerInfo')}</th>
                            <th className={'text-center'}>{t('details.grandTotal')}</th>
                            <th>{t('details.payment')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.map(inv => (
                            <tr key={inv.id}>
                                <td>
                                    <div className="flex flex-col gap-0.5">
                                        <span>{new Date(inv.date).toLocaleDateString(locale)}</span>
                                        <span className="text-[10px] text-gray-500" dir="ltr">{new Date(inv.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </td>
                                <td>{inv.id.slice(0, 8).toUpperCase()}</td>
                                <td>{inv.customerName || (inv.user ? inv.user.username : t('walkInCustomer'))}</td>
                                <td className={'text-center'}>{ts('currency')} {Number(inv.totalAmount).toLocaleString(locale)}</td>
                                <td>{inv.paymentMethod}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} className={clsx("font-bold pt-4", 'text-center')}>{t('report.total')}</td>
                            <td className={clsx("font-bold pt-4", 'text-center')}>
                                {ts('currency')} {filteredInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0).toLocaleString(locale)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div >
    );
}
