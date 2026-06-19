'use server';

import getPrisma from '@/lib/prisma';
import { Prisma } from '@/generated/client';
import { SaleSchema } from '@/lib/validations';
import { getCurrentUser } from '@/lib/auth/session';
import { isReviewer } from '@/lib/auth/session';
import { deductStock, reserveStock, getDefaultLocation, releaseReservedStock } from '@/lib/utils/stock';
import { toNumber } from '@/lib/utils/decimal';
import { buildProductSearchFilter } from '@/lib/utils/search';
import { revalidateSalePaths } from '@/lib/utils/revalidation';
import { safeLogActivity, logger } from '@/lib/utils/logger';
import { getErrorMessage } from '@/lib/utils/errors';
import { validateOrFail } from '@/lib/validations';
import { after } from 'next/server';

async function findExistingInvoice(prisma: ReturnType<typeof getPrisma>, idempotencyKey?: string) {
    if (!idempotencyKey) return null;
    return prisma.invoice.findUnique({
        where: { idempotencyKey },
        include: { items: true },
    });
}

type InvoiceWithItems = {
    id: string;
    totalAmount: Prisma.Decimal;
    items: Array<{
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
};

function serializeInvoice<T extends InvoiceWithItems>(invoice: T) {
    return {
        ...invoice,
        totalAmount: toNumber(invoice.totalAmount),
        items: invoice.items.map(it => ({
            ...it,
            unitPrice: toNumber(it.unitPrice),
            subtotal: toNumber(it.subtotal)
        }))
    };
}

async function resolveCustomerAndBalance(tx: Prisma.TransactionClient, customerId?: string, buyerInfo?: { customerName?: string, customerPhone?: string, customerAddress?: string }) {
    let finalCustomerId = customerId;
    let previousBalance = 0;

    if (!finalCustomerId && buyerInfo?.customerName) {
        const name = buyerInfo.customerName;
        const phone = buyerInfo.customerPhone || null;

        let customer = await tx.customer.findFirst({
            where: { name, phone }
        });

        if (!customer) {
            customer = await tx.customer.create({
                data: {
                    name,
                    phone,
                    address: buyerInfo.customerAddress || null
                }
            });
        }
        finalCustomerId = customer.id;
        previousBalance = Number(customer.balance);
    } else if (finalCustomerId) {
        const customer = await tx.customer.findUnique({ where: { id: finalCustomerId } });
        previousBalance = customer ? Number(customer.balance) : 0;
    }

    return { finalCustomerId, previousBalance };
}

export async function getProducts(search?: string, limit: number = 200) {
    const prisma = getPrisma();

    // Get default location for stock lookup
    const location = await prisma.location.findFirst();

    const whereClause = search ? buildProductSearchFilter(search) : {};

    // Get products with category
    const products = await prisma.product.findMany({
        where: whereClause,
        include: { category: true },
        take: limit,
        orderBy: { name: 'asc' }
    });

    const productIds = products.map(p => p.id);

    // Get inventory just for those products
    const inventories = location && productIds.length > 0 ? await prisma.inventory.findMany({
        where: { 
            locationId: location.id,
            productId: { in: productIds }
        }
    }) : [];

    // Map inventory to a lookup (available = quantity - reserved)
    const stockMap = new Map(inventories.map(inv => [inv.productId, toNumber(inv.quantity) - toNumber(inv.reservedQuantity)]));

    return products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        baseSellingPrice: toNumber(p.baseSellingPrice),
        costPrice: toNumber(p.costPrice),
        categoryId: p.categoryId,
        category: p.category,
        stock: toNumber(stockMap.get(p.id) || 0)
    }));
}

export async function getCategories() {
    const { getCategories } = await import('./inventory');
    return getCategories();
}

