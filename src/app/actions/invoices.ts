'use server';

import getPrisma from '@/lib/prisma';
import { PrismaClient, Prisma } from '@/generated/client';
import { adjustStock, getDefaultLocation, releaseReservedStock } from '@/lib/utils/stock';
import { serializeInvoice, serializeInvoiceItem, toNumber } from '@/lib/utils/decimal';
import { revalidateInvoicePaths, revalidateUndoInvoicePaths } from '@/lib/utils/revalidation';
import { safeLogActivity, logger } from '@/lib/utils/logger';
import { getErrorMessage } from '@/lib/utils/errors';
import { calcSkip } from '@/lib/utils/pagination';
import { getCurrentUser } from '@/lib/auth/session';

async function handleInvoiceItemsUpdate(
    tx: Prisma.TransactionClient, 
    invoiceId: string, 
    existingItems: Array<{ id: string, productId: string, quantity: number | Prisma.Decimal }>, 
    incomingItems: Array<{ id: string, productId: string, quantity: number, unitPrice: number }>, 
    locId?: string
) {
    let newTotalAmount = 0;
    const incomingExistingIds = incomingItems.filter(i => !i.id.startsWith('new-')).map(i => i.id);

    const removedItems = existingItems.filter(ei => !incomingExistingIds.includes(ei.id));
    for (const removed of removedItems) {
        if (locId) await adjustStock(tx, removed.productId, locId, Number(removed.quantity));
        await tx.invoiceItem.delete({ where: { id: removed.id } });
    }

    for (const updatedItem of incomingItems.filter(i => !i.id.startsWith('new-'))) {
        const existingItem = existingItems.find(i => i.id === updatedItem.id);
        if (!existingItem) continue;

        const qtyDelta = Number(existingItem.quantity) - updatedItem.quantity;
        if (locId) await adjustStock(tx, updatedItem.productId, locId, qtyDelta);

        const subtotal = updatedItem.quantity * updatedItem.unitPrice;
        await tx.invoiceItem.update({
            where: { id: updatedItem.id },
            data: { quantity: updatedItem.quantity, unitPrice: updatedItem.unitPrice, subtotal }
        });
        newTotalAmount += subtotal;
    }

    for (const newItem of incomingItems.filter(i => i.id.startsWith('new-'))) {
        if (locId) await adjustStock(tx, newItem.productId, locId, -newItem.quantity);
        const subtotal = newItem.quantity * newItem.unitPrice;
        await tx.invoiceItem.create({
            data: { invoiceId, productId: newItem.productId, quantity: newItem.quantity, unitPrice: newItem.unitPrice, subtotal }
        });
        newTotalAmount += subtotal;
    }

    return newTotalAmount;
}

// Update type definition if not global, but for now we'll imply it from usage
export async function getAllInvoices() {
    const prisma = getPrisma();
    const user = await getCurrentUser();
    const where: Prisma.InvoiceWhereInput = {};
    if (user?.role === 'SALESPERSON') {
        where.userId = user.id;
    }
    const invoices = await prisma.invoice.findMany({
        where,
        include: {
            items: { include: { product: true } },
            customer: true,
            user: true,
            refunds: { include: { items: true } }
        },
        orderBy: { date: 'desc' }
    });
    
    return invoices.map(inv => serializeInvoice(inv, { includeRefundableQty: true }));
}

export async function getInvoices(page: number = 1, limit: number = 50) {
    const prisma: PrismaClient = getPrisma();
    const skip = calcSkip(page, limit);
    const user = await getCurrentUser();
    const where: Prisma.InvoiceWhereInput = {};
    if (user?.role === 'SALESPERSON') {
        where.userId = user.id;
    }

    const [totalCount, invoices] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
            where,
            skip,
            take: limit,
            orderBy: { date: 'desc' },
            include: {
                user: {
                    select: { id: true, name: true, username: true, phone: true, address: true }
                },
                items: {
                    include: {
                        product: true
                    }
                },
                refunds: {
                    include: { items: true }
                }
            }
        })
    ]);

    const mappedInvoices = invoices.map(inv => serializeInvoice(inv, { includeRefundableQty: true }));

    return {
        data: mappedInvoices,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit)
    };
}

export async function getInvoiceById(id: string) {
    const prisma: PrismaClient = getPrisma();
    const user = await getCurrentUser();
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
            user: {
                select: { id: true, name: true, username: true, phone: true, address: true } // Employee/User details
            },
            customer: true,
            items: {
                include: {
                    product: {
                        include: {
                            category: true
                        }
                    }
                }
            },
            refunds: {
                include: { items: true }
            }
        }
    });

    if (!invoice) return null;

    // Salespeople can only view their own invoices
    if (user?.role === 'SALESPERSON' && invoice.userId !== user.id) {
        return null;
    }

    return serializeInvoice(invoice as any, { includeProductFields: true, includeRefundableQty: true });
}

