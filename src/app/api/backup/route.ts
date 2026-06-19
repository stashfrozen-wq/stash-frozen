import { NextResponse } from 'next/server';
import getPrisma from '@/lib/prisma';
import { withAuth, apiError } from '@/lib/api/with-auth';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

async function handleBackup() {
    try {
        const prisma = getPrisma();

        const [products, customers, invoices] = await Promise.all([
            prisma.product.findMany({
                include: { category: true },
            }),
            prisma.customer.findMany({
                include: { group: true },
            }),
            prisma.invoice.findMany({
                include: {
                    items: true,
                    customer: true,
                    user: true,
                    refunds: { include: { items: true } }
                }
            })
        ]);

        const backupData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0'
            },
            data: {
                products,
                customers,
                invoices
            }
        };

        return new NextResponse(JSON.stringify(backupData, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="stash-backup-${new Date().toISOString().split('T')[0]}.json"`,
            },
        });

    } catch (error) {
        logger.error('Backup error:', error);
        return apiError('Failed to generate backup', 500);
    }
}

export const GET = withAuth(handleBackup, { roles: ['ROOT', 'ADMIN'] });
