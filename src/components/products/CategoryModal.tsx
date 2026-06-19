import React from 'react';
import { Loader2, Plus, Trash2, X, FolderPlus, AlertCircle } from 'lucide-react';

interface Category {
    id: string;
    name: string;
    _count?: { products: number };
}

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: (key: string) => string;
    locale: string;
    categoryError: string | null;
    newCategoryName: string;
    onNewCategoryNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddCategory: (e: React.FormEvent) => Promise<void>;
    categorySubmitting: boolean;
    categories: Category[];
    handleDeleteCategoryClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function CategoryModal({
    isOpen,
    onClose,
    t,
    locale,
    categoryError,
    newCategoryName,
    onNewCategoryNameChange,
    handleAddCategory,
    categorySubmitting,
    categories,
    handleDeleteCategoryClick
}: CategoryModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <FolderPlus size={20} />
                        {t('manageCategories.title')}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {categoryError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2"><AlertCircle size={16} />{categoryError}</div>
                    )}

                    {/* Add New Category Form */}
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input
                            type="text"
                            placeholder={t('manageCategories.newPlaceholder')}
                            value={newCategoryName}
                            onChange={onNewCategoryNameChange}
                            className="flex-1 p-3 rounded-xl border border-border bg-background"
                        />
                        <button
                            type="submit"
                            disabled={categorySubmitting || !newCategoryName.trim()}
                            className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                            {categorySubmitting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                            {t('manageCategories.add')}
                        </button>
                    </form>

                    {/* Existing Categories List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {categories.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">{t('manageCategories.noCategories')}</div>
                        ) : (
                            categories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl group transition-all hover:bg-secondary/50">
                                    <div>
                                        <span className="font-semibold">{cat.name}</span>
                                        <span className="mx-2 text-xs text-muted-foreground">
                                            ({cat._count?.products?.toLocaleString(locale) || 0} {t('table.product').toLowerCase()})
                                        </span>
                                    </div>
                                    <button
                                        data-id={cat.id}
                                        onClick={handleDeleteCategoryClick}
                                        disabled={categorySubmitting}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                                        title={t('manageCategories.deleteTooltip')}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
