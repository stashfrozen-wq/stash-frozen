'use server';

import getPrisma from '@/lib/prisma';
import { toNumber } from '@/lib/utils/decimal';
import { revalidatePaths } from '@/lib/utils/revalidation';

export async function getIncomingTransactions() {
    const prisma = getPrisma();

    const transactions = await prisma.transaction.findMany({
        where: { type: 'IN' },
        orderBy: { date: 'desc' },
        include: {
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    return transactions.flatMap(tx =>
        tx.items.map(item => ({
            id: item.id,
            transactionId: tx.id,
            productName: item.product.name,
            quantity: toNumber(item.quantity),
            supplier: tx.notes || 'External Supplier',
            costPrice: toNumber(item.product.costPrice) * toNumber(item.quantity),
            status: 'received' as const,
            date: tx.date
        }))
    );
}

export async function getLocations() {
    const prisma = getPrisma();
    return prisma.location.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function createIncomingStock(data: {
    productId: string;
    quantity: number;
    locationId: string;
    notes?: string;
}) {
    if (!data.productId || !data.locationId) {
        return { success: false, error: 'Product and location are required.' };
    }
    if (typeof data.quantity !== 'number' || isNaN(data.quantity) || data.quantity <= 0) {
        return { success: false, error: 'Quantity must be a positive number.' };
    }

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
        // 1. Create Transaction (type: IN)
        const transaction = await tx.transaction.create({
            data: {
                type: 'IN',
                notes: data.notes || `Stock in from Purchase Order`,
                toLocationId: data.locationId,
                items: {
                    create: {
                        productId: data.productId,
                        quantity: data.quantity
                    }
                }
            }
        });

        // 2. Update Inventory (Increment)
        const inventory = await tx.inventory.upsert({
            where: {
                productId_locationId: {
                    productId: data.productId,
                    locationId: data.locationId
                }
            },
            update: {
                quantity: { increment: data.quantity }
            },
            create: {
                productId: data.productId,
                locationId: data.locationId,
                quantity: data.quantity
            }
        });

        return { transaction, inventory };
    });

    revalidatePaths(['/inventory', '/incoming', '/dashboard']);
    return result;
}
