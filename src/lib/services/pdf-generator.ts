import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { toNumber } from '@/lib/utils/decimal';
import { tafqeet } from '@/lib/tafqeet';

/**
 * Force all digits to Western/English (0-9) instead of Arabic-Indic (٠-٩).
 */
function toEnglishDigits(str: string): string {
    return str
        .replace(/[\u0660-\u0669]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48))
        .replace(/[\u06F0-\u06F9]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48));
}

/**
 * Format a number with English digits, no Arabic locale conversion.
 */
function formatNum(n: number | string): string {
    return toEnglishDigits(Number(n).toLocaleString('en-US'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reverseArabicText(text: string): string {
    if (!text) return '';
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    if (!hasArabic) {
        return text;
    }

    const tokenRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[a-zA-Z0-9\-\.]+|\s+|./g;
    const tokens = text.match(tokenRegex) || [];

    const reversed = tokens.reverse().map(token => {
        if (token === '(') return ')';
        if (token === ')') return '(';
        if (token === '[') return ']';
        if (token === ']') return '[';
        if (token === '{') return '}';
        if (token === '}') return '{';
        if (token === '<') return '>';
        if (token === '>') return '<';
        return token;
    });

    return reversed.join('');
}

export async function generateInvoicePdfBuffer(invoice: any): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const fontPath = path.join(process.cwd(), 'public', 'Cairo-Regular.ttf');
        if (!fs.existsSync(fontPath)) {
            return reject(new Error(`Invoice PDF font missing: ${fontPath}`));
        }

        const logoPath = path.join(process.cwd(), 'public', 'stash-logo.png');
        const hasLogo = fs.existsSync(logoPath);

        const doc = new PDFDocument({
            margin: 40,
            size: 'A4',
            font: fontPath
        });
        doc.registerFont('ArabicFont', fontPath);
        doc.font('ArabicFont');

        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Colors — matching the HTML print page
        const COLOR_TEXT = '#111827';
        const COLOR_MUTED = '#6B7280';
        const COLOR_BORDER = '#D1D5DB';
        const COLOR_BG = '#F3F4F6';
        const COLOR_DARK = '#111827';

        const PAGE_WIDTH = 595.28;
        const MARGIN = 40;
        const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

        // --- Helper: draw text with forced English digits and RTL reversing ---
        const drawText = (text: string, x: number, y: number, opts: any = {}) => {
            doc.text(reverseArabicText(toEnglishDigits(text)), x, y, opts);
        };

        // --- HEADER SECTION ---
        let currentY = MARGIN;

        // === LEFT SIDE (RTL in HTML but left-aligned in layout flow): Meta Table ===
        const metaWidth = 170;
        const metaX = MARGIN; // Left side of the page
        const seqId = invoice.id ? parseInt(invoice.id.slice(-4), 16).toString() : '---';
        const dateObj = new Date(invoice.date);
        const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
        const empName = invoice.user?.name || invoice.user?.username || 'غير معروف';

        doc.lineWidth(1).strokeColor(COLOR_BORDER);

        const drawMetaRow = (y: number, label: string, value: string) => {
            // Label cell (right side within the table)
            doc.rect(metaX + 100, y, 70, 22).fillAndStroke(COLOR_BG, COLOR_BORDER);
            doc.fillColor(COLOR_TEXT).fontSize(10);
            drawText(label, metaX + 100, y + 6, { width: 70, align: 'center' });

            // Value cell (left side within the table)
            doc.rect(metaX, y, 100, 22).stroke();
            doc.fillColor(COLOR_TEXT).fontSize(10);
            drawText(value, metaX, y + 6, { width: 100, align: 'center' });
        };

        drawMetaRow(currentY, 'الرقم', seqId);
        drawMetaRow(currentY + 22, 'التاريخ', formattedDate);
        drawMetaRow(currentY + 44, 'المندوب', empName);

        // === CENTER: Title Box ===
        const titleBoxW = 130;
        const titleBoxX = PAGE_WIDTH / 2 - titleBoxW / 2;
        doc.lineWidth(3).strokeColor(COLOR_DARK)
            .roundedRect(titleBoxX, currentY + 10, titleBoxW, 34, 6).stroke();
        doc.fontSize(16).fillColor(COLOR_TEXT);
        drawText('فاتورة مبيعات', titleBoxX, currentY + 18, { width: titleBoxW, align: 'center' });

        // === RIGHT SIDE (RTL in HTML but right-aligned in layout flow): Logo & Company Name ===
        const logoSize = 60;
        const logoX = PAGE_WIDTH - MARGIN - logoSize; // Right side of the page
        if (hasLogo) {
            // Draw circular clipped logo
            doc.save();
            doc.circle(logoX + logoSize / 2, currentY + logoSize / 2, logoSize / 2).clip();
            doc.image(logoPath, logoX, currentY, { cover: [logoSize, logoSize], align: 'center', valign: 'center' });
            doc.restore();
        }
        doc.fillColor(COLOR_TEXT).fontSize(22);
        drawText('STASH', PAGE_WIDTH - MARGIN - 120, currentY + logoSize + 6, { width: 120, align: 'right' });

        currentY += 90;

        // Bottom border of header
        doc.lineWidth(2).strokeColor(COLOR_DARK)
            .moveTo(MARGIN, currentY).lineTo(PAGE_WIDTH - MARGIN, currentY).stroke();

        currentY += 15;

        // --- CUSTOMER INFO SECTION ---
        // Header bar
        doc.roundedRect(MARGIN, currentY, CONTENT_WIDTH, 26, 4).fillAndStroke(COLOR_BG, COLOR_BORDER);
        doc.fillColor(COLOR_TEXT).fontSize(13);
        drawText('بيانات العميل', MARGIN + 10, currentY + 7, { width: CONTENT_WIDTH - 20, align: 'right' });

        currentY += 26;

        // Customer info box
        doc.rect(MARGIN, currentY, CONTENT_WIDTH, 55).stroke();

        const custName = invoice.customer?.name || invoice.customerName || 'عميل نقدي';
        const custPhone = invoice.customer?.phone || invoice.customerPhone || '---';
        const custAddress = invoice.customer?.address || invoice.customerAddress || '---';
        const custCity = invoice.customer?.governorate || 'دمياط الجديدة';

        doc.fontSize(10).fillColor(COLOR_MUTED);
        // Row 1: Customer Name (right) + Phone (left)
        drawText('اسم العميل:', PAGE_WIDTH - MARGIN - 80, currentY + 8, { width: 70, align: 'right' });
        doc.fillColor(COLOR_TEXT).fontSize(11);
        drawText(custName, MARGIN + CONTENT_WIDTH / 2, currentY + 8, { width: CONTENT_WIDTH / 2 - 90, align: 'right' });

        doc.fillColor(COLOR_MUTED).fontSize(10);
        drawText('الهاتف:', MARGIN + CONTENT_WIDTH / 2 - 55, currentY + 8, { width: 45, align: 'right' });
        doc.fillColor(COLOR_TEXT).fontSize(11);
        drawText(custPhone, MARGIN + 10, currentY + 8, { width: CONTENT_WIDTH / 2 - 70, align: 'right' });

        // Row 2: Address (right) + City (left)
        doc.fillColor(COLOR_MUTED).fontSize(10);
        drawText('العنوان:', PAGE_WIDTH - MARGIN - 80, currentY + 30, { width: 70, align: 'right' });
        doc.fillColor(COLOR_TEXT).fontSize(11);
        drawText(custAddress, MARGIN + CONTENT_WIDTH / 2, currentY + 30, { width: CONTENT_WIDTH / 2 - 90, align: 'right' });

        doc.fillColor(COLOR_MUTED).fontSize(10);
        drawText('المدينة:', MARGIN + CONTENT_WIDTH / 2 - 55, currentY + 30, { width: 45, align: 'right' });
        doc.fillColor(COLOR_TEXT).fontSize(11);
        drawText(custCity, MARGIN + 10, currentY + 30, { width: CONTENT_WIDTH / 2 - 70, align: 'right' });

        currentY += 70;

        // --- LINE ITEMS TABLE ---
        const tableHeaderY = currentY;
        doc.lineWidth(2).strokeColor(COLOR_DARK);
        doc.rect(MARGIN, tableHeaderY, CONTENT_WIDTH, 25).fillAndStroke(COLOR_BG, COLOR_DARK);

        // Columns: RTL order (right-to-left): م | رقم الصنف | اسم الصنف | الوحدة | الكمية | السعر | القيمة
        // Widths adjusted to prevent SKU (رقم الصنف) wrapping
        const cols = [
            { width: 65,  title: 'القيمة',    align: 'center' },
            { width: 60,  title: 'السعر',     align: 'center' },
            { width: 35,  title: 'الكمية',    align: 'center' },
            { width: 40,  title: 'الوحدة',    align: 'center' },
            { width: CONTENT_WIDTH - 335, title: 'اسم الصنف', align: 'center' },
            { width: 110, title: 'رقم الصنف',  align: 'center' },
            { width: 25,  title: 'م',         align: 'center' }
        ];

        let startX = MARGIN;
        doc.fillColor(COLOR_TEXT).fontSize(10);
        doc.lineWidth(1).strokeColor(COLOR_DARK);

        // Draw header titles and vertical lines
        cols.forEach((col) => {
            drawText(col.title, startX, tableHeaderY + 7, { width: col.width, align: col.align as any });
            doc.moveTo(startX, tableHeaderY).lineTo(startX, tableHeaderY + 25).stroke();
            startX += col.width;
        });
        doc.moveTo(PAGE_WIDTH - MARGIN, tableHeaderY).lineTo(PAGE_WIDTH - MARGIN, tableHeaderY + 25).stroke();

        currentY += 25;

        // Rows
        const items = invoice.items || [];
        items.forEach((item: any, idx: number) => {
            const rowHeight = 25;
            // Alternate row background
            if (idx % 2 !== 0) {
                doc.rect(MARGIN, currentY, CONTENT_WIDTH, rowHeight).fill(COLOR_BG);
            }

            doc.fillColor(COLOR_TEXT).fontSize(10);

            let cx = MARGIN;

            // القيمة (Subtotal)
            const subtotal = toNumber(item.subtotal).toFixed(2);
            drawText(subtotal, cx, currentY + 7, { width: cols[0].width, align: 'center' });
            cx += cols[0].width;

            // السعر (Unit Price)
            const price = toNumber(item.unitPrice).toFixed(2);
            drawText(price, cx, currentY + 7, { width: cols[1].width, align: 'center' });
            cx += cols[1].width;

            // الكمية (Quantity)
            const qty = item.quantity.toString();
            drawText(qty, cx, currentY + 7, { width: cols[2].width, align: 'center' });
            cx += cols[2].width;

            // الوحدة (Unit)
            const unit = item.productUnit || 'قطعة';
            drawText(unit, cx, currentY + 7, { width: cols[3].width, align: 'center' });
            cx += cols[3].width;

            // اسم الصنف (Product Name)
            const name = item.productName || item.product?.name || '';
            drawText(name, cx, currentY + 7, { width: cols[4].width, align: 'center' });
            cx += cols[4].width;

            // رقم الصنف (Product Code / SKU)
            const sku = item.productCode || item.product?.sku || '---';
            doc.fontSize(8);
            drawText(sku, cx, currentY + 8, { width: cols[5].width, align: 'center' });
            doc.fontSize(10);
            cx += cols[5].width;

            // م (Index)
            const index = (idx + 1).toString();
            drawText(index, cx, currentY + 7, { width: cols[6].width, align: 'center' });

            // Draw row vertical lines
            let lx = MARGIN;
            doc.lineWidth(0.5).strokeColor(COLOR_BORDER);
            cols.forEach((col) => {
                doc.moveTo(lx, currentY).lineTo(lx, currentY + rowHeight).stroke();
                lx += col.width;
            });
            doc.moveTo(PAGE_WIDTH - MARGIN, currentY).lineTo(PAGE_WIDTH - MARGIN, currentY + rowHeight).stroke();

            // Draw row bottom line
            doc.moveTo(MARGIN, currentY + rowHeight).lineTo(PAGE_WIDTH - MARGIN, currentY + rowHeight).stroke();

            currentY += rowHeight;
        });

        currentY += 20;

        // --- FOOTER: TOTALS & FINANCIALS ---

        // Page break safety
        if (currentY > PAGE_WIDTH - 200) {
            doc.addPage();
            currentY = MARGIN;
        }

        // Layout: Left = Financial Statement, Right = Totals & Amount in words
        const finBoxWidth = 200;
        const finBoxX = MARGIN; // Left side of the page
        const rightBoxX = MARGIN + finBoxWidth + 20; // Right side of the page
        const rightBoxWidth = CONTENT_WIDTH - finBoxWidth - 20;

        // === RIGHT: الاجمالي العام ===
        doc.rect(rightBoxX, currentY, rightBoxWidth, 40).fillAndStroke(COLOR_BG, COLOR_BORDER);
        doc.fillColor(COLOR_TEXT).fontSize(14);
        drawText('الاجمالي العام', rightBoxX + rightBoxWidth - 120, currentY + 12, { width: 110, align: 'right' });

        // Total value box
        doc.rect(rightBoxX + 10, currentY + 8, 110, 24).fillAndStroke('#FFF', COLOR_BORDER);
        const grandTotal = toNumber(invoice.totalAmount).toFixed(2);
        doc.fillColor(COLOR_TEXT).fontSize(14);
        drawText(grandTotal, rightBoxX + 10, currentY + 12, { width: 110, align: 'center' });

        // Amount in words box
        const totalAmountNum = toNumber(invoice.totalAmount);
        const arabicAmount = tafqeet(totalAmountNum);

        doc.rect(rightBoxX, currentY + 60, rightBoxWidth, 40).stroke();
        // Title label overlap
        doc.rect(rightBoxX + rightBoxWidth - 90, currentY + 52, 80, 16).fill('#FFF');
        doc.fillColor(COLOR_MUTED).fontSize(10);
        drawText('المبلغ بالحروف', rightBoxX + rightBoxWidth - 90, currentY + 54, { width: 80, align: 'center' });

        doc.fillColor(COLOR_TEXT).fontSize(11);
        drawText(`فقط وقدره ( ${arabicAmount} ) لا غير.`, rightBoxX + 5, currentY + 72, { width: rightBoxWidth - 10, align: 'center' });

        // === LEFT: كشف الحساب ===
        doc.lineWidth(2).strokeColor(COLOR_DARK).rect(finBoxX, currentY, finBoxWidth, 100).stroke();

        // Header
        doc.rect(finBoxX, currentY, finBoxWidth, 20).fill(COLOR_DARK);
        doc.fillColor('#FFF').fontSize(12);
        drawText('كشف الحساب', finBoxX, currentY + 4, { width: finBoxWidth, align: 'center' });

        // Grid lines
        doc.lineWidth(0.5).strokeColor(COLOR_BORDER);
        doc.moveTo(finBoxX, currentY + 40).lineTo(finBoxX + finBoxWidth, currentY + 40).stroke();
        doc.moveTo(finBoxX, currentY + 60).lineTo(finBoxX + finBoxWidth, currentY + 60).stroke();
        doc.moveTo(finBoxX, currentY + 80).lineTo(finBoxX + finBoxWidth, currentY + 80).stroke();
        doc.moveTo(finBoxX + finBoxWidth / 2, currentY + 20).lineTo(finBoxX + finBoxWidth / 2, currentY + 100).stroke();

        const drawFinRow = (y: number, label: string, value: string, bgLabel: string, valColor: string) => {
            doc.rect(finBoxX + finBoxWidth / 2, y, finBoxWidth / 2, 20).fill(bgLabel);
            doc.fillColor(COLOR_TEXT).fontSize(10);
            drawText(label, finBoxX + finBoxWidth / 2 + 5, y + 5, { width: finBoxWidth / 2 - 10, align: 'right' });
            doc.fillColor(valColor).fontSize(10);
            drawText(value, finBoxX, y + 5, { width: finBoxWidth / 2, align: 'center' });
        };

        const prevBal = formatNum(invoice.previousBalance || 0);
        const finTotal = formatNum(invoice.totalAmount || 0);
        const amountPaid = formatNum(invoice.amountPaid || 0);
        const currBal = formatNum(invoice.currentBalance || 0);

        drawFinRow(currentY + 20, 'الرصيد السابق', prevBal, COLOR_BG, COLOR_TEXT);
        drawFinRow(currentY + 40, 'قيمة الفاتورة', finTotal, COLOR_BG, '#1D4ED8');
        drawFinRow(currentY + 60, invoice.paymentMethod === 'CREDIT' ? 'المدفوع (آجل)' : 'المدفوع (نقداً)', amountPaid, COLOR_BG, '#15803D');
        drawFinRow(currentY + 80, 'الرصيد المتبقي', currBal, '#E5E7EB', '#DC2626');

        currentY += 140;

        // --- SIGNATURES ---
        doc.fillColor(COLOR_MUTED).fontSize(12);

        doc.undash();
        // Both signature lines dashed to match HTML print page
        doc.moveTo(MARGIN + 40, currentY).lineTo(MARGIN + 160, currentY).dash(5, { space: 5 }).strokeColor(COLOR_MUTED).stroke();
        drawText('توقيع المسئول', MARGIN + 40, currentY + 10, { width: 120, align: 'center' });

        doc.moveTo(PAGE_WIDTH - MARGIN - 160, currentY).lineTo(PAGE_WIDTH - MARGIN - 40, currentY).dash(5, { space: 5 }).stroke();
        drawText('توقيع المستلم', PAGE_WIDTH - MARGIN - 160, currentY + 10, { width: 120, align: 'center' });

        doc.end();
    });
}
