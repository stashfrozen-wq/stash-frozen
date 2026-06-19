/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Wallet } from 'lucide-react';
import { getProfitReport } from '@/app/actions/profits';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { PageHeader, StatCard, DateRangeFilter, Spinner } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';

interface Invoice {
    id: string;
    date: string | Date;
    customerName?: string | null;
    totalAmount: number | string;
}

export default function ProfitsTab() {
    const t = useTranslations('Profits');
    const ts = useTranslations('Sales');
    const { locale, isRtl } = useLocale();

    const [recentSales, setRecentSales] = useState<Invoice[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [estimatedCost, setEstimatedCost] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [profit, setProfit] = useState(0);
    const [margin, setMargin] = useState(0);
    const [loading, setLoading] = useState(true);

    // Date Filter
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        setLoading(true);
        getProfitReport({ startDate, endDate }).then((data) => {
            setTotalRevenue(data.totalRevenue);
            setEstimatedCost(data.totalCost);
            setTotalExpenses(data.totalExpenses || 0);
            setProfit(data.netProfit);
            setMargin(data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue * 100) : 0);
            setRecentSales(data.recentSales);
            setLoading(false);
        });
    }, [startDate, endDate]);

    const handleToggleDateFilter = useCallback(() => setShowDateFilter(prev => !prev), []);
    const handleClearDates = useCallback(() => { setStartDate(''); setEndDate(''); }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                icon={TrendingUp}
                title={<h2 className="text-xl font-bold tracking-tight text-foreground">{t('title')}</h2>}
                isRtl={isRtl}
                actions={
                    <button
                        onClick={handleToggleDateFilter}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 border rounded-xl transition-all font-bold text-xs uppercase tracking-widest active:scale-95",
                            showDateFilter ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-card border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Calendar size={16} />
                        {t('dateRange')}
                    </button>
                }
            />

            {showDateFilter && (
                <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={handleClearDates}
                    isRtl={isRtl}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={DollarSign} label={t('stats.totalRevenue')} value={totalRevenue.toLocaleString(locale)} currency={ts('currency')} color="green" isRtl={isRtl} loading={loading} />
                <StatCard icon={TrendingDown} label={t('stats.estimatedCost')} value={estimatedCost.toLocaleString(locale)} currency={ts('currency')} color="red" isRtl={isRtl} loading={loading} />
                <StatCard icon={Wallet} label={t('stats.totalExpenses')} value={totalExpenses.toLocaleString(locale)} currency={ts('currency')} color="amber" isRtl={isRtl} loading={loading} />

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm group hover:border-primary/50 transition-all relative overflow-hidden">
                    <div className={clsx("absolute top-0 w-1 h-full bg-primary opacity-20", isRtl ? "right-0" : "left-0")} />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:scale-110 transition-transform">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {t('stats.netProfit', { margin: margin.toLocaleString(locale, { maximumFractionDigits: 1 }) })}
                        </span>
                    </div>
                    <div className={clsx("text-3xl font-black text-primary tabular-nums flex items-center gap-2", isRtl ? "flex-row-reverse" : "flex-row")}>
                        <span className="text-sm font-bold">{ts('currency')}</span>
                        {loading ? <Spinner size={24} /> : profit.toLocaleString(locale)}
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border bg-secondary/10 flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-wider">{t('recentSales')}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/30 text-muted-foreground border-b border-border">
                            <tr>
                                <th className={clsx("px-6 py-4 font-black text-[10px] uppercase tracking-widest", 'text-center')}>{t('table.invoice')}</th>
                                <th className={clsx("px-6 py-4 font-black text-[10px] uppercase tracking-widest", 'text-center')}>{t('table.date')}</th>
                                <th className={clsx("px-6 py-4 font-black text-[10px] uppercase tracking-widest", 'text-center')}>{t('table.customer')}</th>
                                <th className={clsx("px-6 py-4 font-black text-[10px] uppercase tracking-widest", 'text-center')}>{t('table.amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Spinner size={32} className="text-primary" />
                                            <span className="font-bold uppercase text-xs tracking-widest">{t('loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && recentSales.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-black uppercase text-xs tracking-widest">
                                        {t('noSales')}
                                    </td>
                                </tr>
                            )}
                            {!loading && recentSales.length > 0 && recentSales.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-muted/50 transition-colors">
                                    <td className={clsx("px-6 py-4 font-bold text-foreground", 'text-center')}>
                                        #{parseInt(invoice.id.slice(-4), 16).toString()}
                                    </td>
                                    <td className={clsx("px-6 py-4 font-mono text-xs text-muted-foreground", 'text-center')}>
                                        {new Date(invoice.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </td>
                                    <td className={clsx("px-6 py-4 font-black", 'text-center')}>
                                        {invoice.customerName || t('table.cashCustomer')}
                                    </td>
                                    <td className={clsx("px-6 py-4 font-mono font-black text-foreground tabular-nums", 'text-center')}>
                                        {Number(invoice.totalAmount).toLocaleString(locale)} {ts('currency')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
