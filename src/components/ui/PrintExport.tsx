'use client';

/**
 * Shared utility to print/export HTML content as PDF.
 * Opens a new window, writes content with styles, and triggers print dialog.
 */
export const printElement = (title: string, contentId: string, extraHeader?: string, locale: string = 'ar') => {
    const element = document.getElementById(contentId);
    if (!element) return;

    const printContent = element.innerHTML;
    const printWindow = window.open('', '_blank');
    const isRtl = locale === 'ar';

    if (printWindow) {
        printWindow.document.write(`
            <html dir="${isRtl ? 'rtl' : 'ltr'}">
            <head>
                <title>${title}</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 40px; 
                        color: #333; 
                        direction: ${isRtl ? 'rtl' : 'ltr'};
                    }
                    h1 { font-size: 24px; color: #111; margin-bottom: 5px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .print-header { margin-bottom: 30px; }
                    .print-header p { margin: 5px 0; font-size: 14px; color: #666; }
                    
                    /* Table Styles */
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: ${isRtl ? 'right' : 'left'}; }
                    th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 11px; }
                    tr:nth-child(even) { background-color: #fcfcfc; }
                    
                    /* Utility classes for print */
                    .text-right { text-align: ${isRtl ? 'left' : 'right'}; }
                    .text-left { text-align: ${isRtl ? 'right' : 'left'}; }
                    .font-bold { font-weight: bold; }
                    .text-lg { font-size: 16px; }
                    .text-sm { font-size: 12px; }
                    .uppercase { text-transform: uppercase; }
                    
                    /* Hide non-print elements if they accidentally leaked */
                    button, .no-print { display: none !important; }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <h1>${title}</h1>
                    <p>${isRtl ? 'تم الإنشاء في' : 'Generated'}: ${new Date().toLocaleString(locale)}</p>
                    ${extraHeader || ''}
                </div>
                ${printContent}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
};
