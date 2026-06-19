import { NextRequest, NextResponse } from 'next/server';
import getPrisma from '@/lib/prisma';
import { generateInvoicePdfBuffer } from '@/lib/services/pdf-generator';
import { withAuth, apiError } from '@/lib/api/with-auth';
import { logger } from '@/lib/utils/logger';
import type { DBUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

async function handleInvoicePdf(req: NextRequest, user: DBUser) {
    const match = req.nextUrl.pathname.match(/\/invoices\/([^\/]+)\/pdf/);
    const id = match ? match[1] : '';
    const isDownload = req.nextUrl.searchParams.get('download') === '1';

    const prisma = getPrisma();
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, user: { select: { name: true, username: true, phone: true, address: true } } }
    });

    if (!invoice) {
        return apiError('Not found', 404);
    }

    const start = Date.now();
    try {
        const buffer = await generateInvoicePdfBuffer(invoice);
        const duration = Date.now() - start;
        console.log('Invoice PDF generated', id, `bytes: ${buffer.length}`, `durationMs: ${duration}`, `userId: ${user.id}`);

        return new NextResponse(buffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Length': buffer.length.toString(),
                'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="invoice-${id}.pdf"`,
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
            },
        });
    } catch (error) {
        logger.error('PDF Generation Error:', error);
        return apiError('Failed to generate PDF', 500);
    }
}

export const GET = withAuth(handleInvoicePdf);
