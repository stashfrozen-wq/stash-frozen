'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuditLogs } from '@/app/actions/audit';
import { getUsers } from '@/app/actions/users';
import { RefreshCcw, User, Filter, ScrollText } from 'lucide-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { PageHeader, Spinner, Th, Pagination } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';

interface LogUser {
    id?: string;
    name: string | null;
    username: string;
    role: string;
}

interface LogEntry {
    id: string;
    action: string;
    details: string | null;
    status: boolean;
    reason: string | null;
    timestamp: string | Date;
    user?: LogUser;
}

const ITEMS_PER_PAGE = 50;

function LogsContent() {
    const t = useTranslations('Logs');
    const { locale, isRtl } = useLocale();

    const searchParams = useSearchParams();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [users, setUsers] = useState<LogUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [selectedUserId, setSelectedUserId] = useState<string>(searchParams.get('user') || '');
    const [pagination, setPagination] = useState({ total: 0, pages: 1, current: 1 });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getAuditLogs(page, ITEMS_PER_PAGE, selectedUserId || undefined);
            if (res.success && res.logs) {
                setLogs(res.logs);
                setPagination(res.pagination || { total: 0, pages: 1, current: 1 });
            }
        } finally {
            setLoading(false);
        }
    }, [page, selectedUserId]);

    useEffect(() => {
        getUsers().then(setUsers);
    }, []);

    useEffect(() => {
        fetchLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, selectedUserId]);

    const getActionColor = useCallback((action: string) => {
        if (action.includes('SALE')) return 'bg-green-100 text-green-700 border-green-200';
        if (action.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (action.includes('CREATE')) return 'bg-purple-100 text-purple-700 border-purple-200';
        return 'bg-secondary text-secondary-foreground border-border';
    }, []);

    const handleUserFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedUserId(e.target.value);
        setPage(1);
    }, []);

    const handleClearFilter = useCallback(() => {
        setSelectedUserId('');
        setPage(1);
    }, []);

    return (
        <div className="space-y-6">
            <PageHeader
                icon={ScrollText}
                title={<h1 className="text-3xl font-black tracking-tighter uppercase text-foreground">{t('title')}</h1>}
                isRtl={isRtl}
                actions={
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                        {t('refresh')}
                    </button>
                }
            />

            {/* User Filter */}
            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
                <Filter size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">{t('filters.user')}</span>
                <select
                    value={selectedUserId}
                    onChange={handleUserFilterChange}
                    className="bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 ring-primary/20"
                >
                    <option value="">{t('filters.allUsers')}</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name || u.username} ({u.role})
                        </option>
                    ))}
                </select>
                {selectedUserId && (
                    <button
                        onClick={handleClearFilter}
                        className="text-xs text-primary hover:underline"
                    >
                        {t('filters.clear')}
                    </button>
                )}
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/30 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                            <tr>
                                <Th>{t('table.action')}</Th>
                                <Th>{t('table.status')}</Th>
                                <Th>{t('table.details')}</Th>
                                <Th>{t('table.reason')}</Th>
                                <Th>{t('table.user')}</Th>
                                <Th>{t('table.email')}</Th>
                                <Th>{t('table.time')}</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground"><Spinner className="mx-auto" /></td></tr>
                            // eslint-disable-next-line sonarjs/no-nested-conditional
                            ) : logs.length === 0 ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">{t('empty')}</td></tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/50 transition-colors text-sm">
                                        <td className="px-6 py-4 text-center">
                                            <span className={clsx("px-2.5 py-1 rounded-full text-xs font-bold border", getActionColor(log.action))}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {log.status === false ? (
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-red-100 text-red-700 border-red-200">{t('status.failed')}</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold border bg-green-100 text-green-700 border-green-200">{t('status.success')}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground/80 text-center">{log.details}</td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs text-center">{log.reason || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                                                <User size={14} />
                                                {log.user?.name || 'System'}
                                                {log.user?.role && <span className="text-[10px] bg-secondary px-1 rounded">{log.user.role}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground text-xs text-center">{log.user?.username || '-'}</td>
                                        <td className={clsx("px-6 py-4 tabular-nums text-muted-foreground text-xs whitespace-nowrap", 'text-center')}>
                                            {new Date(log.timestamp).toLocaleString(locale)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t border-border bg-secondary/10">
                        <div className="text-sm text-muted-foreground mb-2 text-center">
                            {t('pagination.status', { page: page.toLocaleString(locale), total: pagination.pages.toLocaleString(locale), count: pagination.total.toLocaleString(locale) })}
                        </div>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.pages}
                            onPageChange={setPage}
                            isRtl={isRtl}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
            <LogsContent />
        </Suspense>
    );
}
