import getPrisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';
import { Prisma } from '@/generated/client';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DBUser = Prisma.UserGetPayload<{}>;

export async function getCurrentUser(): Promise<DBUser | null> {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;

    if (!authUser) return null;

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
        where: { id: authUser.id },
    });

    return user;
}

export async function requireAuth(): Promise<DBUser> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    return user;
}

export async function requireRole(...roles: string[]): Promise<DBUser> {
    const user = await requireAuth();
    if (!roles.includes(user.role)) {
        throw new Error(`Requires one of: ${roles.join(', ')}`);
    }
    return user;
}

export function hasPermission(user: DBUser | null, permission: string): boolean {
    if (!user) return false;
    if (user.role === 'ROOT') return true;
    if (user.permissions && user.permissions.length > 0) {
        return user.permissions.includes(permission);
    }
    return (DEFAULT_PERMISSIONS[user.role] || []).includes(permission);
}

export async function requirePermission(permission: string): Promise<DBUser> {
    const user = await requireAuth();
    if (!hasPermission(user, permission)) {
        throw new Error(`You do not have '${permission}' permission`);
    }
    return user;
}

export function isReviewer(user: DBUser | null): boolean {
    if (!user) return false;
    return (
        user.role === 'ROOT' ||
        user.role === 'ADMIN' ||
        (user.permissions || []).includes('review')
    );
}

export async function hasRole(...roles: string[]): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role);
}