export async function updateInvoice(
    invoiceId: string,
    data: {
        customerName?: string;
        customerPhone?: string;
        customerAddress?: string;
        paymentMethod?: 'CASH' | 'CREDIT' | 'INSTAPAY';
        amountPaid?: number;
        previousBalance?: number;
        date?: string | Date;
        items?: Array<{
            id: string;
            productId: string;
            quantity: number;
            unitPrice: number;
        }>;
    }
) {
    if (!invoiceId) return { success: false, error: 'Invoice ID is required.' };

    const prisma: PrismaClient = getPrisma();

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Get existing invoice with items
            const existing = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: { items: true, customer: true }
            });

            if (!existing) throw new Error('Invoice not found.');
            if (existing.status === 'PENDING_REVIEW') throw new Error('Cannot edit a pending invoice. Use the review flow to accept, decline, or edit it.');
            if (existing.status === 'DECLINED') throw new Error('Cannot edit a declined invoice.');

            // 2. Handle item changes + inventory
            let newTotalAmount = Number(existing.totalAmount);

            if (data.items !== undefined) {
                const loc = await getDefaultLocation(tx, { createIfMissing: false });
                newTotalAmount = await handleInvoiceItemsUpdate(tx, invoiceId, existing.items, data.items, loc?.id);
            }

            // 3. Calculate balance
            const amountPaid = data.amountPaid ?? Number(existing.amountPaid);
            const previousBalance = data.previousBalance ?? Number(existing.previousBalance);
            const currentBalance = previousBalance + newTotalAmount - amountPaid;

            // 4. Update the invoice itself
            const updatedInvoice = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    totalAmount: newTotalAmount,
                    amountPaid,
                    previousBalance,
                    currentBalance,
                    ...(data.date && { date: new Date(data.date) }),
                    ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
                    ...(data.customerName !== undefined && { customerName: data.customerName || null }),
                    ...(data.customerPhone !== undefined && { customerPhone: data.customerPhone || null }),
                    ...(data.customerAddress !== undefined && { customerAddress: data.customerAddress || null }),
                },
                include: { items: true }
            });

            // 5. Update customer balance if linked
            if (existing.customerId) {
                // Customer balance = latest invoice's currentBalance (running total)
                const latestInvoice = await tx.invoice.findFirst({
                    where: { customerId: existing.customerId, status: 'ACCEPTED' },
                    orderBy: { date: 'desc' },
                    select: { currentBalance: true }
                });

                if (latestInvoice) {
                    await tx.customer.update({
                        where: { id: existing.customerId },
                        data: { balance: Number(latestInvoice.currentBalance) }
                    });
                }
            }

            return updatedInvoice;
        }, { timeout: 15000 });

        revalidateInvoicePaths();

        return {
            success: true,
            invoice: {
                ...result,
                totalAmount: toNumber(result.totalAmount),
                items: result.items.map(it => serializeInvoiceItem(it as any))
            }
        };
    } catch (error: unknown) {
        const message = getErrorMessage(error, 'Unknown error');
        logger.error('Failed to update invoice:', error);
        return { success: false, error: message || 'Failed to update invoice.' };
    }
}

/* eslint-disable sonarjs/cognitive-complexity */
export async function undoInvoice(invoiceId: string, userId?: string) {
    if (!invoiceId) return { success: false, error: 'Invoice ID is required.' };

    const prisma: PrismaClient = getPrisma();

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Get existing invoice with items and customer
            const existing = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: { items: true, refunds: true }
            });

            if (!existing) throw new Error('Invoice not found.');

            if (existing.refunds && existing.refunds.length > 0) {
                throw new Error('Cannot undo an invoice that has associated refunds. Please delete or revert the refunds first.');
            }

            const loc = await getDefaultLocation(tx, { createIfMissing: false });
            const isPending = existing.status === 'PENDING_REVIEW';

            if (isPending) {
                // PENDING_REVIEW: release reserved stock, no customer balance change, no RETURN transaction
                if (loc) {
                    await releaseReservedStock(tx, existing.items.map(item => ({
                        productId: item.productId,
                        quantity: Number(item.quantity)
                    })), loc.id);
                }
            } else {
                // ACCEPTED: restore inventory quantity, revert customer balance, create RETURN transaction
                if (loc) {
                    for (const item of existing.items) {
                        await adjustStock(tx, item.productId, loc.id, Number(item.quantity));
                    }
                }

                // 3. Revert Customer Balance
                if (existing.customerId) {
                    const customer = await tx.customer.findUnique({ where: { id: existing.customerId } });
                    if (customer) {
                        const netAddition = Number(existing.totalAmount) - Number(existing.amountPaid || 0);
                        const newBalance = Number(customer.balance) - netAddition;
                        await tx.customer.update({
                            where: { id: existing.customerId },
                            data: { balance: newBalance }
                        });
                    }
                }

                // 4. Create opposite Transaction for Inventory tracking
                if (loc) {
                     await tx.transaction.create({
                        data: {
                            type: 'RETURN',
                            toLocationId: loc.id,
                            createdById: userId || existing.userId,
                            notes: `Undo Invoice #${existing.id}`,
                            items: {
                                create: existing.items.map(item => ({
                                    productId: item.productId,
                                    quantity: item.quantity
                                }))
                            }
                        }
                    });
                }
            }

            // 5. Delete Invoice Items
            await tx.invoiceItem.deleteMany({
                where: { invoiceId }
            });

            // 6. Delete Invoice
            await tx.invoice.delete({
                where: { id: invoiceId }
            });
        }, { timeout: 15000 });

        // 7. Audit Log
        await safeLogActivity('DELETE', `Undid invoice #${invoiceId}`, userId);

        revalidateUndoInvoicePaths();

        return { success: true };
    } catch (error: unknown) {
        const message = getErrorMessage(error, 'Unknown error');
        logger.error('Failed to undo invoice:', error);
        return { success: false, error: message || 'Failed to undo invoice.' };
    }
}
