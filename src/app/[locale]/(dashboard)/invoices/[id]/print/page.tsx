/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable sonarjs/no-unused-vars */
/* eslint-disable sonarjs/no-dead-store */
  
  
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Invoice } from '../../types';
import { getInvoiceById } from '@/app/actions/invoices';
import { Loader2, Printer, Settings2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { tafqeet } from '@/lib/tafqeet';

export default function InvoicePrintPage() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(true);

    // Editable Data States
    const [warehouseName, setWarehouseName] = useState("المخزن الرئيسي");
    const [city, setCity] = useState("دمياط الجديدة");
    const [category, setCategory] = useState("عاملين");
    const [phone1, setPhone1] = useState("");
    const [phone2, setPhone2] = useState("");
    const [sequenceId, setSequenceId] = useState("");
    const [customerCode, setCustomerCode] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [employeeName, setEmployeeName] = useState("");
    const [address, setAddress] = useState("");
    const [customerName, setCustomerName] = useState("");

    // Table Column Toggles
    const [showItemCode, setShowItemCode] = useState(true);
    const [showUnit, setShowUnit] = useState(true);
    const [showDiscountPercent, setShowDiscountPercent] = useState(false);
    const [showDiscountValue, setShowDiscountValue] = useState(false);

    // Field Toggles
    const [showWarehouse, setShowWarehouse] = useState(false);
    const [showCustomerCode, setShowCustomerCode] = useState(false);
    const [showCity, setShowCity] = useState(true);
    const [showCategory, setShowCategory] = useState(false);
    const [showAddress, setShowAddress] = useState(true);
    const [showPhone1, setShowPhone1] = useState(true);
    const [showPhone2, setShowPhone2] = useState(false);

    useEffect(() => {
        if (id) {
            getInvoiceById(id as string).then(data => {
                setInvoice(data as Invoice | null);
                if (data) {
                    setSequenceId(parseInt(data.id.slice(-4), 16).toString());
                    setCustomerCode("01/1/3/" + parseInt(data.id.slice(0, 3), 16));
                    setEmployeeName(data.user?.name || data.user?.username || "غير معروف");
                    setEmployeeId(data.user?.id ? parseInt(data.user.id.slice(0, 2), 16).toString() : "0");
                    setAddress(data.customer?.address || data.customerAddress || "");
                    setPhone1(data.customer?.phone || data.customerPhone || "");
                    setCustomerName(data.customer?.name || data.customerName || "عميل نقدي");
                    if (data.customer?.governorate) {
                        setCity(data.customer.governorate);
                    }
                }
                setLoading(false);
            });
        }
    }, [id]);

    const toggleSettings = useCallback(() => setShowSettings(prev => !prev), []);
    const handlePrint = useCallback(() => window.print(), []);

    const handleCustomerNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerName(e.target.value);
    }, []);

    const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCity(e.target.value);
    }, []);

    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(e.target.value);
    }, []);

    const handlePhone1Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone1(e.target.value);
    }, []);

    const handleEmployeeNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEmployeeName(e.target.value);
    }, []);

    const handleWarehouseNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setWarehouseName(e.target.value);
    }, []);

    const handleShowCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setShowCity(e.target.checked);
    }, []);

    const handleShowAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setShowAddress(e.target.checked);
    }, []);

    const handleShowPhone1Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setShowPhone1(e.target.checked);
    }, []);

    const handleShowItemCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setShowItemCode(e.target.checked);
    }, []);

    const handleShowUnitChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setShowUnit(e.target.checked);
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4 text-blue-600">
                    <Loader2 className="animate-spin" size={40} />
                    <p className="font-bold">جاري تحميل الفاتورة...</p>
                </div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="bg-white p-10 rounded-2xl shadow-xl text-center">
                    <p className="font-bold text-red-500 text-xl mb-2">الفاتورة غير موجودة</p>
                    <p className="text-gray-500">تأكد من الرابط وحاول مرة أخرى.</p>
                </div>
            </div>
        );
    }

    const dateObj = new Date(invoice.date);
    const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row print:block" dir="rtl" data-print-invoice-wrapper>
            {/* Print Styles Injection */}
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Hide dashboard layout chrome */
                    header, footer, nav, aside { display: none !important; }
                    .print-hidden { display: none !important; }
                    
                    /* Reset ALL ancestor containers from root down to the invoice */
                    body > div,
                    #__next,
                    #__next > div,
                    #__next > div > div,
                    #__next > div > div > div,
                    main,
                    main > div {
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: none !important;
                        min-height: auto !important;
                        position: static !important;
                        background: white !important;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    
                    /* The print page wrapper */
                    [data-print-invoice-wrapper] {
                        display: block !important;
                        min-height: auto !important;
                        background: white !important;
                        padding: 0 !important;
                    }
                    
                    /* The scrollable area around the paper */
                    [data-print-paper-area] {
                        padding: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                    
                    /* The A4 paper itself */
                    [data-print-paper] {
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                        max-width: 100% !important;
                        width: 100% !important;
                        min-height: auto !important;
                    }
                    
                    /* Force footer totals to display side by side */
                    [data-print-footer] {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 1.5rem !important;
                    }
                    
                    /* Force financial box width */
                    [data-print-financials] {
                        width: 18rem !important;
                        flex-shrink: 0 !important;
                    }
                    
                    /* Force customer info grid to be multi-column */
                    [data-print-customer-grid] {
                        display: grid !important;
                        grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
                    }
                    [data-print-col-6] { grid-column: span 6 / span 6 !important; }
                    [data-print-col-3] { grid-column: span 3 / span 3 !important; }
                    
                    /* Preserve background colors */
                    [data-print-paper] * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* --- SETTINGS SIDEBAR (Hidden on Print) --- */}
            <div className={`print-hidden bg-white border-l border-gray-200 shadow-xl transition-all duration-300 flex flex-col z-10 ${showSettings ? 'w-full md:w-80 h-auto md:h-screen sticky top-0' : 'w-full md:w-16 h-auto md:h-screen sticky top-0'}`}>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                    {showSettings && <h2 className="font-bold text-blue-900 flex items-center gap-2"><Settings2 size={18} /> إعدادات الطباعة</h2>}
                    <button 
                        onClick={toggleSettings} 
                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors mx-auto md:mx-0"
                        title={showSettings ? "إخفاء" : "إظهار"}
                    >
                        {showSettings ? <X size={20} className="hidden md:block" /> : <Settings2 size={20} />}
                        <span className="md:hidden text-sm font-bold flex items-center gap-1">
                            {showSettings ? <ChevronUp size={16}/> : <ChevronDown size={16}/>} 
                            {showSettings ? 'إخفاء الإعدادات' : 'إظهار الإعدادات'}
                        </span>
                    </button>
                </div>

                {showSettings && (
                    <div className="p-5 overflow-y-auto flex-1 space-y-4">


                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">بيانات العميل</h3>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">اسم العميل</label>
                                    <input type="text" value={customerName} onChange={handleCustomerNameChange} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            {/* Customer Code Field Hidden */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex gap-2 items-center">
                                    <input type="checkbox" checked={showCity} onChange={handleShowCityChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" title="عرض" />
                                    <div className="flex-1 min-w-0">
                                        <label className="block text-xs font-medium text-gray-700 mb-1 truncate">المدينة</label>
                                        <input type="text" value={city} onChange={handleCityChange} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                                {/* Category Field Hidden */}
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="checkbox" checked={showAddress} onChange={handleShowAddressChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" title="عرض" />
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">العنوان</label>
                                    <input type="text" value={address} onChange={handleAddressChange} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="checkbox" checked={showPhone1} onChange={handleShowPhone1Change} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" title="عرض" />
                                <div className="flex-1 min-w-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1 truncate">الهاتف</label>
                                    <input type="text" value={phone1} onChange={handlePhone1Change} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">بيانات المندوب</h3>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">اسم المندوب</label>
                                <input type="text" value={employeeName} onChange={handleEmployeeNameChange} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">إعدادات الجدول</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                                    <input type="checkbox" checked={showItemCode} onChange={handleShowItemCodeChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                    <span>رقم الصنف</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                                    <input type="checkbox" checked={showUnit} onChange={handleShowUnitChange} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                    <span>الوحدة</span>
                                </label>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-6 pb-8">
                            <button
                                onClick={handlePrint}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all flex justify-center items-center gap-2"
                            >
                                <Printer size={20} />
                                <span>طباعة الفاتورة</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- INVOICE PAPER --- */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto" data-print-paper-area>
                <div className="max-w-[210mm] mx-auto bg-white print-shadow-none shadow-2xl rounded-sm p-[10mm] min-h-[297mm] border border-gray-200 text-black" data-print-paper>
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 border-b-2 border-gray-900 pb-6">
                        {/* Company Logo / Name Area */}
                        <div className="flex-1 flex flex-col items-start">
                            <div className="w-[74px] h-[74px] mb-2 flex items-center justify-start rounded-full overflow-hidden">
                                <Image src="/stash-logo.png" alt="STASH Logo" width={74} height={74} className="w-full h-full object-cover" priority />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">STASH</h1>
                            <div className="mt-4 flex items-center gap-2">
                                {showWarehouse && (
                                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded font-bold text-sm border border-gray-200">
                                        المستودع: {warehouseName}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Title */}
                        <div className="flex-1 text-center flex flex-col items-center justify-center">
                            <div className="border-4 border-gray-900 px-6 py-2 uppercase tracking-widest text-xl font-black rounded-lg transform -rotate-2">
                                فاتورة مبيعات
                            </div>
                        </div>

                        {/* Invoice Meta */}
                        <div className="flex-1 flex justify-end">
                            {/* eslint-disable-next-line sonarjs/table-header */}
                            <table className="text-sm border-collapse border border-gray-300 font-medium bg-gray-50">
                                <tbody>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-1 bg-gray-100 text-gray-700 font-bold text-center">الرقم</td>
                                        <td className="border border-gray-300 px-3 py-1 text-center font-bold text-lg">{sequenceId}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-1 bg-gray-100 text-gray-700 font-bold text-center">التاريخ</td>
                                        <td className="border border-gray-300 px-3 py-1 text-center">{formattedDate}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-gray-300 px-3 py-1 bg-gray-100 text-gray-700 font-bold text-center">المندوب</td>
                                        <td className="border border-gray-300 px-3 py-1 text-center">
                                            <span className="font-bold">{employeeName}</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Customer Info Section */}
                    <div className="mb-6 rounded-lg border border-gray-300 overflow-hidden bg-gray-50/50">
                        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 font-bold text-gray-800 flex items-center justify-between">
                            <span>بيانات العميل</span>
                            {showCustomerCode && <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200">{customerCode}</span>}
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-12 gap-y-3 gap-x-4 text-sm" data-print-customer-grid>
                                <div className="col-span-12 md:col-span-6 flex gap-2" data-print-col-6>
                                    <span className="font-bold text-gray-600 w-20 shrink-0">اسم العميل:</span>
                                    <span className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1">{customerName}</span>
                                </div>
                                {showCity && (
                                    <div className="col-span-12 md:col-span-3 flex gap-2" data-print-col-3>
                                        <span className="font-bold text-gray-600 w-16 shrink-0">المدينة:</span>
                                        <span className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1">{city}</span>
                                    </div>
                                )}
                                {showCategory && (
                                    <div className="col-span-12 md:col-span-3 flex gap-2" data-print-col-3>
                                        <span className="font-bold text-gray-600 w-12 shrink-0">الفئة:</span>
                                        <span className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1">{category}</span>
                                    </div>
                                )}

                                {showAddress && (
                                    <div className="col-span-12 md:col-span-6 flex gap-2" data-print-col-6>
                                        <span className="font-bold text-gray-600 w-20 shrink-0">العنوان:</span>
                                        <span className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1">{address}</span>
                                    </div>
                                )}
                                {showPhone1 && (
                                    <div className="col-span-12 md:col-span-3 flex gap-2" data-print-col-3>
                                        <span className="font-bold text-gray-600 w-16 shrink-0">هاتف 1:</span>
                                        <span className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1">{phone1}</span>
                                    </div>
                                )}
                                {showPhone2 && (
                                    <div className="col-span-12 md:col-span-3 flex gap-2" data-print-col-3>
                                        <span className="font-bold text-gray-600 w-12 shrink-0">هاتف 2:</span>
                                        <span className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1">{phone2}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="min-h-[200px]">
                        <table className="w-full border-collapse border-2 border-gray-900 text-sm">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-900 text-gray-800">
                                    <th className="border-l border-gray-300 py-2 w-10 text-center">م</th>
                                    {showItemCode && <th className="border-l border-gray-300 py-2 w-24 text-center">رقم الصنف</th>}
                                    <th className="border-l border-gray-300 py-2 px-3 text-center">اسم الصنف</th>
                                    {showUnit && <th className="border-l border-gray-300 py-2 w-16 text-center">الوحدة</th>}
                                    <th className="border-l border-gray-300 py-2 w-16 text-center">الكمية</th>
                                    <th className="border-l border-gray-300 py-2 w-20 text-center">السعر</th>
                                    {showDiscountPercent && <th className="border-l border-gray-300 py-2 w-16 text-center">ن الخصم</th>}
                                    {showDiscountValue && <th className="border-l border-gray-300 py-2 w-16 text-center">ق الخصم</th>}
                                    <th className="py-2 w-24 text-center font-bold">القيمة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items?.map((item, idx: number) => {
                                    const printItem = item as { productCode?: string; product?: { sku?: string; name?: string }; productName?: string; productUnit?: string; quantity: number; unitPrice: number; subtotal: number };
                                    return (
                                        <tr key={idx} className="border-b border-gray-300 even:bg-gray-50/50">
                                            <td className="border-l border-gray-300 py-2 text-center text-gray-500 font-medium">{idx + 1}</td>
                                            {showItemCode && <td className="border-l border-gray-300 py-2 text-center font-mono text-gray-600">{printItem.productCode || printItem.product?.sku || '---'}</td>}
                                            <td className="border-l border-gray-300 py-2 px-3 font-bold text-gray-900 text-center">{printItem.productName || printItem.product?.name}</td>
                                            {showUnit && <td className="border-l border-gray-300 py-2 text-center text-gray-600">{printItem.productUnit || 'قطعة'}</td>}
                                            <td className="border-l border-gray-300 py-2 text-center font-bold">{printItem.quantity}</td>
                                            <td className="border-l border-gray-300 py-2 text-center font-medium">{printItem.unitPrice.toFixed(2)}</td>
                                            {showDiscountPercent && <td className="border-l border-gray-300 py-2 text-center text-gray-400">-</td>}
                                            {showDiscountValue && <td className="border-l border-gray-300 py-2 text-center text-gray-400">-</td>}
                                            <td className="py-2 text-center font-bold text-gray-900 bg-gray-50/80">{printItem.subtotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Totals & Financials */}
                    <div className="mt-6 flex flex-col md:flex-row gap-6" data-print-footer>
                        {/* Summary & Word Amount */}
                        <div className="flex-1 flex flex-col justify-between space-y-4">
                            <div className="flex gap-6 items-center bg-gray-50 border border-gray-300 p-3 rounded-lg">
                                <div className="flex-1 flex items-center justify-between">
                                    <span className="font-bold text-gray-700">الإجمالي العام</span>
                                    <span className="font-black text-2xl text-gray-900 bg-white px-3 py-1 rounded border border-gray-200">
                                        {invoice.totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="border border-gray-800 p-3 text-center rounded bg-white relative">
                                <span className="absolute -top-3 right-4 bg-white px-2 text-xs font-bold text-gray-500">المبلغ بالحروف</span>
                                <p className="font-bold text-gray-900 text-lg leading-relaxed">
                                    فقط وقدره ( {tafqeet(Number(invoice.totalAmount))} ) لا غير.
                                </p>
                            </div>
                        </div>

                        {/* Financial Balances */}
                        <div className="w-full md:w-72 border-2 border-gray-900 rounded-lg overflow-hidden bg-white" data-print-financials>
                            <div className="bg-gray-900 text-white text-center py-1 font-bold text-sm tracking-widest">
                                كشف الحساب
                            </div>
                            <div className="grid grid-cols-2 text-sm divide-x divide-x-reverse divide-gray-200">
                                <div className="bg-gray-100 p-2 font-bold text-gray-700">الرصيد السابق</div>
                                <div className="p-2 font-black text-center">{Number(invoice.previousBalance || 0).toLocaleString('en-US')}</div>

                                <div className="bg-gray-100 p-2 font-bold text-gray-700 border-t border-gray-200">قيمة الفاتورة</div>
                                <div className="p-2 font-black text-center border-t border-gray-200 text-blue-700">{Number(invoice.totalAmount).toLocaleString('en-US')}</div>

                                <div className="bg-gray-100 p-2 font-bold text-gray-700 border-t border-gray-200 flex flex-col justify-center">
                                    <span>المدفوع</span>
                                    <span className="text-[10px] font-normal text-gray-500">{invoice.paymentMethod === 'CREDIT' ? 'آجل' : 'نقداً'}</span>
                                </div>
                                <div className="p-2 font-black text-center border-t border-gray-200 text-green-600 flex items-center justify-center">
                                    {Number(invoice.amountPaid || 0).toLocaleString('en-US')}
                                </div>

                                <div className="bg-gray-200 p-2 font-black text-gray-900 border-t border-gray-300">الرصيد المتبقي</div>
                                <div className="p-2 font-black text-center text-xl border-t border-gray-300 bg-gray-50 text-red-600">
                                    {Number(invoice.currentBalance || 0).toLocaleString('en-US')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-12 flex justify-between px-16 text-lg font-bold">
                        <div className="text-center w-40 flex flex-col items-center">
                            <div className="h-12 border-b-2 border-dashed border-gray-400 w-full mb-2"></div>
                            <span className="text-gray-600 text-sm">توقيع المستلم</span>
                        </div>
                        <div className="text-center w-40 flex flex-col items-center">
                            <div className="h-12 border-b-2 border-dashed border-gray-400 w-full mb-2"></div>
                            <span className="text-gray-600 text-sm">توقيع المسئول</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

