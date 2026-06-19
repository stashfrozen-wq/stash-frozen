'use server';

import getPrisma from '@/lib/prisma';
import { DateRange, endOfDay, buildDateRangeFilter } from '@/lib/utils/date';
import { toNumber } from '@/lib/utils/decimal';

export async function getProfitReport({ startDate, endDate }: DateRange = {}) {
    const prisma = getPrisma();
    
    let whereClause = '';
    const params: any[] = [];
    
    if (startDate && endDate) {
        whereClause = 'WHERE "Invoice"."status" = \'ACCEPTED\' AND "Invoice"."date" >= $1 AND "Invoice"."date" <= $2';
        params.push(
            new Date(startDate), 
            endOfDay(endDate)
        );
    } else {
        whereClause = 'WHERE "Invoice"."status" = \'ACCEPTED\'';
    }
    
    // We run the raw queries to prevent memory leaks from loading all items into memory
    const revenueRes = await prisma.$queryRawUnsafe<any[]>(`
        SELECT SUM("totalAmount") as "totalRevenue" 
        FROM "Invoice" 
        ${whereClause}
    `, ...params);

    const costRes = await prisma.$queryRawUnsafe<any[]>(`
        SELECT SUM("InvoiceItem"."quantity" * "Product"."costPrice") as "totalCost"
        FROM "InvoiceItem"
        JOIN "Invoice" ON "Invoice"."id" = "InvoiceItem"."invoiceId"
        JOIN "Product" ON "Product"."id" = "InvoiceItem"."productId"
        ${whereClause}
    `, ...params);

    const recentSalesRes = await prisma.invoice.findMany({
        where: {
            status: 'ACCEPTED',
            ...(startDate && endDate ? {
                date: buildDateRangeFilter(startDate, endDate)
            } : {})
        },
        take: 5,
        orderBy: { date: 'desc' },
        select: {
            id: true,
            date: true,
            customerName: true,
            totalAmount: true
        }
    });

    const expensesRes = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: startDate && endDate ? {
            date: buildDateRangeFilter(startDate, endDate)
        } : undefined
    });

    const totalRevenue = toNumber(revenueRes[0]?.totalRevenue);
    const totalCost = toNumber(costRes[0]?.totalCost);
    const totalExpenses = toNumber(expensesRes._sum.amount);
    const netProfit = totalRevenue - totalCost - totalExpenses;

    return {
        totalRevenue,
        totalCost,
        totalExpenses,
        netProfit,
        recentSales: recentSalesRes.map(sale => ({
            ...sale,
            totalAmount: toNumber(sale.totalAmount)
        }))
    };
}
