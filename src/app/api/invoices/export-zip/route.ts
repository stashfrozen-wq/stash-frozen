import { NextRequest, NextResponse } from 'next/server';
import getPrisma from '@/lib/prisma';
import { generateInvoicePdfBuffer } from '@/lib/services/pdf-generator';
import { withAuth, apiError } from '@/lib/api/with-auth';
import { logger } from '@/lib/utils/logger';
import { endOfDay } from '@/lib/utils/date';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

async function handleExportZip(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const whereClause: { status?: 'ACCEPTED'; date?: { gte?: Date; lte?: Date } } = { status: 'ACCEPTED' };
    if (startDateStr || endDateStr) {
        whereClause.date = {};
        if (startDateStr) {
            whereClause.date.gte = new Date(startDateStr);
        }
        if (endDateStr) {
            whereClause.date.lte = endOfDay(endDateStr);
        }
    }

    const prisma = getPrisma();

    try {
        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: {
                items: { include: { product: true } },
                user: { select: { name: true, username: true, phone: true, address: true } }
            },
            orderBy: { date: 'desc' }
        });

        if (invoices.length === 0) {
            return apiError('No invoices found for the specified date range', 404);
        }

        const zip = new JSZip();
        const pdfFolder = zip.folder('invoices');

        const results = await Promise.allSettled(
            invoices.map(async (invoice) => {
                const buffer = await generateInvoicePdfBuffer(invoice as any);
                return { id: invoice.id, buffer };
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled') {
                pdfFolder?.file(`invoice-${result.value.id}.pdf`, result.value.buffer);
            } else {
                logger.error('Failed to generate PDF for an invoice:', result.reason);
            }
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(zipBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.zip"`,
                'Cache-Control': 'no-store'
            },
        });
    } catch (error) {
        logger.error('Export ZIP error:', error);
        return apiError('Failed to generate ZIP archive', 500);
    }
}

export const GET = withAuth(handleExportZip);
