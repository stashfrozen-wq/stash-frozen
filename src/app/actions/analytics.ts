'use server';

import getPrisma from '@/lib/prisma';
import { Prisma } from '@/generated/client';
import { DateRange, endOfDay } from '@/lib/utils/date';
import { calcSkip } from '@/lib/utils/pagination';
import { toNumber } from '@/lib/utils/decimal';

type BuyerReportRow = {
    name: string;
    phone: string;
    address: string | null;
    visitCount: bigint;
    totalSpent: Prisma.Decimal;
    totalCustomers: bigint;
    totalSales: Prisma.Decimal;
};

type PurchaseHistoryRow = {
    customerName: string;
    customerPhone: string;
    productName: string;
    quantity: Prisma.Decimal;
};

type ProductReportRow = {
    id: string;
    name: string;
    sku: string;
    quantitySold: Prisma.Decimal;
    revenue: Prisma.Decimal;
    totalQuantity: Prisma.Decimal;
    totalRevenue: Prisma.Decimal;
};

function buildDateRangeConditions(
    startDate?: string,
    endDate?: string
): { invoiceWhere: Prisma.Sql; refundWhere: Prisma.Sql } {
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = endOfDay(endDate);
        return {
            invoiceWhere: Prisma.sql`AND i."date" >= ${start} AND i."date" <= ${end}`,
            refundWhere: Prisma.sql`AND r."createdAt" >= ${start} AND r."createdAt" <= ${end}`,
        };
    }
    return {
        invoiceWhere: Prisma.empty,
        refundWhere: Prisma.empty,
    };
}

