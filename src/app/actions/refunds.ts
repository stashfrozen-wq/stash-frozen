/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import getPrisma from '@/lib/prisma';
import { PrismaClient } from '@/generated/client';
import { RefundSchema, validateOrFail } from '@/lib/validations';
import { buildRefundedQtyMap } from '@/lib/utils/decimal';
import { revalidateRefundPaths } from '@/lib/utils/revalidation';
import { getErrorMessage } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';
import { calcSkip } from '@/lib/utils/pagination';

// Types
type RefundItemInput = {
    productId: string;
    quantity: number;
    unitPrice: number;
    condition: 'NEW' | 'DEFECTIVE';
};

type CreateRefundInput = {
    invoiceId?: string;
    userId: string;
    items: RefundItemInput[];
    reason?: string;
};

async function verifyInvoiceQuantities(tx: any, invoiceId: string, items: RefundItemInput[]) {
    const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true, refunds: { include: { items: true } } }
    });

    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status !== 'ACCEPTED') throw new Error("Cannot refund a pending or declined invoice.");

    const refundedQtyMap = buildRefundedQtyMap(invoice.refunds as any);

    for (const item of items) {
        const invoiceItem = invoice.items.find((ii: any) => ii.productId === item.productId);
        if (!invoiceItem) throw new Error(`Product ${item.productId} not found on invoice.`);

        const alreadyRefunded = refundedQtyMap.get(item.productId) || 0;
        if (alreadyRefunded + item.quantity > Number(invoiceItem.quantity)) {
            throw new Error(`Refund quantity for product ${item.productId} exceeds the original invoice quantity.`);
        }
    }
}

async function processRefundStockUpdates(tx: any, items: RefundItemInput[], userId: string, invoiceId?: string, reason?: string) {
    const reasonSuffix = reason ? ` - ${reason}` : '';
    const warehouse = await tx.location.findFirst({
        where: { type: 'WAREHOUSE' }
    });

    if (!warehouse) throw new Error("No warehouse found to restock items.");

    for (const item of items) {
        // Always update Product's total refund stat
        await tx.product.update({
            where: { id: item.productId },
            data: {
                totalRefunded: { increment: item.quantity },
                // If defective, update the defective stock counter
                ...(item.condition === 'DEFECTIVE' ? { defectiveStock: { increment: item.quantity } } : {})
            }
        });

        if (item.condition === 'NEW') {
            // Return to Sellable Stock (In Warehouse)
            await tx.inventory.upsert({
                where: {
                    productId_locationId: {
                        productId: item.productId,
                        locationId: warehouse.id
                    }
                },
                update: { quantity: { increment: item.quantity } },
                create: {
                    productId: item.productId,
                    locationId: warehouse.id,
                    quantity: item.quantity
                }
            });

            // Log Movement as RESTOCK
            await tx.transaction.create({
                data: {
                    type: 'REFUND_RESTOCK',
                    toLocationId: warehouse.id,
                    createdById: userId,
                    notes: `Refund Restock for Invoice #${invoiceId || 'N/A'}${reasonSuffix}`,
                    items: {
                        create: [{
                            productId: item.productId,
                            quantity: item.quantity
                        }]
                    }
                }
            });
        } else if (item.condition === 'DEFECTIVE') {
            // Log Movement as DEFECTIVE
            await tx.transaction.create({
                data: {
                    type: 'REFUND_DEFECTIVE',
                    createdById: userId,
                    notes: `Defective Refund for Invoice #${invoiceId || 'N/A'}${reasonSuffix}`,
                    items: {
                        create: [{
                            productId: item.productId,
                            quantity: item.quantity
                        }]
                    }
                }
            });
        }
    }
}

export async function createRefund(data: CreateRefundInput) {
    const validation = validateOrFail(RefundSchema, data);
    if (!validation.success) return validation;

    const prisma: PrismaClient = getPrisma();
    const { invoiceId, userId, items, reason } = data;

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    try {
        await prisma.$transaction(async (tx) => {
            // 0. Verify quantities if linked to an invoice (Security & Integrity Check)
            if (invoiceId) {
                await verifyInvoiceQuantities(tx, invoiceId, items);
            }

            // 1. Create Refund Record with its items
            await tx.refund.create({
                data: {
                    totalAmount,
                    reason,
                    invoiceId: invoiceId || null,
                    userId,
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            condition: item.condition
                        }))
                    }
                }
            });

            // 2. Process Stock & Product Level Updates
            await processRefundStockUpdates(tx, items, userId, invoiceId, reason);
        });

        revalidateRefundPaths();
        return { success: true };
    } catch (error) {
        logger.error('Refund creation failed:', error);
        return { success: false, error: getErrorMessage(error, 'Failed to create refund') };
    }
}

export async function getRefunds(page: number = 1, limit: number = 50) {
    const prisma: PrismaClient = getPrisma();
    const skip = calcSkip(page, limit);

    try {
        const [totalCount, refunds] = await Promise.all([
            prisma.refund.count(),
            prisma.refund.findMany({
                skip,
                take: limit,
                include: {
                    user: true,
                    items: {
                        include: { product: true }
                    },
                    invoice: true
                },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        return [
            totalCount,
            refunds.map((ref: any) => ({
                ...ref,
                totalAmount: Number(ref.totalAmount),
                items: (ref.items || []).map((item: any) => ({
                    ...item,
                    unitPrice: Number(item.unitPrice)
                }))
            }))
        ] as const;
    } catch (error) {
        logger.error("Error fetching refunds:", error);
        return [0, []] as const;
    }
}
