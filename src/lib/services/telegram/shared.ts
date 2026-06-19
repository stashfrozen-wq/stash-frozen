import getPrisma from '@/lib/prisma';
import { toNumber } from '@/lib/utils/decimal';
import { formatEGP, stockEmoji, paymentMethodLabel } from '@/lib/utils/format';
import { buildProductSearchFilter, buildCustomerSearchFilter } from '@/lib/utils/search';
import { getDefaultLocation } from '@/lib/utils/stock';

export { formatEGP, stockEmoji, paymentMethodLabel, toNumber };

export async function getLocation() {
    const prisma = getPrisma();
    return prisma.location.findFirst();
}

export async function buildStockMap(productIds: string[], locationId?: string) {
    if (!locationId || productIds.length === 0) return new Map<string, number>();
    const prisma = getPrisma();
    const inventories = await prisma.inventory.findMany({
        where: { locationId, productId: { in: productIds } },
    });
    return new Map(inventories.map(inv => [inv.productId, toNumber(inv.quantity)]));
}

export function getAppUrl(): string | null {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
    if (!appUrl) return null;
    const protocol = appUrl.startsWith('http') ? '' : 'https://';
    return `${protocol}${appUrl}`;
}

export async function searchProductsForBot(query: string, take: number = 8) {
    const prisma = getPrisma();
    const location = await prisma.location.findFirst();

    const products = await prisma.product.findMany({
        where: buildProductSearchFilter(query),
        take,
        include: { category: true },
    });

    if (products.length === 0) return { products: [], stockMap: new Map<string, number>(), location };

    const stockMap = await buildStockMap(products.map(p => p.id), location?.id);
    return { products, stockMap, location };
}

export async function searchCustomersForBot(query: string, take: number = 5) {
    const prisma = getPrisma();
    return prisma.customer.findMany({
        where: buildCustomerSearchFilter(query),
        take,
        orderBy: { name: 'asc' },
    });
}

export function formatCartLine(item: { name: string; quantity: number; unitPrice: number }, index: number): string {
    return `${index + 1}. ${item.name} × ${item.quantity} = ${formatEGP(item.unitPrice * item.quantity)}`;
}

export { getDefaultLocation };
