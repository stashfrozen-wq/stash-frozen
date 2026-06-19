'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { X, FileText, RefreshCcw, Loader2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { undoInvoice } from '@/app/actions/invoices';

import { Invoice } from './types';

interface InvoiceDetailsModalProps {
    invoice: Invoice;
    availableProducts?: unknown[]; // Kept for interface compatibility but we don't need it
    onClose: () => void;
    onUpdate: () => void;
    onOpenRefund: () => void;
    userRole?: string | null;
}

const Field = ({ label, value, important = false }: { label: string, value: React.ReactNode, important?: boolean }) => (
    <div className="flex flex-col">
        <span className="mb-1 text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
        <div className={clsx("font-medium", important && "font-bold text-lg")}>{value}</div>
    </div>
);

export default function InvoiceDetailsModal({
    invoice,
    onClose,
    onUpdate,
    onOpenRefund,
    userRole
}: InvoiceDetailsModalProps) {
    const t = useTranslations('Invoices');
    const ts = useTranslations('Sales');
    const locale = useLocale();

    const [undoing, setUndoing] = useState(false);

    const handleUndoInvoice = useCallback(async () => {
        if (invoice.items?.some(i => i.quantity > i.refundableQuantity)) {
             alert(t('details.cannotUndoRefunded', { defaultValue: 'Cannot undo an invoice with processed refunds. Revert refunds first.' }));
             return;
        }

        if (!confirm(t('details.confirmUndo', { defaultValue: 'Are you sure you want to completely undo this invoice? This action cannot be reversed.' }))) {
            return;
        }

        setUndoing(true);
        const res = await undoInvoice(invoice.id);
        if (res.success) {
            onUpdate();
        } else {
            alert(res.error || 'Failed to undo invoice');
        }
        setUndoing(false);
    }, [invoice, t, onUpdate]);

    const handleOpenPrintTab = useCallback(() => {
        window.open(`/invoices/${invoice.id}/print`, '_blank');
    }, [invoice.id]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-card w-full max-w-4xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]" onClick={handleBackdropClick}>
                {/* Header Controls */}
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
                    <h3 className="text-xl font-black flex items-center gap-2">
                        {t('details.title')}
                    </h3>
                    <button onClick={onClose} className="p-2 bg-background hover:bg-red-50 hover:text-red-500 rounded-full transition-colors border border-border/50 shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
                    
                    {/* Document Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-black text-foreground mb-1">{t('invoiceTitle', { defaultValue: 'INVOICE' })}</h1>
                            <div className="text-muted-foreground font-medium">#{invoice.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                        <div className="text-right">
                            <Field label={t('details.date')} value={new Date(invoice.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })} important />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Bill To */}
                        <div className="space-y-4">
                            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary/50"></span>
                                {t('details.buyerInfo', { defaultValue: 'BILL TO' })}
                            </div>
                            <div className="bg-background border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
                                <Field label={t('details.name')} value={invoice.customerName || t('walkInCustomer')} important />
                                {invoice.customerPhone && <Field label={t('details.phone')} value={invoice.customerPhone} />}
                                {invoice.customerAddress && <Field label={t('details.address')} value={invoice.customerAddress} />}
                            </div>
                        </div>

                        {/* Meta Details */}
                        <div className="space-y-4">
                            <div className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary/50"></span>
                                {t('details.meta', { defaultValue: 'DETAILS' })}
                            </div>
                            <div className="bg-background border border-border/50 rounded-2xl p-5 shadow-sm space-y-4">
                                <Field label={t('details.salesperson')} value={invoice.user?.name || invoice.user?.username || '-'} />
                                <Field label={t('details.payment')} value={invoice.paymentMethod} important />
                                <Field label={t('details.status', { defaultValue: 'Status' })} value={
                                    <span className={clsx("px-2.5 py-1 rounded-lg text-xs font-bold uppercase border",
                                        invoice.status === 'PENDING_REVIEW' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                        invoice.status === 'DECLINED' && "bg-red-500/10 text-red-600 border-red-500/20",
                                        Number(invoice.currentBalance) > 0 && "bg-red-500/10 text-red-600 border-red-500/20",
                                        (!invoice.status || invoice.status === 'ACCEPTED') && Number(invoice.currentBalance) <= 0 && "bg-green-500/10 text-green-600 border-green-500/20"
                                    )}>
                                        {invoice.status === 'PENDING_REVIEW' ? t('statusPending', { defaultValue: 'Pending Review' }) :
                                         invoice.status === 'DECLINED' ? t('statusDeclined', { defaultValue: 'Declined' }) :
                                         Number(invoice.currentBalance) > 0 ? t('statusDebt', { defaultValue: 'Debt' }) :
                                         t('paid')}
                                    </span>
                                } />
                                {invoice.reviewNote && (
                                    <Field label={t('details.reviewNote', { defaultValue: 'Review Note' })} value={
                                        <span className="text-red-600 text-sm">{invoice.reviewNote}</span>
                                    } />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary/50"></span>
                            {t('details.orderItems', { defaultValue: 'LINE ITEMS' })}
                        </div>
                        <div className="border border-border/50 rounded-2xl overflow-hidden bg-background shadow-sm">
                            {/* Mobile Layout */}
                            <div className="block md:hidden divide-y divide-border/30">
                                {invoice.items?.map((item) => (
                                    <div key={item.id} className="p-4 space-y-3">
                                        <div>
                                            <div className="font-bold text-base">{item.product?.name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{item.product?.sku}</div>
                                        </div>
                                        <div className="flex items-center justify-between bg-secondary/20 p-2 rounded-lg">
                                            <div className="text-sm font-medium">{t('details.qty')}</div>
                                            <span className="font-black text-lg">{item.quantity.toLocaleString(locale)}</span>
                                        </div>
                                        <div className="flex items-center justify-between bg-secondary/20 p-2 rounded-lg">
                                            <div className="text-sm font-medium">{t('details.price')}</div>
                                            <span className="font-bold text-muted-foreground">{ts('currency')} {item.unitPrice.toLocaleString(locale)}</span>
                                        </div>
                                        <div className="flex items-center justify-between bg-primary/5 p-2 rounded-lg border border-primary/10">
                                            <div className="text-sm font-bold text-primary">{t('details.subtotal')}</div>
                                            <div className="font-black text-lg text-primary">{ts('currency')} {item.subtotal.toLocaleString(locale)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <table className="w-full text-sm hidden md:table">
                                <thead className="bg-muted/30 text-muted-foreground font-bold text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className={clsx("p-4", 'text-center')}>{t('details.item')}</th>
                                        <th className="p-4 text-center w-32">{t('details.qty')}</th>
                                        <th className={clsx("p-4 w-32", 'text-center')}>{t('details.price')}</th>
                                        <th className={clsx("p-4 w-32", 'text-center')}>{t('details.subtotal')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {invoice.items?.map((item) => (
                                        <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                                            <td className="p-4 text-center">
                                                <div className="font-bold text-base">{item.product?.name}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{item.product?.sku}</div>
                                            </td>
                                            <td className="p-4 text-center font-black text-lg">{item.quantity.toLocaleString(locale)}</td>
                                            <td className={clsx("p-4", 'text-center font-bold text-muted-foreground')}>
                                                {ts('currency')} {item.unitPrice.toLocaleString(locale)}
                                            </td>
                                            <td className={clsx("p-4 font-black text-lg", 'text-center text-primary')}>
                                                {ts('currency')} {item.subtotal.toLocaleString(locale)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals & Financials */}
                    <div className="flex flex-col items-end pt-4 space-y-4">
                        <div className="w-full md:w-1/2 space-y-3 bg-muted/10 p-6 rounded-2xl border border-border/50">
                            <div className="flex justify-between text-muted-foreground font-bold">
                                <span>{t('details.grandTotal', { defaultValue: 'TOTAL DUE' })}</span>
                                <span className="text-foreground text-xl font-black">{ts('currency')} {Number(invoice.totalAmount).toLocaleString(locale)}</span>
                            </div>
                            
                            <div className="h-px bg-border/50 my-2" />

                            <div className="flex justify-between items-center w-full">
                                <span className="text-muted-foreground text-sm font-bold">{t('details.received', { defaultValue: 'Received' })}</span>
                                <span className="text-green-600 font-bold">{ts('currency')} {Number(invoice.amountPaid || 0).toLocaleString(locale)}</span>
                            </div>

                            <div className="flex justify-between items-center w-full text-sm">
                                <span className="text-muted-foreground font-bold">{t('details.previousBalance')}</span>
                                <span className="font-bold text-muted-foreground">{ts('currency')} {Number(invoice.previousBalance || 0).toLocaleString(locale)}</span>
                            </div>

                            <div className="flex justify-between items-center w-full bg-red-500/10 p-3 rounded-xl border border-red-500/20 mt-2">
                                <span className="text-red-600 font-black text-sm">{t('details.currentBalance')}</span>
                                <span className="font-black text-red-600 text-lg">
                                    {ts('currency')} {Number(invoice.currentBalance || 0).toLocaleString(locale)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-border/50 bg-background flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button
                            onClick={handleUndoInvoice}
                            disabled={undoing}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 rounded-xl font-bold transition-all disabled:opacity-50"
                        >
                            {undoing ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                            {t('details.undoOrder', { defaultValue: 'Undo Invoice' })}
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={onOpenRefund}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground border border-border/60 rounded-xl font-bold transition-all"
                        >
                            <RefreshCcw size={18} />
                            {t('details.refund')}
                        </button>
                        <button 
                            onClick={handleOpenPrintTab} 
                            disabled={invoice.status === 'PENDING_REVIEW' && userRole === 'SALESPERSON'}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-black transition-all hover:bg-primary/90 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={invoice.status === 'PENDING_REVIEW' && userRole === 'SALESPERSON' ? t('details.cannotPrintPending', { defaultValue: 'Cannot print pending invoice' }) : ''}
                        >
                            <FileText size={18} /> {t('details.officialInvoice', { defaultValue: 'Official PDF' })}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
