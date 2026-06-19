/* eslint-disable sonarjs/cognitive-complexity */
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    User, Phone, MapPin, ShoppingBag,
    ArrowLeft, CreditCard, Clock, Receipt, Printer,
    ChevronRight, Loader2,
    CalendarDays, Tag, ScrollText
} from 'lucide-react';
import { getCustomerProfile, getCustomerStatement } from '@/app/actions/customers';
import Link from 'next/link';
import clsx from 'clsx';
import { useTranslations, useLocale } from 'next-intl';

interface InvoiceItem {
    quantity: number;
    product: string;
    price: number;
    subtotal: number;
}

interface Invoice {
    id: string;
    date: string | Date;
    method: string;
    seller: string;
    total: number | string;
    paid: number | string;
    currentBalance: number;
    items: InvoiceItem[];
}

interface Payment {
    id: string;
    date: string | Date;
    amount: number;
    note: string | null;
    recordedBy: string;
}

interface CustomerProfile {
    name: string;
    phone: string;
    address: string;
    type: string;
    balance: number;
    joinedAt: string | Date | null;
}

interface ProfileData {
    profile: CustomerProfile;
    invoices: Invoice[];
    payments: Payment[];
}

interface StatementEntry {
    id: string;
    date: string | Date;
    type: 'INVOICE' | 'PAYMENT';
    description: string;
    debit: number;
    credit: number;
    balance: number;
    recordedBy?: string;
    items?: InvoiceItem[];
}

interface StatementData {
    profile: {
        id: string;
        name: string;
        phone: string;
        address: string;
        balance: number;
        joinedAt: string | Date | null;
        type?: string;
    };
    statement: StatementEntry[];
    finalBalance: number;
}

