import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import type { User } from '@supabase/supabase-js';

const handleI18nRouting = createMiddleware(routing);

// Helper to check if pathname matches protected routes (with or without locale)
function isProtectedPath(path: string): boolean {
    const unprotectedPaths = ['/login', '/api', '/_next', '/favicon.ico'];
    const pathWithoutLocale = path.replace(/^\/(en|ar)(\/|$)/, '/');
    
    if (unprotectedPaths.some(p => pathWithoutLocale.startsWith(p))) return false;
    
    const protectedRoots = ['/dashboard', '/inventory', '/sales', '/invoices', '/profits', '/staff-sales', '/logs', '/users', '/expenses', '/refunds'];
    return pathWithoutLocale === '/' || protectedRoots.some(p => pathWithoutLocale.startsWith(p));
}

function handleAuthRedirect(pathname: string, request: NextRequest, user: User | null): NextResponse | null {
    const isProtectedRoute = isProtectedPath(pathname);
    const pathWithoutLocale = pathname.replace(/^\/(en|ar)(\/|$)/, '/');
    const isLoginPage = pathWithoutLocale === '/login';

    const localeMatch = pathname.match(/^\/(en|ar)/);
    const localePrefix = localeMatch ? localeMatch[0] : '';

    if (isProtectedRoute && !user) {
        return NextResponse.redirect(new URL(`${localePrefix}/login`, request.url))
    }

    if (isLoginPage && user) {
        return NextResponse.redirect(new URL(`${localePrefix}/dashboard`, request.url))
    }

    return null;
}

function handleDeviceRouting(pathname: string, request: NextRequest, userAgent: string): NextResponse | null {
    const isAndroid = /Android/i.test(userAgent);
    const pathWithoutLocale = pathname.replace(/^\/(en|ar)(\/|$)/, '/');
    const localeMatch = pathname.match(/^\/(en|ar)/);
    const localePrefix = localeMatch ? localeMatch[0] : '';

    if (pathWithoutLocale === '/sales' || pathWithoutLocale === '/sales/') {
        if (isAndroid) {
            return NextResponse.redirect(new URL(`${localePrefix}/sales/quick`, request.url));
        }
    } else if (pathWithoutLocale === '/sales/quick' || pathWithoutLocale === '/sales/quick/') {
        if (!isAndroid) {
            return NextResponse.redirect(new URL(`${localePrefix}/sales`, request.url));
        }
    }

    return null;
}

export async function middleware(request: NextRequest) {
    // 1. Handle i18n routing first
    const i18nResponse = handleI18nRouting(request);

    // E2E testing bypass — skip auth when BYPASS_AUTH is set
    // NEVER enable this in production deployments
    if (process.env.BYPASS_AUTH === 'true') {
        return i18nResponse;
    }

    // 2. Prepare Supabase client
    let supabaseResponse = i18nResponse;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    // Copy i18n headers/cookies if any
                    i18nResponse.headers.forEach((v, k) => supabaseResponse.headers.set(k, v));
                    
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user ?? null

    const pathname = request.nextUrl.pathname;
    
    const authRedirect = handleAuthRedirect(pathname, request, user);
    if (authRedirect) return authRedirect;

    const userAgent = request.headers.get('user-agent') || '';
    const deviceRedirect = handleDeviceRouting(pathname, request, userAgent);
    if (deviceRedirect) return deviceRedirect;

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - logo.webp, logo.jpg (public assets)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
