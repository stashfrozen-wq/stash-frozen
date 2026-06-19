'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Plus, Trash2, Search, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RefreshCcw, Settings, Edit, MapPin, Tag, Percent, X, Check, Printer } from 'lucide-react';
import { getUnifiedProducts, getCategories, createProduct, updateProduct, createCategory, deleteCategory, deleteProduct, bulkUpdatePricing } from '@/app/actions/inventory';
import clsx from 'clsx';
import { useTranslations, useLocale } from 'next-intl';
import { ProductModal } from '@/components/products/ProductModal';
import { CategoryModal } from '@/components/products/CategoryModal';
import { Spinner } from '@/components/ui';


export const dynamic = 'force-dynamic';

type SortField = 'name' | 'sku' | 'category' | 'stock' | 'cost' | 'sell' | 'margin' | 'percent';
type SortOrder = 'asc' | 'desc';

interface LocationBreakdown {
    locationId: string;
    locationName: string;
    locationType: string;
    quantity: number;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    categoryId: string;
    categoryName: string;
    costPrice: number;
    baseSellingPrice: number;
    unit: string;
    totalStock: number;
    percentOfTotal: number;
    locationBreakdown: LocationBreakdown[];
}

interface Category {
    id: string;
    name: string;
    _count?: { products: number };
}

const ITEMS_PER_PAGE = 15;

const getMarginColor = (margin: number) => {
    if (margin >= 20) return "bg-green-100 text-green-700";
    if (margin >= 10) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
};

