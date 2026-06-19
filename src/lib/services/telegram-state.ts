/**
 * In-memory conversation state manager for Telegram bot multi-step flows.
 * 
 * Each chat has a state object that tracks:
 * - Current flow (sale, invoice_search, stock_search)
 * - Current step within the flow
 * - Accumulated data (cart items, customer info, etc.)
 * - Timestamp for TTL expiry
 * 
 * States auto-expire after 10 minutes of inactivity.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CartItem {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    stock: number;
}

export interface SaleState {
    flow: 'sale';
    step: 'product_search' | 'browsing_category' | 'quantity' | 'cart_review' | 'customer' | 'customer_search' | 'payment' | 'amount_paid' | 'confirm';
    cart: CartItem[];
    selectedProduct?: { id: string; name: string; sku: string; price: number; stock: number };
    selectedCategoryId?: string;
    customer?: { id?: string; name: string; phone?: string; balance: number };
    paymentMethod?: 'CASH' | 'INSTAPAY' | 'CREDIT';
    amountPaid?: number;
}

export interface InvoiceSearchState {
    flow: 'invoice_search';
    step: 'input' | 'viewing';
    invoiceId?: string;
}

export interface StockSearchState {
    flow: 'stock_search';
    step: 'input' | 'viewing';
    productQuery?: string;
}

export interface DatePickerState {
    flow: 'daily_summary';
    step: 'select_date' | 'viewing';
    date?: string;
}

export type ConversationState = SaleState | InvoiceSearchState | StockSearchState | DatePickerState;

interface StateEntry {
    state: ConversationState;
    updatedAt: number;
}

// ─── State Store ────────────────────────────────────────────────────────────

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const store = new Map<number, StateEntry>();

/**
 * Get conversation state for a chat, or null if expired/nonexistent
 */
export function getState(chatId: number): ConversationState | null {
    const entry = store.get(chatId);
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.updatedAt > TTL_MS) {
        store.delete(chatId);
        return null;
    }
    
    return entry.state;
}

/**
 * Set conversation state for a chat (resets TTL)
 */
export function setState(chatId: number, state: ConversationState): void {
    store.set(chatId, {
        state,
        updatedAt: Date.now(),
    });
}

/**
 * Clear conversation state for a chat
 */
export function clearState(chatId: number): void {
    store.delete(chatId);
}

/**
 * Start a new sale flow
 */
export function startSaleFlow(chatId: number): SaleState {
    const state: SaleState = {
        flow: 'sale',
        step: 'product_search',
        cart: [],
    };
    setState(chatId, state);
    return state;
}

/**
 * Start an invoice search flow
 */
export function startInvoiceSearchFlow(chatId: number): InvoiceSearchState {
    const state: InvoiceSearchState = {
        flow: 'invoice_search',
        step: 'input',
    };
    setState(chatId, state);
    return state;
}

/**
 * Start a stock search flow
 */
export function startStockSearchFlow(chatId: number): StockSearchState {
    const state: StockSearchState = {
        flow: 'stock_search',
        step: 'input',
    };
    setState(chatId, state);
    return state;
}

/**
 * Update the sale state immutably
 */
export function updateSaleState(chatId: number, updates: Partial<SaleState>): SaleState | null {
    const current = getState(chatId);
    if (!current || current.flow !== 'sale') return null;
    
    const updated: SaleState = { ...current, ...updates } as SaleState;
    setState(chatId, updated);
    return updated;
}

/**
 * Add item to cart
 */
export function addToCart(chatId: number, item: CartItem): SaleState | null {
    const current = getState(chatId);
    if (!current || current.flow !== 'sale') return null;
    
    // Check if product already in cart
    const existingIdx = current.cart.findIndex(c => c.productId === item.productId);
    let newCart: CartItem[];
    
    if (existingIdx >= 0) {
        newCart = [...current.cart];
        newCart[existingIdx] = {
            ...newCart[existingIdx],
            quantity: newCart[existingIdx].quantity + item.quantity,
        };
    } else {
        newCart = [...current.cart, item];
    }
    
    return updateSaleState(chatId, { cart: newCart, step: 'cart_review', selectedProduct: undefined });
}

/**
 * Remove item from cart by index
 */
export function removeFromCart(chatId: number, productId: string): SaleState | null {
    const current = getState(chatId);
    if (!current || current.flow !== 'sale') return null;
    
    const newCart = current.cart.filter(c => c.productId !== productId);
    return updateSaleState(chatId, { cart: newCart });
}

/**
 * Get cart total
 */
export function getCartTotal(state: SaleState): number {
    return state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
}

/**
 * Format cart as text summary
 */
export function formatCartSummary(state: SaleState): string {
    if (state.cart.length === 0) return '🛒 السلة فارغة';
    
    const lines = state.cart.map((item, i) => 
        `${i + 1}. ${item.name} × ${item.quantity} = ${(item.unitPrice * item.quantity).toLocaleString('ar-EG')} ج.م`
    );
    
    const total = getCartTotal(state);
    
    return `🛒 السلة (${state.cart.length} صنف):\n\n${lines.join('\n')}\n\n💰 الإجمالي: ${total.toLocaleString('ar-EG')} ج.م`;
}

// ─── Cleanup (run periodically) ─────────────────────────────────────────────

/**
 * Clean up expired states
 */
export function cleanupExpiredStates(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [chatId, entry] of store.entries()) {
        if (now - entry.updatedAt > TTL_MS) {
            store.delete(chatId);
            cleaned++;
        }
    }
    
    return cleaned;
}
