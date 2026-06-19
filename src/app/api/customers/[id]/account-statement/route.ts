import { NextRequest, NextResponse } from "next/server";
import getPrisma from "@/lib/prisma";
import { withAuth, apiError } from "@/lib/api/with-auth";
import { logger } from "@/lib/utils/logger";

export const dynamic = 'force-dynamic';

async function handleAccountStatement(
  req: NextRequest,
) {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    // URL: /api/customers/[id]/account-statement
    const idIndex = segments.indexOf('customers') + 1;
    const customerId = segments[idIndex];

    if (!customerId) {
      return apiError("Customer ID is required", 400);
    }

    const prisma = getPrisma();

    // Fetch customer with all invoices and payments
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
          orderBy: { date: 'asc' },
          include: {
            user: { select: { name: true, username: true } },
            items: {
              include: {
                product: { select: { name: true, sku: true } }
              }
            }
          }
        },
        payments: {
          orderBy: { date: 'asc' },
          include: {
            user: { select: { name: true, username: true } }
          }
        }
      }
    });

    if (!customer) {
      return apiError("Customer not found", 404);
    }

    // Build a unified timeline of all transactions
    interface TimelineEntry {
      id: string;
      date: string;
      type: 'INVOICE' | 'PAYMENT';
      description: string;
      debit: number;
      credit: number;
      balance: number;
      salesperson: string | null;
      invoiceId?: string;
      paymentMethod?: string;
      status?: string;
    }

    const timeline: TimelineEntry[] = [];

    // Add invoices as debit entries
    for (const inv of customer.invoices) {
      timeline.push({
        id: inv.id,
        date: inv.date.toISOString(),
        type: 'INVOICE',
        description: `فاتورة`,
        debit: Number(inv.totalAmount),
        credit: Number(inv.amountPaid),
        balance: 0, // will be recalculated
        salesperson: inv.user?.name || inv.user?.username || null,
        invoiceId: inv.id,
        paymentMethod: inv.paymentMethod,
        status: inv.status,
      });
    }

    // Add payments as credit entries
    for (const pay of customer.payments) {
      timeline.push({
        id: pay.id,
        date: pay.date.toISOString(),
        type: 'PAYMENT',
        description: pay.note || 'دفعة نقدية',
        debit: 0,
        credit: Number(pay.amount),
        balance: 0,
        salesperson: pay.user?.name || pay.user?.username || null,
      });
    }

    // Sort by date
    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate running balance
    let runningBalance = 0;
    for (const entry of timeline) {
      runningBalance += entry.debit - entry.credit;
      entry.balance = runningBalance;
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        governorate: customer.governorate,
        balance: Number(customer.balance),
      },
      timeline,
      totals: {
        totalDebit: timeline.reduce((sum, e) => sum + e.debit, 0),
        totalCredit: timeline.reduce((sum, e) => sum + e.credit, 0),
        currentBalance: Number(customer.balance),
      }
    });
  } catch (error) {
    logger.error("Failed to fetch account statement:", error);
    return apiError("Failed to fetch account statement", 500);
  }
}

export const GET = withAuth(handleAccountStatement);
