import { getDashboardStats } from '@/app/actions/dashboard';
import { getAuditLogs } from '@/app/actions/audit';
import { RefreshCcw, ShoppingCart, Activity } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

// Force dynamic rendering to ensure fresh data
export const revalidate = 60;

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const [stats, { logs: recentLogs }, t, ts] = await Promise.all([
        getDashboardStats(),
        getAuditLogs(1, 4),
        getTranslations({ locale, namespace: 'Home' }),
        getTranslations({ locale, namespace: 'Sales' }),
    ]);

    return (
        <div className="space-y-6" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            
            <h1 className="text-3xl font-black mb-8">{t('subtitle')}</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 rounded-2xl bg-card border border-border">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('metrics.totalRevenue')}</div>
                    <div className="text-2xl font-black">{ts('currency')} {Number(stats.revenue).toLocaleString(locale)}</div>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 mt-1">{t('metrics.lifetime')}</p>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('metrics.inventoryValue')}</div>
                    <div className="text-2xl font-black">{stats.activeInventory.toLocaleString(locale)} <span className="text-xs font-medium text-muted-foreground">Units</span></div>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 mt-1">{t('metrics.totalStock')}</p>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('metrics.salesToday')}</div>
                    <div className="text-2xl font-black">{ts('currency')} {Number(stats.salesToday).toLocaleString(locale)}</div>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 mt-1">{t('metrics.fromMidnight')}</p>
                </div>

                <div className="p-6 rounded-2xl bg-card border border-border">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('metrics.activeVehicles')}</div>
                    <div className="text-2xl font-black">{stats.activeVehicles.toLocaleString(locale)}</div>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/60 mt-1">{t('metrics.onTheRoad')}</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/sales" className="p-5 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary text-primary-foreground rounded-xl">
                            <ShoppingCart size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-0.5">{t('actions.newSale')}</div>
                            <div className="text-xs font-bold text-muted-foreground">{t('actions.openPos')}</div>
                        </div>
                    </div>
                </Link>

                <Link href="/incoming" prefetch={false} className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 text-white rounded-xl">
                            <RefreshCcw size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">{t('actions.addStock')}</div>
                            <div className="text-xs font-bold text-muted-foreground">{t('actions.purchaseOrder')}</div>
                        </div>
                    </div>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-2xl border border-border bg-card text-card-foreground p-6 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('sections.salesRevenue')}</div>
                            <div className="text-lg font-black">{ts('currency')} {Number(stats.revenue).toLocaleString(locale)}</div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <div className="w-2.5 h-2.5 bg-primary rounded-full" /> {t('sections.salesLegend')}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end gap-3 min-h-[220px] border-b border-border/50 pb-2">
                        {/* Chart Bars using real weekly data */}
                        {stats.weeklyData.map((day, i) => {
                            const maxAmount = Math.max(...stats.weeklyData.map(d => d.amount), 1);
                            const heightPercent = Math.max((day.amount / maxAmount) * 100, 5);
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                                    <div
                                        className="w-full bg-primary/20 group-hover:bg-primary transition-all rounded-t-lg relative"
                                        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                                        style={{ height: `${heightPercent}%` }}
                                    >
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 transition-opacity">
                                            {ts('currency')} {day.amount.toLocaleString(locale)}
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60">{day.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="col-span-3 rounded-2xl border border-border bg-card text-card-foreground p-6 flex flex-col">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">{t('sections.recentSales')}</div>
                    <div className="space-y-4 flex-1">
                        {stats.recentSales.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t('sections.noRecentSales')}</div>
                            </div>
                        ) : (
                            stats.recentSales.map((sale) => (
                                <div key={sale.id} className="flex items-center justify-between p-3 rounded-xl">
                                    <div>
                                        <div className="text-xs font-black tracking-tight mb-1">Invoice #{sale.id.slice(0, 8).toUpperCase()}</div>
                                        <div className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                                            {sale.user?.name || sale.user?.username || 'System'}
                                            <span className="mx-2 opacity-30">•</span>
                                            {new Date(sale.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="text-sm font-black text-primary">+{ts('currency')} {Number(sale.totalAmount).toLocaleString(locale)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity Widget */}
            <div className="grid gap-4">
                <div className="rounded-2xl border border-border bg-card text-card-foreground p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <Activity size={24} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('sections.systemActivity')}</div>
                                <div className="text-xl font-black">Live Audit Feed</div>
                            </div>
                        </div>
                        <Link href="/logs" prefetch={false} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-all">{t('sections.viewAll')}</Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {(!recentLogs || recentLogs.length === 0) ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-2xl">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('sections.noActivity')}</div>
                            </div>
                        ) : (
                            recentLogs.map((log) => (
                                <div key={log.id} className="p-5 rounded-2xl bg-secondary/10 border border-border flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                                            {log.action}
                                        </span>
                                        <span className="text-[10px] font-bold text-muted-foreground/60">{new Date(log.timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-xs font-bold leading-relaxed line-clamp-2">{log.details}</p>
                                    <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 border-t border-border/50 pt-3">
                                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[8px]">
                                            {(log.user?.name || log.user?.username || 'S')[0].toUpperCase()}
                                        </div>
                                        {log.user?.name || log.user?.username || 'System'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
