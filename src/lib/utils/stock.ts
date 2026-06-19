import { Prisma } from '@/generated/client';
import { toNumber } from './decimal';

type TransactionClient = Prisma.TransactionClient;

interface InventoryRecord {
    id: string;
    quantity: Prisma.Decimal | number;
    reservedQuantity: Prisma.Decimal | number;
}

export async function getDefaultLocation(
    tx: TransactionClient,
    opts?: { createIfMissing?: boolean }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
): Promise<Prisma.LocationGetPayload<{}> | null> {
    const createIfMissing = opts?.createIfMissing ?? true;

    const location = await tx.location.findFirst();
    if (location) return location;

    if (!createIfMissing) {
        return null;
    }

    return tx.location.create({
        data: { name: 'Main Warehouse', type: 'WAREHOUSE' },
    });
}

export function getAvailableStock(inventory: InventoryRecord | null): number {
    if (!inventory) return 0;
    return toNumber(inventory.quantity) - toNumber(inventory.reservedQuantity);
}

export async function checkStockAvailability(
    tx: TransactionClient,
    productId: string,
    locationId: string,
    requiredQty: number
): Promise<{ available: number; productName: string }> {
    const inv = await tx.inventory.findFirst({
        where: { productId, locationId },
    });
    const available = getAvailableStock(inv);
    if (available < requiredQty) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        const name = product?.name || productId;
        throw new Error(
            `Insufficient stock for ${name}. Available: ${available}, Required: ${requiredQty}`
        );
    }
    return { available, productName: '' };
}

interface StockItem {
    productId: string;
    quantity: number;
}

export async function deductStock(
    tx: TransactionClient,
    items: StockItem[],
    locationId: string
): Promise<void> {
    const productIds = items.map(i => i.productId);
    const inventories = await tx.inventory.findMany({
        where: { productId: { in: productIds }, locationId },
    });
    const invMap = new Map(inventories.map(inv => [inv.productId, inv]));

    const productNames = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
    });
    const nameMap = new Map(productNames.map(p => [p.id, p.name]));

    for (const item of items) {
        const inv = invMap.get(item.productId);
        if (!inv) {
            const name = nameMap.get(item.productId) || item.productId;
            throw new Error(`Insufficient stock for ${name}. Available: 0, Required: ${item.quantity}`);
        }

        const available = getAvailableStock(inv);
        if (available < item.quantity) {
            const name = nameMap.get(item.productId) || item.productId;
            throw new Error(`Insufficient stock for ${name}. Available: ${available}, Required: ${item.quantity}`);
        }

        const result = await tx.inventory.updateMany({
            where: {
                id: inv.id,
                quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
        });

        if (result.count !== 1) {
            const name = nameMap.get(item.productId) || item.productId;
            throw new Error(`Insufficient stock for ${name}. Available: 0, Required: ${item.quantity}`);
        }
    }
}

export async function reserveStock(
    tx: TransactionClient,
    items: StockItem[],
    locationId: string
): Promise<void> {
    const productIds = items.map(i => i.productId);
    const inventories = await tx.inventory.findMany({
        where: { productId: { in: productIds }, locationId },
    });
    const invMap = new Map(inventories.map(inv => [inv.productId, inv]));

    const productNames = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
    });
    const nameMap = new Map(productNames.map(p => [p.id, p.name]));

    for (const item of items) {
        const inv = invMap.get(item.productId);
        if (!inv) {
            const name = nameMap.get(item.productId) || item.productId;
            throw new Error(`Insufficient stock for ${name}. Available: 0, Required: ${item.quantity}`);
        }

        const available = getAvailableStock(inv);
        if (available < item.quantity) {
            const name = nameMap.get(item.productId) || item.productId;
            throw new Error(`Insufficient stock for ${name}. Available: ${available}, Required: ${item.quantity}`);
        }

        const result = await tx.inventory.updateMany({
            where: {
                id: inv.id,
                quantity: { gte: toNumber(inv.reservedQuantity) + item.quantity },
            },
            data: { reservedQuantity: { increment: item.quantity } },
        });

        if (result.count !== 1) {
            const name = nameMap.get(item.productId) || item.productId;
            throw new Error(`Insufficient stock for ${name}. Available: 0, Required: ${item.quantity}`);
        }
    }
}

export async function releaseReservedStock(
    tx: TransactionClient,
    items: StockItem[],
    locationId: string
): Promise<void> {
    for (const item of items) {
        const inv = await tx.inventory.findFirst({
            where: { productId: item.productId, locationId },
        });
        if (inv) {
            const newReserved = toNumber(inv.reservedQuantity) - item.quantity;
            await tx.inventory.update({
                where: { id: inv.id },
                data: { reservedQuantity: Math.max(0, newReserved) },
            });
        }
    }
}

export async function deductAndReleaseReservedStock(
    tx: TransactionClient,
    items: StockItem[],
    locationId: string
): Promise<void> {
    for (const item of items) {
        const inv = await tx.inventory.findFirst({
            where: { productId: item.productId, locationId },
        });
        if (inv) {
            const newQty = toNumber(inv.quantity) - item.quantity;
            const newReserved = toNumber(inv.reservedQuantity) - item.quantity;
            if (newQty < 0) throw new Error(`Insufficient stock for product ${item.productId}`);
            if (newReserved < 0) throw new Error('Reserved quantity inconsistency');
            await tx.inventory.update({
                where: { id: inv.id },
                data: { quantity: newQty, reservedQuantity: newReserved },
            });
        }
    }
}

export async function adjustStock(
    tx: TransactionClient,
    productId: string,
    locationId: string | undefined,
    quantityDelta: number
): Promise<void> {
    if (!locationId || quantityDelta === 0) return;
    const inventory = await tx.inventory.findFirst({
        where: { productId, locationId },
    });
    if (inventory) {
        const newStock = toNumber(inventory.quantity) + quantityDelta;
        if (newStock < 0) {
            const product = await tx.product.findUnique({ where: { id: productId } });
            throw new Error(
                `Insufficient stock for ${product?.name || productId}. Available: ${toNumber(inventory.quantity)}`
            );
        }
        await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: newStock },
        });
    }
}
