'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStockMovements } from '@/app/actions/transactions';
import {
    History, RefreshCcw,
    ArrowDownLeft, ArrowUpRight, ShoppingCart, ArrowRightLeft,
    MapPin, Package, Calendar
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { PageHeader, Spinner, EmptyState, Pagination } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';

const ITEMS_PER_PAGE = 50;

type TransactionType = 'SALE' | 'IN' | 'OUT' | 'TRANSFER' | 'RETURN' | 'REFUND_RESTOCK' | 'REFUND_DEFECTIVE';

interface TransactionItem {
    id: string;
    quantity: number;
    product: { name: string; sku: string };
}

interface Transaction {
    id: string;
    type: TransactionType;
    date: string | Date;
    createdById?: string | null;
    items: TransactionItem[];
    fromLocation?: { name: string } | null;
    toLocation?: { name: string } | null;
    supplier?: { name: string } | null;
    [key: string]: unknown;
}

export default function MovementsPage() {
    const t = useTranslations('Movements');
    const { locale, isRtl } = useLocale();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filterType, setFilterType] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pagination, setPagination] = useState({ total: 0, pages: 1, current: 1 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getStockMovements(page, ITEMS_PER_PAGE, { type: filterType, startDate: startDate || undefined, endDate: endDate || undefined });
            if (res.success && res.movements) {
                setTransactions(res.movements);
                setPagination(res.pagination || { total: 0, pages: 1, current: 1 });
            }
        } finally {
            setLoading(false);
        }
    }, [page, filterType, startDate, endDate]);

    const handlePageChange = useCallback((p: number) => setPage(p), []);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, filterType, startDate, endDate]);

    const handleFilterTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value), []);
    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value), []);
    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value), []);

    const getTypeConfig = (type: TransactionType) => {
        switch (type) {
            case 'SALE': return { icon: ShoppingCart, color: 'text-blue-600 bg-blue-100 border-blue-200', label: t('types.SALE') };
            case 'IN': return { icon: ArrowDownLeft, color: 'text-green-600 bg-green-100 border-green-200', label: t('types.IN') };
            case 'OUT': return { icon: ArrowUpRight, color: 'text-red-600 bg-red-100 border-red-200', label: t('types.OUT') };
            case 'TRANSFER': return { icon: ArrowRightLeft, color: 'text-orange-600 bg-orange-100 border-orange-200', label: t('types.TRANSFER') };
            case 'RETURN': return { icon: RefreshCcw, color: 'text-purple-600 bg-purple-100 border-purple-200', label: t('types.RETURN') };
            default: return { icon: History, color: 'text-gray-600 bg-gray-100 border-gray-200', label: type };
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon={History}
                title={<h1 className="text-3xl font-black tracking-tighter uppercase text-foreground">{t('title')}</h1>}
                isRtl={isRtl}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={filterType}
                        onChange={handleFilterTypeChange}
                        className="px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary"
                    >
                        <option value="ALL">{t('filters.all')}</option>
                        <option value="SALE">{t('filters.sale')}</option>
                        <option value="IN">{t('filters.in')}</option>
                        <option value="OUT">{t('filters.out')}</option>
                        <option value="TRANSFER">{t('filters.transfer')}</option>
                    </select>

                    <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-lg">
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            className="bg-transparent text-sm p-2 outline-none"
                            placeholder="From"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            className="bg-transparent text-sm p-2 outline-none"
                            placeholder="To"
                        />
                    </div>

                    <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50">
                        <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                        {t('refresh')}
                    </button>
                    </div>
                }
            />

            <div className="space-y-4">
                {loading && (
                    <div className="flex justify-center py-20"><Spinner size={32} className="text-muted-foreground" /></div>
                )}
                {!loading && transactions.length === 0 && (
                    <EmptyState icon={History} title={t('empty')} />
                )}
                {!loading && transactions.length > 0 && (
                    transactions.map((tx) => {
                        const { icon: Icon, color, label } = getTypeConfig(tx.type);
                        return (
                            <div key={tx.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row gap-4 justify-between">
                                    {/* Header: Type & Date */}
                                    <div className="flex items-start gap-4 min-w-[200px]">
                                        <div className={clsx("p-3 rounded-xl border", color)}>
                                            <Icon size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">{label}</h4>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                <Calendar size={12} />
                                                {new Date(tx.date).toLocaleString(locale)}
                                            </div>
                                            {tx.createdById && <div className="text-xs text-muted-foreground mt-0.5">{t('labels.by')} {tx.createdById}</div>}
                                        </div>
                                    </div>

                                    {/* Items List */}
                                    <div className="flex-1 space-y-2">
                                        {tx.items.map((item: TransactionItem) => (
                                            <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-secondary/20 rounded-lg">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Package size={14} className="text-muted-foreground" />
                                                    {item.product.name}
                                                    <span className="text-xs text-muted-foreground font-mono">({item.product.sku})</span>
                                                </div>
                                                <div className="font-bold font-mono">
                                                    x{item.quantity.toLocaleString(locale)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Locations */}
                                    <div className={clsx("min-w-[150px] space-y-2 text-sm", 'text-center')}>
                                        {(tx.fromLocation || tx.type === 'SALE' || tx.type === 'OUT') && (
                                            <div className={clsx("flex items-center gap-1.5 text-muted-foreground", locale === 'ar' ? "justify-start" : "justify-end")}>
                                                <span className="text-xs uppercase font-bold">{t('labels.from')}</span>
                                                <span className="font-medium text-foreground">{tx.fromLocation?.name || t('labels.unknown')}</span>
                                                <MapPin size={14} />
                                            </div>
                                        )}
                                        {tx.toLocation && (
                                            <div className={clsx("flex items-center gap-1.5 text-muted-foreground", locale === 'ar' ? "justify-start" : "justify-end")}>
                                                <span className="text-xs uppercase font-bold">{t('labels.to')}</span>
                                                <span className="font-medium text-foreground">{tx.toLocation?.name}</span>
                                                <MapPin size={14} className="text-green-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Pagination Controls */}
                <Pagination
                    currentPage={page}
                    totalPages={pagination.pages}
                    onPageChange={handlePageChange}
                    isRtl={isRtl}
                    disabled={loading}
                />
            </div>
        </div>
    );
}
