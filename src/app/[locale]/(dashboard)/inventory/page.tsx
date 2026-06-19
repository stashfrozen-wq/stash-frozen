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
import { PageHeader, Spinner } from '@/components/ui';

export default function InventoryPage() {
    const t = useTranslations('Stocktake');
    const { locale, isRtl } = useLocale();

    const [products, setProducts] = useState<Awaited<ReturnType<typeof getUnifiedProducts>>[1]>([]);
    const [categories, setCategories] = useState<Awaited<ReturnType<typeof getCategories>>>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'stockAsc' | 'stockDesc' | 'priceAsc' | 'priceDesc'>('name');

    // Expand states (for inventory breakdown)
    const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

    const loadData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const [[, prods], cats] = await Promise.all([
                getUnifiedProducts(1, 2000),
                getCategories()
            ]);
            setProducts(prods);
            setCategories(cats);
        } catch (err) {
            console.error("Failed to load inventory data", err);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(true);
    }, [loadData]);
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

        result.sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'stockAsc': return a.totalStock - b.totalStock;
                case 'stockDesc': return b.totalStock - a.totalStock;
                case 'priceAsc': return a.baseSellingPrice - b.baseSellingPrice;
                case 'priceDesc': return b.baseSellingPrice - a.baseSellingPrice;
                default: return 0;
            }
        });

        return result;
    }, [products, searchQuery, selectedCategory, sortBy]);

    // Summary stats based on loaded products (filtered or total)
    const totalProducts = products.length;
    const totalStockUnits = products.reduce((sum, p) => sum + p.totalStock, 0);
    const totalValueSelling = products.reduce((sum, p) => sum + (p.totalStock * p.baseSellingPrice), 0);
    const totalValueCost = products.reduce((sum, p) => sum + (p.totalStock * p.costPrice), 0);

    const exportToCSV = useCallback(() => {
        const headers = ['Name', 'SKU', 'Category', 'Stock Quantity', 'Cost Price', 'Selling Price'];
        const csvContent = [
            headers.join(','),
            ...filteredAndSortedProducts.map(p => 
                `"${p.name}","${p.sku || ''}","${p.categoryName}",${p.totalStock},${p.costPrice},${p.baseSellingPrice}`
            )
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory_count_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredAndSortedProducts]);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), []);
    const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCategory(e.target.value), []);
    const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as any), []);
    const toggleExpanded = useCallback((id: string) => setExpandedProductId(prev => prev === id ? null : id), []);

    const handleProductClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const id = e.currentTarget.dataset.productId;
        if (id) toggleExpanded(id);
    }, [toggleExpanded]);

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
                icon={Layers}
                title={
                    <div className={clsx("text-left", isRtl && "text-right")}>
                        <h1 className="text-2xl font-black tracking-tighter uppercase text-foreground">{t('tabView')}</h1>
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
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-xl font-bold hover:bg-secondary/80 transition-all border border-border text-xs uppercase tracking-wider"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">{t('exportCSV')}</span>
                        </button>
                    </div>
                }
            />

            {/* Filters Section */}
            <div className="grid grid-cols-2 md:flex md:flex-row gap-2 w-full">
                <input
                    type="text"
                    placeholder={t('searchProductSku')}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium col-span-2 md:col-span-1 md:flex-1"
                />
                <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium cursor-pointer text-foreground md:flex-1"
                >
                    <option value="all">{t('filterAll')}</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium cursor-pointer text-foreground md:flex-1"
                >
                    <option value="name">{t('sortName')}</option>
                    <option value="stockAsc">{t('sortStockAsc')}</option>
                    <option value="stockDesc">{t('sortStockDesc')}</option>
                    <option value="priceDesc">{t('sortPriceDesc')}</option>
                    <option value="priceAsc">{t('sortPriceAsc')}</option>
                </select>
            </div>

            {/* List / Table Content */}
            <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Mobile list view */}
                    <div className="md:hidden grid grid-cols-2 gap-2">
                        {filteredAndSortedProducts.map(p => (
                            <div key={p.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                                <div 
                                    className="p-2.5 flex gap-2.5 items-start cursor-pointer flex-1"
                                    data-product-id={p.id}
                                    onClick={handleProductClick}
                                >
                                    <div className="flex flex-col items-center gap-1.5 shrink-0 mt-0.5">
                                        <div className={clsx(
                                            "w-9 h-9 flex items-center justify-center rounded-lg font-black text-sm shadow-sm",
                                            (() => {
                                                if (p.totalStock <= 0) return "bg-red-500 text-white";
                                                if (p.totalStock < 5) return "bg-red-400 text-white";
                                                if (p.totalStock < 20) return "bg-amber-400 text-amber-950";
                                                return "bg-emerald-500 text-white";
                                            })()
                                        )}>
                                            {p.totalStock}
                                        </div>
                                        <button className="text-muted-foreground p-0.5 hover:text-foreground bg-secondary/40 rounded-full">
                                            {expandedProductId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                    
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none">{p.categoryName}</span>
                                            <span className="font-bold text-xs leading-tight text-foreground line-clamp-1">{p.name}</span>
                                        </div>
                                        
                                        <div className="mt-1 flex flex-col gap-0.5">
                                            <div className="font-black text-foreground text-[13px]">
                                                {p.baseSellingPrice.toLocaleString(locale)} <span className="text-[10px]">{isRtl ? 'ج.م' : 'EGP'}</span>
                                            </div>
                                            {p.sku && <div className="text-[9px] text-muted-foreground font-mono truncate">{p.sku}</div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded location breakdown */}
                                {expandedProductId === p.id && p.locationBreakdown.length > 0 && (
                                    <div className="bg-secondary/20 p-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
                                        <div className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">{t('locations')}</div>
                                        <div className="space-y-2">
                                            {p.locationBreakdown.map((loc) => (
                                                <div key={loc.locationId} className="flex justify-between items-center bg-card p-2.5 rounded-xl border border-border shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                                        <span className="font-bold text-sm text-foreground">{loc.locationName}</span>
                                                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded font-black text-muted-foreground uppercase tracking-widest">{loc.locationType}</span>
                                                    </div>
                                                    <div className="font-black text-foreground">{loc.quantity}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop table view */}
                    <div className="hidden md:block bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                                    <tr>
                                        <th className={clsx("px-6 py-4 font-black", isRtl ? "text-right" : "text-left")}>{t('table.product')}</th>
                                        <th className="px-6 py-4 font-black text-center">{t('table.category')}</th>
                                        <th className="px-6 py-4 font-black text-center">SKU</th>
                                        <th className="px-6 py-4 font-black text-center">{isRtl ? 'سعر البيع' : 'Selling Price'}</th>
                                        <th className="px-6 py-4 font-black text-center">{isRtl ? 'المخزون الإجمالي' : 'Total Stock'}</th>
                                        <th className={clsx("px-6 py-4 font-black w-40", isRtl ? "text-left" : "text-right")}>{t('locations')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredAndSortedProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-secondary/10 transition-colors">
                                            <td className={clsx("px-6 py-4", isRtl ? "text-right" : "text-left")}>
                                                <div className="font-bold text-foreground">{p.name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-muted-foreground">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/50 text-muted-foreground border border-border">
                                                    {p.categoryName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm text-muted-foreground font-mono">
                                                {p.sku || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-foreground">
                                                {p.baseSellingPrice.toLocaleString(locale)} {isRtl ? 'ج.م' : 'EGP'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={clsx(
                                                    "inline-flex px-3 py-1 rounded-full font-bold text-sm",
                                                    (() => {
                                                        if (p.totalStock <= 0) return "bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400";
                                                        if (p.totalStock < 5) return "bg-red-50 text-red-600 dark:bg-red-950/10 dark:text-red-400";
                                                        if (p.totalStock < 20) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400";
                                                        return "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400";
                                                    })()
                                                )}>
                                                    {p.totalStock}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={clsx("flex flex-col gap-1 text-sm max-w-[140px]", isRtl ? "mr-auto" : "ml-auto")}>
                                                    {p.locationBreakdown.map(loc => (
                                                        <div key={loc.locationId} className="flex justify-between items-center px-2.5 py-1 bg-background rounded-lg border border-border shadow-sm text-xs">
                                                            <span className="truncate font-semibold text-muted-foreground text-left" title={loc.locationName}>{loc.locationName}</span>
                                                            <span className="font-bold ml-4 tabular-nums text-foreground">{loc.quantity}</span>
                                                        </div>
                                                    ))}
                                                    {p.locationBreakdown.length === 0 && (
                                                        <span className="text-muted-foreground text-center">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
