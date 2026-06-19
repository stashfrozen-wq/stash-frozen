'use client';

import { useState, useCallback } from 'react';
import { X, AlertCircle, Loader2, RefreshCcw, ShieldAlert, Check } from 'lucide-react';
import { createRefund } from '@/app/actions/refunds';
import { getCurrentUser } from '@/app/actions/auth';
import clsx from 'clsx';

interface Product {
    name: string;
    sku: string;
}

interface InvoiceItem {
    id: string;
    productId: string;
    product: Product;
    quantity: number;
    refundableQuantity: number;
    unitPrice: number;
    subtotal: number;
}

interface Invoice {
    id: string;
    customerName: string | null;
    items?: InvoiceItem[];
}

interface RefundModalProps {
    invoice: Invoice;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RefundModal({ invoice, onClose, onSuccess }: RefundModalProps) {
    const [refundItems, setRefundItems] = useState(
        (invoice.items || [])
            .filter(item => item.refundableQuantity > 0)
            .map(item => ({
                productId: item.productId,
                name: item.product.name,
                sku: item.product.sku,
                maxQuantity: item.refundableQuantity,
                refundQuantity: 0,
                unitPrice: item.unitPrice,
                condition: 'NEW' as 'NEW' | 'DEFECTIVE'
            }))
    );

    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const productId = e.target.dataset.id;
        const val = parseInt(e.target.value) || 0;
        if (!productId) return;
        setRefundItems(prev => prev.map(item =>
            item.productId === productId
                ? { ...item, refundQuantity: Math.min(item.maxQuantity, Math.max(0, val)) }
                : item
        ));
    }, []);

    const handleConditionNew = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const productId = e.currentTarget.dataset.id;
        if (!productId) return;
        setRefundItems(prev => prev.map(item =>
            item.productId === productId ? { ...item, condition: 'NEW' } : item
        ));
    }, []);

    const handleConditionDefective = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const productId = e.currentTarget.dataset.id;
        if (!productId) return;
        setRefundItems(prev => prev.map(item =>
            item.productId === productId ? { ...item, condition: 'DEFECTIVE' } : item
        ));
    }, []);

    const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setReason(e.target.value);
    }, []);

    const totalRefundAmount = refundItems.reduce((sum, item) => sum + (item.refundQuantity * item.unitPrice), 0);
    const hasItemsToRefund = refundItems.some(item => item.refundQuantity > 0);

    const handleSubmit = useCallback(async () => {
        if (!hasItemsToRefund) {
            setError('Please select at least one item to refund.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const user = await getCurrentUser();
            if (!user) throw new Error('User not authenticated.');

            const itemsToRefund = refundItems
                .filter(item => item.refundQuantity > 0)
                .map(item => ({
                    productId: item.productId,
                    quantity: item.refundQuantity,
                    unitPrice: item.unitPrice,
                    condition: item.condition
                }));

            const result = await createRefund({
                invoiceId: invoice.id,
                userId: user.id,
                items: itemsToRefund,
                reason
            });

            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Failed to process refund.');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }, [hasItemsToRefund, refundItems, invoice.id, reason, onSuccess]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex items-center justify-between bg-red-50/50 dark:bg-red-950/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg">
                            <RefreshCcw size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Process Refund</h3>
                            <p className="text-xs text-muted-foreground font-mono mt-1">Invoice #{invoice.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border rounded-xl transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary hover:scale-105 active:scale-95 flex items-center justify-center"
                        aria-label="Close modal"
                    >
                        <X size={18} className="transition-transform duration-300 hover:rotate-90" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                            <AlertCircle size={20} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Select Items to Refund</h4>
                            <span className="text-[10px] bg-secondary px-2 py-1 rounded-full font-bold">MAX QUANTITY ENFORCED</span>
                        </div>

                        <div className="border border-border rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary/20 text-muted-foreground font-medium">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Item</th>
                                        <th className="px-4 py-2 text-center">Refund Qty</th>
                                        <th className="px-4 py-2 text-center">Condition</th>
                                        <th className="px-4 py-2 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {refundItems.map(item => (
                                        <tr key={item.productId} className={clsx("transition-colors", item.refundQuantity > 0 ? "bg-primary/5" : "hover:bg-muted/30")}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-[10px] text-muted-foreground">Available: {item.maxQuantity}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="number"
                                                        data-id={item.productId}
                                                        min="0"
                                                        max={item.maxQuantity}
                                                        value={item.refundQuantity}
                                                        onChange={handleQuantityChange}
                                                        className="w-16 p-1.5 text-center border border-border rounded-lg bg-background font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-1">
                                                    <button
                                                        data-id={item.productId}
                                                        onClick={handleConditionNew}
                                                        className={clsx(
                                                            "px-2 py-1 text-[10px] font-bold rounded border transition-all",
                                                            item.condition === 'NEW' ? "bg-green-100 text-green-700 border-green-200" : "bg-secondary text-muted-foreground border-transparent opacity-50"
                                                        )}
                                                    >
                                                        NEW
                                                    </button>
                                                    <button
                                                        data-id={item.productId}
                                                        onClick={handleConditionDefective}
                                                        className={clsx(
                                                            "px-2 py-1 text-[10px] font-bold rounded border transition-all",
                                                            item.condition === 'DEFECTIVE' ? "bg-red-100 text-red-700 border-red-200" : "bg-secondary text-muted-foreground border-transparent opacity-50"
                                                        )}
                                                    >
                                                        DEFECTIVE
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold">
                                                EGP {(item.refundQuantity * item.unitPrice).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-secondary/10 font-bold border-t border-border">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-4 text-right">TOTAL REFUND</td>
                                        <td className="px-4 py-4 text-right text-red-600 text-lg">EGP {totalRefundAmount.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold flex items-center gap-2">
                            Reason for Refund <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
                        </label>
                        <textarea
                            placeholder="Customer returning item because..."
                            value={reason}
                            onChange={handleReasonChange}
                            className="w-full p-4 rounded-xl border border-border bg-background resize-none h-24 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                        <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <div className="text-xs text-amber-800 dark:text-amber-300">
                            <strong>Inventory Alert:</strong> &apos;New&apos; items will be restocked to the main warehouse. &apos;Defective&apos; items will only update the defective stock counter and will not be available for sale.
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-border bg-secondary/5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-border rounded-xl font-semibold hover:bg-secondary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !hasItemsToRefund}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Process Refund</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
