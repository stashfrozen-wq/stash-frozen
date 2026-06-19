'use server';

import getPrisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';
import { calcSkip } from '@/lib/utils/pagination';
import { logger } from '@/lib/utils/logger';

export async function logActivity(
    action: string,
    details?: string,
    explicitUserId?: string,
    status: boolean = true,
    reason?: string
) {
    const prisma = getPrisma();
    let userId = explicitUserId;

    if (!userId) {
        const user = await getCurrentUser();
        if (user) {
            userId = user.id;
        }
    }

    if (!userId) {
        const admin = await prisma.user.findFirst({ where: { role: 'ROOT' } });
        userId = admin?.id;
    }

    if (!userId) {
        logger.warn('logActivity', `Failed to log activity "${action}": No valid userId found.`);
        return { success: false, error: 'User not identified' };
    }

    try {
        await prisma.auditLog.create({
            data: {
                action,
                details,
                userId,
                status,
                reason
            }
        });
        return { success: true };
    } catch (error) {
        logger.error('Audit log error:', error);
        return { success: false, error: 'Failed to create log' };
    }
}

export async function getAuditLogs(page = 1, limit = 50, userId?: string) {
    const prisma = getPrisma();
    const skip = calcSkip(page, limit);

    const where = userId ? { userId } : {};

    try {
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: {
                    user: {
                        select: { name: true, username: true, role: true }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        return {
            success: true,
            logs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: page
            }
        };
    } catch (error) {
        logger.error('Get logs error:', error);
        return { success: false, error: 'Failed to fetch logs' };
    }
}
