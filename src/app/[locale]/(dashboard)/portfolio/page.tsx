'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Clock, Check, X, Filter, ChevronDown } from 'lucide-react';
import { getStaffList, getStaffPortfolio } from '@/app/actions/staff';
import { getCurrentUser } from '@/app/actions/permissions';
import clsx from 'clsx';
import { Spinner, EmptyState, Card } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';
import type { StaffMember } from '@/types/shared';

type StatusFilter = 'ALL' | 'ACCEPTED' | 'PENDING_REVIEW' | 'DECLINED';
type PeriodFilter = 'all' | 'day' | 'week' | 'month';

interface PortfolioInvoice {
    id: string;
    date: string | Date;
    totalAmount: number;
    paymentMethod: string;
    status: string;
    customerName: string | null;
    customerPhone: string | null;
    reviewNote: string | null;
    reviewer: { id: string; name: string | null; username: string } | null;
    revisedFrom: { id: string } | null;
    revisedBy: { id: string }[];
    items: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        product: { name: string; sku: string; unit?: string | null };
    }>;
}

const StatusBadge = ({ status }: { status: string }) => {
    const t = useTranslations('Portfolio');
    if (status === 'ACCEPTED') {
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-1"><Check size={12} /> {t('statusAccepted')}</span>;
    }
    if (status === 'PENDING_REVIEW') {
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1"><Clock size={12} /> {t('statusPending')}</span>;
    }
    if (status === 'DECLINED') {
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20 flex items-center gap-1"><X size={12} /> {t('statusDeclined')}</span>;
    }
    return null;
};

export default function PortfolioPage() {
    const t = useTranslations('Portfolio');
    const ts = useTranslations('Sales');
    const { locale } = useLocale();

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [invoices, setInvoices] = useState<PortfolioInvoice[]>([]);
    const [statusCounts, setStatusCounts] = useState({ pending: 0, accepted: 0, declined: 0 });
    const [acceptedTotal, setAcceptedTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    useEffect(() => {
        Promise.all([getStaffList(), getCurrentUser()]).then(([staffList, user]) => {
            setStaff(staffList as StaffMember[]);
            if (user) {
                setSelectedStaffId(user.id);
                setCurrentUserRole(user.role);
            }
            setLoading(false);
        });
    }, []);

    const loadPortfolio = useCallback(async () => {
        if (!selectedStaffId) return;
        setDataLoading(true);
        try {
            const data = await getStaffPortfolio(selectedStaffId, {
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                period: periodFilter
            });
            setInvoices(data.invoices as PortfolioInvoice[]);
            setStatusCounts(data.statusCounts);
            setAcceptedTotal(data.acceptedTotal);
        } catch (err) {
            console.error('Failed to load portfolio', err);
        } finally {
            setDataLoading(false);
        }
    }, [selectedStaffId, statusFilter, periodFilter]);

    useEffect(() => {
        if (selectedStaffId) {
            loadPortfolio();
        }
    }, [loadPortfolio]);

    const handleStaffChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStaffId(e.target.value);
    }, []);

    const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value as StatusFilter);
    }, []);

    const handlePeriodFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setPeriodFilter(e.target.value as PeriodFilter);
    }, []);

    const handleToggleExpand = useCallback((id: string) => {
        setExpandedId(prev => prev === id ? null : id);
    }, []);

    const handleInvoiceClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) handleToggleExpand(id);
    }, [handleToggleExpand]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
                {currentUserRole !== 'SALESPERSON' && (
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-muted-foreground" />
                    <select
                        value={selectedStaffId}
                        onChange={handleStaffChange}
                        className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                    >
                        {staff.map(s => (
                            <option key={s.id} value={s.id}>{s.name || s.username}</option>
                        ))}
                    </select>
                </div>
                )}
                <select
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="ALL">{t('filterAll')}</option>
                    <option value="ACCEPTED">{t('statusAccepted')}</option>
                    <option value="PENDING_REVIEW">{t('statusPending')}</option>
                    <option value="DECLINED">{t('statusDeclined')}</option>
                </select>
                <select
                    value={periodFilter}
                    onChange={handlePeriodFilterChange}
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                >
                    <option value="all">{t('periodAll')}</option>
                    <option value="day">{t('periodDay')}</option>
                    <option value="week">{t('periodWeek')}</option>
                    <option value="month">{t('periodMonth')}</option>
                </select>
            </div>


            {/* Invoice List */}
            {dataLoading ? (
                <div className="flex justify-center p-12">
                    <Spinner size={32} />
                </div>
            ) : invoices.length === 0 ? (
                <EmptyState icon={FileText} title={t('empty')} />
            ) : (
                <div className="space-y-3">
                    {invoices.map(inv => (
                        <div key={inv.id} className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                            <div
                                data-id={inv.id}
                                onClick={handleInvoiceClick}
                                className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={clsx(
                                        "p-2 rounded-lg shrink-0",
                                        inv.status === 'ACCEPTED' && "bg-green-500/5 text-green-600",
                                        inv.status === 'PENDING_REVIEW' && "bg-amber-500/5 text-amber-600",
                                        inv.status === 'DECLINED' && "bg-red-500/5 text-red-600",
                                    )}>
                                        <FileText size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-bold text-base truncate">
                                            {inv.customerName || t('walkIn')}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                            <span>{new Date(inv.date).toLocaleDateString(locale)}</span>
                                            <span>•</span>
                                            <span className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">#{inv.id.slice(0, 8).toUpperCase()}</span>
                                            {inv.reviewer && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-[10px]">{t('reviewedBy')} {inv.reviewer.name || inv.reviewer.username}</span>
                                                </>
                                                    )}
                                                    {inv.revisedBy.length > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-[10px] text-blue-600 font-bold">{t('revisedBadge')}</span>
                                                        </>
                                                    )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <StatusBadge status={inv.status} />
                                    <div className="text-end">
                                        <div className="font-black text-sm text-primary whitespace-nowrap">{ts('currency')} {inv.totalAmount.toLocaleString(locale)}</div>
                                        <div className="text-[10px] text-muted-foreground">{inv.paymentMethod}</div>
                                    </div>
                                    <ChevronDown size={16} className={clsx("text-muted-foreground transition-transform", expandedId === inv.id && "rotate-180")} />
                                </div>
                            </div>

                            {/* Expanded details */}
                            {expandedId === inv.id && (
                                <div className="border-t border-border/50 p-5 bg-secondary/10 space-y-3">
                                    {inv.reviewNote && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                            <span className="font-bold">{t('declineReason')}: </span>{inv.reviewNote}
                                        </div>
                                    )}
                                    {inv.revisedFrom && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
                                            {t('revisedFrom')} #{inv.revisedFrom.id.slice(0, 8).toUpperCase()}
                                        </div>
                                    )}
                                    {inv.revisedBy.length > 0 && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                                            {t('revisedTo')} #{inv.revisedBy[0].id.slice(0, 8).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        {inv.items.map((item, idx) => (
                                            <div key={item.id || idx} className="flex justify-between items-center p-2 bg-background rounded-lg text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground tabular-nums">{idx + 1}</span>
                                                    <span className="font-bold">{item.product.name}</span>
                                                    <span className="text-muted-300">×{item.quantity}</span>
                                                </div>
                                                <div className="font-bold tabular-nums">{ts('currency')} {item.subtotal.toLocaleString(locale)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
