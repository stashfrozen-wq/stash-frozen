export function formatEGP(amount: number): string {
    return `${amount.toLocaleString('ar-EG')} ج.م`;
}

export function formatMoney(amount: number): string {
    return amount.toFixed(2);
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'كاش',
    INSTAPAY: 'انستاباي',
    CREDIT: 'آجل',
};

const PAYMENT_METHOD_EMOJI_LABELS: Record<string, string> = {
    CASH: '💵 كاش',
    INSTAPAY: '📱 انستاباي',
    CREDIT: '💳 آجل',
};

export function paymentMethodLabel(method: string, opts?: { emoji?: boolean }): string {
    if (opts?.emoji) {
        return PAYMENT_METHOD_EMOJI_LABELS[method] || method;
    }
    return PAYMENT_METHOD_LABELS[method] || method;
}

export function stockEmoji(qty: number): string {
    if (qty <= 0) return '🔴';
    if (qty < 5) return '🟡';
    return '🟢';
}
