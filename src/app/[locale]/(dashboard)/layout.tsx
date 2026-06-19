'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    FileText,
    LogOut,
    Menu,
    X,
    ArrowLeftRight,
    ClipboardCheck,
    TrendingUp,
    UserCheck,
    BarChart3,
    ScrollText,
    DollarSign,
    RefreshCcw,
    Globe,
    Download,
    Tags,
    ChevronDown,
    ChevronRight,
    Zap,
    Database,
    ClipboardList,
    FolderOpen,
    Landmark,
    Layers
} from 'lucide-react';
import clsx from 'clsx';
import { signOut } from '@/app/actions/auth';
import { getMenuItemsForUser, getCurrentUser } from '@/app/actions/permissions';
import { getPendingReviewInvoices } from '@/app/actions/reviews';
import { Spinner } from '@/components/ui';

const iconMap: Record<string, React.ElementType> = {
    '/dashboard': LayoutDashboard,
    '/sales': ShoppingCart,
    '/stocktake': ClipboardCheck,
    '/inventory': Layers,
    '/movements': ArrowLeftRight,
    '/incoming': Download,
    '/products': Package,
    '/invoices': FileText,
    '/customers': Users,
    '/reports': BarChart3,
    '/reviews': ClipboardList,
    '/portfolio': FolderOpen,
    '/logs': ScrollText,
    '/users': Users,
    '/refunds': RefreshCcw,
    '/debts': Landmark,
    '/backup': Database,
};

interface MenuItem {
    to: string;
    translationKey: string;
    permission: string;
}

interface CurrentUser {
    id: string;
    username: string;
    name: string | null;
    role: string;
}

