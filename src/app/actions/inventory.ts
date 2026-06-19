'use server';

import getPrisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isPrismaUniqueConstraintError } from '@/lib/utils/errors';
import { getDefaultLocation } from '@/lib/utils/stock';
import { safeLogActivity, logger } from '@/lib/utils/logger';
import { revalidateInventoryPaths, revalidatePaths } from '@/lib/utils/revalidation';
import { calcSkip } from '@/lib/utils/pagination';
import { serializeProduct } from '@/lib/utils/decimal';
import { buildProductSearchFilter } from '@/lib/utils/search';
import { ProductSchema, validateOrFail } from '@/lib/validations';

export async function getInventory(page: number = 1, limit: number = 50) {
    const prisma = getPrisma();
    const skip = calcSkip(page, limit);

    const [totalCount, inventory] = await Promise.all([
        prisma.inventory.count(),
        prisma.inventory.findMany({
            skip,
            take: limit,
            include: {
                product: {
                    include: {
                        category: true
                    }
                },
                location: true
            },
            orderBy: {
                product: { name: 'asc' }
            }
        })
    ]);

    return [
        totalCount,
        inventory.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            product: {
                ...item.product,
                costPrice: Number(item.product.costPrice),
                baseSellingPrice: Number(item.product.baseSellingPrice)
            }
        }))
    ] as const;
}

export async function getCategories() {
    const prisma = getPrisma();
    return prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { products: true } }
        }
    });
}

export async function createCategory(name: string) {
    const prisma = getPrisma();
    try {
        const category = await prisma.category.create({
            data: { name }
        });

        await safeLogActivity('CREATE_CATEGORY', `Created category "${name}"`);

        revalidatePath('/products');
        return { success: true, category };
    } catch (error: unknown) {
        if (isPrismaUniqueConstraintError(error)) {
            return { success: false, error: 'Category name already exists.' };
        }
        return { success: false, error: 'Failed to create category.' };
    }
}

export async function deleteCategory(id: string) {
    const prisma = getPrisma();
    try {
        const products = await prisma.product.findMany({
            where: { categoryId: id },
            include: {
                _count: {
                    select: { transactionItems: true, invoiceItems: true, refundItems: true }
                }
            }
        });

        const hasUsage = products.some(p => p._count.transactionItems > 0 || p._count.invoiceItems > 0 || p._count.refundItems > 0);
        
        if (hasUsage) {
            return { success: false, error: 'Cannot delete: some products are used in transactions or invoices.' };
        }

        await prisma.$transaction(async (tx) => {
            const productIds = products.map(p => p.id);
            if (productIds.length > 0) {
                await tx.inventory.deleteMany({ where: { productId: { in: productIds } } });
                await tx.product.deleteMany({ where: { categoryId: id } });
            }
            await tx.category.delete({ where: { id } });
        });

        await safeLogActivity('DELETE_CATEGORY', `Deleted category ID: ${id} along with its products`);

        revalidatePath('/products');
        return { success: true };
    } catch {
        return { success: false, error: 'Failed to delete category.' };
    }
}