function ProfileContent() {
    const t = useTranslations('CustomerProfile');
    const ts = useTranslations('Sales');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [data, setData] = useState<ProfileData | null>(null);
    const [statement, setStatement] = useState<StatementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'history' | 'statement'>('statement');

    useEffect(() => {
        if (id) {
            Promise.all([
                getCustomerProfile(id),
                getCustomerStatement(id)
            ]).then(([res, stmt]) => {
                setData(res);
                setStatement(stmt);
                setLoading(false);
            });
        }
    }, [id]);

    const handlePrintStatement = useCallback(() => {
        const printContents = document.getElementById('print-statement-content');
        if (printContents) {
            const originalContents = document.body.innerHTML;
            document.body.innerHTML = printContents.innerHTML;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); // Reload to restore React state since DOM manipulation breaks it
        }
    }, []);

    const handleTabChange = useCallback((tab: 'history' | 'statement') => {
        setActiveTab(tab);
    }, []);

    const handleStatementTabClick = useCallback(() => {
        handleTabChange('statement');
    }, [handleTabChange]);

    const handleHistoryTabClick = useCallback(() => {
        handleTabChange('history');
    }, [handleTabChange]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
                <Loader2 className="animate-spin text-primary" size={64} />
                <p className="text-muted-foreground font-black text-xl tracking-tighter uppercase animate-pulse">{t('loading')}</p>
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center font-black uppercase tracking-widest text-muted-foreground">{t('notFound')}</div>;

    const { profile, invoices, payments } = data;
    const totalSpent = invoices.reduce((sum: number, inv: Invoice) => sum + Number(inv.total), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Nav Header */}
            <div className="flex items-center justify-between">
                <Link href="/customers" prefetch={false} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-black text-xs uppercase tracking-widest group">
                    <div className={clsx(
                        "p-2 rounded-full group-hover:bg-primary/10 transition-colors",
                        isRtl && "rotate-180"
                    )}>
                        <ArrowLeft size={20} />
                    </div>
                    {t('backButton')}
                </Link>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handlePrintStatement}
                        className="px-6 py-3 flex items-center gap-2 bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
                    >
                        <Printer size={18} />
                        {t('printStatement')}
                    </button>
                    <div className={clsx(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                        profile.type === 'USER' ? "bg-primary/10 text-primary border-primary/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                    )}>
                        {t(`accountType.${profile.type}` as Parameters<typeof t>[0], { defaultValue: profile.type })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Profile Card */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-card border border-border rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl group hover:border-primary/30 transition-all">
                        <div className={clsx(
                            "absolute top-0 p-8 text-primary/5 pointer-events-none group-hover:scale-110 group-hover:text-primary/10 transition-all duration-500",
                            isRtl ? "left-0" : "right-0"
                        )}>
                            <User size={160} />
                        </div>

                        <div className="flex flex-col items-center text-center relative z-10">
                            <div className="w-24 h-24 bg-gradient-to-br from-primary to-orange-600 rounded-3xl flex items-center justify-center shadow-lg mb-6 text-white font-black text-4xl transform rotate-3 group-hover:rotate-0 transition-transform">
                                {profile.name[0]}
                            </div>
                            <h2 className="text-3xl font-black tracking-tighter uppercase mb-2 line-clamp-2">{profile.name}</h2>
                            <p className="text-muted-foreground flex items-center gap-2 font-bold tabular-nums">
                                <Phone size={14} className="text-primary" />
                                {profile.phone || t('profile.noPhone')}
                            </p>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-start gap-4 p-5 bg-secondary/30 rounded-2xl border border-border/50 group/item hover:border-primary/30 transition-colors">
                                <MapPin className="text-primary shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('profile.addressLabel')}</h4>
                                    <p className="text-sm font-bold leading-relaxed">{profile.address || t('profile.noAddress')}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-5 bg-secondary/30 rounded-2xl border border-border/50 group/item hover:border-primary/30 transition-colors">
                                <CalendarDays className="text-primary shrink-0 mt-1" size={20} />
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('profile.joinedLabel')}</h4>
                                    <p className="text-sm font-bold tabular-nums">
                                        {profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : t('profile.na')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-border grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{t('profile.lifetimeValue')}</div>
                                <div className="text-2xl font-black text-green-600 tabular-nums">
                                    <span className="text-xs mr-1">{ts('currency')}</span>
                                    {totalSpent.toLocaleString(locale)}
                                </div>
                            </div>
                            <div className={clsx("text-center", isRtl ? "border-r" : "border-l", "border-border")}>
                                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">{t('profile.currentBalance')}</div>
                                <div className={clsx(
                                    "text-2xl font-black tabular-nums",
                                    profile.balance > 0 ? "text-red-600" : "text-green-600"
                                )}>
                                    <span className="text-xs mr-1">{ts('currency')}</span>
                                    {Number(profile.balance).toLocaleString(locale)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Purchase History + Statement */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Tab Switcher */}
                    <div className="flex gap-2 p-1 bg-secondary/30 rounded-2xl border border-border">
                        <button
                            onClick={handleStatementTabClick}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                                activeTab === 'statement' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ScrollText size={16} />
                            {t('statement.title')}
                        </button>
                        <button
                            onClick={handleHistoryTabClick}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                                activeTab === 'history' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Receipt size={16} />
                            {t('history.title')} <span className="tabular-nums">({invoices.length.toLocaleString(locale)})</span>
                        </button>
                    </div>

                    {/* Statement Tab */}
                    {activeTab === 'statement' && statement && (
                        <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm">
                            <div className="p-6 bg-secondary/20 border-b border-border">
                                <h3 className="font-black text-xl tracking-tight uppercase flex items-center gap-3">
                                    <ScrollText size={24} className="text-primary" />
                                    {t('statement.title')}
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-secondary/30 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">#</th>
                                            <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">{t('statement.colDate')}</th>
                                            <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">{t('statement.colType')}</th>
                                            <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">{t('statement.colDescription')}</th>
                                            <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">{t('statement.colDebit')}</th>
                                            <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">{t('statement.colCredit')}</th>
                                            <th className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-muted-foreground text-center">{t('statement.colBalance')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {statement.statement.map((entry: StatementEntry, idx: number) => (
                                            <tr key={`${entry.type}-${entry.id}`} className={clsx("hover:bg-muted/30 transition-colors", entry.type === 'PAYMENT' && "bg-green-50/30 dark:bg-green-950/10")}>
                                                <td className="px-4 py-3 text-center font-bold text-muted-foreground tabular-nums">{(idx + 1).toLocaleString(locale)}</td>
                                                <td className="px-4 py-3 text-center font-bold tabular-nums">{new Date(entry.date).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                        entry.type === 'INVOICE'
                                                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                            : "bg-green-500/10 text-green-600 border-green-500/20"
                                                    )}>
                                                        {entry.type === 'INVOICE' ? t('statement.typeInvoice') : t('statement.typePayment')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold">
                                                    {entry.description}
                                                    {entry.type === 'PAYMENT' && entry.recordedBy && (
                                                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                                            {t('statement.recordedBy', { name: entry.recordedBy })}
                                                        </div>
                                                    )}
                                                    {entry.type === 'INVOICE' && entry.recordedBy && (
                                                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                                            {t('history.seller', { name: entry.recordedBy })}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center font-black text-red-600 tabular-nums">
                                                    {entry.debit > 0 ? entry.debit.toLocaleString(locale) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-center font-black text-green-600 tabular-nums">
                                                    {entry.credit > 0 ? entry.credit.toLocaleString(locale) : '—'}
                                                </td>
                                                <td className={clsx(
                                                    "px-4 py-3 text-center font-black tabular-nums",
                                                    entry.balance > 0 ? "text-red-600" : "text-green-600"
                                                )}>
                                                    {entry.balance.toLocaleString(locale)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-secondary/30 border-t-2 border-border">
                                        <tr>
                                            <td colSpan={6} className="px-4 py-4 font-black uppercase text-xs tracking-widest text-muted-foreground text-center">
                                                {t('statement.finalBalance')}
                                            </td>
                                            <td className={clsx(
                                                "px-4 py-4 text-center font-black text-xl tabular-nums",
                                                statement.finalBalance > 0 ? "text-red-600" : "text-green-600"
                                            )}>
                                                <span className="text-sm font-bold opacity-60">{ts('currency')}</span>
                                                {statement.finalBalance.toLocaleString(locale)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            {statement.statement.length === 0 && (
                                <div className="text-center py-16 bg-secondary/10">
                                    <ScrollText className="mx-auto text-muted-foreground/20 mb-4" size={48} />
                                    <p className="font-black uppercase tracking-widest text-muted-foreground text-sm">{t('statement.empty')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab (Original Purchase History) */}
                    {activeTab === 'history' && (
                    <>
                    <div className="space-y-6">
                        {invoices.map((invoice: Invoice) => (
                            <div key={invoice.id} className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all group hover:border-primary/30">
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-secondary/20">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-background border border-border rounded-2xl group-hover:border-primary/30 transition-colors shadow-sm">
                                            <ShoppingBag size={28} className="text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-black text-xl tracking-tight uppercase">{t('history.invoiceNumber', { number: invoice.id.slice(-6).toUpperCase() })}</h4>
                                                <span className="px-3 py-1 bg-green-500/10 text-green-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-green-500/20">{t('history.status.completed')}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5 font-bold tabular-nums">
                                                <span className="flex items-center gap-1.5"><Clock size={14} className="text-primary" /> {new Date(invoice.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                <span className="w-1.5 h-1.5 bg-border rounded-full" />
                                                <span className="flex items-center gap-1.5 uppercase"><CreditCard size={14} className="text-primary" /> {invoice.method}</span>
                                                <span className="w-1.5 h-1.5 bg-border rounded-full" />
                                                <span className="flex items-center gap-1.5 uppercase italic underline decoration-primary/30">{t('history.seller', { name: invoice.seller })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={clsx("flex flex-col gap-1", isRtl ? "items-start text-left" : "items-end text-right")}>
                                        <div className="text-2xl font-black text-primary tabular-nums">
                                            <span className="text-sm mr-1">{ts('currency')}</span>
                                            {Number(invoice.total).toLocaleString(locale)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('history.paid', { amount: Number(invoice.paid).toLocaleString(locale), currency: ts('currency') })}</span>
                                            {invoice.currentBalance > 0 && (
                                                <span className="px-2.5 py-1 bg-red-500/10 text-red-600 text-[9px] font-black rounded-full uppercase tracking-tighter italic border border-red-500/20">
                                                    {t('history.due', { amount: Number(invoice.currentBalance).toLocaleString(locale), currency: ts('currency') })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-8 bg-background">
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2 mb-2">
                                            <Tag size={12} className="text-primary" /> {t('history.itemsTitle')}
                                        </div>
                                        {invoice.items.map((item: InvoiceItem, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-sm p-3 rounded-2xl bg-secondary/10 border border-border/30 hover:border-primary/20 transition-colors">
                                                <div className="font-black flex items-center gap-3">
                                                    <span className="w-7 h-7 flex items-center justify-center bg-primary text-primary-foreground rounded-lg text-[10px] font-black shadow-sm shadow-primary/20">{item.quantity.toLocaleString(locale)}</span>
                                                    {item.product}
                                                </div>
                                                <div className="font-black text-muted-foreground tabular-nums">{ts('currency')} {Number(item.subtotal).toLocaleString(locale)}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={clsx("hidden md:flex flex-col justify-end gap-3", isRtl ? "items-start" : "items-end")}>
                                        <Link prefetch={false}
                                            href={`/invoices?search=${invoice.id.slice(-6).toUpperCase()}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                                        >
                                            {t('history.viewOriginal')} 
                                            <ChevronRight size={14} className={clsx(isRtl && "rotate-180")} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {invoices.length === 0 && activeTab === 'history' && (
                        <div className="text-center py-24 bg-secondary/10 rounded-[3rem] border border-dashed border-border group animate-in zoom-in-95 duration-500">
                            <ShoppingBag className="mx-auto text-muted-foreground/20 mb-6 group-hover:scale-110 transition-transform duration-500" size={64} />
                            <p className="font-black uppercase tracking-widest text-muted-foreground">{t('history.empty')}</p>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </div>

            {/* Hidden Print Content for Statement of Account */}
            <div id="print-statement-content" className="hidden">
                <style>{`
                    @media print {
                        body { background: white; color: black; font-family: sans-serif; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: ${isRtl ? 'right' : 'left'}; }
                        th { background-color: #f8f9fa; font-weight: 900; text-transform: uppercase; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .font-black { font-weight: 900; }
                        .header-box { border: 2px solid #000; padding: 20px; margin-bottom: 30px; border-radius: 10px; }
                        .total-box { border: 2px solid #000; padding: 15px; margin-top: 30px; text-align: ${isRtl ? 'right' : 'left'}; border-radius: 10px; }
                        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 10rem; color: rgba(0,0,0,0.03); z-index: -1; pointer-events: none; font-weight: 900; }
                        .uppercase { text-transform: uppercase; }
                    }
                `}</style>

                <div className="watermark">{t('report.watermark')}</div>

                <div className="header-box" dir={isRtl ? 'rtl' : 'ltr'}>
                    <h1 className="text-3xl font-black mb-6 text-center uppercase tracking-tighter border-b-2 border-black pb-4">{t('report.title')}</h1>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <div className="text-[10px] font-black uppercase text-gray-500">{t('report.customerName')}</div>
                            <div className="text-lg font-black">{profile.name}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-black uppercase text-gray-500">{t('report.date')}</div>
                            <div className="text-lg font-black">{new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-black uppercase text-gray-500">{t('report.phone')}</div>
                            <div className="text-lg font-black">{profile.phone || t('report.na')}</div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-black uppercase text-gray-500">{t('report.address')}</div>
                            <div className="text-lg font-black">{profile.address || t('report.na')}</div>
                        </div>
                    </div>
                </div>

                <table dir={isRtl ? 'rtl' : 'ltr'}>
                    <thead>
                        <tr>
                            <th className="text-center">{t('report.table.index')}</th>
                            <th>{t('report.table.date')}</th>
                            <th>{t('report.table.type')}</th>
                            <th>{t('report.table.description')}</th>
                            <th className={'text-center'}>{t('report.table.debit')}</th>
                            <th className={'text-center'}>{t('report.table.credit')}</th>
                            <th className={'text-center'}>{t('report.table.balance')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statement && statement.statement.map((entry: StatementEntry, idx: number) => (
                            <tr key={`${entry.type}-${entry.id}`}>
                                <td className="text-center font-bold">{(idx + 1).toLocaleString(locale)}</td>
                                <td className="font-bold text-center">{new Date(entry.date).toLocaleDateString(locale)}</td>
                                <td className="text-center font-bold">{entry.type === 'INVOICE' ? t('statement.typeInvoice') : t('statement.typePayment')}</td>
                                <td className="font-bold text-center">
                                    {entry.description}
                                    {entry.recordedBy && <span className="block text-[10px] text-gray-500">{entry.recordedBy}</span>}
                                </td>
                                <td className={clsx("font-black text-red-600", 'text-center')}>{entry.debit > 0 ? entry.debit.toLocaleString(locale, { minimumFractionDigits: 2 }) : '—'}</td>
                                <td className={clsx("text-green-700 font-bold", 'text-center')}>{entry.credit > 0 ? entry.credit.toLocaleString(locale, { minimumFractionDigits: 2 }) : '—'}</td>
                                <td className={clsx("font-black", entry.balance > 0 ? "text-red-600" : "text-green-700", 'text-center')}>{entry.balance.toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="total-box" dir={isRtl ? 'rtl' : 'ltr'}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-black uppercase text-gray-600">{t('report.totalPurchases')}</span>
                        <span className="text-xl font-black">{totalSpent.toLocaleString(locale, { minimumFractionDigits: 2 })} {ts('currency')}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-black uppercase text-gray-600">{t('report.totalPayments')}</span>
                        <span className="text-xl font-black text-green-700">
                            {(payments?.reduce((sum: number, p: Payment) => sum + p.amount, 0) || 0).toLocaleString(locale, { minimumFractionDigits: 2 })} {ts('currency')}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-black mt-2">
                        <span className="text-lg font-black uppercase">{t('report.totalDue')}</span>
                        <span className="text-2xl font-black text-red-600">{Number(profile.balance).toLocaleString(locale, { minimumFractionDigits: 2 })} {ts('currency')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CustomerProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
                <Loader2 className="animate-spin text-primary" size={64} />
                <p className="text-muted-foreground font-black text-xl tracking-tighter uppercase animate-pulse">Loading Profile...</p>
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
