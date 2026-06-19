export interface StaffMember {
    id: string;
    name: string | null;
    username: string;
    role: string;
    phone?: string | null;
    createdAt?: Date;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
    costPrice: number;
    baseSellingPrice: number;
    retailPrice?: number;
    lowestRetailPrice?: number;
    wholesalePrice?: number;
    lowestWholesalePrice?: number;
    unit?: string;
    categoryId: string;
    category?: { id: string; name: string };
    stock?: number;
    defectiveStock?: number;
    totalRefunded?: number;
}

export interface InvoiceItem {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product?: Product;
    refundableQuantity?: number;
}

export interface Invoice {
    id: string;
    date: Date;
    totalAmount: number;
    paymentMethod: string;
    status: string;
    customerName?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    customerId?: string | null;
    previousBalance: number;
    amountPaid: number;
    currentBalance: number;
    items: InvoiceItem[];
    user?: { id: string; name: string | null; username: string };
    reviewer?: { id: string; name: string | null; username: string } | null;
}

export interface User {
    id: string;
    name: string | null;
    username: string;
    role: string;
    phone?: string | null;
    address?: string | null;
    permissions?: string[];
}

export type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string };

export type PaginatedActionResult<T> =
    | { success: true; data: T[]; pagination: { total: number; pages: number; current: number } }
    | { success: false; error: string };