export async function createProduct(data: {
    name: string;
    sku: string;
    categoryId: string;
    costPrice: number;
    baseSellingPrice: number;
    retailPrice?: number;
    lowestRetailPrice?: number;
    wholesalePrice?: number;
    lowestWholesalePrice?: number;
    unit?: string;
    image?: string;
    initialQuantity?: number;
}) {
    const validation = validateOrFail(ProductSchema, {
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId,
        costPrice: data.costPrice,
        baseSellingPrice: data.baseSellingPrice,
        retailPrice: data.retailPrice,
        lowestRetailPrice: data.lowestRetailPrice,
        wholesalePrice: data.wholesalePrice,
        lowestWholesalePrice: data.lowestWholesalePrice,
        unit: data.unit
    });
    if (!validation.success) return { success: false, error: validation.error };

    if (data.initialQuantity !== undefined && (typeof data.initialQuantity !== 'number' || isNaN(data.initialQuantity) || data.initialQuantity < 0)) {
        return { success: false, error: 'Opening stock cannot be negative.' };
    }

    const prisma = getPrisma();

    try {
        // Check for duplicate SKU
        const existingSku = await prisma.product.findFirst({
            where: { sku: data.sku }
        });
        if (existingSku) {
            return { success: false, error: `SKU "${data.sku}" already exists. Please use a unique SKU.` };
        }

        const product = await prisma.$transaction(async (tx) => {
            // 1. Create Product
            const newProduct = await tx.product.create({
                data: {
                    name: data.name,
                    sku: data.sku,
                    categoryId: data.categoryId,
                    costPrice: Math.max(0, data.costPrice),
                    baseSellingPrice: Math.max(0, data.baseSellingPrice),
                    retailPrice: Math.max(0, data.retailPrice || 0),
                    lowestRetailPrice: Math.max(0, data.lowestRetailPrice || 0),
                    wholesalePrice: Math.max(0, data.wholesalePrice || 0),
                    lowestWholesalePrice: Math.max(0, data.lowestWholesalePrice || 0),
                    unit: data.unit || 'piece',
                    image: data.image
                }
            });

            // 2. Self-healing Location (Ensure at least one location exists)
            const location = await getDefaultLocation(tx);
            if (!location) throw new Error('No location available');

            // 3. Create Initial Inventory if provided
            if (data.initialQuantity !== undefined && data.initialQuantity > 0) {
                await tx.inventory.create({
                    data: {
                        productId: newProduct.id,
                        locationId: location.id,
                        quantity: data.initialQuantity
                    }
                });

                // [NEW] Create Transaction for Opening Stock
                await tx.transaction.create({
                    data: {
                        type: 'IN',
                        toLocationId: location.id,
                        items: {
                            create: [{
                                productId: newProduct.id,
                                quantity: data.initialQuantity
                            }]
                        }
                    }
                });
            }

            return newProduct;
        });

        // 4. Audit Log
        await safeLogActivity('CREATE_PRODUCT', `Created product "${data.name}" (${data.sku})`);

        revalidateInventoryPaths();

        return {
            success: true,
            product: serializeProduct(product)
        };
    } catch (error: unknown) {
        if (isPrismaUniqueConstraintError(error)) {
            return {
                success: false,
                error: 'SKU already exists. Please use a unique code.'
            };
        }
        return {
            success: false,
            error: 'Failed to create product. Please try again.'
        };
    }
}

export async function getUnifiedProducts(page: number = 1, limit: number = 50, search?: string) {
    const prisma = getPrisma();
    const skip = calcSkip(page, limit);

    const whereClause = search ? buildProductSearchFilter(search) : {};

    const [totalCount, grandTotalResult, products] = await Promise.all([
        prisma.product.count({ where: whereClause }),
        prisma.inventory.aggregate({ _sum: { quantity: true } }),
        prisma.product.findMany({
            where: whereClause,
            skip,
            take: limit,
            include: {
                category: true,
                inventoryItems: {
                    include: { location: true }
                }
            },
            orderBy: { name: 'asc' }
        })
    ]);

    const grandTotal = Number(grandTotalResult._sum.quantity || 0);

    return [
        totalCount,
        products.map(p => {
            const totalStock = p.inventoryItems.reduce((s, inv) => s + Number(inv.quantity), 0);
            const percentOfTotal = grandTotal > 0 ? Number(((totalStock / grandTotal) * 100).toFixed(1)) : 0;

            return {
                id: p.id,
                name: p.name,
                sku: p.sku,
                unit: p.unit,
                categoryId: p.categoryId,
                categoryName: p.category?.name || 'Uncategorized',
                costPrice: Number(p.costPrice),
                baseSellingPrice: Number(p.baseSellingPrice),
                retailPrice: Number(p.retailPrice),
                lowestRetailPrice: Number(p.lowestRetailPrice),
                wholesalePrice: Number(p.wholesalePrice),
                lowestWholesalePrice: Number(p.lowestWholesalePrice),
                image: p.image,
                totalStock,
                percentOfTotal,
                locationBreakdown: p.inventoryItems.map(inv => ({
                    locationId: inv.locationId,
                    locationName: inv.location.name,
                    locationType: inv.location.type,
                    quantity: Number(inv.quantity)
                }))
            };
        })
    ] as const;
}

