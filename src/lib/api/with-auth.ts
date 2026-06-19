import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { timingSafeEqual } from 'crypto';
import type { DBUser } from '@/lib/auth/session';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function apiError(message: string, status: number = 500): NextResponse {
    return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

type AuthHandler<T = unknown> = (
    req: NextRequest,
    user: DBUser
) => Promise<T>;

type SecretHandler<T = unknown> = (
    req: NextRequest
) => Promise<T>;

function checkSecret(key: string | null, envVar: string): boolean {
    const secret = process.env[envVar];
    if (!secret || !key) return false;
    if (key.length !== secret.length) return false;
    try {
        return timingSafeEqual(Buffer.from(key), Buffer.from(secret));
    } catch {
        return false;
    }
}

export function withAuth<T = NextResponse>(
    handler: AuthHandler<T>,
    opts?: { roles?: string[]; permissions?: string[] }
): (req: NextRequest) => Promise<T | NextResponse> {
    return async (req: NextRequest) => {
        try {
            const supabase = await createClient();
            const { data: { session } } = await supabase.auth.getSession();
            const authUser = session?.user;
            if (!authUser) {
                return apiError('Unauthorized', 401);
            }

            const { default: getPrisma } = await import('@/lib/prisma');
            const prisma = getPrisma();
            const dbUser = await prisma.user.findUnique({
                where: { id: authUser.id },
            });

            if (!dbUser) {
                return apiError('Unauthorized', 401);
            }

            if (opts?.roles && !opts.roles.includes(dbUser.role)) {
                return apiError('Forbidden', 403);
            }

            if (opts?.permissions) {
                const userPerms = dbUser.permissions || [];
                const hasAny = opts.permissions.some((p) => userPerms.includes(p));
                if (!hasAny && dbUser.role !== 'ROOT' && dbUser.role !== 'ADMIN') {
                    return apiError('Forbidden', 403);
                }
            }

            return await handler(req, dbUser);
        } catch (error) {
            logger.error('API auth error:', error);
            return apiError('Internal Server Error', 500);
        }
    };
}

export function withSecret<T = NextResponse>(
    handler: SecretHandler<T>,
    envVar: string = 'CRON_SECRET'
): (req: NextRequest) => Promise<T | NextResponse> {
    return async (req: NextRequest) => {
        const { searchParams } = new URL(req.url);
        const key = searchParams.get('key') || searchParams.get('secret');

        if (!checkSecret(key, envVar === 'CRON_SECRET' ? 'CRON_SECRET' : envVar)) {
            return apiError('Not found', 404);
        }

        try {
            return await handler(req);
        } catch (error) {
            logger.error('API secret route error:', error);
            return apiError('Internal Server Error', 500);
        }
    };
}

export function withWebhookSecret<T = NextResponse>(
    handler: SecretHandler<T>
): (req: NextRequest) => Promise<T | NextResponse> {
    return async (req: NextRequest) => {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
            return apiError('Unauthorized', 401);
        }

        try {
            return await handler(req);
        } catch (error) {
            logger.error('Webhook error:', error);
            return NextResponse.json({ success: false, error: 'Internal server error' });
        }
    };
}
