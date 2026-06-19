'use server';

import getPrisma from '@/lib/prisma';
import { getStartDateForPeriod, Period } from '@/lib/utils/date';
import { serializeInvoice, toNumber } from '@/lib/utils/decimal';
import { getCurrentUser } from '@/lib/auth/session';

// Get all staff members with their basic info
export async function getStaffList() {
    const prisma = getPrisma();
    const staff = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            role: true,
            createdAt: true
        },
        orderBy: { name: 'asc' }
    });
    return staff;
}

// Get sales details for a specific staff member by period
export async function getStaffSalesDetail(
    userId: string,
    period: 'day' | 'week' | 'month' | '2months' | '6months' | 'all'
) {
    // Salespeople can only view their own sales data
    const currentUser = await getCurrentUser();
    if (currentUser?.role === 'SALESPERSON' && currentUser.id !== userId) {
        throw new Error('You can only view your own sales data');
    }

    const prisma = getPrisma();

    const startDate = getStartDateForPeriod(period as Period);

    const invoices = await prisma.invoice.findMany({
        where: {
            userId,
            status: 'ACCEPTED',
            ...(startDate && { date: { gte: startDate } })
        },
        include: {
            items: {
                include: { product: true }
            }
        },
        orderBy: { date: 'desc' }
    });

    const totalSales = invoices.reduce((sum, inv) => sum + toNumber(inv.totalAmount), 0);
    const totalTransactions = invoices.length;

    return {
        invoices: invoices.map(inv => ({
            ...inv,
            items: inv.items.map(it => ({
                ...it,
                quantity: toNumber(it.quantity)
            }))
        })),
        totalSales,
        totalTransactions,
        period
    };
}

// Get a salesperson's full invoice portfolio with status info
export async function getStaffPortfolio(
    userId: string,
    filter?: { status?: 'ACCEPTED' | 'PENDING_REVIEW' | 'DECLINED'; period?: 'day' | 'week' | 'month' | 'all' }
) {
    // Salespeople can only view their own portfolio
    const currentUser = await getCurrentUser();
    if (currentUser?.role === 'SALESPERSON' && currentUser.id !== userId) {
        throw new Error('You can only view your own portfolio');
    }

    const prisma = getPrisma();

    const startDate = getStartDateForPeriod((filter?.period || 'all') as Period);

    const where: Record<string, unknown> = { userId };
    if (filter?.status) where.status = filter.status;
    if (startDate) where.date = { gte: startDate };

    const invoices = await prisma.invoice.findMany({
        where: where as any,
        include: {
            items: { include: { product: true } },
            reviewer: { select: { id: true, name: true, username: true } },
            revisedFrom: { select: { id: true } },
            revisedBy: { select: { id: true } },
        },
        orderBy: { date: 'desc' }
    });

    const statusCounts = {
        pending: invoices.filter(i => i.status === 'PENDING_REVIEW').length,
        accepted: invoices.filter(i => i.status === 'ACCEPTED').length,
        declined: invoices.filter(i => i.status === 'DECLINED').length,
    };

    const acceptedTotal = invoices
        .filter(i => i.status === 'ACCEPTED')
        .reduce((sum, inv) => sum + toNumber(inv.totalAmount), 0);

    return {
        invoices: invoices.map(inv => serializeInvoice(inv)),
        statusCounts,
        acceptedTotal
    };
}

