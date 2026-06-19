/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    sendMessage, sendDocument,
    btn, navRow,
    type InlineKeyboard,
} from '../telegram';
import {
    getState, clearState, startSaleFlow,
    updateSaleState, addToCart, removeFromCart, getCartTotal, formatCartSummary,
    type SaleState,
} from '../telegram-state';
import { toNumber, formatEGP, stockEmoji, searchProductsForBot, searchCustomersForBot, getAppUrl, formatCartLine } from './shared';
import getPrisma from '@/lib/prisma';

export async function startSaleWizard(chatId: number): Promise<void> {
    startSaleFlow(chatId);

    await sendMessage(
        chatId,
        '🛒 <b>بيع سريع — الخطوة 1/4</b>\n\nابحث عن المنتج:\nاكتب اسم المنتج أو رقم الباركود...',
        [
            [btn('📂 تصفح الأصناف', 'sale:browse_cats')],
            navRow({ cancel: true }),
        ]
    );
}

export async function handleSaleTextInput(chatId: number, text: string, state: SaleState): Promise<void> {
    switch (state.step) {
        case 'product_search':
            await searchProducts(chatId, text);
            break;
        case 'quantity': {
            const qty = parseInt(text, 10);
            if (isNaN(qty) || qty <= 0) {
                await sendMessage(chatId, '⚠️ يرجى إدخال رقم صحيح أكبر من 0', [
                    navRow({ back: 'sale:back_to_search', cancel: true }),
                ]);
                return;
            }
            await handleQuantitySelection(chatId, qty);
            break;
        }
        case 'customer_search':
            await searchCustomersForSale(chatId, text);
            break;
        case 'customer':
            updateSaleState(chatId, { customer: { name: text, balance: 0 }, step: 'payment' });
            await sendPaymentStep(chatId);
            break;
        case 'amount_paid': {
            const amount = parseFloat(text);
            if (isNaN(amount) || amount < 0) {
                await sendMessage(chatId, '⚠️ يرجى إدخال مبلغ صحيح');
                return;
            }
            await handleAmountPaid(chatId, amount);
            break;
        }
        default:
            await searchProducts(chatId, text);
            break;
    }
}

export async function handleSaleCallback(chatId: number, value: string): Promise<void> {
    const state = getState(chatId);
    if (!state || state.flow !== 'sale') {
        await startSaleWizard(chatId);
        return;
    }

    if (value.startsWith('cat:')) return browseProductsInCategory(chatId, value.substring(4));
    if (value.startsWith('prod:')) return selectProduct(chatId, value.substring(5));
    if (value.startsWith('qty:')) return handleQuantitySelection(chatId, parseInt(value.substring(4), 10));
    if (value.startsWith('cust:')) return selectCustomer(chatId, value.substring(5));

    switch (value) {
        case 'browse_cats': return browseCategoriesStep(chatId);
        case 'custom_qty': return handleSaleCustomQty(chatId);
        case 'add_more': return handleSaleAddMore(chatId);
        case 'remove_last': return handleSaleRemoveLast(chatId, state as SaleState);
        case 'checkout': return handleSaleCheckout(chatId);
        case 'skip_customer': return handleSaleSkipCustomer(chatId);
        case 'new_customer': return handleSaleNewCustomer(chatId);
        case 'pay_cash': return handlePaymentMethod(chatId, 'CASH');
        case 'pay_instapay': return handlePaymentMethod(chatId, 'INSTAPAY');
        case 'pay_credit': return handlePaymentMethod(chatId, 'CREDIT');
        case 'pay_full': return handleSalePayFull(chatId, state as SaleState);
        case 'pay_custom': return handleSalePayCustom(chatId);
        case 'confirm_sale': return processSaleFromBot(chatId);
        case 'new_sale': return startSaleWizard(chatId);
        case 'back_to_search': return handleSaleBackToSearch(chatId);
        case 'back_to_cart': return sendCartReview(chatId);
    }
}