export async function getStaffList() {
    const { getStaffList } = await import('./staff');
    return getStaffList();
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function processSale(
    items: { productId: string, quantity: number, unitPrice?: number, discountValue?: number }[],
    paymentMethod: 'CASH' | 'CREDIT' | 'INSTAPAY',
    buyerInfo?: { customerName?: string, customerPhone?: string, customerAddress?: string },
    userId?: string,
    staffId?: string,
    amountPaid?: number,
    customerId?: string,
    reviewerEditOf?: string,
    clientRequestId?: string
) {
    // Validate inputs using Zod
    const validation = validateOrFail(SaleSchema, {
        items,
        paymentMethod,
        buyerInfo,
        userId,
        staffId,
        amountPaid,
        customerId,
        reviewerEditOf
    });
    if (!validation.success) return validation;

    const prisma = getPrisma();

    // Idempotency: if clientRequestId was provided, return existing invoice
    const existing = await findExistingInvoice(prisma, clientRequestId);
    if (existing) {
        return {
            success: true,
            needsReview: existing.status === 'PENDING_REVIEW',
            idempotent: true,
            invoice: serializeInvoice(existing)
        };
    }

    // Check if the current user is a reviewer (permission-based review trigger)
    const currentUser = await getCurrentUser();
    const userIsReviewer = isReviewer(currentUser);

    // Determine who gets credit for the sale:
    // 1. Explicitly selected staff
    // 2. Explicitly passed userId
    // 3. Currently logged-in user (mobile quick-sale fallback)
    const effectiveUserId = userId || currentUser?.id;
    const sellerId = staffId || effectiveUserId;

    if (!sellerId) {
        return { success: false, error: 'Seller is required. Please select a salesperson.' };
    }

    console.log('processSale seller resolved', staffId, userId, effectiveUserId, sellerId, currentUser?.id);

    // Reviewer editing on behalf of a salesperson → always accepted, no review
    const isReviewerEdit = !!reviewerEditOf && userIsReviewer;

    // 1. Batch-fetch all products in one query (eliminates N+1)
    const productIds = items.map(i => i.productId);
    const productRecords = await prisma.product.findMany({
        where: { id: { in: productIds } },
    });
    const productMap = new Map(productRecords.map(p => [p.id, p]));

    let totalAmount = 0;
    const invoiceItemsData: { productId: string, quantity: number, unitPrice: number, subtotal: number }[] = [];
    let hasPriceOverride = false;

    for (const item of items) {
        const product = productMap.get(item.productId);

        if (!product) throw new Error(`Product ${item.productId} not found`);

        const manualPrice = item.unitPrice !== undefined ? item.unitPrice : Number(product.baseSellingPrice);
        const discount = Number(item.discountValue) || 0;
        const effectivePrice = manualPrice - discount / item.quantity;
        const lineTotal = manualPrice * item.quantity - discount;

        if (lineTotal < 0) {
            return { success: false, error: 'Discount cannot exceed the line total.' };
        }

        totalAmount += lineTotal;

        if (item.unitPrice !== undefined && Number(item.unitPrice) !== Number(product.baseSellingPrice)) {
            hasPriceOverride = true;
        }

        invoiceItemsData.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: effectivePrice,
            subtotal: lineTotal
        });
    }

    // Non-reviewers with a price override → pending review; reviewers (including edit flow) → accepted
    const needsReview = !isReviewerEdit && !userIsReviewer && hasPriceOverride;

    // 2. Transaction
    try {
        const invoice = await prisma.$transaction(async (tx) => {
            // Find or create location
            const loc = await getDefaultLocation(tx);
            if (!loc) throw new Error('No location found');

            if (needsReview) {
                // PENDING REVIEW: reserve stock (don't deduct), don't update customer balance, no SALE transaction
                await reserveStock(tx, items, loc.id);

                const { finalCustomerId, previousBalance } = await resolveCustomerAndBalance(tx, customerId, buyerInfo);

                const newInvoice = await tx.invoice.create({
                    data: {
                        totalAmount,
                        paymentMethod,
                        status: 'PENDING_REVIEW',
                        customerName: buyerInfo?.customerName || null,
                        customerPhone: buyerInfo?.customerPhone || null,
                        customerAddress: buyerInfo?.customerAddress || null,
                        customerId: finalCustomerId || null,
                        previousBalance,
                        amountPaid: 0,
                        currentBalance: previousBalance,
                        userId: sellerId || null,
                        ...(clientRequestId && { idempotencyKey: clientRequestId }),
                        items: { create: invoiceItemsData }
                    },
                    include: { items: true }
                });

                return newInvoice;
            }

            // ACCEPTED: deduct stock, update customer balance, create SALE transaction
            await deductStock(tx, items, loc.id);

            const { finalCustomerId, previousBalance } = await resolveCustomerAndBalance(tx, customerId, buyerInfo);

            const paid = amountPaid ?? (paymentMethod === 'CREDIT' ? 0 : totalAmount);
            const currentBalance = previousBalance + totalAmount - paid;

            if (finalCustomerId) {
                await tx.customer.update({
                    where: { id: finalCustomerId },
                    data: { balance: currentBalance }
                });
            }

            let newInvoice;

            if (isReviewerEdit && reviewerEditOf) {
                const oldInvoice = await tx.invoice.findUnique({ where: { id: reviewerEditOf }, include: { items: true } });
                if (oldInvoice) {
                    await releaseReservedStock(tx, oldInvoice.items as any, loc.id);
                    await tx.invoiceItem.deleteMany({ where: { invoiceId: reviewerEditOf } });
                    
                    newInvoice = await tx.invoice.update({
                        where: { id: reviewerEditOf },
                        data: {
                            totalAmount,
                            paymentMethod,
                            status: 'ACCEPTED',
                            customerName: buyerInfo?.customerName || null,
                            customerPhone: buyerInfo?.customerPhone || null,
                            customerAddress: buyerInfo?.customerAddress || null,
                            customerId: finalCustomerId || null,
                            previousBalance,
                            amountPaid: paid,
                            currentBalance,
                            userId: sellerId || null,
                            reviewerId: currentUser?.id,
                            reviewedAt: new Date(),
                            ...(clientRequestId && { idempotencyKey: clientRequestId }),
                            items: { create: invoiceItemsData }
                        },
                        include: { items: true }
                    });
                }
            }

            if (!newInvoice) {
                newInvoice = await tx.invoice.create({
                    data: {
                        totalAmount,
                        paymentMethod,
                        status: 'ACCEPTED',
                        customerName: buyerInfo?.customerName || null,
                        customerPhone: buyerInfo?.customerPhone || null,
                        customerAddress: buyerInfo?.customerAddress || null,
                        customerId: finalCustomerId || null,
                        previousBalance,
                        amountPaid: paid,
                        currentBalance,
                        userId: sellerId || null,
                        ...(clientRequestId && { idempotencyKey: clientRequestId }),
                        items: { create: invoiceItemsData }
                    },
                    include: { items: true }
                });
            }

            await tx.transaction.create({
                data: {
                    type: 'SALE',
                    fromLocationId: loc.id,
                    createdById: sellerId,
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity
                        }))
                    }
                }
            });

            return newInvoice;

        }, {
            timeout: 10000
        });

        // 3. Audit Log — fire-and-forget via after() so it never blocks the response
        const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
        const attributionSuffix = staffId ? ` (Attributed to Staff: ${staffId})` : '';
        const editSuffix = isReviewerEdit ? ' (Reviewer edit)' : '';
        const auditUserId = currentUser?.id || userId || sellerId;

        after(
            needsReview
                ? safeLogActivity(
                    'SALE_PENDING',
                    `Submitted sale #${invoice.id} for review - ${itemCount} items. Total: ${invoice.totalAmount}${attributionSuffix}`,
                    auditUserId
                )
                : safeLogActivity(
                    'SALE',
                    `Processed sale #${invoice.id} - ${itemCount} items. Total: ${invoice.totalAmount}${attributionSuffix}${editSuffix}`,
                    auditUserId
                )
        );

        revalidateSalePaths();

        return {
            success: true,
            needsReview,
            invoice: serializeInvoice(invoice)
        };
    } catch (error: unknown) {
        const message = getErrorMessage(error, "An unexpected error occurred during the sale.");
        logger.error("Sale processing failed:", error);
        return {
            success: false,
            error: message
        };
    }
}
