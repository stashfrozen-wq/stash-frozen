/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendMessage, sendDocument, btn, navRow, type InlineKeyboard } from '../telegram';
import { startInvoiceSearchFlow } from '../telegram-state';
import { toNumber, paymentMethodLabel, getAppUrl } from './shared';
import getPrisma from '@/lib/prisma';

export async function startInvoiceLookup(chatId: number): Promise<void> {
    startInvoiceSearchFlow(chatId);

    await sendMessage(
        chatId,
        '📋 <b>بحث عن فاتورة</b>\n\nاكتب رقم الفاتورة أو اسم العميل:',
        [
            [btn('📅 آخر 5 فواتير', 'inv:recent')],
            navRow({ cancel: true }),
        ]
    );
}

export async function handleInvoiceTextInput(chatId: number, text: string): Promise<void> {
    const prisma = getPrisma();

    const invoices = await prisma.invoice.findMany({
        where: {
            status: 'ACCEPTED',
            OR: [
                { id: { contains: text, mode: 'insensitive' } },
                { customerName: { contains: text, mode: 'insensitive' } },
            ],
        },
        take: 5,
        orderBy: { date: 'desc' },
        include: { items: { include: { product: true } } },
    });

    if (invoices.length === 0) {
        await sendMessage(chatId, `🔍 لم يتم العثور على نتائج لـ "${text}"`, [
            [btn('📅 آخر 5 فواتير', 'inv:recent')],
            navRow({ home: true }),
        ]);
        return;
    }

    await sendInvoiceList(chatId, invoices);
}

export async function handleInvoiceCallback(chatId: number, value: string): Promise<void> {
    if (value === 'recent') {
        const prisma = getPrisma();
        const invoices = await prisma.invoice.findMany({
            where: { status: 'ACCEPTED' },
            take: 5,
            orderBy: { date: 'desc' },
            include: { items: { include: { product: true } } },
        });
        await sendInvoiceList(chatId, invoices);
    } else if (value.startsWith('view:')) {
        await sendInvoiceDetail(chatId, value.substring(5));
    } else if (value.startsWith('pdf:')) {
        await sendInvoicePdf(chatId, value.substring(4));
    }
}

async function sendInvoiceList(chatId: number, invoices: any[]): Promise<void> {
    const lines = invoices.map((inv, i) => {
        const shortId = inv.id.slice(-4).toUpperCase();
        const customer = inv.customerName || 'بدون عميل';
        const total = toNumber(inv.totalAmount).toLocaleString('ar-EG');
        const date = new Date(inv.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
        return `${i + 1}. #${shortId} — ${customer} — ${total} ج.م — ${date}`;
    });

    const buttons: InlineKeyboard = invoices.map(inv => {
        const shortId = inv.id.slice(-4).toUpperCase();
        return [btn(`#${shortId}`, `inv:view:${inv.id}`)];
    });

    const mergedButtons: InlineKeyboard = [];
    for (let i = 0; i < buttons.length; i += 3) {
        mergedButtons.push(buttons.slice(i, i + 3).map(row => row[0]));
    }
    mergedButtons.push(navRow({ home: true }));

    await sendMessage(chatId, `📋 <b>الفواتير:</b>\n\n${lines.join('\n')}`, mergedButtons);
}

async function sendInvoiceDetail(chatId: number, invoiceId: string): Promise<void> {
    const prisma = getPrisma();
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            items: { include: { product: true } },
            user: { select: { name: true, username: true } },
        },
    });

    if (!invoice) {
        await sendMessage(chatId, '⚠️ الفاتورة غير موجودة', [navRow({ home: true })]);
        return;
    }

    const shortId = invoice.id.slice(-4).toUpperCase();
    const date = new Date(invoice.date).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const itemLines = invoice.items.map((item, i) =>
        `${i + 1}. ${item.product.name} × ${toNumber(item.quantity)} — ${toNumber(item.subtotal).toLocaleString('ar-EG')} ج.م`
    ).join('\n');

    const payMethodAr = paymentMethodLabel(invoice.paymentMethod);
    const seller = invoice.user?.name || invoice.user?.username || 'N/A';

    let text = `📄 <b>فاتورة #${shortId}</b>\n\n`;
    text += `📅 ${date}\n`;
    text += `👤 العميل: ${invoice.customerName || 'بدون عميل'}\n`;
    text += `👷 البائع: ${seller}\n`;
    text += `\n━━━━━━━━━━━━━━━━━━━\n`;
    text += `${itemLines}\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 الإجمالي: <b>${toNumber(invoice.totalAmount).toLocaleString('ar-EG')} ج.م</b>\n`;
    text += `💵 المدفوع: ${toNumber(invoice.amountPaid).toLocaleString('ar-EG')} ج.م\n`;
    text += `💳 طريقة الدفع: ${payMethodAr}\n`;

    if (toNumber(invoice.currentBalance) > 0) {
        text += `📊 الرصيد: ${toNumber(invoice.currentBalance).toLocaleString('ar-EG')} ج.م\n`;
    }

    await sendMessage(chatId, text, [
        [btn('📎 تحميل PDF', `inv:pdf:${invoiceId}`)],
        navRow({ back: 'inv:recent', home: true }),
    ]);
}

async function sendInvoicePdf(chatId: number, invoiceId: string): Promise<void> {
    try {
        await sendMessage(chatId, '⏳ جاري إنشاء ملف PDF...');

        const baseUrl = getAppUrl();
        if (!baseUrl) {
            await sendMessage(chatId, '⚠️ لم يتم تكوين عنوان التطبيق (APP_URL)');
            return;
        }

        const pdfUrl = `${baseUrl}/api/invoices/${invoiceId}/pdf`;
        const response = await fetch(pdfUrl);

        if (!response.ok) {
            await sendMessage(chatId, '❌ فشل إنشاء ملف PDF');
            return;
        }

        const pdfBuffer = Buffer.from(await response.arrayBuffer());
        const shortId = invoiceId.slice(-4).toUpperCase();
        await sendDocument(chatId, pdfBuffer, `invoice-${shortId}.pdf`, `📎 فاتورة #${shortId}`);
    } catch {
        await sendMessage(chatId, '❌ حدث خطأ أثناء إنشاء ملف PDF');
    }
}