async function handleSaleCustomQty(chatId: number) {
    updateSaleState(chatId, { step: 'quantity' });
    await sendMessage(chatId, '✏️ اكتب الكمية المطلوبة:', [navRow({ back: 'sale:back_to_search', cancel: true })]);
}
async function handleSaleAddMore(chatId: number) {
    updateSaleState(chatId, { step: 'product_search' });
    await sendMessage(chatId, '🛒 ابحث عن منتج آخر لإضافته:', [[btn('📂 تصفح الأصناف', 'sale:browse_cats')], navRow({ cancel: true })]);
}
async function handleSaleRemoveLast(chatId: number, state: SaleState) {
    if (state.cart.length > 0) removeFromCart(chatId, state.cart[state.cart.length - 1].productId);
    const updated = getState(chatId) as SaleState;
    if (updated.cart.length === 0) {
        updateSaleState(chatId, { step: 'product_search' });
        await sendMessage(chatId, '🛒 السلة فارغة. ابحث عن منتج:', [[btn('📂 تصفح الأصناف', 'sale:browse_cats')], navRow({ cancel: true })]);
    } else {
        await sendCartReview(chatId);
    }
}
async function handleSaleCheckout(chatId: number) {
    updateSaleState(chatId, { step: 'customer' });
    await sendCustomerStep(chatId);
}
async function handleSaleSkipCustomer(chatId: number) {
    updateSaleState(chatId, { step: 'payment' });
    await sendPaymentStep(chatId);
}
async function handleSaleNewCustomer(chatId: number) {
    updateSaleState(chatId, { step: 'customer' });
    await sendMessage(chatId, '👤 اكتب اسم العميل الجديد:', [navRow({ back: 'sale:checkout', cancel: true })]);
}
async function handleSalePayFull(chatId: number, state: SaleState) {
    await handleAmountPaid(chatId, getCartTotal(state));
}
async function handleSalePayCustom(chatId: number) {
    updateSaleState(chatId, { step: 'amount_paid' });
    await sendMessage(chatId, '✏️ اكتب المبلغ المدفوع:', [navRow({ back: 'sale:checkout', cancel: true })]);
}
async function handleSaleBackToSearch(chatId: number) {
    updateSaleState(chatId, { step: 'product_search' });
    await sendMessage(chatId, '🔍 ابحث عن المنتج:', [[btn('📂 تصفح الأصناف', 'sale:browse_cats')], navRow({ cancel: true })]);
}

async function searchProducts(chatId: number, query: string): Promise<void> {
    const { products, stockMap } = await searchProductsForBot(query);

    if (products.length === 0) {
        await sendMessage(chatId, `🔍 لم يتم العثور على نتائج لـ "${query}"\n\nجرب بحث آخر:`, [
            [btn('📂 تصفح الأصناف', 'sale:browse_cats')],
            navRow({ cancel: true }),
        ]);
        return;
    }

    const buttons: InlineKeyboard = products.map(p => {
        const stock = stockMap.get(p.id) || 0;
        const price = toNumber(p.baseSellingPrice);
        return [btn(`${stockEmoji(stock)} ${p.name} — ${price} ج.م (${stock})`, `sale:prod:${p.id}`)];
    });

    buttons.push([btn('🔍 بحث آخر', 'sale:back_to_search')]);
    buttons.push(navRow({ cancel: true }));

    await sendMessage(chatId, `🔍 نتائج البحث عن "<b>${query}</b>":`, buttons);
}

async function browseCategoriesStep(chatId: number): Promise<void> {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
    });

    if (categories.length === 0) {
        await sendMessage(chatId, '📂 لا توجد فئات. ابحث عن المنتج مباشرة:', [
            navRow({ back: 'sale:back_to_search', cancel: true }),
        ]);
        return;
    }

    const rows: InlineKeyboard = [];
    for (let i = 0; i < categories.length; i += 2) {
        const row = [btn(`📁 ${categories[i].name} (${categories[i]._count.products})`, `sale:cat:${categories[i].id}`)];
        if (categories[i + 1]) {
            row.push(btn(`📁 ${categories[i + 1].name} (${categories[i + 1]._count.products})`, `sale:cat:${categories[i + 1].id}`));
        }
        rows.push(row);
    }
    rows.push(navRow({ back: 'sale:back_to_search', cancel: true }));

    await sendMessage(chatId, '📂 <b>اختر الفئة:</b>', rows);
}

