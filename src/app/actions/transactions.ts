/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import getPrisma from '@/lib/prisma';
import { calcSkip } from '@/lib/utils/pagination';
import { endOfDay } from '@/lib/utils/date';
import { logger } from '@/lib/utils/logger';

export async function getStockMovements(
    page = 1,
    limit = 50,
    filters?: {
        type?: string;
        productId?: string;
        locationId?: string;
        startDate?: string;
        endDate?: string;
    }
) {
    const prisma = getPrisma();
    const skip = calcSkip(page, limit);

    try {
        const whereClause: any = {};
        if (filters?.type && filters.type !== 'ALL') whereClause.type = filters.type;
        if (filters?.locationId && filters.locationId !== 'ALL') {
            whereClause.OR = [
                { fromLocationId: filters.locationId },
                { toLocationId: filters.locationId }
            ];
        }
        if (filters?.productId && filters.productId !== 'ALL') {
            whereClause.items = {
                some: { productId: filters.productId }
            };
        }
        if (filters?.startDate || filters?.endDate) {
            whereClause.date = {};
            if (filters.startDate) whereClause.date.gte = new Date(filters.startDate);
            if (filters.endDate) whereClause.date.lte = endOfDay(filters.endDate);
        }

        const [movements, total] = await Promise.all([
            prisma.transaction.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    fromLocation: true,
                    toLocation: true,
                    items: {
                        include: {
                            product: { select: { name: true, sku: true } }
                        }
                    },
                    supplier: true
                }
            }),
            prisma.transaction.count({ where: whereClause })
        ]);

        return {
            success: true,
            movements: movements.map(m => ({
                ...m,
                items: m.items.map(it => ({
                    ...it,
                    quantity: Number(it.quantity)
                }))
            })),
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: page
            }
        };
    } catch (error) {
        logger.error('Get stock movements error:', error);
        return { success: false, error: 'Failed to fetch stock movements' };
    }
}
