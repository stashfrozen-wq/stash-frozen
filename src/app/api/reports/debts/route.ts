/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import getPrisma from "@/lib/prisma";
import { withAuth, apiError } from "@/lib/api/with-auth";
import { logger } from "@/lib/utils/logger";

export const dynamic = 'force-dynamic';

async function handleDebtsReport(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const governorate = searchParams.get("governorate");
    const customerId = searchParams.get("customerId");

    const prisma = getPrisma();
    const where: any = {
      balance: { gt: 0 }
    };

    if (governorate) {
      where.governorate = governorate;
    }

    if (customerId) {
      where.id = customerId;
    }

    const [customers, uniqueGovernorates] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: [
          { governorate: 'asc' },
          { name: 'asc' }
        ],
        include: {
          invoices: {
            take: 1,
            orderBy: { date: 'desc' },
            include: { user: { select: { name: true, username: true } } }
          }
        }
      }),
      prisma.customer.findMany({
        select: { governorate: true },
        distinct: ['governorate'],
        where: {
          governorate: { not: null }
        }
      })
    ]);

    const governoratesList = uniqueGovernorates
      .map((c: { governorate: string | null }) => c.governorate)
      .filter(Boolean);

    return NextResponse.json({
      customers,
      governorates: governoratesList
    });
  } catch (error) {
    logger.error("Failed to fetch debts report:", error);
    return apiError("Failed to fetch debts report", 500);
  }
}

export const GET = withAuth(handleDebtsReport);
