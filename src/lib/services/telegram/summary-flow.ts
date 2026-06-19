import { sendMessage, navRow } from '../telegram';
import { toNumber, paymentMethodLabel } from './shared';
import { startOfDay } from '@/lib/utils/date';
import getPrisma from '@/lib/prisma';

export async function sendTodaySummary(chatId: number): Promise<void> {
    const prisma = getPrisma();

    const todayStart = startOfDay(new Date());

    const invoices = await prisma.invoice.findMany({
        where: { status: 'ACCEPTED', date: { gte: todayStart } },
        include: { items: { include: { product: true } } },
    });

    const totalSales = invoices.reduce((sum, inv) => sum + toNumber(inv.totalAmount), 0);
    const totalItems = invoices.reduce((sum, inv) =>
        sum + inv.items.reduce((s, item) => s + toNumber(item.quantity), 0), 0
    );

    const byMethod: Record<string, { count: number; total: number }> = {};
    for (const inv of invoices) {
        const method = inv.paymentMethod;
        if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
        byMethod[method].count++;
        byMethod[method].total += toNumber(inv.totalAmount);
    }

    const methodLines = Object.entries(byMethod).map(([m, d]) =>
        `${paymentMethodLabel(m, { emoji: true })}: ${d.total.toLocaleString('ar-EG')} ج.م (${d.count} فواتير)`
    ).join('\n');

    const productSales = new Map<string, { name: string; qty: number; total: number }>();
    for (const inv of invoices) {
        for (const item of inv.items) {
            const existing = productSales.get(item.productId);
            const qty = toNumber(item.quantity);
            const subtotal = toNumber(item.subtotal);
            if (existing) {
                existing.qty += qty;
                existing.total += subtotal;
            } else {
                productSales.set(item.productId, { name: item.product.name, qty, total: subtotal });
            }
        }
    }
    const topProducts = [...productSales.values()].sort((a, b) => b.total - a.total).slice(0, 3);
    const topText = topProducts.map((p, i) =>
        `${i + 1}. ${p.name} × ${p.qty} = ${p.total.toLocaleString('ar-EG')} ج.م`
    ).join('\n');

    const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    let text = `📊 <b>ملخص اليوم — ${dateStr}</b>\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 المبيعات: <b>${totalSales.toLocaleString('ar-EG')} ج.م</b>\n`;
    text += `🧾 عدد الفواتير: ${invoices.length}\n`;
    text += `📦 عدد الأصناف المباعة: ${totalItems}\n`;
    text += `\n━━━━ حسب طريقة الدفع ━━━━\n${methodLines}\n`;
    if (topText) {
        text += `\n━━━━ أعلى 3 أصناف ━━━━\n${topText}`;
    }

    await sendMessage(chatId, text, [
        navRow({ home: true }),
    ]);
}

export async function handleTodayCallback(chatId: number, value: string): Promise<void> {
    if (value === 'refresh') {
        await sendTodaySummary(chatId);
    }
}
