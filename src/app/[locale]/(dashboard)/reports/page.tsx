'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import { BarChart3, TrendingUp, Receipt, UserCheck } from 'lucide-react';
import clsx from 'clsx';

// Import tab components
import AnalyticsTab from '@/components/reports/AnalyticsTab';
import ProfitsTab from '@/components/reports/ProfitsTab';
import ExpensesTab from '@/components/reports/ExpensesTab';
import StaffSalesTab from '@/components/reports/StaffSalesTab';

type ReportTab = 'analytics' | 'profits' | 'expenses' | 'staff';

function ReportsDashboard() {
    const t = useTranslations('Reports');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const activeTab = (searchParams.get('tab') as ReportTab) || 'analytics';

    const handleTabChange = (tab: ReportTab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const tabsConfig = [
        { id: 'analytics' as const, label: t('tabs.analytics'), icon: BarChart3 },
        { id: 'profits' as const, label: t('tabs.profits'), icon: TrendingUp },
        { id: 'expenses' as const, label: t('tabs.expenses'), icon: Receipt },
        { id: 'staff' as const, label: t('tabs.staff'), icon: UserCheck }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        <BarChart3 size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                            {t('title')}
                        </h1>
                        <p className="text-xs text-muted-foreground font-medium">
                            {t('subtitle')}
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="bg-secondary/50 p-1 rounded-xl flex items-center border border-border overflow-x-auto max-w-full">
                    {tabsConfig.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] relative">
                {activeTab === 'analytics' && <AnalyticsTab />}
                {activeTab === 'profits' && <ProfitsTab />}
                {activeTab === 'expenses' && <ExpensesTab />}
                {activeTab === 'staff' && <StaffSalesTab />}
            </div>
        </div>
    );
}

export default function ReportsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        }>
            <ReportsDashboard />
        </Suspense>
    );
}