async function browseProductsInCategory(chatId: number, categoryId: string): Promise<void> {
    const prisma = getPrisma();
    const location = await prisma.location.findFirst();

    const products = await prisma.product.findMany({
        where: { categoryId },
        include: { category: true },
        take: 15,
        orderBy: { name: 'asc' },
    });

    const stockMap = await (await import('./shared')).buildStockMap(products.map(p => p.id), location?.id);

    const catName = products[0]?.category?.name || 'الفئة';

    const buttons: InlineKeyboard = products
        .filter(p => (stockMap.get(p.id) || 0) > 0)
        .map(p => {
            const stock = stockMap.get(p.id) || 0;
            return [btn(`${p.name} (متاح: ${stock})`, `sale:prod:${p.id}`)];
        });

    if (buttons.length === 0) {
        await sendMessage(chatId, `📂 ${catName} — لا توجد أصناف متاحة`, [
            [btn('↩️ الفئات', 'sale:browse_cats')],
            navRow({ cancel: true }),
        ]);
        return;
    }

    buttons.push([btn('↩️ الفئات', 'sale:browse_cats')]);
    buttons.push(navRow({ cancel: true }));

    await sendMessage(chatId, `📂 <b>${catName}</b> — اختر المنتج:`, buttons);
}

async function selectProduct(chatId: number, productId: string): Promise<void> {
    const prisma = getPrisma();
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
        await sendMessage(chatId, '⚠️ المنتج غير موجود');
        return;
    }

    const location = await prisma.location.findFirst();
    const inventory = location ? await prisma.inventory.findFirst({
        where: { productId, locationId: location.id },
    }) : null;
    const stock = inventory ? toNumber(inventory.quantity) : 0;

    updateSaleState(chatId, {
        selectedProduct: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: toNumber(product.baseSellingPrice),
            stock,
        },
    });

    const qtyButtons: InlineKeyboard = [
        [btn('1', 'sale:qty:1'), btn('2', 'sale:qty:2'), btn('3', 'sale:qty:3')],
        [btn('4', 'sale:qty:4'), btn('5', 'sale:qty:5'), btn('10', 'sale:qty:10')],
        [btn('✏️ كمية أخرى', 'sale:custom_qty'), btn('↩️ رجوع', 'sale:back_to_search')],
    ];

    await sendMessage(
        chatId,
        `🛒 <b>بيع سريع — الخطوة 2/4</b>\n\nالمنتج: <b>${product.name}</b>\nالسعر: ${toNumber(product.baseSellingPrice).toLocaleString('ar-EG')} ج.م\nالمتاح: ${stock} قطعة\n\nاختر الكمية:`,
        qtyButtons
    );
}

async function handleQuantitySelection(chatId: number, quantity: number): Promise<void> {
    const state = getState(chatId) as SaleState;
    if (!state?.selectedProduct) return;

    if (quantity > state.selectedProduct.stock) {
        await sendMessage(
            chatId,
            `⚠️ <b>الكمية غير متاحة</b>\n\nالمنتج: ${state.selectedProduct.name}\nالمطلوب: ${quantity} قطعة\nالمتاح: ${state.selectedProduct.stock} قطعة فقط`,
            [
                [btn('✏️ تغيير الكمية', 'sale:custom_qty'), btn('🗑 حذف', 'sale:back_to_search')],
                navRow({ cancel: true }),
            ]
        );
        return;
    }

    addToCart(chatId, {
        productId: state.selectedProduct.id,
        name: state.selectedProduct.name,
        sku: state.selectedProduct.sku,
        quantity,
        unitPrice: state.selectedProduct.price,
        stock: state.selectedProduct.stock,
    });

    await sendCartReview(chatId);
}

async function sendCartReview(chatId: number): Promise<void> {
    const state = getState(chatId) as SaleState;
    if (!state) return;

    const summary = formatCartSummary(state);

    await sendMessage(chatId, summary, [
        [btn('➕ إضافة صنف', 'sale:add_more'), btn('🗑 حذف آخر', 'sale:remove_last')],
        [btn('✅ متابعة الدفع', 'sale:checkout'), btn('❌ إلغاء', 'cancel')],
    ]);
}