const SidebarItem = ({ to, icon: Icon, translationKey, active, onClick, hasDot }: { to: string, icon: React.ElementType, translationKey: string, active: boolean, onClick?: () => void, hasDot?: boolean }) => {
    const t = useTranslations('Navigation');
    const ref = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (active && ref.current) {
            const timer = setTimeout(() => {
                ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [active]);

    return (
        <Link
            ref={ref}
            href={to as import('react').ComponentProps<typeof Link>['href']}
            onClick={onClick}
            className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mx-2",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
        >
            <div className="relative flex items-center justify-center">
                <Icon size={20} />
                {hasDot && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
                )}
            </div>
            <span className={clsx("text-sm transition-colors duration-200", active ? "font-bold" : "font-medium")}>
                {t(translationKey)}
            </span>
        </Link>
    );
};

const SidebarGroup = ({ 
    id, 
    items, 
    pathname, 
    isOpen, 
    onToggle,
    onItemClick,
    hasPendingReviews
}: { 
    id: string, 
    items: MenuItem[], 
    pathname: string, 
    isOpen: boolean, 
    onToggle: () => void,
    onItemClick?: () => void,
    hasPendingReviews?: boolean
}) => {
    const t = useTranslations('Navigation');

    if (items.length === 0) return null;

    const isEffectivelyOpen = isOpen || items.length === 1;

    return (
        <div className="space-y-1 mb-2">
            <button 
                onClick={items.length === 1 ? undefined : onToggle}
                className={clsx(
                    "w-full flex items-center justify-between px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-colors",
                    items.length === 1 ? "cursor-default" : "hover:text-foreground"
                )}
            >
                {t(`groups.${id}`)}
                {items.length > 1 && (
                    isEffectivelyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} className="rtl:rotate-180" />
                )}
            </button>
            
            <div className={clsx("space-y-1 transition-all duration-300 ease-in-out overflow-hidden", isEffectivelyOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0")}>
                {items.map((item) => (
                    <SidebarItem
                        key={item.to}
                        to={item.to}
                        icon={iconMap[item.to] || LayoutDashboard}
                        translationKey={item.translationKey}
                        active={pathname === item.to || pathname.startsWith(item.to + '/')}
                        onClick={onItemClick}
                        hasDot={item.to === '/reviews' && hasPendingReviews}
                    />
                ))}
            </div>
        </div>
    );
};

const getGroupForPathname = (pathname: string): string | null => {
    const overviewPaths = ['/dashboard', '/reports'];
    const salesPaths = ['/sales', '/invoices', '/portfolio', '/customers', '/debts', '/reviews'];
    const inventoryPaths = ['/products', '/inventory', '/stocktake', '/movements', '/incoming'];
    const managementPaths = ['/logs', '/users', '/backup'];

    if (overviewPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return 'overview';
    if (salesPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return 'sales';
    if (inventoryPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return 'inventory';
    if (managementPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) return 'management';
    return null;
};

const getRequiredPermission = (path: string): string | null => {
    if (path === '/dashboard' || path.startsWith('/dashboard/')) return 'dashboard';
    if (path === '/sales' || path.startsWith('/sales/')) return 'sales';
    if (path === '/stocktake' || path.startsWith('/stocktake/')) return 'stocktake';
    if (path === '/inventory' || path.startsWith('/inventory/')) return 'inventory';
    if (path === '/movements' || path.startsWith('/movements/')) return 'movements';
    if (path === '/incoming' || path.startsWith('/incoming/')) return 'movements';
    if (path === '/products' || path.startsWith('/products/')) return 'products';
    if (path === '/invoices' || path.startsWith('/invoices/')) return 'invoices';
    if (path === '/refunds' || path.startsWith('/refunds/')) return 'invoices';
    if (path === '/customers' || path.startsWith('/customers/')) return 'customers';
    if (path === '/reports' || path.startsWith('/reports/')) return 'reports';
    if (path === '/reviews' || path.startsWith('/reviews/')) return 'review';
    if (path === '/portfolio' || path.startsWith('/portfolio/')) return 'portfolio';
    if (path === '/logs' || path.startsWith('/logs/')) return 'logs';
    if (path === '/users' || path.startsWith('/users/')) return 'users';
    if (path === '/debts' || path.startsWith('/debts/')) return 'debts';
    if (path === '/backup' || path.startsWith('/backup/')) return 'backup';
    return null;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [openGroupId, setOpenGroupId] = useState<string | null>(null);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [hasPendingReviews, setHasPendingReviews] = useState(false);

    const hasReviewPermission = menuItems.some(item => item.permission === 'review');

    useEffect(() => {
        if (!hasReviewPermission) {
            setHasPendingReviews(false);
            return;
        }

        const checkPendingReviews = async () => {
            try {
                const invoices = await getPendingReviewInvoices();
                setHasPendingReviews(invoices.length > 0);
            } catch (err) {
                console.error('Error checking pending reviews', err);
            }
        };

        checkPendingReviews();

        // Poll every 30 seconds
        const interval = setInterval(checkPendingReviews, 30000);
        return () => clearInterval(interval);
    }, [hasReviewPermission, pathname]);

    useEffect(() => {
        // Load menu items based on user permissions
        Promise.all([getMenuItemsForUser(), getCurrentUser()]).then(([items, user]) => {
            setMenuItems(items as MenuItem[]);
            setCurrentUser(user as CurrentUser);
            setPermissionsLoaded(true);
        }).catch(err => {
            console.error('Failed to load user permissions', err);
            setPermissionsLoaded(true);
        });
    }, []);

    // Page access validation and redirection
    useEffect(() => {
        if (!permissionsLoaded) return;

        const reqPermission = getRequiredPermission(pathname);
        if (reqPermission) {
            const hasAccess = menuItems.some(item => item.permission === reqPermission);
            if (!hasAccess) {
                if (menuItems.length > 0) {
                    router.replace(menuItems[0].to);
                } else {
                    router.replace('/login');
                }
            }
        }
    }, [pathname, menuItems, permissionsLoaded, router]);

    // Automatically expand the active category group and collapse the others on route change
    useEffect(() => {
        const activeGroup = getGroupForPathname(pathname);
        if (activeGroup) {
            setOpenGroupId(activeGroup);
        }
    }, [pathname]);

    const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
    const handleToggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
    const handleSignOut = useCallback(async () => {
        await signOut();
    }, []);

    const toggleLocale = useCallback(() => {
        const nextLocale = locale === 'en' ? 'ar' : 'en';
        document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
        router.replace(pathname, { locale: nextLocale });
    }, [locale, pathname, router]);

    const handleToggleGroup = useCallback((groupId: string) => {
        setOpenGroupId(prev => prev === groupId ? null : groupId);
    }, []);

    const reqPermission = getRequiredPermission(pathname);
    const hasAccess = !reqPermission || menuItems.some(item => item.permission === reqPermission);

    if (!permissionsLoaded || !hasAccess) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
                <Spinner size={32} />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={handleCloseSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed lg:relative z-30 w-64 h-full bg-card border-r border-border flex flex-col transition-transform duration-300",
                !isSidebarOpen
                    ? locale === 'ar'
                        ? "translate-x-full lg:translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                    : "translate-x-0",
                locale === 'ar' ? "right-0 border-l border-r-0" : "left-0"
            )}>
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-[46px] h-[46px] overflow-hidden flex-shrink-0 flex items-center justify-center rounded-full">
                        <Image src="/stash-logo.png" alt="STASH Logo" width={46} height={46} className="w-full h-full object-cover rounded-full" priority />
                    </div>
                    <h1 className="text-xl font-black bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent uppercase tracking-tighter">
                        STASH
                    </h1>
                    <button
                        onClick={handleToggleSidebar}
                        className="lg:hidden ml-auto p-2 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-border rounded-xl transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background hover:scale-105 active:scale-95 flex items-center justify-center"
                        aria-label="Close sidebar"
                    >
                        <X size={18} className="transition-transform duration-300 hover:rotate-90" />
                    </button>
                </div>

                <nav className="flex-1 py-4 overflow-y-auto">
                    <SidebarGroup 
                        id="overview" 
                        pathname={pathname}
                        items={menuItems.filter(i => ['/dashboard', '/reports'].includes(i.to))} 
                        isOpen={openGroupId === 'overview'}
                        onToggle={() => handleToggleGroup('overview')}
                        onItemClick={handleCloseSidebar}
                    />
                    <SidebarGroup 
                        id="sales" 
                        pathname={pathname}
                        items={menuItems.filter(i => ['/sales', '/invoices', '/portfolio', '/customers', '/debts', '/reviews'].includes(i.to))} 
                        isOpen={openGroupId === 'sales'}
                        onToggle={() => handleToggleGroup('sales')}
                        onItemClick={handleCloseSidebar}
                        hasPendingReviews={hasPendingReviews}
                    />
                    <SidebarGroup 
                        id="inventory" 
                        pathname={pathname}
                        items={menuItems.filter(i => ['/products', '/inventory', '/stocktake', '/movements', '/incoming'].includes(i.to))} 
                        isOpen={openGroupId === 'inventory'}
                        onToggle={() => handleToggleGroup('inventory')}
                        onItemClick={handleCloseSidebar}
                    />
                    <SidebarGroup 
                        id="management" 
                        pathname={pathname}
                        items={menuItems.filter(i => ['/logs', '/users', '/backup'].includes(i.to))} 
                        isOpen={openGroupId === 'management'}
                        onToggle={() => handleToggleGroup('management')}
                        onItemClick={handleCloseSidebar}
                    />
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                    <button
                        onClick={toggleLocale}
                        className="flex items-center gap-3 px-4 py-3 w-full text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
                    >
                        <Globe size={20} />
                        <span className="font-medium">{locale === 'en' ? 'العربية' : 'English'}</span>
                    </button>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">{t('Navigation.logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur px-6 flex items-center justify-between">
                    <button onClick={handleToggleSidebar} className="p-2 hover:bg-secondary rounded-lg lg:hidden">
                        <Menu />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm font-medium">{currentUser?.name || currentUser?.username || t('Common.user')}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{currentUser?.role || t('Common.loading')}</div>
                        </div>
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white",
                            (({ ROOT: 'bg-purple-500', ADMIN: 'bg-blue-500', ACCOUNTANT: 'bg-green-500', SALESPERSON: 'bg-orange-500' } as Record<string, string>)[currentUser?.role || ''] || 'bg-gray-500')
                        )}>
                            {(currentUser?.name || currentUser?.username || 'U')[0].toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-2 md:p-6 bg-secondary/20">
                    {children}
                </div>
            </main>
        </div>
    );
}