export async function getBuyerReport({ startDate, endDate }: DateRange, limit: number = 50, page: number = 1) {
    const prisma = getPrisma();
    const offset = calcSkip(page, limit);
    const { invoiceWhere, refundWhere } = buildDateRangeConditions(startDate, endDate);

    const rows = await prisma.$queryRaw<BuyerReportRow[]>`
        WITH Combined AS (
            SELECT
                COALESCE(i."customerName", 'Unknown') as name,
                COALESCE(i."customerPhone", 'N/A') as phone,
                MAX(i."customerAddress") as address,
                COUNT(i."id") as visits,
                SUM(i."totalAmount") as spent,
                0 as refunded
            FROM "Invoice" i
            WHERE i."status" = 'ACCEPTED' ${invoiceWhere}
            GROUP BY COALESCE(i."customerName", 'Unknown'), COALESCE(i."customerPhone", 'N/A')

            UNION ALL

            SELECT
                COALESCE(i."customerName", 'Unknown') as name,
                COALESCE(i."customerPhone", 'N/A') as phone,
                '' as address,
                0 as visits,
                0 as spent,
                SUM(r."totalAmount") as refunded
            FROM "Refund" r
            JOIN "Invoice" i ON r."invoiceId" = i."id"
            WHERE 1=1 ${refundWhere}
            GROUP BY COALESCE(i."customerName", 'Unknown'), COALESCE(i."customerPhone", 'N/A')
        ), Grouped AS (
            SELECT
                name,
                phone,
                MAX(address) as address,
                SUM(visits) as "visitCount",
                SUM(spent) - SUM(refunded) as "totalSpent",
                COUNT(*) OVER() as "totalCustomers",
                SUM(SUM(spent) - SUM(refunded)) OVER() as "totalSales"
            FROM Combined
            GROUP BY name, phone
        )
        SELECT
            name,
            phone,
            address,
            "visitCount",
            "totalSpent",
            "totalCustomers",
            "totalSales"
        FROM Grouped
        ORDER BY "totalSpent" DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const totalCustomers = rows.length > 0 ? toNumber(rows[0].totalCustomers) : 0;
    const totalSales = rows.length > 0 ? toNumber(rows[0].totalSales) : 0;

    const buyers = rows.map(r => ({
        name: r.name,
        phone: r.phone,
        address: r.address,
        visitCount: toNumber(r.visitCount),
        totalSpent: toNumber(r.totalSpent),
    }));

    if (buyers.length === 0) {
        return { data: [], totalCustomers, totalSales };
    }

    const historyRows = await prisma.$queryRaw<PurchaseHistoryRow[]>`
        WITH Sales AS (
            SELECT
                COALESCE(i."customerName", 'Unknown') as "customerName",
                COALESCE(i."customerPhone", 'N/A') as "customerPhone",
                p.name as "productName",
                SUM(ii.quantity) as qty
            FROM "InvoiceItem" ii
            JOIN "Invoice" i ON ii."invoiceId" = i.id
            JOIN "Product" p ON ii."productId" = p.id
            WHERE i."status" = 'ACCEPTED' ${invoiceWhere}
            GROUP BY COALESCE(i."customerName", 'Unknown'), COALESCE(i."customerPhone", 'N/A'), p.name
        ), Refunds AS (
            SELECT
                COALESCE(i."customerName", 'Unknown') as "customerName",
                COALESCE(i."customerPhone", 'N/A') as "customerPhone",
                p.name as "productName",
                SUM(ri.quantity) as qty
            FROM "RefundItem" ri
            JOIN "Refund" r ON ri."refundId" = r.id
            JOIN "Invoice" i ON r."invoiceId" = i.id
            JOIN "Product" p ON ri."productId" = p.id
            WHERE 1=1 ${refundWhere}
            GROUP BY COALESCE(i."customerName", 'Unknown'), COALESCE(i."customerPhone", 'N/A'), p.name
        )
        SELECT
            s."customerName",
            s."customerPhone",
            s."productName",
            COALESCE(s.qty, 0) - COALESCE(r.qty, 0) as quantity
        FROM Sales s
        LEFT JOIN Refunds r
            ON s."customerName" = r."customerName"
            AND s."customerPhone" = r."customerPhone"
            AND s."productName" = r."productName"
        WHERE COALESCE(s.qty, 0) - COALESCE(r.qty, 0) > 0
    `;

    const historyMap = new Map<string, { name: string; quantity: number }[]>();
    for (const h of historyRows) {
        const key = `${h.customerName}\0${h.customerPhone}`;
        const list = historyMap.get(key) || [];
        list.push({ name: h.productName, quantity: toNumber(h.quantity) });
        historyMap.set(key, list);
    }

    const enrichedBuyers = buyers.map(b => ({
        ...b,
        purchaseHistory: (historyMap.get(`${b.name}\0${b.phone}`) || [])
            .sort((a, z) => z.quantity - a.quantity),
    }));

    return {
        data: enrichedBuyers,
        totalCustomers,
        totalSales
    };
}

export async function getProductReport({ startDate, endDate }: DateRange, limit: number = 50, page: number = 1) {
    const prisma = getPrisma();
    const offset = calcSkip(page, limit);
    const { invoiceWhere, refundWhere } = buildDateRangeConditions(startDate, endDate);

    const rows = await prisma.$queryRaw<ProductReportRow[]>`
        WITH Sales AS (
            SELECT
                p.id,
                p.name,
                p.sku,
                SUM(ii.quantity) as sold_qty,
                SUM(ii.quantity * ii."unitPrice") as sold_rev,
                SUM(SUM(ii.quantity)) OVER() as total_qty,
                SUM(SUM(ii.quantity * ii."unitPrice")) OVER() as total_rev
            FROM "InvoiceItem" ii
            JOIN "Invoice" i ON ii."invoiceId" = i.id
            JOIN "Product" p ON ii."productId" = p.id
            WHERE i."status" = 'ACCEPTED' ${invoiceWhere}
            GROUP BY p.id, p.name, p.sku
        ), Refunds AS (
            SELECT
                p.id,
                SUM(ri.quantity) as ref_qty,
                SUM(ri.quantity * ri."unitPrice") as ref_rev
            FROM "RefundItem" ri
            JOIN "Refund" r ON ri."refundId" = r.id
            JOIN "Product" p ON ri."productId" = p.id
            WHERE 1=1 ${refundWhere}
            GROUP BY p.id
        )
        SELECT
            s.id,
            s.name,
            s.sku,
            COALESCE(s.sold_qty, 0) - COALESCE(r.ref_qty, 0) as "quantitySold",
            COALESCE(s.sold_rev, 0) - COALESCE(r.ref_rev, 0) as "revenue",
            s.total_qty - COALESCE(SUM(r.ref_qty) OVER(), 0) as "totalQuantity",
            s.total_rev - COALESCE(SUM(r.ref_rev) OVER(), 0) as "totalRevenue"
        FROM Sales s
        LEFT JOIN Refunds r ON s.id = r.id
        WHERE COALESCE(s.sold_qty, 0) - COALESCE(r.ref_qty, 0) > 0
        ORDER BY "quantitySold" DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const totalQuantity = rows.length > 0 ? toNumber(rows[0].totalQuantity) : 0;
    const totalRevenue = rows.length > 0 ? toNumber(rows[0].totalRevenue) : 0;

    return {
        data: rows.map(r => ({
            name: r.name,
            sku: r.sku,
            quantitySold: toNumber(r.quantitySold),
            revenue: toNumber(r.revenue),
        })),
        totalQuantity,
        totalRevenue
    };
}
