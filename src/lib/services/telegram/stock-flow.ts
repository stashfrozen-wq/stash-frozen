import { sendMessage, btn, navRow, type InlineKeyboard } from '../telegram';
import { startStockSearchFlow } from '../telegram-state';
import { toNumber, stockEmoji, buildStockMap } from './shared';
import getPrisma from '@/lib/prisma';

export async function startStockQuery(chatId: number): Promise<void> {
    await sendMessage(
        chatId,
        '📦 <b>المخزون</b>',
        [
            [btn('📊 ملخص عام', 'stk:summary'), btn('🔍 بحث', 'stk:search')],
            [btn('📂 حسب الفئة', 'stk:by_cat'), btn('⚠️ نفاد', 'stk:low')],
            navRow({ home: true }),
        ]
    );
}

export async function handleStockCallback(chatId: number, value: string): Promise<void> {
    if (value === 'summary') {
        await sendStockSummary(chatId);
    } else if (value === 'search') {
        startStockSearchFlow(chatId);
        await sendMessage(chatId, '🔍 اكتب اسم المنتج للبحث:', [
            navRow({ back: 'menu:stock', cancel: true }),
        ]);
    } else if (value === 'by_cat') {
        await sendStockByCategory(chatId);
    } else if (value === 'low') {
        await sendLowStock(chatId);
    } else if (value.startsWith('prod:')) {
        await sendProductStock(chatId, value.substring(5));
    }
}

export async function handleStockTextInput(chatId: number, text: string): Promise<void> {
    const prisma = getPrisma();
    const location = await prisma.location.findFirst();

    const products = await prisma.product.findMany({
        where: {
            OR: [
                { name: { contains: text, mode: 'insensitive' } },
                { sku: { contains: text, mode: 'insensitive' } },
            ],
        },
        take: 5,
        include: { category: true },
    });

    if (products.length === 0) {
        await sendMessage(chatId, `🔍 لم يتم العثور على "${text}"`, [
            navRow({ back: 'menu:stock', home: true }),
        ]);
        return;
    }

    const stockMap = await buildStockMap(products.map(p => p.id), location?.id);

    const buttons: InlineKeyboard = products.map(p => {
        const stock = stockMap.get(p.id) || 0;
        return [btn(`${stockEmoji(stock)} ${p.name} (${stock})`, `stk:prod:${p.id}`)];
    });
    buttons.push(navRow({ back: 'menu:stock', home: true }));

    await sendMessage(chatId, `🔍 <b>نتائج البحث:</b>`, buttons);
}

async function sendStockSummary(chatId: number): Promise<void> {
    const prisma = getPrisma();

    const productCount = await prisma.product.count();
    const inventories = await prisma.inventory.findMany({
        include: { product: true },
    });

    const totalUnits = inventories.reduce((sum, inv) => sum + toNumber(inv.quantity), 0);
    const totalValue = inventories.reduce((sum, inv) => sum + (toNumber(inv.quantity) * toNumber(inv.product.baseSellingPrice)), 0);

    const stockByProduct = new Map<string, { name: string; qty: number }>();
    for (const inv of inventories) {
        const existing = stockByProduct.get(inv.productId);
        if (existing) {
            existing.qty += toNumber(inv.quantity);
        } else {
            stockByProduct.set(inv.productId, { name: inv.product.name, qty: toNumber(inv.quantity) });
        }
    }
    const top5 = [...stockByProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    const top5Text = top5.map((p, i) => `${i + 1}. ${p.name} — ${p.qty} قطعة`).join('\n');

    let text = `📦 <b>ملخص المخزون:</b>\n\n`;
    text += `📊 إجمالي الأصناف: <b>${productCount}</b>\n`;
    text += `📦 إجمالي القطع: <b>${totalUnits.toLocaleString('ar-EG')}</b>\n`;
    text += `💰 قيمة المخزون (بيع): <b>${totalValue.toLocaleString('ar-EG')} ج.م</b>\n`;
    text += `\n<b>أعلى 5 أصناف:</b>\n${top5Text}`;

    await sendMessage(chatId, text, [
        [btn('🔍 بحث', 'stk:search'), btn('⚠️ نفاد', 'stk:low')],
        navRow({ back: 'menu:stock', home: true }),
    ]);
}

async function sendLowStock(chatId: number): Promise<void> {
    const prisma = getPrisma();
    const location = await prisma.location.findFirst();
    if (!location) {
        await sendMessage(chatId, '⚠️ لا يوجد مستودع', [navRow({ home: true })]);
        return;
    }

    const lowItems = await prisma.inventory.findMany({
        where: {
            locationId: location.id,
            quantity: { lt: 5 },
        },
        include: { product: true },
        orderBy: { quantity: 'asc' },
        take: 15,
    });

    if (lowItems.length === 0) {
        await sendMessage(chatId, '✅ لا توجد أصناف قاربت على النفاد!', [
            navRow({ back: 'menu:stock', home: true }),
        ]);
        return;
    }

    const lines = lowItems.map(inv => {
        const qty = toNumber(inv.quantity);
        let emoji = '🟡';
        if (qty <= 1) emoji = '🔴';
        else if (qty <= 3) emoji = '🟠';
        return `${emoji} ${inv.product.name} — ${qty} قطعة`;
    });

    await sendMessage(
        chatId,
        `⚠️ <b>أصناف قاربت على النفاد (أقل من 5):</b>\n\n${lines.join('\n')}`,
        [navRow({ back: 'menu:stock', home: true })]
    );
}

async function sendStockByCategory(chatId: number): Promise<void> {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
        include: {
            products: {
                include: {
                    inventoryItems: true,
                },
            },
        },
        orderBy: { name: 'asc' },
    });

    const lines = categories.map(cat => {
        const totalStock = cat.products.reduce((sum, p) =>
            sum + p.inventoryItems.reduce((s, inv) => s + toNumber(inv.quantity), 0), 0
        );
        return `📁 ${cat.name}: ${cat.products.length} أصناف — ${totalStock} قطعة`;
    });

    await sendMessage(
        chatId,
        `📂 <b>المخزون حسب الفئة:</b>\n\n${lines.join('\n')}`,
        [navRow({ back: 'menu:stock', home: true })]
    );
}

async function sendProductStock(chatId: number, productId: string): Promise<void> {
    const prisma = getPrisma();
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            category: true,
            inventoryItems: {
                include: { location: true },
            },
        },
    });

    if (!product) {
        await sendMessage(chatId, '⚠️ المنتج غير موجود', [navRow({ home: true })]);
        return;
    }

    const totalStock = product.inventoryItems.reduce((sum, inv) => sum + toNumber(inv.quantity), 0);
    const locationBreakdown = product.inventoryItems.map(inv =>
        `  • ${inv.location.name}: ${toNumber(inv.quantity)}`
    ).join('\n');

    let text = `📦 <b>${product.name}</b>\n\n`;
    text += `المخزون: <b>${totalStock} قطعة</b>\n`;
    text += `سعر البيع: ${toNumber(product.baseSellingPrice).toLocaleString('ar-EG')} ج.م\n`;
    text += `الفئة: ${product.category.name}\n`;
    text += `الكود: ${product.sku}\n`;
    if (locationBreakdown) {
        text += `\n📍 التوزيع:\n${locationBreakdown}`;
    }

    await sendMessage(chatId, text, [
        [btn('🛒 بيع هذا الصنف', `sale:prod:${productId}`)],
        navRow({ back: 'menu:stock', home: true }),
    ]);
}
