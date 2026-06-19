import React from 'react';
import { Loader2, Plus, Check, X, AlertCircle } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    _count?: { products: number };
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: (key: string) => string;
    isEditMode: boolean;
    error: string | null;
    formData: { name: string; sku: string; categoryId: string; costPrice: string | number; baseSellingPrice: string | number; unit?: string; stock?: string | number; initialQuantity?: string | number };
    categories: Category[];
    submitting: boolean;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    handleFormNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFormSkuChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFormCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleFormUnitChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleFormCostChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFormPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFormQtyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProductModal({
    isOpen,
    onClose,
    t,
    isEditMode,
    error,
    formData,
    categories,
    submitting,
    handleSubmit,
    handleFormNameChange,
    handleFormSkuChange,
    handleFormCategoryChange,
    handleFormUnitChange,
    handleFormCostChange,
    handleFormPriceChange,
    handleFormQtyChange
}: ProductModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
                    <h3 className="text-xl font-bold">{isEditMode ? t('modal.editTitle') : t('modal.addTitle')}</h3>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-secondary rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('modal.nameLabel')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-border bg-background" required value={formData.name} onChange={handleFormNameChange} />
                        </div>
                        <div className="space-y-1.5 col-span-2 sm:col-span-1">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('modal.skuLabel')}</label>
                            <input type="text" className="w-full p-3 rounded-xl border border-border bg-background" required value={formData.sku} onChange={handleFormSkuChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('modal.categoryLabel')}</label>
                            <select className="w-full p-3 rounded-xl border border-border bg-background" required value={formData.categoryId} onChange={handleFormCategoryChange}>
                                <option value="">{t('modal.selectCategory')}</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('modal.unitLabel')}</label>
                            <select className="w-full p-3 rounded-xl border border-border bg-background" value={formData.unit} onChange={handleFormUnitChange}>
                                <option value="piece">{t('units.piece')}</option>
                                <option value="kg">{t('units.kg')}</option>
                                <option value="carton">{t('units.carton')}</option>
                                <option value="liter">{t('units.liter')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('modal.costLabel')}</label>
                            <input type="number" min="0" step="0.01" className="w-full p-3 rounded-xl border border-border bg-background" required value={formData.costPrice} onChange={handleFormCostChange} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('modal.sellLabel')}</label>
                            <input type="number" min="0" step="0.01" className="w-full p-3 rounded-xl border border-border bg-background" required value={formData.baseSellingPrice} onChange={handleFormPriceChange} />
                        </div>
                    </div>
                    {!isEditMode && (
                        <div className="space-y-1.5 p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <label className="text-xs font-bold uppercase text-primary">{t('modal.openingStock')}</label>
                            <input type="number" className="w-full p-3 rounded-lg border border-border bg-background" required min="0" value={formData.initialQuantity} onChange={handleFormQtyChange} />
                        </div>
                    )}
                    <div className="pt-6 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-secondary font-semibold">{t('modal.cancel')}</button>
                        <button type="submit" disabled={submitting} className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                            {(() => {
                                if (submitting) return <Loader2 className="animate-spin" size={18} />;
                                if (isEditMode) return <Check size={18} />;
                                return <Plus size={18} />;
                            })()}
                            {isEditMode ? t('modal.update') : t('modal.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
