/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import getPrisma from "@/lib/prisma";
import { withAuth, apiError } from "@/lib/api/with-auth";
import { logger } from "@/lib/utils/logger";

export const dynamic = 'force-dynamic';

async function handleBulkImport(req: NextRequest) {
  try {
    const data = await req.json();

    if (!Array.isArray(data)) {
      return apiError("Invalid data format. Expected an array.", 400);
    }

    const validData = data
      .filter((item: any) => item.name)
      .map((item: any) => ({
        name: item.name,
        phone: item.phone || null,
        address: item.address || null,
        governorate: item.governorate || null,
        balance: item.balance ? parseFloat(item.balance) : 0,
      }));

    if (validData.length === 0) {
      return NextResponse.json({ message: "No valid customers to import.", createdCount: 0 });
    }

    const prisma = getPrisma();
    const result = await prisma.customer.createMany({
      data: validData,
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: `Successfully imported ${result.count} customers.`,
      createdCount: result.count,
    });

  } catch (error) {
    logger.error("Bulk import error:", error);
    return apiError("Failed to process bulk import", 500);
  }
}

export const POST = withAuth(handleBulkImport, { permissions: ['customers'] });