async function sendCustomerStep(chatId: number): Promise<void> {
    const state = getState(chatId) as SaleState;
    if (!state) return;

    const total = getCartTotal(state);

    await sendMessage(
        chatId,
        `🛒 <b>بيع سريع — الخطوة 3/4</b>\n\nالإجمالي: <b>${formatEGP(total)}</b>\n\nبيانات العميل (اختياري):\nاكتب اسم العميل للبحث:`,
        [
            [btn('👤 بدون عميل (كاش سريع)', 'sale:skip_customer')],
            navRow({ back: 'sale:back_to_cart', cancel: true }),
        ]
    );

    updateSaleState(chatId, { step: 'customer_search' });
}

async function searchCustomersForSale(chatId: number, query: string): Promise<void> {
    const customers = await searchCustomersForBot(query);

    const buttons: InlineKeyboard = customers.map(c => {
        const phoneStr = c.phone ? ` — ${c.phone}` : '';
        const balanceStr = toNumber(c.balance).toLocaleString('ar-EG');
        return [btn(`${c.name}${phoneStr} (رصيد: ${balanceStr})`, `sale:cust:${c.id}`)];
    });

    buttons.push([btn('➕ عميل جديد', 'sale:new_customer')]);
    buttons.push(navRow({ back: 'sale:checkout', cancel: true }));

    await sendMessage(chatId, `👥 <b>نتائج البحث:</b>`, buttons);
}

async function selectCustomer(chatId: number, customerId: string): Promise<void> {
    const prisma = getPrisma();
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    if (!customer) {
        await sendMessage(chatId, '⚠️ العميل غير موجود');
        return;
    }

    updateSaleState(chatId, {
        customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone || undefined,
            balance: toNumber(customer.balance),
        },
        step: 'payment',
    });

    await sendPaymentStep(chatId);
}

async function sendPaymentStep(chatId: number): Promise<void> {
    const state = getState(chatId) as SaleState;
    if (!state) return;

    const total = getCartTotal(state);
    const cartText = state.cart.map((item, i) => formatCartLine(item, i)).join('\n');

    let customerLine = '👤 بدون عميل';
    if (state.customer) {
        customerLine = `👤 العميل: ${state.customer.name}`;
        if (state.customer.balance > 0) {
            customerLine += `\n💰 الرصيد السابق: ${formatEGP(state.customer.balance)}`;
        }
    }

    await sendMessage(
        chatId,
        `🛒 <b>بيع سريع — الخطوة 4/4</b>\n\n📋 ملخص الطلب:\n━━━━━━━━━━━━━━━━━━━\n${customerLine}\n\n${cartText}\n━━━━━━━━━━━━━━━━━━━\nالإجمالي: <b>${formatEGP(total)}</b>\n\nاختر طريقة الدفع:`,
        [
            [btn('💵 كاش', 'sale:pay_cash'), btn('📱 انستاباي', 'sale:pay_instapay')],
            [btn('💳 آجل (ائتمان)', 'sale:pay_credit')],
            navRow({ back: 'sale:back_to_cart', cancel: true }),
        ]
    );
}

async function handlePaymentMethod(chatId: number, method: 'CASH' | 'INSTAPAY' | 'CREDIT'): Promise<void> {
    updateSaleState(chatId, { paymentMethod: method });

    const state = getState(chatId) as SaleState;
    const total = getCartTotal(state);

    if (method === 'CREDIT') {
        await handleAmountPaid(chatId, 0);
    } else {
        await sendMessage(
            chatId,
            `💵 الدفع ${method === 'CASH' ? 'كاش' : 'انستاباي'}\n\nالإجمالي: <b>${formatEGP(total)}</b>\n\nالمبلغ المدفوع:`,
            [
                [btn(`💰 المبلغ كامل (${formatEGP(total)})`, 'sale:pay_full')],
                [btn('✏️ مبلغ مختلف', 'sale:pay_custom')],
                navRow({ back: 'sale:checkout', cancel: true }),
            ]
        );
    }
}

