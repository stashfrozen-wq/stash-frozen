'use client';

import { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, Check } from 'lucide-react';
import { getIncomingTransactions, getLocations, createIncomingStock } from '@/app/actions/incoming';
import { getProducts } from '@/app/actions/sales';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { PageHeader, Th, Spinner, Modal, Button, FormField, Select, Input, Textarea } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';

interface IncomingItem {
    id: string;
    productName: string;
    quantity: number;
    supplier: string;
    costPrice: number;
    status: 'pending' | 'received' | 'rejected';
    date?: Date;
}

interface Product {
    id: string;
    name: string;
    sku: string;
}

interface Location {
    id: string;
    name: string;
}

export default function IncomingStockPage() {
    const t = useTranslations('Incoming');
    const ts = useTranslations('Sales');
    const { locale, isRtl } = useLocale();
    
    const [items, setItems] = useState<IncomingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [formData, setFormData] = useState({
        productId: '',
        quantity: 1,
        locationId: '',
        notes: ''
    });

    const refreshData = useCallback(async () => {
        setLoading(true);
        const data = await getIncomingTransactions();
        setItems(data as IncomingItem[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        refreshData();
        // Pre-fetch products and locations
        getProducts().then(setProducts);
        getLocations().then(setLocations);
    }, [refreshData]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productId || !formData.locationId || formData.quantity <= 0) return;

        setSubmitting(true);
        try {
            await createIncomingStock(formData);
            await refreshData();
            setIsModalOpen(false);
            setFormData({ productId: '', quantity: 1, locationId: '', notes: '' });
        } catch (error) {
            console.error("Failed to add purchase:", error);
            alert(t('alerts.failed'));
        } finally {
            setSubmitting(false);
        }
    }, [formData, refreshData, t]);

    const handleOpenModal = useCallback(() => setIsModalOpen(true), []);
    const handleCloseModal = useCallback(() => setIsModalOpen(false), []);
    
    const handleProductIdChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, productId: e.target.value }));
    }, []);
    
    const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, quantity: Math.max(0, parseFloat(e.target.value) || 0) }));
    }, []);
    
    const handleLocationIdChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, locationId: e.target.value }));
    }, []);
    
    const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, notes: e.target.value }));
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Truck}
                title={<h1 className="text-3xl font-black tracking-tighter uppercase text-foreground">{t('title')}</h1>}
                isRtl={isRtl}
                actions={
                    <Button onClick={handleOpenModal} icon={<Plus size={16} />}>
                        {t('newOrder')}
                    </Button>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm group hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl dark:bg-blue-900/30 dark:text-blue-300 group-hover:scale-110 transition-transform">
                            <Truck size={24} />
                        </div>
                        <div className={'text-center'}>
                            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('metrics.totalShipments')}</div>
                            <div className="text-2xl font-black">{t('metrics.records', { count: items.length.toLocaleString(locale) })}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/30 text-muted-foreground border-b border-border">
                            <tr>
                                <Th>{t('table.product')}</Th>
                                <Th>{t('table.quantity')}</Th>
                                <Th>{t('table.supplier')}</Th>
                                <Th>{t('table.totalCost')}</Th>
                                <Th>{t('table.date')}</Th>
                                <Th>{t('table.status')}</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <Spinner size={32} label={t('table.loading')} />
                                    </td>
                                </tr>
                            )}
                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <Truck size={40} className="mb-2 opacity-20" />
                                            <p className="text-lg font-black uppercase tracking-tight">{t('table.empty')}</p>
                                            <p className="text-sm font-medium opacity-60">{t('table.emptyDescription')}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && items.length > 0 && (
                                items.map(item => (
                                    <tr key={item.id} className="hover:bg-muted/50 transition-colors group">
                                        <td className={clsx("px-6 py-4 font-bold text-foreground", 'text-center')}>{item.productName}</td>
                                        <td className="px-6 py-4 font-black text-center tabular-nums">{item.quantity.toLocaleString(locale)}</td>
                                        <td className={clsx("px-6 py-4 text-muted-foreground truncate max-w-[200px] font-medium", 'text-center')}>{item.supplier}</td>
                                        <td className={clsx("px-6 py-4 font-black text-primary tabular-nums", 'text-center')}>{ts('currency')} {item.costPrice.toLocaleString(locale)}</td>
                                        <td className={clsx("px-6 py-4 text-muted-foreground font-medium", 'text-center')}>{item.date ? new Date(item.date).toLocaleDateString(locale) : '-'}</td>
                                        <td className={clsx("px-6 py-4", 'text-center')}>
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800 shadow-sm">
                                                <Check size={10} />
                                                {t(`table.statuses.${item.status}`)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={t('modal.title')}
                icon={<Truck size={20} />}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <FormField label={t('modal.product')} required>
                        <Select required value={formData.productId} onChange={handleProductIdChange}>
                            <option value="">{t('modal.chooseItem')}</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                        </Select>
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label={t('modal.quantity')} required>
                            <Input
                                type="number"
                                min="0.01"
                                step="any"
                                required
                                value={formData.quantity}
                                onChange={handleQuantityChange}
                                className="font-black"
                            />
                        </FormField>
                        <FormField label={t('modal.location')} required>
                            <Select required value={formData.locationId} onChange={handleLocationIdChange}>
                                <option value="">{t('modal.selectBranch')}</option>
                                {locations.map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </Select>
                        </FormField>
                    </div>

                    <FormField label={t('modal.notes')}>
                        <Textarea
                            placeholder={t('modal.notesPlaceholder')}
                            value={formData.notes}
                            onChange={handleNotesChange}
                            className="h-24"
                        />
                    </FormField>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="outline" fullWidth onClick={handleCloseModal}>
                            {t('modal.cancel')}
                        </Button>
                        <Button type="submit" fullWidth loading={submitting} icon={!submitting ? <Check size={18} /> : undefined}>
                            {t('modal.add')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
