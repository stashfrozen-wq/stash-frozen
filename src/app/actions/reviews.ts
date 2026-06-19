'use server';

import getPrisma from '@/lib/prisma';
import { PrismaClient } from '@/generated/client';
import { requirePermission } from '@/lib/auth/session';
import { deductAndReleaseReservedStock, releaseReservedStock, getDefaultLocation } from '@/lib/utils/stock';
import { serializeInvoice, toNumber } from '@/lib/utils/decimal';
import { revalidateReviewPaths } from '@/lib/utils/revalidation';
import { safeLogActivity, logger } from '@/lib/utils/logger';
import { getErrorMessage } from '@/lib/utils/errors';

async function requireReviewer() {
    return requirePermission('review');
}

const mapReviewInvoice = (inv: any) => {
    const serialized = serializeInvoice(inv);
    return {
        ...serialized,
        items: serialized.items?.map((item: any) => ({
            ...item,
            baseSellingPrice: toNumber(item.product?.baseSellingPrice),
            priceDeviation: toNumber(item.unitPrice) - toNumber(item.product?.baseSellingPrice),
        })) || []
    };
};

export async function getPendingReviewInvoices() {
    const prisma: PrismaClient = getPrisma();
    const invoices = await prisma.invoice.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
            items: { include: { product: { include: { category: true } } } },
            user: { select: { id: true, name: true, username: true } },
            customer: true,
        },
        orderBy: { date: 'desc' }
    });

    return invoices.map(mapReviewInvoice);
}

 
export async function acceptInvoice(invoiceId: string) {
    const reviewer = await requireReviewer();
    const prisma: PrismaClient = getPrisma();

    try {
        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: { items: true, customer: true }
            });

            if (!invoice) throw new Error('Invoice not found');
            if (invoice.status !== 'PENDING_REVIEW') throw new Error('Invoice is not pending review');

            const loc = await getDefaultLocation(tx, { createIfMissing: false });
            if (!loc) throw new Error('No location found');

            // Deduct stock (quantity) and release reservation (reservedQuantity)
            await deductAndReleaseReservedStock(tx, invoice.items as any, loc.id);

            // Update customer balance
            const totalAmount = Number(invoice.totalAmount);
            const previousBalance = Number(invoice.previousBalance);
            const paid = Number(invoice.amountPaid) || 0;
            // For accepted invoices, if no amountPaid was recorded, default based on payment method
            const effectivePaid = paid > 0 ? paid : (invoice.paymentMethod === 'CREDIT' ? 0 : totalAmount);
            const currentBalance = previousBalance + totalAmount - effectivePaid;

            if (invoice.customerId) {
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: { balance: currentBalance }
                });
            }

            // Create SALE transaction (stock movement log)
            await tx.transaction.create({
                data: {
                    type: 'SALE',
                    fromLocationId: loc.id,
                    createdById: invoice.userId,
                    items: {
                        create: invoice.items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))
                    }
                }
            });

            // Update invoice status
            const updated = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    status: 'ACCEPTED',
                    reviewerId: reviewer.id,
                    reviewedAt: new Date(),
                    amountPaid: effectivePaid,
                    currentBalance
                },
                include: { items: true }
            });

            return updated;
        }, { timeout: 15000 });

        await safeLogActivity('REVIEW_ACCEPT', `Accepted pending invoice #${invoiceId}`, reviewer.id);

        revalidateReviewPaths();

        return { success: true, invoice: { ...result, totalAmount: toNumber(result.totalAmount) } };
    } catch (error: unknown) {
        const message = getErrorMessage(error, 'Failed to accept invoice');
        logger.error('Accept invoice failed:', error);
        return { success: false, error: message };
    }
}

export async function declineInvoice(invoiceId: string, note?: string) {
    const reviewer = await requireReviewer();
    const prisma: PrismaClient = getPrisma();

    try {
        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: { items: true }
            });

            if (!invoice) throw new Error('Invoice not found');
            if (invoice.status !== 'PENDING_REVIEW') throw new Error('Invoice is not pending review');

            const loc = await getDefaultLocation(tx, { createIfMissing: false });

            // Release reserved stock
            if (loc) {
                await releaseReservedStock(tx, invoice.items as any, loc.id);
            }

            const updated = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    status: 'DECLINED',
                    reviewerId: reviewer.id,
                    reviewedAt: new Date(),
                    reviewNote: note || null
                }
            });

            return updated;
        }, { timeout: 15000 });

        await safeLogActivity('REVIEW_DECLINE', `Declined pending invoice #${invoiceId}${note ? ': ' + note : ''}`, reviewer.id);

        revalidateReviewPaths();

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error, 'Failed to decline invoice');
        logger.error('Decline invoice failed:', error);
        return { success: false, error: message };
    }
}

export async function editInvoice(invoiceId: string) {
    await requireReviewer();

    try {
        // Do nothing to the invoice here. Just return success so the frontend opens the edit tab.
        // We no longer decline it here because we update the original invoice directly during processSale
        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error, 'Failed to edit invoice');
        logger.error('Edit invoice failed:', error);
        return { success: false, error: message };
    }
}

export async function getInvoiceForEdit(invoiceId: string) {
    await requireReviewer();
    const prisma: PrismaClient = getPrisma();

    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            items: { include: { product: true } },
            user: { select: { id: true, name: true, username: true } },
            customer: true,
        }
    });

    if (!invoice) return null;

    const loc = await getDefaultLocation(prisma as any, { createIfMissing: false });
    const productIds = invoice.items.map(i => i.productId);
    const inventories = loc ? await prisma.inventory.findMany({
        where: { locationId: loc.id, productId: { in: productIds } }
    }) : [];
    const stockMap = new Map(inventories.map(inv => [inv.productId, toNumber(inv.quantity) - toNumber(inv.reservedQuantity)]));

    return {
        id: invoice.id,
        date: invoice.date,
        paymentMethod: invoice.paymentMethod,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        customerAddress: invoice.customerAddress,
        customerId: invoice.customerId,
        previousBalance: toNumber(invoice.previousBalance),
        amountPaid: toNumber(invoice.amountPaid),
        salespersonId: invoice.userId,
        salespersonName: invoice.user?.name || invoice.user?.username || null,
        items: invoice.items.map(item => ({
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku,
            productUnit: item.product.unit,
            productCategoryId: item.product.categoryId,
            baseSellingPrice: toNumber(item.product.baseSellingPrice),
            stock: stockMap.get(item.productId) ?? 0,
            quantity: toNumber(item.quantity),
            unitPrice: toNumber(item.unitPrice),
            subtotal: toNumber(item.subtotal),
        }))
    };
}

export async function getReviewerStats() {
    const prisma: PrismaClient = getPrisma();

    const [pending, accepted, declined] = await Promise.all([
        prisma.invoice.count({ where: { status: 'PENDING_REVIEW' } }),
        prisma.invoice.count({ where: { status: 'ACCEPTED' } }),
        prisma.invoice.count({ where: { status: 'DECLINED' } }),
    ]);

    return { pending, accepted, declined };
}
