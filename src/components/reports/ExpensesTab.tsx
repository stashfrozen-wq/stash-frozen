'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/hooks/useLocale';
import { getExpenses, createExpense, deleteExpense, getSalaryReport, getMonthlyExpenseSummary } from '@/app/actions/expenses';
import { getStaffList } from '@/app/actions/sales';
import {
    Plus, Trash2, Calendar, DollarSign, Tag, Search, FileText,
    Percent, Briefcase, Receipt, ChevronLeft, ChevronRight, BarChart3
} from 'lucide-react';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

interface Expense {
    id: string;
    description: string;
    amount: number;
    userId: string;
    userName: string;
    category: string | null;
    date: string;
}

interface StaffMember {
    id: string;
    name: string | null;
    username: string;
}

interface CategoryBreakdownRow {
    category: string;
    count: number;
    total: number;
}

interface MonthlySummary {
    year: number;
    months: { month: number; monthName: string; total: number; categories: Record<string, number> }[];
    grandTotal: number;
}

const EXPENSE_CATEGORIES = ['SALARY', 'Utilities', 'Supplies', 'Maintenance', 'Other'] as const;

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

function categoryBadgeVariant(cat: string): BadgeVariant {
    switch (cat.toUpperCase()) {
        case 'SALARY': return 'info';
        case 'UTILITIES': return 'warning';
        case 'SUPPLIES': return 'success';
        case 'MAINTENANCE': return 'primary';
        default: return 'default';
    }
}

function ShareBar({ percent }: { percent: number }) {
    const style = useMemo(() => ({ width: `${Math.min(Math.max(percent, 0), 100)}%` }), [percent]);
    return (
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={style} />
        </div>
    );
}

const EMPTY_FORM = {
    description: '',
    amount: '',
    userId: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
};

