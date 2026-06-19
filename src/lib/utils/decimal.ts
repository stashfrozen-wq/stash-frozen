import { Prisma } from '@/generated/client';

type DecimalLike = Prisma.Decimal | number | bigint | null | undefined;

export function toNumber(value: DecimalLike, fallback: number = 0): number {
    if (value === null || value === undefined) return fallback;
    return Number(value);
}

export function sumMoney(values: DecimalLike[]): number {
    return values.reduce<number>((acc, val) => acc + toNumber(val), 0);
}

export function formatMoney(value: DecimalLike, locale: string = 'en'): string {
    return toNumber(value).toLocaleString(locale);
}

export function buildRefundedQtyMap(
    refunds: Array<{
        items: Array<{
            productId: string;
            quantity: DecimalLike;
        }>;
    }> | null | undefined
): Map<string, number> {
    const map = new Map<string, number>();
    refunds?.forEach((ref) => {
        ref.items?.forEach((ri) => {
            const current = map.get(ri.productId) || 0;
            map.set(ri.productId, current + toNumber(ri.quantity));
        });
    });
    return map;
}

 
export function serializeInvoiceItem(
    item: any,
    refundedQtyMap?: Map<string, number>
): any {
    const quantity = toNumber(item.quantity as DecimalLike);
    const productId = item.productId as string;
    return {
        ...item,
        quantity,
        unitPrice: toNumber(item.unitPrice as DecimalLike),
        subtotal: toNumber(item.subtotal as DecimalLike),
        ...(refundedQtyMap
            ? { refundableQuantity: Math.max(0, quantity - (refundedQtyMap.get(productId) || 0)) }
            : {}),
    };
}

 
export function serializeInvoice(
    inv: any,
    opts?: {
        includeProductFields?: boolean;
        includeRefundableQty?: boolean;
    }
): any {
    const refundedQtyMap = opts?.includeRefundableQty
        ? buildRefundedQtyMap(inv.refunds as any)
        : undefined;

    const items = (inv.items as Array<Record<string, unknown>>) || [];

    return {
        ...inv,
        totalAmount: toNumber(inv.totalAmount as DecimalLike),
        previousBalance: toNumber(inv.previousBalance as DecimalLike),
        amountPaid: toNumber(inv.amountPaid as DecimalLike),
        currentBalance: toNumber(inv.currentBalance as DecimalLike),
        items: items.map((item) => {
            const serialized = serializeInvoiceItem(item, refundedQtyMap);
            if (opts?.includeProductFields && item.product) {
                const product = item.product as Record<string, unknown>;
                return {
                    ...serialized,
                    productCode: product.sku,
                    productName: product.name,
                    productUnit: product.unit,
                    categoryName: (product.category as Record<string, unknown>)?.name,
                };
            }
            return serialized;
        }),
    };
}

 
export function serializeProduct(
    p: any
): any {
    return {
        ...p,
        costPrice: toNumber(p.costPrice as DecimalLike),
        baseSellingPrice: toNumber(p.baseSellingPrice as DecimalLike),
        retailPrice: toNumber(p.retailPrice as DecimalLike),
        lowestRetailPrice: toNumber(p.lowestRetailPrice as DecimalLike),
        wholesalePrice: toNumber(p.wholesalePrice as DecimalLike),
        lowestWholesalePrice: toNumber(p.lowestWholesalePrice as DecimalLike),
    };
}

 
export function serializeExpense(
    e: any
): any {
    return {
        ...e,
        amount: toNumber(e.amount as DecimalLike),
    };
}

 
export function serializeInventoryItem(
    item: any
): any {
    return {
        ...item,
        quantity: toNumber(item.quantity as DecimalLike),
        reservedQuantity: toNumber(item.reservedQuantity as DecimalLike),
        product: item.product
            ? serializeProduct(item.product as Record<string, unknown>)
            : item.product,
    };
}
