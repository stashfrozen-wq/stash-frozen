/* eslint-disable sonarjs/cognitive-complexity */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/hooks/useLocale';
import { 
    Package, Search, Filter, Download, ChevronDown, ChevronUp, 
    Loader2, BarChart3, TrendingUp, DollarSign, Layers, 
    RefreshCcw, Save, ClipboardCheck 
} from 'lucide-react';
import clsx from 'clsx';
import { getUnifiedProducts, getCategories } from '@/app/actions/inventory';
import { reconcileStock, StockAdjustment } from '@/app/actions/stocktake';
import { PageHeader, Spinner } from '@/components/ui';

export default function StocktakePage() {
    const t = useTranslations('Stocktake');
    const { locale, isRtl } = useLocale();

    const [products, setProducts] = useState<Awaited<ReturnType<typeof getUnifiedProducts>>[1]>([]);
    const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingSingleId, setSavingSingleId] = useState<string | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Map of productId -> actualStock count input
    const [counts, setCounts] = useState<Record<string, number>>({});

    const loadData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const [[, prods], cats] = await Promise.all([
                getUnifiedProducts(1, 2000),
                getCategories()
            ]);
            setProducts(prods);
            setCategories(cats);

            // Initialize/sync counts with current stock only for products that don't have adjustments yet
            setCounts(prev => {
                const newCounts = { ...prev };
                prods.forEach(p => {
                    if (newCounts[p.id] === undefined) {
                        newCounts[p.id] = p.totalStock;
                    }
                });
                return newCounts;
            });
        } catch (err) {
            console.error("Failed to load inventory data", err);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCountChange = useCallback((id: string, value: string) => {
        const num = parseInt(value);
        if (!isNaN(num)) {
            setCounts(prev => ({ ...prev, [id]: Math.max(0, num) }));
        }
    }, []);

    const handleCountChangeCb = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const id = e.target.dataset.id;
        if (id) {
            handleCountChange(id, e.target.value);
        }
    }, [handleCountChange]);

    const handleFocusSelect = useCallback((e: React.FocusEvent<HTMLInputElement>) => e.target.select(), []);

    const getAdjustments = useCallback((): StockAdjustment[] => {
        const adjustments: StockAdjustment[] = [];
        products.forEach(p => {
            const actual = counts[p.id];
            if (actual !== undefined && actual !== p.totalStock) {
                adjustments.push({
                    productId: p.id,
                    currentStock: p.totalStock,
                    actualStock: actual
                });
            }
        });
        return adjustments;
    }, [products, counts]);

    const adjustments = useMemo(() => getAdjustments(), [getAdjustments]);
    const hasAdjustments = adjustments.length > 0;

    const handleSave = useCallback(async () => {
        if (!hasAdjustments) return;

        const confirmed = window.confirm(
            t('confirmMessage', { count: adjustments.length })
        );

        if (!confirmed) return;

        setSaving(true);
        try {
            const res = await reconcileStock(adjustments);
            if (res && 'success' in res && res.success === false) {
                alert(res.error || t('error'));
            } else {
                alert(t('success'));
                // Clear adjustments and reload
                setCounts({});
                await loadData(true);
            }
        } catch (error) {
            alert(t('error'));
            console.error(error);
        } finally {
            setSaving(false);
        }
    }, [hasAdjustments, adjustments, loadData, t]);

    const handleSaveSingle = useCallback(async (productId: string, actualStock: number, currentStock: number) => {
        setSavingSingleId(productId);
        try {
            const res = await reconcileStock([{ productId, currentStock, actualStock }]);
            if (res && 'success' in res && res.success === false) {
                alert(res.error || t('error'));
            } else {
                await loadData(false);
            }
        } catch (error) {
            alert(t('error'));
            console.error(error);
        } finally {
            setSavingSingleId(null);
        }
    }, [loadData, t]);

    // Filtered products for display
    const filteredAndSortedProducts = useMemo(() => {
        let result = products;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(q) || 
                (p.sku && p.sku.toLowerCase().includes(q))
            );
        }

        if (selectedCategory !== 'all') {
            result = result.filter(p => p.categoryId === selectedCategory);
        }

        result.sort((a, b) => a.name.localeCompare(b.name));

        return result;
    }, [products, searchQuery, selectedCategory]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), []);
    const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value), []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Spinner size={40} label={t('table.loading')} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Page Header */}
            <PageHeader
                icon={ClipboardCheck}
                title={
                    <div className={clsx("text-left", isRtl && "text-right")}>
                        <h1 className="text-2xl font-black tracking-tighter uppercase text-foreground">{t('title')}</h1>
                        <p className="text-muted-foreground text-sm font-bold">{t('subtitle')}</p>
                    </div>
                }
                isRtl={isRtl}
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => loadData(true)}
                            className="p-3 text-muted-foreground hover:bg-secondary rounded-xl transition-colors border border-border bg-card"
                            title={t('refresh')}
                        >
                            <RefreshCcw size={18} />
                        </button>

                        {hasAdjustments && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-bold shadow-lg shadow-primary/20 text-xs uppercase tracking-wider active:scale-95 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        {t('submit', { 
                                            count: adjustments.length,
                                            plural: adjustments.length !== 1 ? 'other' : 'one'
                                        })}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                }
            />

            {/* Filters Section */}
            <div className="flex flex-row gap-2 w-full">
                <input
                    type="text"
                    placeholder={t('searchProductSku')}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium flex-1"
                />
                <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium cursor-pointer text-foreground flex-1"
                >
                    <option value="all">{t('filterAll')}</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* List / Table Content */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-secondary/30 text-muted-foreground font-semibold border-b border-border">
                                <tr>
                                    <th className={clsx("px-2 sm:px-6 py-4", isRtl ? "text-right" : "text-left")}>{t('table.product')}</th>
                                    <th className="px-2 sm:px-6 py-4 text-center hidden md:table-cell">{t('table.category')}</th>
                                    <th className="px-2 sm:px-6 py-4 text-center">{t('table.systemStock')}</th>
                                    <th className="px-2 sm:px-6 py-4 text-center w-24 sm:w-32">{t('table.actualCount')}</th>
                                    <th className="px-2 sm:px-6 py-4 text-center">{t('table.diff')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredAndSortedProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            {t('table.noResults')}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedProducts.map(product => {
                                        const actual = counts[product.id] ?? product.totalStock;
                                        const diff = actual - product.totalStock;
                                        const hasDiff = diff !== 0;

                                        return (
                                            <tr key={product.id} className={clsx(
                                                "transition-colors",
                                                hasDiff ? "bg-yellow-500/5 hover:bg-yellow-500/10" : "hover:bg-muted/50"
                                            )}>
                                                <td className={clsx("px-2 sm:px-6 py-4 font-semibold text-foreground", isRtl ? "text-right" : "text-left")}>
                                                    <div>{product.name}</div>
                                                    {hasDiff && (
                                                        <span className={clsx(
                                                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 mt-1",
                                                            isRtl ? "ml-2" : "mr-2"
                                                        )}>
                                                            {t('table.modified')}
                                                        </span>
                                                    )}
                                                    {product.locationBreakdown.length > 1 && (
                                                        <div className="text-[10px] text-muted-foreground mt-1">
                                                            {product.locationBreakdown.map(l => `${l.locationName}: ${l.quantity.toLocaleString(locale)}`).join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-2 sm:px-6 py-4 text-center hidden md:table-cell">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/50 text-muted-foreground border border-border">
                                                        {product.categoryName}
                                                    </span>
                                                </td>
                                                <td className="px-2 sm:px-6 py-4 text-center font-bold text-foreground">
                                                    {product.totalStock.toLocaleString(locale)}
                                                </td>
                                                <td className="px-2 sm:px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={actual}
                                                            data-id={product.id}
                                                            onChange={handleCountChangeCb}
                                                            className={clsx(
                                                                "w-16 sm:w-20 px-1 sm:px-2 py-1.5 text-center font-bold rounded-lg border outline-none focus:ring-2 transition-all",
                                                                hasDiff
                                                                    ? "border-yellow-500 text-yellow-600 bg-background focus:ring-yellow-500/20"
                                                                    : "border-input bg-muted/30 focus:bg-background focus:ring-primary/20 focus:border-primary"
                                                            )}
                                                            onFocus={handleFocusSelect}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-6 py-4 text-center font-black">
                                                    {diff === 0 ? (
                                                        <span className="text-muted-foreground/30">—</span>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className={clsx(
                                                                "font-black text-sm",
                                                                diff > 0 ? "text-green-600" : "text-red-500"
                                                            )}>
                                                                {diff > 0 ? '+' : ''}{diff.toLocaleString(locale)}
                                                            </span>
                                                            <button 
                                                                onClick={() => handleSaveSingle(product.id, actual, product.totalStock)}
                                                                disabled={savingSingleId === product.id}
                                                                className="text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {savingSingleId === product.id && <Loader2 size={10} className="animate-spin" />}
                                                                {isRtl ? 'اعتماد التعديل' : 'Mark as Fixed'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            {filteredAndSortedProducts.length === 0 && (
                <div className="text-center py-20 bg-card rounded-2xl border border-border shadow-sm">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-bold">{t('noProducts')}</h3>
                    <p className="text-muted-foreground text-sm">{t('adjustFilters')}</p>
                </div>
            )}
        </div>
    );
}