export default function ExpensesTab() {
    const t = useTranslations('Expenses');
    const ts = useTranslations('Sales');
    const { locale, isRtl } = useLocale();

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [users, setUsers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownRow[]>([]);
    const [metrics, setMetrics] = useState({ salaryTotal: 0, nonSalaryTotal: 0, grandTotal: 0, salaryPercent: 0 });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalServerItems, setTotalServerItems] = useState(0);
    const ITEMS_PER_PAGE = 50;

    // New Expense modal
    const [showForm, setShowForm] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    // Filters
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Monthly summary
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
    const [loadingMonthly, setLoadingMonthly] = useState(false);

    // Debounce the search term before hitting the server
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => clearTimeout(id);
    }, [search]);

    // A new search always starts from the first page
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [expData, staff] = await Promise.all([
            getExpenses(currentPage, ITEMS_PER_PAGE, dateRange.start, dateRange.end, categoryFilter, debouncedSearch),
            getStaffList()
        ]);
        setExpenses(expData.expenses);
        setTotalServerItems(expData.totalCount);
        setMetrics({
            salaryTotal: expData.salaryTotal,
            nonSalaryTotal: expData.nonSalaryTotal,
            grandTotal: expData.grandTotal,
            salaryPercent: expData.salaryPercent
        });
        setCategoryBreakdown(expData.categoryBreakdown);
        setUsers(staff);
        setLoading(false);
    }, [currentPage, dateRange.start, dateRange.end, categoryFilter, debouncedSearch]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        setLoadingMonthly(true);
        getMonthlyExpenseSummary(selectedYear).then(data => {
            setMonthlySummary(data);
            setLoadingMonthly(false);
        });
    }, [selectedYear]);

    const handlePrevYear = useCallback(() => setSelectedYear(y => y - 1), []);
    const handleNextYear = useCallback(() => setSelectedYear(y => y + 1), []);

    const resetForm = useCallback(() => {
        setFormData({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
        setFormError(null);
    }, []);

    const handleOpenForm = useCallback(() => {
        resetForm();
        setShowForm(true);
    }, [resetForm]);

    const handleCloseForm = useCallback(() => {
        setShowForm(false);
        setFormError(null);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);
        try {
            const res = await createExpense({
                description: formData.description,
                amount: parseFloat(formData.amount),
                userId: formData.userId,
                category: formData.category,
                date: formData.date
            });
            if (res.success) {
                setShowForm(false);
                resetForm();
                await loadData();
            } else {
                setFormError(t('alerts.createFailed'));
            }
        } catch (error) {
            console.error(error);
            setFormError(t('alerts.createFailed'));
        } finally {
            setSubmitting(false);
        }
    }, [formData, loadData, resetForm, t]);

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await deleteExpense(deleteTarget.id);
            if (res.success) {
                setDeleteTarget(null);
                await loadData();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setDeleting(false);
        }
    }, [deleteTarget, loadData]);

    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, start: e.target.value }));
        setCurrentPage(1);
    }, []);
    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, end: e.target.value }));
        setCurrentPage(1);
    }, []);
    const handleCategoryFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setCategoryFilter(e.target.value);
        setCurrentPage(1);
    }, []);
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
    const handleClearFilters = useCallback(() => {
        setDateRange({ start: '', end: '' });
        setCategoryFilter('ALL');
        setSearch('');
        setCurrentPage(1);
    }, []);

    const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, description: e.target.value })), []);
    const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (v === '') return setFormData(prev => ({ ...prev, amount: '' }));
        setFormData(prev => ({ ...prev, amount: String(Math.max(0, Number(v) || 0)) }));
    }, []);
    const handleUserIdChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, userId: e.target.value })), []);
    const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, category: e.target.value })), []);
    const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, date: e.target.value })), []);

    const handleDeleteClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        const target = expenses.find(x => x.id === id);
        if (target) setDeleteTarget(target);
    }, [expenses]);

    const handleCancelDelete = useCallback(() => setDeleteTarget(null), []);
    const handlePrevPage = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
    const handleNextPage = useCallback(() => setCurrentPage(p => p + 1), []);

    const categoryLabel = useCallback((cat: string) =>
        (EXPENSE_CATEGORIES as readonly string[]).includes(cat)
            ? t(`categoriesList.${cat}` as 'categoriesList.SALARY')
            : cat, [t]);

    const salaryBarStyle = useMemo(
        () => ({ width: `${Math.min(metrics.salaryPercent, 100)}%` }),
        [metrics.salaryPercent]
    );

    const totalPages = Math.ceil(totalServerItems / ITEMS_PER_PAGE);
    const currency = ts('currency');
    const hasActiveFilters = !!(dateRange.start || dateRange.end || categoryFilter !== 'ALL' || search);

    const handleExportSalaryPdf = useCallback(async () => {
        if (!dateRange.start || !dateRange.end) {
            alert(t('alerts.selectDateRange'));
            return;
        }
        setGeneratingPdf(true);
        try {
            const report = await getSalaryReport(dateRange.start, dateRange.end);

            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            const html = `<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
<title>${t('report.title')}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
    body { font-family: 'Inter', sans-serif; max-width: 1000px; margin: 0 auto; padding: 60px; color: #1a1a1a; line-height: 1.5; }
    h1 { text-align: center; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; font-size: 32px; border-bottom: 4px solid #3b82f6; padding-bottom: 20px; margin-bottom: 40px; }
    .period { text-align: center; color: #6b7280; font-weight: 700; margin-bottom: 40px; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; }
    .summary { background: #f3f4f6; padding: 30px; border-radius: 20px; margin-bottom: 40px; display: flex; justify-content: space-around; }
    .summary-item { text-align: center; }
    .summary-item .value { font-size: 28px; font-weight: 900; color: #3b82f6; }
    .summary-item .label { font-size: 10px; color: #6b7280; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 5px; }
    .employee { margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
    .employee-header { background: #1f2937; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    .employee-header span:first-child { font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
    .employee-header span:last-child { font-weight: 900; font-size: 18px; }
    .employee-entries { padding: 0; }
    .entry { display: flex; justify-content: space-between; padding: 12px 24px; border-bottom: 1px solid #f3f4f6; }
    .entry:last-child { border-bottom: none; }
    .entry span:first-child { font-family: monospace; color: #6b7280; }
    .entry span:nth-child(2) { font-weight: 700; }
    .entry span:last-child { font-weight: 900; color: #ef4444; }
    @media print { body { padding: 20px; } .employee { break-inside: avoid; } }
</style></head><body>
<h1>${t('report.title')}</h1>
<div class="period">${t('report.period', { start: new Date(report.period.startDate).toLocaleDateString(locale), end: new Date(report.period.endDate).toLocaleDateString(locale) })}</div>
<div class="summary">
    <div class="summary-item"><div class="value">${currency} ${report.grandTotal.toLocaleString(locale)}</div><div class="label">${t('report.totalSalaries')}</div></div>
    <div class="summary-item"><div class="value">${report.employees.length.toLocaleString(locale)}</div><div class="label">${t('report.employees')}</div></div>
</div>
${report.employees.map(emp => `
<div class="employee">
    <div class="employee-header">
        <span>${emp.name}</span>
        <span>${currency} ${emp.total.toLocaleString(locale)}</span>
    </div>
    <div class="employee-entries">
        ${emp.entries.map(e => `
        <div class="entry">
            <span>${new Date(e.date).toLocaleDateString(locale)}</span>
            <span>${e.description}</span>
            <span>${currency} ${e.amount.toLocaleString(locale)}</span>
        </div>`).join('')}
    </div>
</div>`).join('')}
</body></html>`;

            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => printWindow.print(), 500);
        } catch (err) {
            console.error(err);
            alert(t('alerts.reportFailed'));
        } finally {
            setGeneratingPdf(false);
        }
    }, [dateRange, locale, t, isRtl, currency]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <Receipt size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">{t('title')}</h2>
                        <p className="text-xs text-muted-foreground font-medium">{t('subtitle')}</p>
                    </div>
                </div>
                <div className={clsx('flex items-center gap-2', isRtl && 'flex-row-reverse')}>
                    <Button
                        variant="outline"
                        size="md"
                        icon={<FileText size={16} />}
                        onClick={handleExportSalaryPdf}
                        loading={generatingPdf}
                    >
                        {t('buttons.salaryPdf')}
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        icon={<Plus size={16} />}
                        onClick={handleOpenForm}
                    >
                        {t('buttons.newExpense')}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary"><DollarSign size={18} /></div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('metrics.totalSpend')}</span>
                    </div>
                    <div className={clsx('text-2xl font-black tabular-nums flex items-center gap-1 text-primary', isRtl && 'flex-row-reverse')}>
                        <span className="text-sm font-bold opacity-60">{currency}</span>
                        <span>{metrics.grandTotal.toLocaleString(locale)}</span>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/20 rounded-lg"><Briefcase size={18} /></div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('metrics.salaryTotal')}</span>
                    </div>
                    <div className={clsx('text-2xl font-black tabular-nums text-blue-600 flex items-center gap-1', isRtl && 'flex-row-reverse')}>
                        <span className="text-sm font-bold opacity-60">{currency}</span>
                        <span>{metrics.salaryTotal.toLocaleString(locale)}</span>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/20 rounded-lg"><Tag size={18} /></div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('metrics.otherExpenses')}</span>
                    </div>
                    <div className={clsx('text-2xl font-black tabular-nums text-amber-600 flex items-center gap-1', isRtl && 'flex-row-reverse')}>
                        <span className="text-sm font-bold opacity-60">{currency}</span>
                        <span>{metrics.nonSalaryTotal.toLocaleString(locale)}</span>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-950/20 rounded-lg"><Percent size={18} /></div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('metrics.salaryPercent')}</span>
                    </div>
                    <div className="flex items-end gap-3">
                        <span className="text-2xl font-black text-purple-600 tabular-nums">{metrics.salaryPercent.toLocaleString(locale)}%</span>
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-purple-500 rounded-full" style={salaryBarStyle} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={handleStartDateChange}
                                className="ps-9 pe-3 py-2 bg-background border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                        <span className="text-muted-foreground font-bold text-xs">—</span>
                        <div className="relative">
                            <Calendar size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={handleEndDateChange}
                                className="ps-9 pe-3 py-2 bg-background border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                    </div>

                    <select
                        value={categoryFilter}
                        onChange={handleCategoryFilterChange}
                        className="px-3 py-2 bg-background border border-border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                    >
                        <option value="ALL">{t('categories.ALL')}</option>
                        {EXPENSE_CATEGORIES.map(c => (
                            <option key={c} value={c}>{categoryLabel(c)}</option>
                        ))}
                    </select>

                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder={t('search.placeholder')}
                            value={search}
                            onChange={handleSearchChange}
                            className="w-full ps-9 pe-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                    </div>

                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                            {t('buttons.clear')}
                        </Button>
                    )}

                    <span className={clsx('text-xs text-muted-foreground font-medium', isRtl ? 'mr-auto' : 'ml-auto')}>
                        {totalServerItems.toLocaleString(locale)}
                    </span>
                </div>
            </Card>

            {/* Category Breakdown */}
            <Card className="overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={18} className="text-primary" />
                        {t('breakdown.title')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{t('breakdown.subtitle')}</p>
                </div>
                {categoryBreakdown.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                        <Receipt size={36} className="mx-auto mb-2 opacity-20" />
                        <p className="font-bold text-sm">{t('breakdown.empty')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary/30 border-b border-border">
                                <tr>
                                    <th className="px-5 py-3 text-start font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('breakdown.category')}</th>
                                    <th className="px-5 py-3 text-end font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('breakdown.count')}</th>
                                    <th className="px-5 py-3 text-end font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('breakdown.total')}</th>
                                    <th className="px-5 py-3 text-start font-black text-[10px] uppercase tracking-widest text-muted-foreground w-1/3">{t('breakdown.share')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {categoryBreakdown.map(row => {
                                    const share = metrics.grandTotal > 0 ? (row.total / metrics.grandTotal) * 100 : 0;
                                    return (
                                        <tr key={row.category} className="hover:bg-muted/40 transition-colors">
                                            <td className="px-5 py-3">
                                                <Badge variant={categoryBadgeVariant(row.category)}>{categoryLabel(row.category)}</Badge>
                                            </td>
                                            <td className="px-5 py-3 text-end tabular-nums font-medium text-muted-foreground">{row.count.toLocaleString(locale)}</td>
                                            <td className="px-5 py-3 text-end">
                                                <span className={clsx('inline-flex items-center gap-1 font-black tabular-nums', isRtl && 'flex-row-reverse')}>
                                                    <span className="text-xs font-bold opacity-60">{currency}</span>
                                                    <span>{row.total.toLocaleString(locale)}</span>
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <ShareBar percent={share} />
                                                    <span className="text-xs tabular-nums font-bold text-muted-foreground w-12 text-end">{share.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Expenses Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/30 border-b border-border">
                            <tr>
                                <th className="px-5 py-3 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('table.date')}</th>
                                <th className="px-5 py-3 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('table.description')}</th>
                                <th className="px-5 py-3 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('table.category')}</th>
                                <th className="px-5 py-3 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('table.spentBy')}</th>
                                <th className="px-5 py-3 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('table.amount')}</th>
                                <th className="px-5 py-3 text-center font-black text-[10px] uppercase tracking-widest text-muted-foreground">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12">
                                        <Spinner size={32} label={t('table.loading')} />
                                    </td>
                                </tr>
                            )}
                            {!loading && expenses.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <Receipt size={36} className="mx-auto mb-2 opacity-20" />
                                        <p className="font-bold text-sm">{t('table.noResults')}</p>
                                    </td>
                                </tr>
                            )}
                            {!loading && expenses.map(exp => (
                                <tr key={exp.id} className="hover:bg-muted/40 transition-colors">
                                    <td className="px-5 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">
                                        {new Date(exp.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-5 py-3 text-center font-semibold text-foreground">{exp.description}</td>
                                    <td className="px-5 py-3 text-center">
                                        {exp.category ? (
                                            <Badge variant={categoryBadgeVariant(exp.category)}>{categoryLabel(exp.category)}</Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-center font-medium">{exp.userName}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={clsx('inline-flex items-center gap-1 font-mono font-black text-red-600 tabular-nums', isRtl && 'flex-row-reverse')}>
                                            <span className="text-xs">-</span>
                                            <span className="text-xs font-bold opacity-70">{currency}</span>
                                            <span>{exp.amount.toLocaleString(locale)}</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <button
                                            data-id={exp.id}
                                            onClick={handleDeleteClick}
                                            className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                                            aria-label={t('delete.title')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3 bg-secondary/10">
                        <span className="text-xs text-muted-foreground font-medium">
                            {t('table.pageInfo', { current: currentPage, total: totalPages })}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={handlePrevPage}
                                aria-label={t('buttons.previous')}
                            >
                                {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={handleNextPage}
                                aria-label={t('buttons.next')}
                            >
                                {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Monthly Summary */}
            <Card className="overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={18} className="text-primary" />
                        {t('monthly.title')}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevYear} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Previous year">
                            <ChevronLeft size={18} className={clsx(isRtl && 'rotate-180')} />
                        </button>
                        <span className="font-black text-lg tabular-nums min-w-[3rem] text-center">{selectedYear}</span>
                        <button onClick={handleNextYear} className="p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Next year">
                            <ChevronRight size={18} className={clsx(isRtl && 'rotate-180')} />
                        </button>
                    </div>
                </div>

                {loadingMonthly ? (
                    <div className="p-12 flex justify-center">
                        <Spinner size={32} label={t('table.loading')} />
                    </div>
                ) : monthlySummary && (
                    <div className="p-5 space-y-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {monthlySummary.months.map(m => (
                                <div
                                    key={m.month}
                                    className={clsx(
                                        'p-4 rounded-xl border',
                                        m.total > 0
                                            ? 'bg-card border-border'
                                            : 'bg-secondary/10 border-dashed border-border opacity-60'
                                    )}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{m.monthName}</div>
                                    <div className={clsx('text-base font-black tabular-nums', m.total > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                                        {m.total > 0 ? (
                                            <span className={clsx('inline-flex items-center gap-1', isRtl && 'flex-row-reverse')}>
                                                <span className="text-[10px] font-bold opacity-60">{currency}</span>
                                                <span>{m.total.toLocaleString(locale)}</span>
                                            </span>
                                        ) : '—'}
                                    </div>
                                    {m.total > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {Object.entries(m.categories).map(([cat, amt]) => (
                                                <div key={cat} className="flex items-center justify-between text-[10px] font-bold">
                                                    <span className="text-muted-foreground">{categoryLabel(cat)}</span>
                                                    <span className="tabular-nums text-muted-foreground">{amt.toLocaleString(locale)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 rounded-xl flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('monthly.grandTotal')}</span>
                            <span className={clsx('inline-flex items-center gap-1 text-xl font-black text-amber-600 tabular-nums', isRtl && 'flex-row-reverse')}>
                                <span className="text-sm font-bold opacity-60">{currency}</span>
                                <span>{monthlySummary.grandTotal.toLocaleString(locale)}</span>
                            </span>
                        </div>
                    </div>
                )}
            </Card>

            {/* New Expense Modal */}
            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={t('form.title')}
                icon={<Plus size={20} />}
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formError && (
                            <div className="col-span-2 p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900 rounded-lg text-red-600 text-sm font-medium">
                                {formError}
                            </div>
                        )}
                        <FormField label={t('form.description')} required className="col-span-2">
                            <Input
                                required
                                placeholder={t('form.descriptionPlaceholder')}
                                value={formData.description}
                                onChange={handleDescriptionChange}
                            />
                        </FormField>
                        <FormField label={t('form.amount', { currency })} required>
                            <Input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={handleAmountChange}
                                className="font-mono tabular-nums"
                            />
                        </FormField>
                        <FormField label={t('form.date')} required>
                            <Input
                                required
                                type="date"
                                value={formData.date}
                                onChange={handleDateChange}
                            />
                        </FormField>
                        <FormField label={t('form.whoSpent')} required>
                            <Select required value={formData.userId} onChange={handleUserIdChange}>
                                <option value="">{t('form.selectStaff')}</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name || u.username}</option>
                                ))}
                            </Select>
                        </FormField>
                        <FormField label={t('form.category')}>
                            <Select value={formData.category} onChange={handleCategoryChange}>
                                <option value="">{t('form.selectCategory')}</option>
                                {EXPENSE_CATEGORIES.map(c => (
                                    <option key={c} value={c}>{categoryLabel(c)}</option>
                                ))}
                            </Select>
                        </FormField>
                    </div>
                    <div className="p-6 border-t border-border flex gap-3 bg-secondary/5">
                        <Button type="button" variant="outline" fullWidth onClick={handleCloseForm}>
                            {t('form.cancel')}
                        </Button>
                        <Button type="submit" variant="primary" fullWidth loading={submitting} icon={<Receipt size={18} />}>
                            {t('form.save')}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={handleCancelDelete}
                onConfirm={confirmDelete}
                title={t('delete.title')}
                message={t('alerts.deleteConfirm')}
                confirmLabel={t('delete.confirm')}
                cancelLabel={t('form.cancel')}
                loading={deleting}
                danger
            />
        </div>
    );
}
