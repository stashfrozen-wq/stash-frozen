export interface Invoice {
    id: string;
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    user?: {
        id: string;
        name: string | null;
        username: string;
        phone: string | null;
        address: string | null;
    };
    date: Date;
    totalAmount: number;
    paymentMethod: string;
    status?: string;
    reviewer?: { id: string; name: string | null; username: string } | null;
    reviewedAt?: Date | null;
    reviewNote?: string | null;
    previousBalance?: number;
    amountPaid?: number;
    currentBalance?: number;
    items?: Array<{
        id: string;
        productId: string;
        product: { name: string, sku: string, baseSellingPrice?: number };
        quantity: number;
        refundableQuantity: number;
        unitPrice: number;
        subtotal: number;
    }>;
}
