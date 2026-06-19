import { NextResponse } from 'next/server';
import getPrisma from '@/lib/prisma';
import { createObjectCsvStringifier } from 'csv-writer';
import { sendBackup } from '@/lib/services/telegram';
import { logger } from '@/lib/utils/logger';
import { withSecret } from '@/lib/api/with-auth';

export const dynamic = 'force-dynamic';

interface InvoiceBackupRow {
    id: string;
    date: Date;
    totalAmount: { toString(): string };
    paymentMethod: string;
    customerName: string | null;
}

interface RefundBackupRow {
    id: string;
    createdAt: Date;
    totalAmount: { toString(): string };
    reason: string | null;
    invoiceId: string | null;
}

interface CustomerBackupRow {
    id: string;
    name: string;
    phone: string | null;
    balance: { toString(): string };
}

interface ExpenseBackupRow {
    id: string;
    description: string;
    amount: { toString(): string };
    date: Date;
    category: string | null;
}

interface PaymentBackupRow {
    id: string;
    amount: { toString(): string };
    date: Date;
    note: string | null;
}

interface AuditBackupRow {
    id: string;
    userId: string;
    action: string;
    details: string | null;
    timestamp: Date;
}

interface InventoryBackupRow {
    product: { name: string };
    location: { name: string };
    quantity: { toString(): string };
    reservedQuantity: { toString(): string };
}

async function backupTable(
    dateStr: string,
    tableName: string,
    emoji: string,
    rows: Record<string, unknown>[],
    headers: Array<{ id: string; title: string }>
): Promise<void> {
    const writer = createObjectCsvStringifier({ header: headers });
    const csv = writer.getHeaderString() + writer.stringifyRecords(rows);
    await sendBackup(
        Buffer.from(csv),
        `${tableName}-${dateStr}.csv`,
        `${emoji} Monthly Backup: ${tableName} - ${dateStr}`
    );
}

async function handleCronBackup() {
    const prisma = getPrisma();

    try {
        const dateStr = new Date().toISOString().split('T')[0];

        const [
            invoices, refunds, customers, expenses,
            customerPayments, auditLogs, inventory
        ] = await Promise.all([
            prisma.invoice.findMany({
                select: { id: true, date: true, totalAmount: true, paymentMethod: true, customerName: true }
            }),
            prisma.refund.findMany({
                select: { id: true, createdAt: true, totalAmount: true, reason: true, invoiceId: true }
            }),
            prisma.customer.findMany({
                select: { id: true, name: true, phone: true, balance: true }
            }),
            prisma.expense.findMany({
                select: { id: true, description: true, amount: true, date: true, category: true }
            }),
            prisma.customerPayment.findMany({
                select: { id: true, amount: true, date: true, note: true }
            }),
            prisma.auditLog.findMany({
                select: { id: true, userId: true, action: true, details: true, timestamp: true }
            }),
            prisma.inventory.findMany({
                select: {
                    productId: true,
                    locationId: true,
                    quantity: true,
                    reservedQuantity: true,
                    product: { select: { name: true } },
                    location: { select: { name: true } }
                }
            })
        ]);

        await Promise.all([
            backupTable(dateStr, 'invoices', '📊',
                invoices.map((i: InvoiceBackupRow) => ({
                    id: i.id, date: i.date.toISOString(), totalAmount: i.totalAmount.toString(),
                    method: i.paymentMethod, customer: i.customerName || ''
                })),
                [
                    { id: 'id', title: 'ID' },
                    { id: 'date', title: 'Date' },
                    { id: 'totalAmount', title: 'Total' },
                    { id: 'method', title: 'Method' },
                    { id: 'customer', title: 'Customer' }
                ]
            ),

            backupTable(dateStr, 'refunds', '↩️',
                refunds.map((r: RefundBackupRow) => ({
                    id: r.id, date: r.createdAt.toISOString(), totalAmount: r.totalAmount.toString(),
                    reason: r.reason || '', invoiceId: r.invoiceId || ''
                })),
                [
                    { id: 'id', title: 'ID' },
                    { id: 'date', title: 'Date' },
                    { id: 'totalAmount', title: 'Total' },
                    { id: 'reason', title: 'Reason' },
                    { id: 'invoiceId', title: 'Invoice ID' }
                ]
            ),

            backupTable(dateStr, 'customers', '👥',
                customers.map((c: CustomerBackupRow) => ({
                    id: c.id, name: c.name, phone: c.phone || '', balance: c.balance.toString()
                })),
                [
                    { id: 'id', title: 'ID' },
                    { id: 'name', title: 'Name' },
                    { id: 'phone', title: 'Phone' },
                    { id: 'balance', title: 'Balance' }
                ]
            ),

            backupTable(dateStr, 'expenses', '💸',
                expenses.map((e: ExpenseBackupRow) => ({
                    id: e.id, description: e.description, amount: e.amount.toString(),
                    date: e.date.toISOString(), category: e.category || ''
                })),
                [
                    { id: 'id', title: 'ID' },
                    { id: 'description', title: 'Description' },
                    { id: 'amount', title: 'Amount' },
                    { id: 'date', title: 'Date' },
                    { id: 'category', title: 'Category' }
                ]
            ),

            backupTable(dateStr, 'customer-payments', '💰',
                customerPayments.map((p: PaymentBackupRow) => ({
                    id: p.id, amount: p.amount.toString(),
                    date: p.date.toISOString(), note: p.note || ''
                })),
                [
                    { id: 'id', title: 'ID' },
                    { id: 'amount', title: 'Amount' },
                    { id: 'date', title: 'Date' },
                    { id: 'note', title: 'Note' }
                ]
            ),

            backupTable(dateStr, 'audit-logs', '📝',
                auditLogs.map((a: AuditBackupRow) => ({
                    id: a.id, userId: a.userId, action: a.action,
                    details: a.details || '', timestamp: a.timestamp.toISOString()
                })),
                [
                    { id: 'id', title: 'ID' },
                    { id: 'userId', title: 'User ID' },
                    { id: 'action', title: 'Action' },
                    { id: 'details', title: 'Details' },
                    { id: 'timestamp', title: 'Timestamp' }
                ]
            ),

            backupTable(dateStr, 'inventory', '📦',
                inventory.map((i: InventoryBackupRow) => ({
                    productName: i.product.name,
                    locationName: i.location.name,
                    quantity: i.quantity.toString(),
                    reserved: i.reservedQuantity.toString()
                })),
                [
                    { id: 'productName', title: 'Product' },
                    { id: 'locationName', title: 'Location' },
                    { id: 'quantity', title: 'Quantity' },
                    { id: 'reserved', title: 'Reserved' }
                ]
            )
        ]);

        return NextResponse.json(
            { success: true, message: 'Backups sent to Telegram' },
            { headers: { 'Cache-Control': 'no-store' } }
        );

    } catch (error) {
        logger.error('Backup failed:', error);
        return NextResponse.json(
            { error: 'Backup failed. Check server logs for details.' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}

export const GET = withSecret(handleCronBackup);
