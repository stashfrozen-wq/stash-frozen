'use server';

import getPrisma from '@/lib/prisma';
import { traceAction } from '@/lib/perf-trace';
import { startOfDay } from '@/lib/utils/date';
import { toNumber } from '@/lib/utils/decimal';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@/generated/client';

type WeeklyBucket = { day: Date; amount: Prisma.Decimal };

async function fetchDashboardStats() {
    const prisma = getPrisma();

    const startOfToday = startOfDay(new Date());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
        totalRevenue, totalRefunds,
        inventoryCount,
        salesToday, refundsToday,
        recentSales,
        activeVehicles,
        weeklyInvoices, weeklyRefunds
    ] = await Promise.all([
        prisma.invoice.aggregate({
            _sum: { totalAmount: true },
            where: { status: 'ACCEPTED' }
        }),
        prisma.refund.aggregate({
            _sum: { totalAmount: true }
        }),

        prisma.inventory.aggregate({
            _sum: { quantity: true }
        }),

        prisma.invoice.aggregate({
            _sum: { totalAmount: true },
            where: {
                status: 'ACCEPTED',
                date: { gte: startOfToday }
            }
        }),
        prisma.refund.aggregate({
            _sum: { totalAmount: true },
            where: {
                createdAt: { gte: startOfToday }
            }
        }),

        prisma.invoice.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            where: { status: 'ACCEPTED' },
            select: {
                id: true,
                date: true,
                totalAmount: true,
                user: {
                    select: { name: true, username: true }
                }
            }
        }),

        prisma.location.count({
            where: { type: 'VEHICLE' }
        }),

        prisma.$queryRaw<WeeklyBucket[]>`
            SELECT
                DATE_TRUNC('day', "date") as day,
                SUM("totalAmount") as amount
            FROM "Invoice"
            WHERE "status" = 'ACCEPTED' AND "date" >= ${sevenDaysAgo}
            GROUP BY DATE_TRUNC('day', "date")
            ORDER BY day
        `,

        prisma.$queryRaw<WeeklyBucket[]>`
            SELECT
                DATE_TRUNC('day', "createdAt") as day,
                SUM("totalAmount") as amount
            FROM "Refund"
            WHERE "createdAt" >= ${sevenDaysAgo}
            GROUP BY DATE_TRUNC('day', "createdAt")
            ORDER BY day
        `
    ]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const invoiceMap = new Map(
        weeklyInvoices.map(r => [
            new Date(r.day).toISOString().split('T')[0],
            Number(r.amount)
        ])
    );
    const refundMap = new Map(
        weeklyRefunds.map(r => [
            new Date(r.day).toISOString().split('T')[0],
            Number(r.amount)
        ])
    );

    const weeklyData: { day: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        weeklyData.push({
            day: dayNames[date.getDay()],
            amount: (invoiceMap.get(dateKey) || 0) - (refundMap.get(dateKey) || 0)
        });
    }

    return {
        revenue: toNumber(totalRevenue._sum.totalAmount) - toNumber(totalRefunds._sum.totalAmount),
        activeInventory: inventoryCount._sum.quantity || 0,
        salesToday: toNumber(salesToday._sum.totalAmount) - toNumber(refundsToday._sum.totalAmount),
        recentSales: recentSales.map(inv => ({
            ...inv,
            totalAmount: toNumber(inv.totalAmount)
        })),
        activeVehicles,
        weeklyData
    };
}

const getDashboardStatsCached = unstable_cache(
    fetchDashboardStats,
    ['dashboard'],
    {
        revalidate: 60,
        tags: ['dashboard']
    }
);

export async function getDashboardStats() {
    return traceAction('getDashboardStats', () => getDashboardStatsCached());
}
