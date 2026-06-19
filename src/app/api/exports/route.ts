import { NextRequest, NextResponse } from 'next/server';
import getPrisma from '@/lib/prisma';
import { createObjectCsvStringifier } from 'csv-writer';
import { withAuth, apiError } from '@/lib/api/with-auth';
import { endOfDay, startOfDay } from '@/lib/utils/date';
import { formatMoney } from '@/lib/utils/format';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

async function handleExport(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const prisma = getPrisma();
    const now = new Date();

    let startDate: Date;
    const endDate = endOfDay(now);

    if (type === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
        startDate = startOfDay(now);
    }

    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                status: 'ACCEPTED',
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                customer: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'id', title: 'INVOICE ID' },
                { id: 'date', title: 'DATE' },
                { id: 'customer', title: 'CUSTOMER' },
                { id: 'totalAmount', title: 'TOTAL AMOUNT' },
                { id: 'paymentMethod', title: 'PAYMENT METHOD' },
            ]
        });

        const records = invoices.map(inv => ({
            id: inv.id,
            date: new Date(inv.date).toISOString().split('T')[0],
            customer: inv.customer?.name || inv.customerName || 'Walk-in',
            totalAmount: formatMoney(Number(inv.totalAmount)),
            paymentMethod: inv.paymentMethod
        }));

        const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

        return new NextResponse(csvString, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="sales_export_${type}_${now.toISOString().split('T')[0]}.csv"`,
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        logger.error('Export error:', error);
        return apiError('Internal Server Error', 500);
    }
}

export const GET = withAuth(handleExport, { roles: ['ROOT', 'ADMIN', 'ACCOUNTANT'] });