export async function updateProduct(id: string, data: {
    name: string;
    sku: string;
    categoryId: string;
    costPrice: number;
    baseSellingPrice: number;
    retailPrice?: number;
    lowestRetailPrice?: number;
    wholesalePrice?: number;
    lowestWholesalePrice?: number;
    unit?: string;
    image?: string;
}) {
    const validation = validateOrFail(ProductSchema, {
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId,
        costPrice: data.costPrice,
        baseSellingPrice: data.baseSellingPrice,
        retailPrice: data.retailPrice,
        lowestRetailPrice: data.lowestRetailPrice,
        wholesalePrice: data.wholesalePrice,
        lowestWholesalePrice: data.lowestWholesalePrice,
        unit: data.unit
    });
    if (!validation.success) return { success: false, error: validation.error };

    const prisma = getPrisma();

    try {
        const product = await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                sku: data.sku,
                categoryId: data.categoryId,
                costPrice: Math.max(0, data.costPrice),
                baseSellingPrice: Math.max(0, data.baseSellingPrice),
                retailPrice: Math.max(0, data.retailPrice || 0),
                lowestRetailPrice: Math.max(0, data.lowestRetailPrice || 0),
                wholesalePrice: Math.max(0, data.wholesalePrice || 0),
                lowestWholesalePrice: Math.max(0, data.lowestWholesalePrice || 0),
                unit: data.unit || 'piece',
                image: data.image
            }
        });

        // Audit Log
        await safeLogActivity('UPDATE_PRODUCT', `Updated product "${data.name}" (${data.sku})`);

        revalidateInventoryPaths();

        return {
            success: true,
            product: serializeProduct(product)
        };
    } catch (error: unknown) {
        if (isPrismaUniqueConstraintError(error)) {
            return {
                success: false,
                error: 'SKU already exists. Please use a unique code.'
            };
        }
        return {
            success: false,
            error: 'Failed to update product. Please try again.'
        };
    }
}

export async function deleteProduct(id: string) {
    const prisma = getPrisma();
    try {
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        transactionItems: true,
                        invoiceItems: true,
                        refundItems: true
                    }
                }
            }
        });

        if (!product) return { success: false, error: 'Product not found.' };

        if (product._count.transactionItems > 0 || product._count.invoiceItems > 0 || product._count.refundItems > 0) {
            return { success: false, error: 'Cannot delete: product is used in transactions or invoices.' };
        }

        await prisma.$transaction(async (tx) => {
            await tx.inventory.deleteMany({ where: { productId: id } });
            await tx.product.delete({ where: { id } });
        });

        await safeLogActivity('DELETE_PRODUCT', `Deleted product "${product.name}" (${product.sku})`);

        revalidatePaths(['/products', '/inventory', '/sales', '/dashboard']);

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete product:', error);
        return { success: false, error: 'Failed to delete product.' };
    }
}

export async function bulkUpdatePricing(percentage: number, type: 'markup' | 'increase') {
    if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0) {
        return { success: false, error: 'Percentage cannot be negative.' };
    }
    const prisma = getPrisma();
    try {
        const products = await prisma.product.findMany();

        await prisma.$transaction(
            products.map((product) => {
                let newSellingPrice = Number(product.baseSellingPrice);
                const cost = Number(product.costPrice);

                if (type === 'markup') {
                    newSellingPrice = cost * (1 + percentage / 100);
                } else if (type === 'increase') {
                    newSellingPrice = newSellingPrice * (1 + percentage / 100);
                }

                return prisma.product.update({
                    where: { id: product.id },
                    data: { baseSellingPrice: newSellingPrice }
                });
            })
        );

        await safeLogActivity('BULK_UPDATE_PRICING', `Applied ${percentage}% ${type} to all products`);

        revalidatePaths(['/pricing', '/products', '/inventory', '/sales']);
        
        return { success: true };
    } catch (error) {
        logger.error('Failed to bulk update pricing:', error);
        return { success: false, error: 'Failed to bulk update pricing.' };
    }
}