async function handleAmountPaid(chatId: number, amount: number): Promise<void> {
    updateSaleState(chatId, { amountPaid: amount, step: 'confirm' });

    const state = getState(chatId) as SaleState;
    const total = getCartTotal(state);
    const balance = (state.customer?.balance || 0) + total - amount;

    const cartText = state.cart.map((item, i) => formatCartLine(item, i)).join('\n');

    const payMethodAr = (await import('./shared')).paymentMethodLabel(state.paymentMethod || 'CREDIT');

    let text = `📋 <b>تأكيد الفاتورة</b>\n\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n`;
    if (state.customer) text += `👤 العميل: ${state.customer.name}\n`;
    text += `\n${cartText}\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 الإجمالي: <b>${formatEGP(total)}</b>\n`;
    text += `💵 المدفوع: ${formatEGP(amount)}\n`;
    text += `💳 طريقة الدفع: ${payMethodAr}\n`;
    if (state.customer) text += `📊 الرصيد الجديد: ${formatEGP(balance)}\n`;

    await sendMessage(chatId, text, [
        [btn('✅ تأكيد وإصدار الفاتورة', 'sale:confirm_sale')],
        navRow({ back: 'sale:checkout', cancel: true }),
    ]);
}

async function processSaleFromBot(chatId: number): Promise<void> {
    const state = getState(chatId) as SaleState;
    if (!state || state.cart.length === 0) {
        await sendMessage(chatId, '⚠️ السلة فارغة');
        return;
    }

    await sendMessage(chatId, '⏳ جاري إصدار الفاتورة...');

    try {
        const { processSale } = await import('@/app/actions/sales');

        const items = state.cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
        }));

        const buyerInfo = state.customer ? {
            customerName: state.customer.name,
            customerPhone: state.customer.phone,
        } : undefined;

        const result = await processSale(
            items,
            state.paymentMethod || 'CASH',
            buyerInfo,
            undefined,
            undefined,
            state.amountPaid ?? getCartTotal(state),
            state.customer?.id
        );

        if (result.success && result.invoice) {
            await handleSuccessfulBotSale(chatId, state, result.invoice);
        } else {
            await sendMessage(chatId, `❌ فشل إصدار الفاتورة\n\n${result.error || 'خطأ غير معروف'}`, [
                [btn('🔄 إعادة المحاولة', 'sale:confirm_sale'), btn('🏠 القائمة', 'menu:main')],
            ]);
        }
    } catch (error: any) {
        await sendMessage(chatId, `❌ حدث خطأ في الاتصال\n\n${error.message || ''}`, [
            [btn('🔄 إعادة المحاولة', 'sale:confirm_sale'), btn('🏠 القائمة', 'menu:main')],
        ]);
    }
}

async function handleSuccessfulBotSale(chatId: number, state: SaleState, invoice: any): Promise<void> {
    const invoiceId = invoice.id;
    const shortId = invoiceId.slice(-4).toUpperCase();
    const total = toNumber(invoice.totalAmount);

    clearState(chatId);

    let successText = `✅ <b>تم إصدار الفاتورة بنجاح!</b>\n\n`;
    successText += `━━━━━━━━━━━━━━━━━━━\n`;
    successText += `📄 فاتورة رقم: #${shortId}\n`;
    successText += `📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}\n`;
    if (state.customer) successText += `👤 العميل: ${state.customer.name}\n`;
    successText += `💰 الإجمالي: ${formatEGP(total)}\n`;
    successText += `━━━━━━━━━━━━━━━━━━━\n`;

    await sendMessage(chatId, successText, [
        [btn('🛒 بيع جديد', 'sale:new_sale'), btn('🏠 القائمة', 'menu:main')],
    ]);

    try {
        const baseUrl = getAppUrl();
        if (baseUrl) {
            const pdfUrl = `${baseUrl}/api/invoices/${invoiceId}/pdf`;
            const pdfResponse = await fetch(pdfUrl);
            if (pdfResponse.ok) {
                const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
                await sendDocument(chatId, pdfBuffer, `invoice-${shortId}.pdf`, `📎 فاتورة #${shortId}`);
            }
        }
    } catch {
        // Not critical — sale was already processed
    }
}
