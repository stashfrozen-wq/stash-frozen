import { NextResponse } from 'next/server';
import getPrisma from '@/lib/prisma';
import { withAuth, apiError } from '@/lib/api/with-auth';
import { logger } from '@/lib/utils/logger';
import { toNumber } from '@/lib/utils/decimal';

export const dynamic = 'force-dynamic';

async function handleInventoryReport() {
  try {
    const prisma = getPrisma();
    const products = await prisma.product.findMany({
      include: {
        category: true,
        inventoryItems: {
          include: {
            location: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const report = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || 'Uncategorized',
      unit: p.unit,
      costPrice: toNumber(p.costPrice),
      baseSellingPrice: toNumber(p.baseSellingPrice),
      totalStock: p.inventoryItems.reduce((sum, inv) => sum + toNumber(inv.quantity), 0),
      totalReserved: p.inventoryItems.reduce((sum, inv) => sum + toNumber(inv.reservedQuantity), 0),
      locations: p.inventoryItems.map(inv => ({
        locationId: inv.locationId,
        locationName: inv.location.name,
        locationType: inv.location.type,
        quantity: toNumber(inv.quantity),
        reserved: toNumber(inv.reservedQuantity)
      }))
    }));

    return NextResponse.json(report);
  } catch (error) {
    logger.error('Failed to fetch inventory report:', error);
    return apiError('Failed to fetch inventory report', 500);
  }
}

export const GET = withAuth(handleInventoryReport);
