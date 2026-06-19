import { revalidatePath, revalidateTag } from 'next/cache';

export function revalidatePaths(paths: string[]): void {
    for (const path of paths) {
        revalidatePath(path);
    }
}

function revalidateTagsAndPaths(tags: string[], paths: string[]): void {
    for (const tag of tags) {
        revalidateTag(tag, 'seconds');
    }
    revalidatePaths(paths);
}

const INVOICE_PATHS = [
    '/invoices',
    '/analytics',
    '/profits',
    '/customers',
    '/sales',
];

const INVENTORY_PATHS = [
    '/inventory',
    '/sales',
];

const SALE_PATHS = [
    '/inventory',
    '/sales',
    '/logs',
    '/reviews',
    '/portfolio',
    '/inventory/transactions',
];

const REVIEW_PATHS = [
    '/reviews',
    '/portfolio',
    '/invoices',
    '/inventory',
    '/sales',
    '/profits',
];

const REFUND_PATHS = [
    '/invoices',
    '/products',
    '/analytics',
];

const UNDO_INVOICE_PATHS = [
    ...INVOICE_PATHS,
    '/inventory',
    '/inventory/transactions',
    '/logs',
];

const DASHBOARD_TAG = ['dashboard'];

export function revalidateInvoicePaths(): void {
    revalidateTagsAndPaths(DASHBOARD_TAG, INVOICE_PATHS);
}

export function revalidateInventoryPaths(): void {
    revalidateTagsAndPaths(DASHBOARD_TAG, INVENTORY_PATHS);
}

export function revalidateSalePaths(): void {
    revalidateTagsAndPaths(DASHBOARD_TAG, SALE_PATHS);
}

export function revalidateReviewPaths(): void {
    revalidateTagsAndPaths(DASHBOARD_TAG, REVIEW_PATHS);
}

export function revalidateRefundPaths(): void {
    revalidateTagsAndPaths(DASHBOARD_TAG, REFUND_PATHS);
}

export function revalidateUndoInvoicePaths(): void {
    revalidateTagsAndPaths(DASHBOARD_TAG, UNDO_INVOICE_PATHS);
}
