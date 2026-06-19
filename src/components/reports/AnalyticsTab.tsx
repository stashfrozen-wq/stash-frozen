/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Calendar, Users, Package, Printer, DollarSign, Phone, MapPin, ChevronDown } from 'lucide-react';
import { getBuyerReport, getProductReport } from '@/app/actions/analytics';
import { printElement } from '@/components/ui/PrintExport';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useLocale } from '@/hooks/useLocale';

interface PurchaseHistory {
    name: string;
    quantity: number;
}

interface BuyerData {
    name: string;
    phone: string | null;
    address: string | null;
    visitCount: number;
    totalSpent: number;
    purchaseHistory: PurchaseHistory[];
}

interface ProductData {
    name: string;
    sku: string;
    quantitySold: number;
    revenue: number;
}

export default function AnalyticsTab() {
    const t = useTranslations('Analytics');
    const ts = useTranslations('Sales');
    const { locale } = useLocale();
    const [activeTab, setActiveTab] = useState<'buyers' | 'products'>('buyers');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);

    const [buyerData, setBuyerData] = useState<BuyerData[]>([]);
    const [productData, setProductData] = useState<ProductData[]>([]);
    const [expandedBuyer, setExpandedBuyer] = useState<number | null>(null);
    const [buyerTotals, setBuyerTotals] = useState({ customers: 0, sales: 0 });
    const [productTotals, setProductTotals] = useState({ quantity: 0, revenue: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [buyersRes, productsRes] = await Promise.all([
                getBuyerReport({ startDate, endDate }).catch(e => { console.error('Buyer report failed:', e); return null; }),
                getProductReport({ startDate, endDate }).catch(e => { console.error('Product report failed:', e); return null; })
            ]);
            if (buyersRes) {
                setBuyerData(buyersRes.data);
                setBuyerTotals({ customers: buyersRes.totalCustomers, sales: buyersRes.totalSales });
            }
            if (productsRes) {
                setProductData(productsRes.data);
                setProductTotals({ quantity: productsRes.totalQuantity, revenue: productsRes.totalRevenue });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const handlePrint = useCallback(() => {
        const title = activeTab === 'buyers' ? t('report.buyersTitle') : t('report.productsTitle');
        const contentId = activeTab === 'buyers' ? 'print-buyers' : 'print-products';
        const dateRangeStr = startDate || endDate ? `<p>${t('report.period', { start: startDate || 'Start', end: endDate || 'Now' })}</p>` : '';

        printElement(title, contentId, dateRangeStr);
    }, [activeTab, startDate, endDate, t]);

    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value), []);
    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value), []);
    const handleTabBuyersClick = useCallback(() => setActiveTab('buyers'), []);
    const handleTabProductsClick = useCallback(() => setActiveTab('products'), []);
    
    const handleExpandBuyerClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const idx = Number(e.currentTarget.dataset.idx);
        if (!isNaN(idx)) {
            setExpandedBuyer(prev => prev === idx ? null : idx);
        }
    }, []);

    return (
        <div className="space-y-6 max-w-7xl mx-auto" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Date Inputs */}
                    <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-lg">
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            className="bg-transparent text-sm p-2 outline-none"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            className="bg-transparent text-sm p-2 outline-none"
                        />
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Printer size={16} />
                        {t('exportReport')}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border">
                <button
                    onClick={handleTabBuyersClick}
                    className={`pb-3 px-1 font-medium text-sm transition-all relative ${activeTab === 'buyers' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <span className="flex items-center gap-2">
                        <Users size={16} /> {t('tabs.topBuyers')}
                    </span>
                    {activeTab === 'buyers' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={handleTabProductsClick}
                    className={`pb-3 px-1 font-medium text-sm transition-all relative ${activeTab === 'products' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <span className="flex items-center gap-2">
                        <Package size={16} /> {t('tabs.topProducts')}
                    </span>
                    {activeTab === 'products' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                        {t('loading')}
                    </div>
                ) : (
                    <>
                        {/* Buyers Tab */}
                        {activeTab === 'buyers' && (
                            <div id="print-buyers" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-gradient-to-br from-card to-secondary/30 p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Users size={20} />
                                            </div>
                                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('buyers.totalCustomers')}</div>
                                        </div>
                                        <div className="text-3xl font-black">{buyerTotals.customers.toLocaleString(locale)}</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-card to-secondary/30 p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                                                <DollarSign size={20} />
                                            </div>
                                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('buyers.totalSalesValue')}</div>
                                        </div>
                                        <div className="text-3xl font-black text-green-600">
                                            {ts('currency')} {buyerTotals.sales.toLocaleString(locale)}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left font-sans">
                                            <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                                                <tr>
                                                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">{t('buyers.table.rank')}</th>
                                                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">{t('buyers.table.customer')}</th>
                                                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">{t('buyers.table.address')}</th>
                                                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">{t('buyers.table.frequency')}</th>
                                                    <th className={clsx("p-4 font-bold uppercase tracking-wider text-[10px]", 'text-center')}>{t('buyers.table.contribution')}</th>
                                                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] w-8 text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {buyerData.map((buyer, idx) => (
                                                    <React.Fragment key={idx}>
                                                        <tr className="hover:bg-secondary/20 transition-colors group">
                                                            <td className="p-4 text-center">
                                                                <span className={clsx(
                                                                    "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs",
                                                                    ["bg-yellow-500/20 text-yellow-600", "bg-gray-400/20 text-gray-600", "bg-orange-400/20 text-orange-600"][idx] || "bg-secondary text-muted-foreground"
                                                                )}>
                                                                    #{(idx + 1).toLocaleString(locale)}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <div className="font-black text-base">{buyer.name}</div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Phone size={10} /> {buyer.phone}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                {buyer.address ? (
                                                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <MapPin size={12} className="text-primary shrink-0" />
                                                                        <span className="truncate max-w-[200px]">{buyer.address}</span>
                                                                    </div>
                                                                ) : <span className="text-xs text-muted-foreground/50">—</span>}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar size={14} className="text-muted-foreground" />
                                                                    <span className="font-medium">{buyer.visitCount.toLocaleString(locale)} {t('buyers.table.visits')}</span>
                                                                </div>
                                                            </td>
                                                            <td className={clsx("p-4", 'text-center')}>
                                                                <div className="font-black text-primary text-lg">{ts('currency')} {buyer.totalSpent.toLocaleString(locale)}</div>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                {buyer.purchaseHistory?.length > 0 && (
                                                                    <button
                                                                        data-idx={idx}
                                                                        onClick={handleExpandBuyerClick}
                                                                        className="p-1 rounded hover:bg-secondary"
                                                                    >
                                                                        <ChevronDown size={14} className={clsx("transition-transform", expandedBuyer === idx && "rotate-180")} />
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                        {expandedBuyer === idx && buyer.purchaseHistory?.length > 0 && (
                                                            <tr className="bg-secondary/10">
                                                                <td colSpan={6} className="px-4 py-3 text-center">
                                                                    <div className={clsx("space-y-1", locale === 'ar' ? "mr-12" : "ml-12")}>
                                                                        <div className="text-[10px] font-bold uppercase text-muted-foreground mb-2">{t('buyers.table.history')}</div>
                                                                        {buyer.purchaseHistory.map((ph: PurchaseHistory, i: number) => (
                                                                            <div key={i} className="flex items-center gap-3 text-sm py-1 px-3 rounded hover:bg-secondary/30">
                                                                                <Package size={14} className="text-primary" />
                                                                                <span className="flex-1 font-medium">{ph.name}</span>
                                                                                <span className="font-bold font-mono">{ph.quantity.toLocaleString(locale)} {t('buyers.table.units')}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                                {buyerData.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-12 text-center text-muted-foreground italic">{t('buyers.empty')}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Products Tab */}
                        {activeTab === 'products' && (
                            <div id="print-products" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-gradient-to-br from-card to-secondary/30 p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Package size={20} />
                                            </div>
                                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('products.uniqueProducts')}</div>
                                        </div>
                                        <div className="text-3xl font-black">
                                            {productData.length === 50 ? '50+' : productData.length.toLocaleString(locale)}
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-card to-secondary/30 p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                                                <BarChart3 size={20} />
                                            </div>
                                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('products.totalUnits')}</div>
                                        </div>
                                        <div className="text-3xl font-black text-orange-600">
                                            {productTotals.quantity.toLocaleString(locale)} {t('products.items')}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                                                <tr>
                                                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">{t('products.table.rank')}</th>
                                                    <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">{t('products.table.product')}</th>
                                                    <th className={clsx("p-4 font-bold uppercase tracking-wider text-[10px]", 'text-center')}>{t('products.table.quantity')}</th>
                                                    <th className={clsx("p-4 font-bold uppercase tracking-wider text-[10px]", 'text-center')}>{t('products.table.revenue')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {productData.map((prod, idx) => (
                                                    <tr key={idx} className="hover:bg-secondary/20 transition-colors group">
                                                        <td className="p-4 text-center">
                                                            <span className={clsx(
                                                                "inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs",
                                                                ["bg-yellow-500/20 text-yellow-600", "bg-gray-400/20 text-gray-600", "bg-orange-400/20 text-orange-600"][idx] || "bg-secondary text-muted-foreground"
                                                                )}>
                                                                #{(idx + 1).toLocaleString(locale)}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <div className="font-black text-base group-hover:text-primary transition-colors">{prod.name}</div>
                                                            <div className="text-xs text-muted-foreground font-mono bg-secondary/30 px-2 py-0.5 rounded inline-block mt-1">{prod.sku}</div>
                                                        </td>
                                                        <td className={clsx("p-4", 'text-center')}>
                                                            <div className="font-bold text-lg">{prod.quantitySold.toLocaleString(locale)}</div>
                                                            <div className="text-[10px] text-muted-foreground uppercase">{t('products.table.units')}</div>
                                                        </td>
                                                        <td className={clsx("p-4", 'text-center')}>
                                                            <div className="font-black text-green-600 text-lg">{ts('currency')} {prod.revenue.toLocaleString(locale)}</div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {productData.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-12 text-center text-muted-foreground italic">{t('products.empty')}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
