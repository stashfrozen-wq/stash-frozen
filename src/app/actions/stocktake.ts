'use server';

import getPrisma from '@/lib/prisma';
import { toNumber } from '@/lib/utils/decimal';
import { revalidatePaths } from '@/lib/utils/revalidation';

export async function getStocktakeItems() {
    const prisma = getPrisma();

    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            sku: true,
            category: { select: { name: true } },
            baseSellingPrice: true,
            inventoryItems: {
                include: {
                    location: true
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    return products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name || 'Uncategorized',
        price: toNumber(p.baseSellingPrice),
        stock: p.inventoryItems.reduce((sum, item) => sum + toNumber(item.quantity), 0),
        locations: p.inventoryItems.map(item => ({
            id: item.locationId,
            name: item.location.name,
            quantity: toNumber(item.quantity)
        }))
    }));
}

export type StockAdjustment = {
    productId: string;
    actualStock: number;
    currentStock: number;
    reason?: string;
    locationId?: string; // Optional, defaults to finding the first inventory item or creating one
};

export async function reconcileStock(adjustments: StockAdjustment[]) {
    const prisma = getPrisma();

    for (const adj of adjustments) {
        if (typeof adj.actualStock !== 'number' || isNaN(adj.actualStock) || adj.actualStock < 0) {
            return { success: false, error: 'Actual stock count cannot be negative.' };
        }
    }

    // Get a default location (e.g., WAREHOUSE) if needed
    const defaultLocation = await prisma.location.findFirst({
        where: { type: 'WAREHOUSE' }
    });

    const fallbackLocation = defaultLocation || await prisma.location.findFirst();

    if (!fallbackLocation && adjustments.length > 0) {
        throw new Error('No Location found in system');
    }

    await prisma.$transaction(async (tx) => {
        for (const adj of adjustments) {
            const diff = adj.actualStock - adj.currentStock;
            if (diff === 0) continue;

            const type = diff > 0 ? 'IN' : 'OUT';
            const quantity = Math.abs(diff);

            // Determine target location: use specific location if provided, else default
            const locationId = adj.locationId || fallbackLocation?.id;

            if (!locationId) continue;

            // Upsert Inventory
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_locationId: {
                        productId: adj.productId,
                        locationId: locationId
                    }
                }
            });

            if (inventory) {
                // If inventory exists, update it
                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: { quantity: { increment: diff } }
                });
            } else {
                // Create inventory record if missing
                // If currentStock (system) was 0, diff is actualStock.
                await tx.inventory.create({
                    data: {
                        productId: adj.productId,
                        locationId: locationId,
                        quantity: adj.actualStock
                    }
                });
            }

            // Create Transaction
            const transaction = await tx.transaction.create({
                data: {
                    type,
                    notes: `Stocktake: ${adj.reason || 'Manual Adjustment'}`,
                    toLocationId: type === 'IN' ? locationId : undefined,
                    fromLocationId: type === 'OUT' ? locationId : undefined,
                }
            });

            // Create TransactionItem
            await tx.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    productId: adj.productId,
                    quantity: quantity
                }
            });
        }
    });

    revalidatePaths(['/stocktake', '/products', '/movements']);

    return { success: true };
}
