'use server';

import getPrisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth/session';
import { isPrismaUniqueConstraintError } from '@/lib/utils/errors';
import { buildCustomerSearchFilter } from '@/lib/utils/search';
import { calcSkip } from '@/lib/utils/pagination';
import { toNumber } from '@/lib/utils/decimal';
import { safeLogActivity, logger } from '@/lib/utils/logger';
import { getErrorMessage } from '@/lib/utils/errors';

export async function searchCustomers(query: string) {
    if (!query || query.length < 2) return [];

    const prisma = getPrisma();

    // Search in Customers (New Model)
    const customers = await prisma.customer.findMany({
        where: buildCustomerSearchFilter(query),
        include: {
            group: true
        },
        take: 10
    });

    return customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || 'N/A',
        address: c.address || 'N/A',
        balance: toNumber(c.balance),
        group: c.group?.name || 'No Group',
        type: 'CUSTOMER'
    }));
}

export async function getCustomersList(page: number = 1, limit: number = 50) {
    const prisma = getPrisma();
    const skip = calcSkip(page, limit);

    const [totalCount, customers] = await Promise.all([
        prisma.customer.count(),
        prisma.customer.findMany({
            skip,
            take: limit,
            include: {
                group: true,
                parent: true
            },
            orderBy: { name: 'asc' }
        })
    ]);

    return {
        data: customers,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit)
    };
}

export async function getCustomerProfile(id: string) {
    const prisma = getPrisma();

    const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
            group: true,
            parent: true,
            invoices: {
                where: { status: 'ACCEPTED' },
                include: {
                    items: {
                        include: { product: true }
                    },
                    user: { select: { name: true } }
                },
                orderBy: { date: 'desc' }
            },
            payments: {
                include: {
                    user: { select: { name: true, username: true } }
                },
                orderBy: { date: 'desc' }
            }
        }
    });

    if (!customer) throw new Error("Customer not found");

    return {
        profile: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone || 'N/A',
            address: customer.address || 'N/A',
            balance: Number(customer.balance),
            type: customer.groupId ? 'GROUP_MEMBER' : 'INDIVIDUAL',
            groupName: customer.group?.name,
            parentName: customer.parent?.name,
            joinedAt: customer.createdAt
        },
        invoices: customer.invoices.map(inv => ({
            id: inv.id,
            date: inv.date,
            total: Number(inv.totalAmount),
            paid: Number(inv.amountPaid),
            currentBalance: Number(inv.currentBalance),
            method: inv.paymentMethod,
            seller: inv.user?.name || 'Unknown',
            items: inv.items.map(it => ({
                product: it.product.name,
                quantity: Number(it.quantity),
                price: Number(it.unitPrice),
                subtotal: Number(it.subtotal)
            }))
        })),
        payments: customer.payments.map(p => ({
            id: p.id,
            date: p.date,
            amount: Number(p.amount),
            note: p.note,
            recordedBy: p.user?.name || p.user?.username || 'Unknown'
        }))
    };
}

export async function createCustomer(data: {
    name: string;
    phone?: string;
    address?: string;
    groupId?: string;
}) {
    if (!data.name || data.name.trim().length < 2) {
        return { success: false, error: 'Customer name must be at least 2 characters.' };
    }

    const prisma = getPrisma();

    try {
        const customer = await prisma.customer.create({
            data: {
                name: data.name.trim(),
                phone: data.phone?.trim() || null,
                address: data.address?.trim() || null,
                groupId: data.groupId || null,
                balance: 0,
            }
        });

        revalidatePath('/customers');
        return { success: true, customer };
    } catch (error: unknown) {
        if (isPrismaUniqueConstraintError(error)) {
            return { success: false, error: 'A customer with this name and phone already exists.' };
        }
        logger.error('Failed to create customer:', error);
        return { success: false, error: 'Failed to create customer. Please try again.' };
    }
}

export async function updateCustomer(
    id: string,
    data: {
        name: string;
        phone?: string;
        address?: string;
        governorate?: string;
        groupId?: string;
    }
) {
    if (!id) return { success: false, error: 'Customer ID is required.' };
    if (!data.name || data.name.trim().length < 2) {
        return { success: false, error: 'Customer name must be at least 2 characters.' };
    }

    const prisma = getPrisma();

    try {
        // Use a transaction to update customer AND sync legacy invoice fields
        const customer = await prisma.$transaction(async (tx) => {
            const updated = await tx.customer.update({
                where: { id },
                data: {
                    name: data.name.trim(),
                    phone: data.phone?.trim() || null,
                    address: data.address?.trim() || null,
                    governorate: data.governorate?.trim() || null,
                    groupId: data.groupId || null,
                },
            });

            // Sync legacy denormalized fields on all linked invoices
            await tx.invoice.updateMany({
                where: { customerId: id },
                data: {
                    customerName: updated.name,
                    customerPhone: updated.phone,
                    customerAddress: updated.address,
                },
            });

            return updated;
        });

        revalidatePath('/customers');
        revalidatePath('/invoices');
        revalidatePath('/analytics');
        revalidatePath('/dashboard');
        revalidatePath('/profits');
        return { success: true, customer };
    } catch (error: unknown) {
        if (isPrismaUniqueConstraintError(error)) {
            return { success: false, error: 'A customer with this name and phone already exists.' };
        }
        logger.error('Failed to update customer:', error);
        return { success: false, error: 'Failed to update customer. Please try again.' };
    }
}