export default function ProductsPage() {
    const t = useTranslations('Products');
    const ts = useTranslations('Sales');
    const tp = useTranslations('Pricing');
    const locale = useLocale();
    const isRtl = locale === 'ar';

    const [activeTab, setActiveTab] = useState<'stock' | 'pricing'>('stock');

    // Bulk Update State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkPercentage, setBulkPercentage] = useState<number | ''>('');
    const [bulkType, setBulkType] = useState<'markup' | 'increase'>('markup');
    const [bulkSubmitting, setBulkSubmitting] = useState(false);

    // Single Edit State (for quick pricing edit)
    const [isPriceEditModalOpen, setIsPriceEditModalOpen] = useState(false);
    const [editingPriceProduct, setEditingPriceProduct] = useState<Product | null>(null);
    const [editCost, setEditCost] = useState(0);
    const [editSell, setEditSell] = useState(0);
    const [editSubmitting, setEditSubmitting] = useState(false);

    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [productDeleteError, setProductDeleteError] = useState<string | null>(null);

    // Sorting state
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);

    // Category modal state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryError, setCategoryError] = useState<string | null>(null);
    const [categorySubmitting, setCategorySubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        categoryId: '',
        costPrice: 0,
        baseSellingPrice: 0,
        unit: 'piece',
        initialQuantity: 0
    });

    const [totalServerItems, setTotalServerItems] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [[total, prods], cats] = await Promise.all([
                getUnifiedProducts(currentPage, ITEMS_PER_PAGE, searchQuery), 
                getCategories()
            ]);
            setProducts(prods);
            setTotalServerItems(total);
            setCategories(cats);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, categoryFilter]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, categoryFilter, sortField, sortOrder]);

    const openAddModal = useCallback(() => {
        setIsEditMode(false);
        setEditingId(null);
        setFormData({ name: '', sku: '', categoryId: '', costPrice: 0, baseSellingPrice: 0, unit: 'piece', initialQuantity: 0 });
        setError(null);
        setIsModalOpen(true);
    }, []);

    const openEditModal = useCallback((product: Product) => {
        setIsEditMode(true);
        setEditingId(product.id);
        setFormData({
            name: product.name,
            sku: product.sku,
            categoryId: product.categoryId,
            costPrice: product.costPrice,
            baseSellingPrice: product.baseSellingPrice,
            unit: product.unit,
            initialQuantity: product.totalStock
        });
        setError(null);
        setIsModalOpen(true);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.sku || !formData.categoryId) return;
        setSubmitting(true);
        setError(null);
        try {
            let result;
            if (isEditMode && editingId) {
                const { name, sku, categoryId, costPrice, baseSellingPrice, unit } = formData;
                result = await updateProduct(editingId, { name, sku, categoryId, costPrice, baseSellingPrice, unit });
            } else {
                result = await createProduct(formData);
            }
            if (!result.success) {
                setError(result.error || t('errors.operationFailed'));
                return;
            }
            await fetchData();
            setIsModalOpen(false);
        } catch {
            setError(t('errors.connectionError'));
        } finally {
            setSubmitting(false);
        }
    }, [formData, isEditMode, editingId, fetchData, t]);

    const handleAddCategory = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setCategorySubmitting(true);
        setCategoryError(null);
        try {
            const result = await createCategory(newCategoryName.trim());
            if (!result.success) {
                setCategoryError(result.error || t('errors.categoryCreateFailed'));
                return;
            }
            setNewCategoryName('');
            await fetchData();
        } catch {
            setCategoryError(t('errors.connectionError'));
        } finally {
            setCategorySubmitting(false);
        }
    }, [newCategoryName, fetchData, t]);

    const handleDeleteCategory = useCallback(async (id: string) => {
        if (!confirm(t('manageCategories.deleteConfirm'))) return;
        setCategorySubmitting(true);
        setCategoryError(null);
        try {
            const result = await deleteCategory(id);
            if (!result.success) {
                setCategoryError(result.error || t('errors.categoryDeleteFailed'));
                return;
            }
            await fetchData();
        } catch {
            setCategoryError(t('errors.connectionError'));
        } finally {
            setCategorySubmitting(false);
        }
    }, [fetchData, t]);

    const handleDeleteProduct = useCallback(async (id: string) => {
        if (!confirm(t('manageCategories.deleteConfirm'))) return;
        setLoading(true);
        setProductDeleteError(null);
        try {
            const result = await deleteProduct(id);
            if (!result.success) {
                setProductDeleteError(result.error || t('errors.productDeleteFailed'));
            } else {
                await fetchData();
            }
        } catch {
            setProductDeleteError(t('errors.connectionError'));
        } finally {
            setLoading(false);
        }
    }, [fetchData, t]);

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    }, [sortField, sortOrder]);

    const handleCloseModal = useCallback(() => setIsModalOpen(false), []);
    const handleCloseCategoryModal = useCallback(() => setIsCategoryModalOpen(false), []);
    const handleOpenCategoryModal = useCallback(() => setIsCategoryModalOpen(true), []);
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value), []);
    const handleCategoryFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value), []);
    const handleFormNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value })), []);
    const handleFormSkuChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, sku: e.target.value })), []);
    const handleFormCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, categoryId: e.target.value })), []);
    const handleFormCostChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, costPrice: Math.max(0, Number(e.target.value) || 0) })), []);
    const handleFormPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, baseSellingPrice: Math.max(0, Number(e.target.value) || 0) })), []);
    const handleFormUnitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, unit: e.target.value })), []);
    const handleFormQtyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, initialQuantity: Math.max(0, Number(e.target.value) || 0) })), []);
    const handleNewCategoryNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setNewCategoryName(e.target.value), []);

    // Bulk Pricing handlers
    const handleSaveBulk = useCallback(async () => {
        if (!bulkPercentage) return;
        setBulkSubmitting(true);
        try {
            await bulkUpdatePricing(Number(bulkPercentage), bulkType);
            setIsBulkModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setBulkSubmitting(false);
        }
    }, [bulkPercentage, bulkType, fetchData]);

    const openBulkModal = useCallback(() => {
        setBulkPercentage('');
        setBulkType('markup');
        setIsBulkModalOpen(true);
    }, []);
    const closeBulkModal = useCallback(() => setIsBulkModalOpen(false), []);
    const handleBulkPercentageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setBulkPercentage(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)), []);
    const setBulkTypeMarkup = useCallback(() => setBulkType('markup'), []);
    const setBulkTypeIncrease = useCallback(() => setBulkType('increase'), []);

    const handleEditPriceClick = useCallback((product: Product) => {
        setEditingPriceProduct(product);
        setEditCost(product.costPrice);
        setEditSell(product.baseSellingPrice);
        setIsPriceEditModalOpen(true);
    }, []);

    const handleSavePriceEdit = useCallback(async () => {
        if (!editingPriceProduct) return;
        setEditSubmitting(true);
        try {
            await updateProduct(editingPriceProduct.id, {
                name: editingPriceProduct.name,
                sku: editingPriceProduct.sku,
                categoryId: editingPriceProduct.categoryId,
                costPrice: editCost,
                baseSellingPrice: editSell,
                unit: editingPriceProduct.unit
            });
            setIsPriceEditModalOpen(false);
            await fetchData();
        } catch (err) {
            console.error(err);
        } finally {
            setEditSubmitting(false);
        }
    }, [editingPriceProduct, editCost, editSell, fetchData]);

    const closePriceEditModal = useCallback(() => setIsPriceEditModalOpen(false), []);
    const handleEditCostChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditCost(Math.max(0, Number(e.target.value) || 0)), []);
    const handleEditSellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEditSell(Math.max(0, Number(e.target.value) || 0)), []);

    const handleToggleExpandRow = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) {
            setExpandedRow(prev => prev === id ? null : id);
        }
    }, []);

    const handleEditProductClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) {
            const product = products.find(p => p.id === id);
            if (product) openEditModal(product);
        }
    }, [products, openEditModal]);

    const handleDeleteProductClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) {
            void handleDeleteProduct(id);
        }
    }, [handleDeleteProduct]);

    const handlePageChange = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const pageStr = e.currentTarget.dataset.page;
        if (pageStr) {
            setCurrentPage(parseInt(pageStr, 10));
        }
    }, []);

    const handlePrevPage = useCallback(() => setCurrentPage(prev => Math.max(1, prev - 1)), []);
    const handleNextPage = useCallback(() => setCurrentPage(prev => prev + 1), []);

    const handleSortClick = useCallback((e: React.MouseEvent<HTMLTableCellElement>) => {
        const field = e.currentTarget.dataset.field as SortField;
        if (field) handleSort(field);
    }, [handleSort]);

    const handleDeleteCategoryClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) void handleDeleteCategory(id);
    }, [handleDeleteCategory]);

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />;
        return sortOrder === 'asc' ? <ArrowUp size={14} className="text-primary" /> : <ArrowDown size={14} className="text-primary" />;
    };

    // Filter and sort products
    const filteredAndSortedItems = useMemo(() => {
        const result = (products || []).filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        result.sort((a, b) => {
            let aVal: string | number = 0;
            let bVal: string | number = 0;
            switch (sortField) {
                case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
                case 'sku': aVal = a.sku.toLowerCase(); bVal = b.sku.toLowerCase(); break;
                case 'category': aVal = a.categoryName.toLowerCase(); bVal = b.categoryName.toLowerCase(); break;
                case 'stock': aVal = a.totalStock; bVal = b.totalStock; break;
                case 'cost': aVal = a.costPrice; bVal = b.costPrice; break;
                case 'sell': aVal = a.baseSellingPrice; bVal = b.baseSellingPrice; break;
                case 'percent': aVal = a.percentOfTotal; bVal = b.percentOfTotal; break;
                case 'margin':
                    aVal = a.baseSellingPrice > 0 ? ((a.baseSellingPrice - a.costPrice) / a.baseSellingPrice) : 0;
                    bVal = b.baseSellingPrice > 0 ? ((b.baseSellingPrice - b.costPrice) / b.baseSellingPrice) : 0;
                    break;
                default: return 0;
            }
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [products, searchQuery, categoryFilter, sortField, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(totalServerItems / ITEMS_PER_PAGE);
    const paginatedItems = filteredAndSortedItems;

    const renderSortableHeader = (field: SortField, children: React.ReactNode, className = "") => (
        <th
            className={clsx("px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors select-none text-xs", className, 'text-center')}
            data-field={field}
            onClick={handleSortClick}
        >
            <div className={clsx("flex items-center gap-1", isRtl ? "justify-end" : "justify-start")}>
                {children}
                {getSortIcon(field)}
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: auto; margin: 15mm; }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    aside, header, .print\\:hidden, button, select, input, .filters-bar {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }
                    .bg-secondary\\/20 {
                        background-color: transparent !important;
                    }
                }
            `}} />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                        {activeTab === 'stock' ? t('title') : tp('title')}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {activeTab === 'stock' ? t('subtitle') : tp('subtitle')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Tab Switcher */}
                    <div className="bg-secondary/50 p-1 rounded-xl flex items-center border border-border">
                        <button
                            onClick={() => setActiveTab('stock')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                activeTab === 'stock'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t('title')}
                        </button>
                        <button
                            onClick={() => setActiveTab('pricing')}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                                activeTab === 'pricing'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tp('title')}
                        </button>
                    </div>

                    <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50" aria-label="Refresh">
                        <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                    
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                        <Printer size={16} />
                        {ts('buttons.exportPDF')}
                    </button>

                    {activeTab === 'stock' && (
                        <>
                            <button onClick={handleOpenCategoryModal} className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors">
                                <Settings size={16} />
                                {t('categories')}
                            </button>
                            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all shadow-sm active:scale-95">
                                <Plus size={16} />
                                {t('newProduct')}
                            </button>
                        </>
                    )}
                    {activeTab === 'pricing' && (
                        <button
                            onClick={openBulkModal}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-all shadow-sm active:scale-95 font-bold text-xs uppercase"
                        >
                            <Percent size={16} />
                            {tp('bulkUpdate')}
                        </button>
                    )}
                </div>
            </div>

            {productDeleteError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 flex items-center gap-2">
                    <AlertCircle size={20} />
                    {productDeleteError}
                </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm print:hidden">
                {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={handleCategoryFilterChange}
                        className="px-3 py-2 bg-background border border-input rounded-lg text-sm"
                    >
                        <option value="all">{t('allCategories')}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className={clsx("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRtl ? "right-3" : "left-3")} size={18} />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className={clsx("w-full py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring", isRtl ? "pr-10 pl-4" : "pl-10 pr-4")}
                        />
                    </div>

                    {/* Results count */}
                    <div className="text-sm text-muted-foreground">
                        {t('productsCount', { count: filteredAndSortedItems.length.toLocaleString(locale) })}
                    </div>
            </div>

            {/* Unified Table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden products-table-container">
                <div className="overflow-x-auto">
                    <table className={clsx("w-full text-sm", 'text-center')}>
                        <thead className="bg-secondary/30 text-muted-foreground font-semibold border-b border-border">
                            <tr>
                                <th className="px-4 py-3 w-8 text-center print:hidden"></th>
                                {renderSortableHeader('name', t('table.product'))}
                                {renderSortableHeader('sku', t('table.sku'))}
                                {renderSortableHeader('category', t('table.category'))}
                                {activeTab === 'stock' && <th className="px-4 py-3 text-xs text-center">{t('table.unit')}</th>}
                                {renderSortableHeader('cost', t('table.cost'), 'text-center')}
                                {renderSortableHeader('sell', t('table.sell'), 'text-center')}
                                {renderSortableHeader('margin', activeTab === 'stock' ? t('table.margin') : tp('table.margin'), 'text-center')}
                                {activeTab === 'stock' && renderSortableHeader('stock', t('table.stock'), 'text-center')}
                                {activeTab === 'stock' && renderSortableHeader('percent', t('table.percentTotal'), 'text-center')}
                                <th className={clsx("px-4 py-3 text-xs print:hidden", 'text-center')}>{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && (
                                <tr><td colSpan={activeTab === 'stock' ? 11 : 8} className="px-6 py-12 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto" /></td></tr>
                            )}
                            {!loading && paginatedItems.length === 0 && (
                                <tr><td colSpan={activeTab === 'stock' ? 11 : 8} className="px-6 py-12 text-center text-muted-foreground">{t('noProducts')}</td></tr>
                            )}
                            {!loading && paginatedItems.length > 0 && (
                                paginatedItems.map((p) => {
                                    const margin = p.baseSellingPrice > 0 ? ((p.baseSellingPrice - p.costPrice) / p.baseSellingPrice * 100).toFixed(1) : '0';
                                    const isExpanded = expandedRow === p.id;
                                    return (
                                        <React.Fragment key={p.id}>
                                            <tr className="hover:bg-muted/50 transition-colors group">
                                                <td className="px-4 py-3 text-center print:hidden">
                                                    {p.locationBreakdown.length > 0 && (
                                                        <button
                                                            data-id={p.id}
                                                            onClick={handleToggleExpandRow}
                                                            className="p-1 rounded hover:bg-secondary transition-colors"
                                                        >
                                                            <ChevronDown size={14} className={clsx("transition-transform", isExpanded && "rotate-180")} />
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-center">{p.name}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-center">{p.sku}</td>
                                                <td className="px-4 py-3 text-center"><span className="px-2 py-1 bg-secondary rounded text-[10px] font-bold">{p.categoryName}</span></td>
                                                {activeTab === 'stock' && <td className="px-4 py-3 text-xs capitalize text-muted-foreground text-center">{t(`units.${p.unit}` as Parameters<typeof t>[0])}</td>}
                                                <td className={clsx("px-4 py-3 font-mono text-xs", 'text-center')}>{ts('currency')} {p.costPrice.toLocaleString(locale)}</td>
                                                <td className={clsx("px-4 py-3 font-mono text-xs font-bold", 'text-center')}>{ts('currency')} {p.baseSellingPrice.toLocaleString(locale)}</td>
                                                <td className={clsx("px-4 py-3", 'text-center')}>
                                                    <span className={clsx(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold",
                                                        getMarginColor(Number(margin))
                                                    )}>
                                                        {Number(margin).toLocaleString(locale)}%
                                                    </span>
                                                </td>
                                                {activeTab === 'stock' && (
                                                    <td className={clsx("px-4 py-3", 'text-center')}>
                                                        <span className={clsx("font-bold", p.totalStock < 10 ? "text-red-500" : "")}>{p.totalStock.toLocaleString(locale)}</span>
                                                        {p.totalStock < 10 && <AlertCircle size={12} className="inline mx-1 text-red-500" />}
                                                    </td>
                                                )}
                                                {activeTab === 'stock' && (
                                                    <td className={clsx("px-4 py-3", 'text-center')}>
                                                        <div className={clsx("flex items-center gap-2", isRtl ? "justify-start" : "justify-end")}>
                                                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary rounded-full transition-all"
                                                                    style={{ width: `${Math.min(p.percentOfTotal, 100)}%` } as React.CSSProperties}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-mono w-12">{p.percentOfTotal.toLocaleString(locale)}%</span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className={clsx("px-4 py-3 print:hidden", 'text-center')}>
                                                    <div className={clsx("flex items-center gap-1", isRtl ? "justify-start" : "justify-end")}>
                                                        {activeTab === 'stock' ? (
                                                            <>
                                                                <button data-id={p.id} onClick={handleEditProductClick} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground" aria-label="Edit product"><Edit size={14} /></button>
                                                                <button data-id={p.id} onClick={handleDeleteProductClick} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors" aria-label="Delete product"><Trash2 size={14} /></button>
                                                            </>
                                                        ) : (
                                                            <button data-id={p.id} onClick={() => handleEditPriceClick(p)} className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground" aria-label="Edit price"><Edit size={14} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded Location Breakdown */}
                                            {isExpanded && activeTab === 'stock' && (
                                                <tr className="bg-secondary/10 print:hidden">
                                                    <td colSpan={11} className="px-4 py-3 text-center">
                                                        <div className={clsx("space-y-1", isRtl ? "mr-8" : "ml-8")}>
                                                            <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">{t('stockByLocation')}</div>
                                                            {p.locationBreakdown.map((loc: LocationBreakdown) => (
                                                                <div key={loc.locationId} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg hover:bg-secondary/30">
                                                                    <MapPin size={14} className={loc.locationType === 'WAREHOUSE' ? 'text-blue-500' : 'text-orange-500'} />
                                                                    <span className="font-medium flex-1">{loc.locationName}</span>
                                                                    <span className={clsx(
                                                                        "px-2 py-0.5 rounded text-[10px] font-bold",
                                                                        loc.locationType === 'WAREHOUSE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                                                    )}>
                                                                        {loc.locationType}
                                                                    </span>
                                                                    <span className={clsx("font-bold font-mono w-16", 'text-center')}>{loc.quantity.toLocaleString(locale)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between bg-secondary/10 gap-4 print:hidden">
                        <div className="text-sm text-muted-foreground text-center sm:text-left">
                            {t('paginationInfo', {
                                start: (((currentPage - 1) * ITEMS_PER_PAGE) + 1).toLocaleString(locale),
                                end: (Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedItems.length)).toLocaleString(locale),
                                total: filteredAndSortedItems.length.toLocaleString(locale)
                            })}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {isRtl ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                            </button>
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let page;
                                    if (totalPages <= 5) {
                                        page = i + 1;
                                    } else if (currentPage <= 3) {
                                        page = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        page = totalPages - 4 + i;
                                    } else {
                                        page = currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={page}
                                            data-page={page}
                                            onClick={handlePageChange}
                                            className={clsx(
                                                "w-8 h-8 rounded-lg text-sm font-medium",
                                                currentPage === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                                            )}
                                        >
                                            {page.toLocaleString(locale)}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= totalPages}
                                className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {isRtl ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Modal */}
            <ProductModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                t={t}
                isEditMode={isEditMode}
                error={error}
                formData={formData}
                categories={categories}
                submitting={submitting}
                handleSubmit={handleSubmit}
                handleFormNameChange={handleFormNameChange}
                handleFormSkuChange={handleFormSkuChange}
                handleFormCategoryChange={handleFormCategoryChange}
                handleFormUnitChange={handleFormUnitChange}
                handleFormCostChange={handleFormCostChange}
                handleFormPriceChange={handleFormPriceChange}
                handleFormQtyChange={handleFormQtyChange}
            />

            {/* Category Management Modal */}
            <CategoryModal
                isOpen={isCategoryModalOpen}
                onClose={handleCloseCategoryModal}
                t={t}
                locale={locale}
                categoryError={categoryError}
                newCategoryName={newCategoryName}
                onNewCategoryNameChange={handleNewCategoryNameChange}
                handleAddCategory={handleAddCategory}
                categorySubmitting={categorySubmitting}
                categories={categories}
                handleDeleteCategoryClick={handleDeleteCategoryClick}
            />

            {/* Single Price Edit Modal */}
            {isPriceEditModalOpen && editingPriceProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                                    <Edit size={20} className="text-primary" />
                                    {tp('title')}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1 font-mono">{editingPriceProduct.name}</p>
                            </div>
                            <button
                                onClick={closePriceEditModal}
                                className="p-2 hover:bg-secondary rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {tp('table.cost', { currency: ts('currency') })}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editCost}
                                    onChange={handleEditCostChange}
                                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
                                    step="0.01"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {tp('table.selling', { currency: ts('currency') })}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editSell}
                                    onChange={handleEditSellChange}
                                    className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono font-bold"
                                    step="0.01"
                                />
                            </div>
                            
                            <div className="pt-2">
                                <div className="p-3 bg-secondary/50 rounded-xl flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tp('table.margin')}</span>
                                    {(() => {
                                        const margin = editSell > 0 ? ((editSell - editCost) / editSell * 100) : 0;
                                        let marginClass = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800";
                                        if (margin >= 20) {
                                            marginClass = "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800";
                                        } else if (margin >= 10) {
                                            marginClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800";
                                        }
                                        return (
                                            <span className={clsx("px-2 py-1 rounded-full text-xs font-black shadow-sm tabular-nums", marginClass)}>
                                                {margin.toLocaleString(locale, { maximumFractionDigits: 1 })}%
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border flex justify-end gap-3 bg-secondary/30">
                            <button
                                onClick={closePriceEditModal}
                                className="px-5 py-2.5 font-bold text-xs uppercase tracking-widest text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                            >
                                {ts('cancel')}
                            </button>
                            <button
                                onClick={handleSavePriceEdit}
                                disabled={editSubmitting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
                            >
                                {editSubmitting ? <Spinner size={16} /> : <Check size={16} />}
                                {ts('save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Update Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                                    <Percent size={20} className="text-primary" />
                                    {tp('bulkUpdate')}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">Apply a bulk percentage to all products</p>
                            </div>
                            <button
                                onClick={closeBulkModal}
                                className="p-2 hover:bg-secondary rounded-xl transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    Update Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={setBulkTypeMarkup}
                                        className={clsx(
                                            "py-3 px-2 rounded-xl text-xs font-bold transition-all border",
                                            bulkType === 'markup' 
                                                ? "bg-primary text-primary-foreground border-primary shadow-md" 
                                                : "bg-background text-muted-foreground border-border hover:bg-secondary"
                                        )}
                                    >
                                        Markup on Cost
                                    </button>
                                    <button 
                                        onClick={setBulkTypeIncrease}
                                        className={clsx(
                                            "py-3 px-2 rounded-xl text-xs font-bold transition-all border",
                                            bulkType === 'increase' 
                                                ? "bg-primary text-primary-foreground border-primary shadow-md" 
                                                : "bg-background text-muted-foreground border-border hover:bg-secondary"
                                        )}
                                    >
                                        Increase Sell Price
                                    </button>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 h-4">
                                    {bulkType === 'markup' 
                                        ? 'Selling Price = Cost Price + X% margin' 
                                        : 'Selling Price = Current Selling Price + X%'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    Percentage (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={bulkPercentage}
                                        onChange={handleBulkPercentageChange}
                                        className="w-full px-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono font-bold pr-10"
                                        placeholder="e.g. 10"
                                        step="0.1"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                        %
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-border flex justify-end gap-3 bg-secondary/30">
                            <button
                                onClick={closeBulkModal}
                                className="px-5 py-2.5 font-bold text-xs uppercase tracking-widest text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                            >
                                {ts('cancel')}
                            </button>
                            <button
                                onClick={handleSaveBulk}
                                disabled={bulkSubmitting || bulkPercentage === ''}
                                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
                            >
                                {bulkSubmitting ? <Spinner size={16} /> : <Check size={16} />}
                                Apply Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
