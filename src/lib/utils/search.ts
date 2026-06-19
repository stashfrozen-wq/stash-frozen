import { Prisma } from '@/generated/client';

export function buildProductSearchFilter(
    query: string
): Prisma.ProductWhereInput {
    return {
        OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
        ],
    };
}

export function buildCustomerSearchFilter(
    query: string
): Prisma.CustomerWhereInput {
    return {
        OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
        ],
    };
}

export function buildSearchFilter(
    query: string,
    fields: string[],
    opts?: { insensitive?: boolean }
): { OR: Array<Record<string, { contains: string; mode?: 'insensitive' }>> } {
    const insensitive = opts?.insensitive ?? true;
    return {
        OR: fields.map((field) => ({
            [field]: {
                contains: query,
                ...(insensitive ? { mode: 'insensitive' as const } : {}),
            },
        })),
    };
}