export async function deleteCustomer(id: string) {
    if (!id) return { success: false, error: 'Customer ID is required.' };

    const prisma = getPrisma();

    try {
        // Check if customer has any invoices
        const invoiceCount = await prisma.invoice.count({
            where: { customerId: id, status: 'ACCEPTED' },
        });

        if (invoiceCount > 0) {
            return {
                success: false,
                error: `Cannot delete this customer because they have ${invoiceCount} invoice(s). Edit them instead.`,
            };
        }

        await prisma.customer.delete({ where: { id } });

        revalidatePath('/customers');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error: unknown) {
        logger.error('Failed to delete customer:', error);
        return { success: false, error: 'Failed to delete customer. Please try again.' };
    }
}

export async function recordCustomerPayment(
    customerId: string,
    amount: number,
    note?: string
) {
    if (!customerId) return { success: false, error: 'Customer ID is required.' };
    if (!amount || amount <= 0) return { success: false, error: 'Payment amount must be greater than zero.' };

    const prisma = getPrisma();
    const currentUser = await getCurrentUser();

    if (!currentUser) return { success: false, error: 'Unauthorized. Please sign in.' };

    try {
        const result = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { id: customerId } });
            if (!customer) throw new Error('Customer not found.');

            const payment = await tx.customerPayment.create({
                data: {
                    customerId,
                    amount,
                    userId: currentUser.id,
                    note: note?.trim() || null,
                }
            });

            const newBalance = Number(customer.balance) - amount;
            await tx.customer.update({
                where: { id: customerId },
                data: { balance: newBalance }
            });

            return { payment, newBalance, customerName: customer.name };
        });

        const noteSuffix = note ? `. Note: ${note}` : '';
        await safeLogActivity(
            'PAYMENT',
            `Customer "${result.customerName}" paid ${amount}. Recorded by ${currentUser.name || currentUser.username}. New balance: ${result.newBalance}${noteSuffix}`,
            currentUser.id
        );

        revalidatePath('/customers');
        revalidatePath('/customers/profile');
        revalidatePath('/dashboard');

        return { success: true, newBalance: result.newBalance };
    } catch (error: unknown) {
        const message = getErrorMessage(error, 'Failed to record payment.');
        logger.error('Failed to record payment:', error);
        return { success: false, error: message };
    }
}

export async function getCustomerStatement(customerId: string) {
    if (!customerId) throw new Error('Customer ID is required.');

    const prisma = getPrisma();

    const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
            invoices: {
                include: {
                    items: { include: { product: true } },
                    user: { select: { name: true } }
                },
                orderBy: { date: 'asc' }
            },
            payments: {
                include: {
                    user: { select: { name: true, username: true } }
                },
                orderBy: { date: 'asc' }
            }
        }
    });

    if (!customer) throw new Error('Customer not found');

    type StatementEntry = {
        id: string;
        date: Date;
        type: 'INVOICE' | 'PAYMENT';
        description: string;
        debit: number;
        credit: number;
        balance: number;
        recordedBy?: string;
        items?: { product: string; quantity: number; price: number; subtotal: number }[];
    };

    const entries: StatementEntry[] = [];

    for (const inv of customer.invoices) {
        entries.push({
            id: inv.id,
            date: inv.date,
            type: 'INVOICE',
            description: `Invoice #${inv.id.slice(-6).toUpperCase()}`,
            debit: Number(inv.totalAmount),
            credit: Number(inv.amountPaid),
            balance: Number(inv.currentBalance),
            recordedBy: inv.user?.name || 'Unknown',
            items: inv.items.map(it => ({
                product: it.product.name,
                quantity: Number(it.quantity),
                price: Number(it.unitPrice),
                subtotal: Number(it.subtotal)
            }))
        });
    }

    for (const p of customer.payments) {
        entries.push({
            id: p.id,
            date: p.date,
            type: 'PAYMENT',
            description: p.note ? `Payment - ${p.note}` : 'Payment',
            debit: 0,
            credit: Number(p.amount),
            balance: 0,
            recordedBy: p.user?.name || p.user?.username || 'Unknown'
        });
    }

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    for (const entry of entries) {
        if (entry.type === 'INVOICE') {
            runningBalance = runningBalance + entry.debit - entry.credit;
        } else {
            runningBalance = runningBalance - entry.credit;
        }
        entry.balance = runningBalance;
    }

    return {
        profile: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone || 'N/A',
            address: customer.address || 'N/A',
            balance: Number(customer.balance),
            joinedAt: customer.createdAt
        },
        statement: entries,
        finalBalance: Number(customer.balance)
    };
}
