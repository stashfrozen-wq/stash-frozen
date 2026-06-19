/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable sonarjs/unused-import */
/* eslint-disable sonarjs/no-unused-vars */
/* eslint-disable sonarjs/no-dead-store */


/* eslint-disable sonarjs/pseudo-random */
/* eslint-disable sonarjs/no-nested-functions */
'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useDeferredValue } from 'react';
import { Search, Loader2, Settings2, X, ChevronDown, ChevronUp, Download, Check, Plus, AlertCircle, Zap } from 'lucide-react';
import Image from 'next/image';
import { getProducts, processSale, getStaffList } from '@/app/actions/sales';
import QuickWizard from '@/components/sales/QuickWizard';
import { searchCustomers } from '@/app/actions/customers';
import { getCurrentUser } from '@/app/actions/auth';
import { getInvoiceForEdit } from '@/app/actions/reviews';
import clsx from 'clsx';
import { useTranslations, useLocale } from 'next-intl';
import { tafqeet } from '@/lib/tafqeet';

interface Product {
    id: string;
    name: string;
    sku: string;
    baseSellingPrice: number;
    categoryId: string;
    stock: number;
}

interface CartItem {
    id: string;
    product: Product;
    nameOverride: string;
    unitOverride: string;
    codeOverride: string;
    quantity: number;
    priceOverride: number;
    discountPercent: number | '';
    discountValue: number | '';
}

interface Staff {
    id: string;
    name: string | null;
    username: string;
}

interface CustomerSearch {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    type: string;
    balance?: number;
    governorate?: string | null;
}

type PaymentMethodType = 'CASH' | 'CREDIT' | 'INSTAPAY';

const loadSavedDefaults = () => {
    if (typeof window === 'undefined') return null;
    const savedDefaults = localStorage.getItem('sales_print_defaults');
    if (!savedDefaults) return null;
    try {
        return JSON.parse(savedDefaults);
    } catch (e) {
        console.error("Failed to parse sales_print_defaults", e);
        return null;
    }
};

const loadAutocompleteHistory = () => {
    if (typeof window === 'undefined') return null;
    const savedHistory = localStorage.getItem('sales_autocomplete_history');
    if (!savedHistory) return null;
    try {
        return JSON.parse(savedHistory);
    } catch (e) {
        console.error("Failed to parse sales_autocomplete_history", e);
        return null;
    }
};

export default function SalesPage() {
    const locale = useLocale();

    const [loading, setLoading] = useState(true);
    const [checkoutMode, setCheckoutMode] = useState<'standard' | 'quick'>('standard');

    // Automatically set checkoutMode to quick on mobile and tablet viewports
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setCheckoutMode('quick');
        }
    }, []);

    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showSettings, setShowSettings] = useState(true);
    const [pendingReviewNotice, setPendingReviewNotice] = useState(false);
    const [editFromInvoiceId, setEditFromInvoiceId] = useState<string | null>(null);
    const [editFromStaffName, setEditFromStaffName] = useState<string | null>(null);

    // Sidebar Toggles
    const [showWarehouse, setShowWarehouse] = useState(false);
    const [showCustomerCode, setShowCustomerCode] = useState(false);
    const [showCity, setShowCity] = useState(true);
    const [showAddress, setShowAddress] = useState(true);
    const [showPhone1, setShowPhone1] = useState(true);
    const [showPhone2, setShowPhone2] = useState(false);
    const [showItemCode, setShowItemCode] = useState(true);
    const [showUnit, setShowUnit] = useState(true);
    const [showDiscountPercent, setShowDiscountPercent] = useState(false);
    const [showDiscountValue, setShowDiscountValue] = useState(false);

    // Sidebar Editable Info
    const [sequenceId, setSequenceId] = useState("");
    useEffect(() => {
        setSequenceId(Math.floor(100000 + Math.random() * 900000).toString());
    }, []);
    const [warehouseName, setWarehouseName] = useState("");
    
    // Customer Info
    const [customerName, setCustomerName] = useState("");
    const [customerCode, setCustomerCode] = useState("");

    // Autocomplete History
    const [history, setHistory] = useState<Record<string, string[]>>({});
    const [city, setCity] = useState("دمياط الجديدة");
    const [address, setAddress] = useState("");
    const [phone1, setPhone1] = useState("");
    const [phone2, setPhone2] = useState("");

    // Customer Search State
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<CustomerSearch[]>([]);
    const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
    const customerSearchRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const productSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Employee Info
    const [employeeName, setEmployeeName] = useState("");
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');

    // Cart Items & Product Search
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const productSearchRef = useRef<HTMLTableCellElement>(null);
    
    // Payment info
    const [previousBalance, setPreviousBalance] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('CASH');
    const [amountPaid, setAmountPaid] = useState<number | ''>(0);

    // Date
    const formattedDate = new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    useEffect(() => {
        setCustomerCode(Math.floor(10000 + Math.random() * 90000).toString());

        const d = loadSavedDefaults();
        if (d) {
            if (d.warehouseName !== undefined) setWarehouseName(d.warehouseName);
            if (d.showCity !== undefined) setShowCity(d.showCity);
            if (d.showAddress !== undefined) setShowAddress(d.showAddress);
            if (d.showPhone1 !== undefined) setShowPhone1(d.showPhone1);
            setShowPhone2(false); 
            if (d.showItemCode !== undefined) setShowItemCode(d.showItemCode);
            if (d.showUnit !== undefined) setShowUnit(d.showUnit);
            setShowDiscountPercent(false); 
            setShowDiscountValue(false); 
        }
        
        const h = loadAutocompleteHistory();
        if (h) setHistory(h);

        Promise.all([getStaffList(), getCurrentUser()]).then(([staff, user]) => {
            setStaffList(staff);
            setLoading(false);
            // Do not pre-select the current user as the default salesperson/delegate
        });

        const handleClickOutside = (event: MouseEvent) => {
            if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
                setShowProductDropdown(false);
            }
            if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
                setShowCustomerSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Edit-on-behalf flow: load invoice data from editFrom query param
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const editFromId = params.get('editFrom');
        if (!editFromId) return;

        getInvoiceForEdit(editFromId).then(data => {
            if (!data) return;
            setEditFromInvoiceId(editFromId);
            setEditFromStaffName(data.salespersonName);

            // Lock salesperson to the original
            setSelectedStaffId(data.salespersonId || '');
            setEmployeeName(data.salespersonName || '');

            // Pre-fill customer info
            setCustomerName(data.customerName || '');
            setSelectedCustomerId(data.customerId || null);
            setPhone1(data.customerPhone || '');
            setAddress(data.customerAddress || '');

            // Pre-fill payment
            setPaymentMethod(data.paymentMethod as PaymentMethodType);
            setPreviousBalance(data.previousBalance);

            // Pre-fill cart
            const cartItems: CartItem[] = data.items.map(item => ({
                id: crypto.randomUUID(),
                product: {
                    id: item.productId,
                    name: item.productName,
                    sku: item.productSku,
                    baseSellingPrice: item.baseSellingPrice,
                    categoryId: item.productCategoryId,
                    stock: item.stock,
                },
                codeOverride: item.productSku,
                nameOverride: item.productName,
                unitOverride: item.productUnit || 'قطعة',
                quantity: item.quantity,
                priceOverride: item.unitPrice,
                discountPercent: '',
                discountValue: ''
            }));
            setCart(cartItems);
        }).catch(err => {
            console.error('Failed to load invoice for edit', err);
            setError('فشل تحميل الفاتورة للتعديل');
        });
    }, []);

    // Derived values
    const totalQty = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const invoiceTotal = cart.reduce((sum, item) => {
        const qty = item.quantity || 0;
        const price = item.priceOverride || 0;
        const disc = Number(item.discountValue) || 0;
        return sum + (price * qty - disc);
    }, 0);
    
    const safeAmountPaid = Number(amountPaid) || 0;
    const currentBalance = previousBalance + invoiceTotal - safeAmountPaid;

    const saveDefaults = useCallback(() => {
        const defaults = {
            showWarehouse, showCustomerCode, showCity, showAddress, showPhone1, showPhone2, showItemCode, showUnit, showDiscountPercent, showDiscountValue,
            warehouseName
        };
        localStorage.setItem('sales_print_defaults', JSON.stringify(defaults));
        alert('تم حفظ الإعدادات الافتراضية بنجاح');
    }, [showWarehouse, showCustomerCode, showCity, showAddress, showPhone1, showPhone2, showItemCode, showUnit, showDiscountPercent, showDiscountValue, warehouseName]);

    const updateHistory = useCallback((key: string, val: string) => {
        if (!val) return;
        setHistory(prev => {
            const arr = prev[key] || [];
            if (!arr.includes(val)) {
                const newArr = [val, ...arr].slice(0, 10);
                const next = { ...prev, [key]: newArr };
                localStorage.setItem('sales_autocomplete_history', JSON.stringify(next));
                return next;
            }
            return prev;
        });
    }, []);

    // Handlers
    const handleCustomerNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomerName(val);
        setSelectedCustomerId(null);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        
        if (val.length < 2) { 
            setSearchResults([]); 
            setShowCustomerSuggestions(false); 
            return; 
        }
        
        searchTimeoutRef.current = setTimeout(async () => {
            const results = await searchCustomers(val);
            setSearchResults(results as CustomerSearch[]);
            setShowCustomerSuggestions(results.length > 0);
        }, 300);
    }, []);

    const selectCustomer = useCallback((cust: CustomerSearch) => {
        setCustomerName(cust.name);
        setSelectedCustomerId(cust.id);
        setPhone1(cust.phone || '');
        setAddress(cust.address || '');
        setCity(cust.governorate || '');
        setPreviousBalance(Number(cust.balance) || 0);
        setShowCustomerSuggestions(false);
    }, []);

    const handleProductSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (productSearchTimeoutRef.current) clearTimeout(productSearchTimeoutRef.current);
        
        if (val.trim().length === 0) {
            setFilteredProducts([]);
            setShowProductDropdown(false);
            return;
        }

        productSearchTimeoutRef.current = setTimeout(async () => {
            const results = await getProducts(val, 10);
            setFilteredProducts(results);
            setShowProductDropdown(results.length > 0);
        }, 300);
    }, []);

    const addToCart = useCallback((product: Product) => {
        setCart(prev => {
            const currentInCart = prev.filter(item => item.product.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
            if (currentInCart >= product.stock) {
                setError(`الكمية المتاحة من ${product.name} هي ${product.stock} فقط`);
                setTimeout(() => setError(null), 3000);
                return prev;
            }
            
            const existingIdx = prev.findIndex(item => item.product.id === product.id);
            if (existingIdx >= 0) {
                const newCart = [...prev];
                newCart[existingIdx] = { ...newCart[existingIdx], quantity: newCart[existingIdx].quantity + 1 };
                return newCart;
            }

            return [...prev, { 
                id: crypto.randomUUID(), 
                product, 
                codeOverride: product.sku,
                nameOverride: product.name,
                unitOverride: 'قطعة',
                quantity: 1,
                priceOverride: product.baseSellingPrice,
                discountPercent: '',
                discountValue: ''
            }];
        });
        setSearchQuery('');
        setShowProductDropdown(false);
    }, []);

    const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
        setCart(prev => prev.map(item => {
            if (item.id !== id) return item;

            const sanitized: Partial<CartItem> = { ...updates };
            if (sanitized.quantity !== undefined) sanitized.quantity = Math.max(0, Number(sanitized.quantity) || 0);
            if (sanitized.priceOverride !== undefined) sanitized.priceOverride = Math.max(0, Number(sanitized.priceOverride) || 0);
            if (sanitized.discountPercent !== undefined && sanitized.discountPercent !== '') sanitized.discountPercent = Math.max(0, Number(sanitized.discountPercent) || 0);
            if (sanitized.discountValue !== undefined && sanitized.discountValue !== '') sanitized.discountValue = Math.max(0, Number(sanitized.discountValue) || 0);

            const newItem = { ...item, ...sanitized };

            if (sanitized.quantity !== undefined && sanitized.quantity > item.product.stock) {
                setError(`الكمية المتاحة من ${item.product.name} هي ${item.product.stock} فقط`);
                setTimeout(() => setError(null), 3000);
                newItem.quantity = item.product.stock;
            }

            if (sanitized.discountPercent !== undefined && sanitized.discountPercent !== '') {
                newItem.discountValue = newItem.priceOverride * newItem.quantity * (Number(sanitized.discountPercent) / 100);
            }

            return newItem;
        }));
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    }, []);

    const toggleSettings = useCallback(() => setShowSettings(prev => !prev), []);
    const toggleCity = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setShowCity(e.target.checked), []);
    const toggleAddress = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setShowAddress(e.target.checked), []);
    const togglePhone1 = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setShowPhone1(e.target.checked), []);
    const toggleItemCode = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setShowItemCode(e.target.checked), []);
    const toggleUnit = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setShowUnit(e.target.checked), []);

    const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value), []);
    const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value), []);
    const handlePhone1Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPhone1(e.target.value), []);
    const handlePhone2Change = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPhone2(e.target.value), []);
    const handleStaffSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const staffId = e.target.value;
        setSelectedStaffId(staffId);
        if (staffId) {
            const selectedStaff = staffList.find((s: Staff) => s.id === staffId);
            if (selectedStaff) {
                setEmployeeName(selectedStaff.name || selectedStaff.username);
            }
        } else {
            setEmployeeName('');
        }
    }, [staffList]);
    const handleWarehouseNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setWarehouseName(e.target.value), []);
    const handleCustomerCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCustomerCode(e.target.value), []);
    const handlePreviousBalanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPreviousBalance(Math.max(0, Number(e.target.value) || 0)), []);
    const handleAmountPaidChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAmountPaid(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0)), []);

    const showCustomerSuggestionsHandler = useCallback(() => setShowCustomerSuggestions(true), []);
    const showProductDropdownHandler = useCallback(() => setShowProductDropdown(true), []);

    const handleSearchQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setShowProductDropdown(true);
    }, []);

    const handleRemoveFromCartEvent = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const itemId = e.currentTarget.dataset.itemId;
        if (itemId) removeFromCart(itemId);
    }, [removeFromCart]);

    const handleAddToCartEvent = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const productId = e.currentTarget.dataset.productId;
        const product = filteredProducts.find(p => p.id === productId);
        if (product) addToCart(product);
    }, [filteredProducts, addToCart]);

    const handleItemFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const itemId = e.currentTarget.dataset.itemId;
        const field = e.currentTarget.dataset.field;
        if (!itemId || !field) return;

        const value = e.target.value;
        let updates: Partial<CartItem> = {};

        if (field === 'nameOverride') updates = { nameOverride: value };
        else if (field === 'codeOverride') updates = { codeOverride: value };
        else if (field === 'unitOverride') updates = { unitOverride: value };
        else if (field === 'quantity') updates = { quantity: Number(value) };
        else if (field === 'priceOverride') updates = { priceOverride: Number(value) };
        else if (field === 'discountPercent') updates = { discountPercent: value === '' ? '' : Number(value) };
        else if (field === 'discountValue') updates = { discountValue: value === '' ? '' : Number(value) };

        updateItem(itemId, updates);
    }, [updateItem]);

    const handleCheckoutAndPrint = useCallback(async () => {
        if (cart.length === 0) return;

        if (!selectedStaffId) {
            setError("يجب اختيار المندوب قبل إصدار الفاتورة");
            setTimeout(() => setError(null), 3000);
            return;
        }

        if (!customerName.trim()) {
            setError("يجب إدخال اسم العميل قبل إصدار الفاتورة");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const itemsToProcess = cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                unitPrice: item.priceOverride,
                discountValue: Number(item.discountValue) || 0
            }));

            const buyerInfo = {
                customerName,
                customerPhone: phone1,
                customerAddress: address
            };

            const finalAmountPaid = Number(amountPaid) || 0;

            const result = await processSale(
                itemsToProcess,
                paymentMethod,
                buyerInfo,
                undefined,
                selectedStaffId,
                finalAmountPaid,
                selectedCustomerId || undefined,
                editFromInvoiceId || undefined
            );

            if (result.success && result.invoice) {
                if (result.needsReview) {
                    setPendingReviewNotice(true);
                    setCart([]);
                    setCustomerName('');
                    setSelectedCustomerId(null);
                    setPhone1('');
                    setPhone2('');
                    setAddress('');
                    setAmountPaid('');
                    setPreviousBalance(0);
                    setFilteredProducts([]);
                    setTimeout(() => setPendingReviewNotice(false), 5000);
                } else {
                    setShowSuccess(true);

                    updateHistory('warehouseName', warehouseName);
                    updateHistory('city', city);
                    updateHistory('address', address);
                    updateHistory('employeeName', employeeName);

                    // Set sequence ID to the actual invoice ID for the printout
                    setSequenceId(parseInt(result.invoice.id.slice(-4), 16).toString());

                    // Download PDF in background
                    try {
                        const pdfRes = await fetch(`/api/invoices/${result.invoice.id}/pdf?download=1`);
                        if (pdfRes.ok) {
                            const blob = await pdfRes.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `invoice-${result.invoice.id.slice(-6).toUpperCase()}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }
                    } catch (pdfErr) {
                        console.error('PDF download error:', pdfErr);
                    }

                    // Clear after download
                    setTimeout(() => {
                        setShowSuccess(false);
                        setCart([]);
                        setCustomerName('');
                        setSelectedCustomerId(null);
                        setPhone1('');
                        setPhone2('');
                        setAddress('');


                        setSequenceId(Math.floor(100000 + Math.random() * 900000).toString());

                        setCustomerCode(Math.floor(10000 + Math.random() * 90000).toString());
                        setAmountPaid('');
                        setPreviousBalance(0);
                        setFilteredProducts([]);

                        // If this was a reviewer edit, close the tab
                        if (editFromInvoiceId) {
                            setTimeout(() => window.close(), 500);
                        }
                    }, 1500);
                }
            } else {
                setError(result.error || "حدث خطأ أثناء معالجة الفاتورة");
            }
        } catch (err) {
            console.error(err);
            setError("حدث خطأ في الاتصال");
        } finally {
            setProcessing(false);
        }
    }, [cart, customerName, phone1, phone2, address, amountPaid, processSale, paymentMethod, selectedStaffId, selectedCustomerId, editFromInvoiceId, updateHistory, warehouseName, city, employeeName]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4 text-blue-600">
                    <Loader2 className="animate-spin" size={40} />
                    <p className="font-bold">جاري تحميل المحرر...</p>
                </div>
            </div>
        );
    }

    if (checkoutMode === 'quick') {
        return (
            <QuickWizard onSwitchMode={() => setCheckoutMode('standard')} />
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row print:block" dir="rtl" data-print-invoice-wrapper>
            <datalist id="warehouse-history">
                {history.warehouseName?.map(v => <option key={v} value={v} />)}
            </datalist>
            <datalist id="city-history">
                {history.city?.map(v => <option key={v} value={v} />)}
            </datalist>
            <datalist id="address-history">
                {history.address?.map(v => <option key={v} value={v} />)}
            </datalist>
            <datalist id="employeeId-history">
                {history.employeeId?.map(v => <option key={v} value={v} />)}
            </datalist>
            <datalist id="employeeName-history">
                {history.employeeName?.map(v => <option key={v} value={v} />)}
            </datalist>
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
                    
                    /* Hide placeholder text and remove borders of inputs when printing */
                    input::placeholder { color: transparent !important; }
                    .print-appearance-none { appearance: none !important; }
                    .print-hide-spinners::-webkit-inner-spin-button, 
                    .print-hide-spinners::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                    }
                }
            `}</style>

            {error && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] p-4 bg-red-500/90 backdrop-blur-md border border-red-500/20 rounded-2xl text-white text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-4 shadow-2xl">
                    <AlertCircle size={20} className="shrink-0" />
                    {error}
                </div>
            )}

            {pendingReviewNotice && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] p-4 bg-amber-500/90 backdrop-blur-md border border-amber-500/20 rounded-2xl text-white text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-4 shadow-2xl">
                    <Check size={20} className="shrink-0" />
                    تم إرسال الفاتورة للمراجعة بسبب تغيير السعر
                </div>
            )}

            {editFromInvoiceId && (
                <div className="fixed top-0 left-0 right-0 z-[200] p-3 bg-purple-600 text-white text-center text-sm font-bold print-hidden">
                    وضع التعديل بالنيابة عن: {editFromStaffName || 'مندوب المبيعات'} — سيتم اعتماد الفاتورة مباشرة بعد الحفظ
                </div>
            )}

            {/* --- SETTINGS SIDEBAR (Hidden on Print) --- */}
            <div className={`print-hidden bg-white border-l border-gray-200 shadow-xl transition-all duration-300 flex flex-col z-10 ${showSettings ? 'w-full md:w-80 h-auto md:h-screen sticky top-0' : 'w-full md:w-16 h-auto md:h-screen sticky top-0'}`}>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                    {showSettings && (
                        <div className="flex flex-col gap-1">
                            <h2 className="font-bold text-blue-900 flex items-center gap-2"><Settings2 size={18} /> إعدادات الطباعة</h2>
                            <button onClick={saveDefaults} className="text-[10px] text-blue-600 font-bold hover:underline self-start">حفظ كإعدادات افتراضية</button>
                            <button
                                onClick={() => setCheckoutMode('quick')}
                                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold transition-all shadow-sm hover:opacity-90 active:scale-95 self-start"
                            >
                                <Zap size={14} />
                                {locale === 'ar' ? 'وضع البيع السريع' : 'Quick Checkout Mode'}
                            </button>
                        </div>
                    )}
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
                            <div className="flex gap-2 items-center mb-2">
                                <input type="checkbox" checked={showCity} onChange={toggleCity} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" title="عرض" />
                                <div className="flex-1 min-w-0">
                                    <label className="block text-xs font-medium text-gray-700 mb-1 truncate">المدينة</label>
                                    <input type="text" list="city-history" value={city} onChange={handleCityChange} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="checkbox" checked={showAddress} onChange={toggleAddress} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" title="عرض" />
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">العنوان</label>
                                    <input type="text" list="address-history" value={address} onChange={handleAddressChange} className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <input type="checkbox" checked={showPhone1} onChange={togglePhone1} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0" title="عرض" />
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
                                <select
                                    value={selectedStaffId}
                                    onChange={handleStaffSelect}
                                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">-- اختر المندوب --</option>
                                    {staffList.map((staff: Staff) => (
                                        <option key={staff.id} value={staff.id}>
                                            {staff.name || staff.username}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4 space-y-3 pb-8">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">إعدادات الجدول</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                                    <input type="checkbox" checked={showItemCode} onChange={(e) => setShowItemCode(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                    <span>رقم الصنف</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                                    <input type="checkbox" checked={showUnit} onChange={(e) => setShowUnit(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                                    <span>الوحدة</span>
                                </label>
                            </div>
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
                                    <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded font-bold text-sm border border-gray-200 flex items-center gap-1">
                                        المستودع: <input value={warehouseName} onChange={e => setWarehouseName(e.target.value)} className="bg-transparent outline-none w-32" />
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
                                        <td className="border border-gray-300 px-1 py-1 text-center relative">
                                            <select
                                                value={selectedStaffId}
                                                onChange={handleStaffSelect}
                                                className="w-full bg-transparent outline-none font-bold text-center appearance-none cursor-pointer text-gray-900"
                                                title="اضغط لتغيير المندوب"
                                            >
                                                <option value="">-- اختر المندوب --</option>
                                                {staffList.map((staff: Staff) => (
                                                    <option key={staff.id} value={staff.id}>
                                                        {staff.name || staff.username}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Customer Info Section */}
                    <div className="mb-6 rounded-lg border border-gray-300 overflow-hidden bg-gray-50/50 relative" ref={customerSearchRef}>
                        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 font-bold text-gray-800 flex items-center justify-between">
                            <span>بيانات العميل</span>
                            {showCustomerCode && (
                                <div className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-gray-200 flex items-center gap-1">
                                    كود: <input value={customerCode} onChange={e => setCustomerCode(e.target.value)} className="bg-transparent outline-none w-24" />
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-12 gap-y-3 gap-x-4 text-sm" data-print-customer-grid>
                                <div className="col-span-12 md:col-span-6 flex gap-2 relative" data-print-col-6>
                                    <span className="font-bold text-gray-600 w-20 shrink-0">اسم العميل:</span>
                                    <input 
                                        value={customerName} 
                                        onChange={handleCustomerNameChange} 
                                        onFocus={() => setShowCustomerSuggestions(true)}
                                        className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1 bg-transparent outline-none placeholder:font-normal placeholder:text-gray-400" 
                                        placeholder="اكتب اسم العميل للبحث..."
                                    />
                                    {showCustomerSuggestions && searchResults.length > 0 && (
                                        <div className="absolute top-full right-0 w-full mt-1 bg-white border border-gray-200 shadow-xl rounded-lg z-[100] max-h-48 overflow-y-auto print-hidden">
                                            {searchResults.map(cust => (
                                                <button key={cust.id} onClick={() => selectCustomer(cust)} className="w-full text-right p-2 border-b hover:bg-gray-50 flex justify-between items-center">
                                                    <div>
                                                        <div className="font-bold text-sm">{cust.name}</div>
                                                        <div className="text-xs text-gray-500">{cust.phone}</div>
                                                    </div>
                                                    <div className="text-xs font-bold text-blue-600" dir="ltr">{Number(cust.balance || 0).toLocaleString('ar-EG')} رصيد</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {showCity && (
                                    <div className="col-span-12 md:col-span-6 flex gap-2" data-print-col-6>
                                        <span className="font-bold text-gray-600 w-16 shrink-0">المدينة:</span>
                                        <input value={city} onChange={e => setCity(e.target.value)} className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1 bg-transparent outline-none" />
                                    </div>
                                )}

                                {showAddress && (
                                    <div className="col-span-12 md:col-span-6 flex gap-2" data-print-col-6>
                                        <span className="font-bold text-gray-600 w-20 shrink-0">العنوان:</span>
                                        <input value={address} onChange={e => setAddress(e.target.value)} className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1 bg-transparent outline-none" />
                                    </div>
                                )}
                                {showPhone1 && (
                                    <div className="col-span-12 md:col-span-3 flex gap-2" data-print-col-3>
                                        <span className="font-bold text-gray-600 w-16 shrink-0">هاتف 1:</span>
                                        <input value={phone1} onChange={e => setPhone1(e.target.value)} className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1 bg-transparent outline-none" />
                                    </div>
                                )}
                                {showPhone2 && (
                                    <div className="col-span-12 md:col-span-3 flex gap-2" data-print-col-3>
                                        <span className="font-bold text-gray-600 w-12 shrink-0">هاتف 2:</span>
                                        <input value={phone2} onChange={e => setPhone2(e.target.value)} className="font-bold text-gray-900 border-b border-gray-300 flex-1 pb-1 bg-transparent outline-none" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="min-h-[200px]">
                        {/* Mobile Layout */}
                        <div className="block md:hidden border-2 border-gray-900 rounded-lg overflow-hidden bg-white print-hidden">
                            <div className="divide-y-2 divide-gray-200">
                                {cart.map((item, idx) => {
                                    const rowTotal = item.priceOverride * item.quantity - (Number(item.discountValue) || 0);
                                    return (
                                        <div key={item.id} className="p-4 bg-gray-50/30 relative">
                                            <button onClick={() => removeFromCart(item.id)} className="absolute top-4 left-4 text-red-500 bg-white rounded-full p-1 shadow-sm border border-red-200">
                                                <X size={16}/>
                                            </button>
                                            
                                            <div className="flex flex-col gap-3">
                                                <div>
                                                    <span className="text-xs text-gray-500 font-bold mb-1 block">الصنف {idx + 1}</span>
                                                    <input value={item.nameOverride} onChange={(e) => updateItem(item.id, {nameOverride: e.target.value})} className="font-bold text-lg text-gray-900 bg-white border border-gray-300 rounded p-1 w-[85%]" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {showItemCode && (
                                                        <div>
                                                            <span className="text-xs text-gray-500 font-bold block">رقم الصنف</span>
                                                            <input value={item.codeOverride} onChange={(e) => updateItem(item.id, {codeOverride: e.target.value})} className="bg-white border border-gray-300 rounded p-1 w-full text-center font-mono" />
                                                        </div>
                                                    )}
                                                    {showUnit && (
                                                        <div>
                                                            <span className="text-xs text-gray-500 font-bold block">الوحدة</span>
                                                            <input value={item.unitOverride} onChange={(e) => updateItem(item.id, {unitOverride: e.target.value})} className="bg-white border border-gray-300 rounded p-1 w-full text-center" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-xs text-gray-500 font-bold block">الكمية</span>
                                                        <input type="number" min="0" value={item.quantity || ''} onChange={(e) => updateItem(item.id, {quantity: Number(e.target.value)})} className="bg-white border border-gray-300 rounded p-1 w-full text-center font-bold text-black" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-500 font-bold block">السعر</span>
                                                        <input type="number" min="0" value={item.priceOverride || ''} onChange={(e) => updateItem(item.id, {priceOverride: Number(e.target.value)})} className="bg-white border border-gray-300 rounded p-1 w-full text-center font-bold" />
                                                    </div>
                                                </div>

                                                {(showDiscountPercent || showDiscountValue) && (
                                                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-100 rounded">
                                                        <span className="text-xs text-gray-600 font-bold col-span-2 block">الخصم</span>
                                                        {showDiscountPercent && (
                                                            <input type="number" min="0" value={item.discountPercent} onChange={(e) => updateItem(item.id, {discountPercent: e.target.value === '' ? '' : Number(e.target.value)})} className="bg-white border border-gray-300 rounded p-1 w-full text-center text-blue-700" placeholder="نسبة %" />
                                                        )}
                                                        {showDiscountValue && (
                                                            <input type="number" min="0" value={item.discountValue} onChange={(e) => updateItem(item.id, {discountValue: e.target.value === '' ? '' : Number(e.target.value)})} className="bg-white border border-gray-300 rounded p-1 w-full text-center text-red-600" placeholder="قيمة" />
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center bg-gray-100 p-2 rounded mt-1 border border-gray-200">
                                                    <span className="font-bold text-gray-700">القيمة:</span>
                                                    <span className="font-black text-lg text-gray-900">{rowTotal.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Mobile Search */}
                                <div className="p-4 relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Plus size={16} className="text-gray-500" />
                                        <span className="font-bold text-gray-700 text-sm">إضافة صنف</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="ابحث عن صنف لإضافته..." 
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowProductDropdown(true);
                                        }}
                                        onFocus={() => setShowProductDropdown(true)}
                                        className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
                                    />
                                    {showProductDropdown && searchQuery && (
                                        <div className="absolute bottom-full mb-1 right-0 w-full bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] max-h-[300px] overflow-y-auto">
                                            {filteredProducts.map(p => (
                                                <button key={p.id} onClick={() => addToCart(p)} className="w-full text-right p-3 border-b hover:bg-gray-50 flex justify-between items-center group">
                                                    <div>
                                                        <div className="font-bold group-hover:text-blue-600 transition-colors">{p.name}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">{p.sku} <span className="mx-1">•</span> متوفر: <span className="font-bold text-gray-800">{p.stock}</span></div>
                                                    </div>
                                                    <div className="font-black text-blue-600">{p.baseSellingPrice}</div>
                                                </button>
                                            ))}
                                            {filteredProducts.length === 0 && (
                                                <div className="p-4 text-center text-gray-500 text-sm">لا توجد نتائج مطابقة</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Desktop Table */}
                        <table className="w-full border-collapse border-2 border-gray-900 text-sm hidden md:table">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-900 text-gray-800">
                                    <th className="border-l border-gray-300 py-2 w-10 text-center">م</th>
                                    {showItemCode && <th className="border-l border-gray-300 py-2 w-24 text-center">رقم الصنف</th>}
                                    <th className="border-l border-gray-300 py-2 px-3 text-center">اسم الصنف</th>
                                    {showUnit && <th className="border-l border-gray-300 py-2 w-16 text-center">الوحدة</th>}
                                    <th className="border-l border-gray-300 py-2 w-16 text-center">الكمية</th>
                                    <th className="border-l border-gray-300 py-2 w-20 text-center">السعر</th>
                                    {(showDiscountPercent || showDiscountValue) && <th className="border-l border-gray-300 py-2 w-20 text-center">الخصم</th>}
                                    <th className="py-2 w-24 text-center font-bold">القيمة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, idx) => {
                                    const rowTotal = item.priceOverride * item.quantity - (Number(item.discountValue) || 0);
                                    return (
                                        <tr key={item.id} className="border-b border-gray-300 even:bg-gray-50/50 group relative">
                                            <td className="border-l border-gray-300 py-2 text-center text-gray-500 font-medium relative">
                                                {idx + 1}
                                                <button onClick={() => removeFromCart(item.id)} className="absolute -right-3 top-1/2 -translate-y-1/2 text-red-500 opacity-0 group-hover:opacity-100 print-hidden bg-white rounded-full p-0.5 shadow-sm border border-red-200 transition-opacity"><X size={14}/></button>
                                            </td>
                                            {showItemCode && <td className="border-l border-gray-300 py-2 px-1 text-center font-mono text-gray-600"><input value={item.codeOverride} onChange={(e) => updateItem(item.id, {codeOverride: e.target.value})} className="w-full bg-transparent outline-none text-center" /></td>}
                                            <td className="border-l border-gray-300 py-2 px-3 font-bold text-gray-900 text-center"><input value={item.nameOverride} onChange={(e) => updateItem(item.id, {nameOverride: e.target.value})} className="w-full bg-transparent outline-none" /></td>
                                            {showUnit && <td className="border-l border-gray-300 py-2 text-center text-gray-600"><input value={item.unitOverride} onChange={(e) => updateItem(item.id, {unitOverride: e.target.value})} className="w-full bg-transparent outline-none text-center" /></td>}
                                            <td className="border-l border-gray-300 py-2 text-center font-bold"><input type="number" min="0" value={item.quantity || ''} onChange={(e) => updateItem(item.id, {quantity: Number(e.target.value)})} className="w-full bg-transparent outline-none text-center print-hide-spinners font-bold text-black" /></td>
                                            <td className="border-l border-gray-300 py-2 text-center font-medium"><input type="number" min="0" value={item.priceOverride || ''} onChange={(e) => updateItem(item.id, {priceOverride: Number(e.target.value)})} className="w-full bg-transparent outline-none text-center print-hide-spinners" /></td>
                                            {(showDiscountPercent || showDiscountValue) && (
                                                <td className="border-l border-gray-300 p-1 text-center">
                                                    <div className="flex flex-col gap-1 justify-center items-center h-full">
                                                        {showDiscountPercent && <input type="number" min="0" value={item.discountPercent} onChange={(e) => updateItem(item.id, {discountPercent: e.target.value === '' ? '' : Number(e.target.value)})} className={clsx("w-full bg-transparent outline-none text-center print-hide-spinners text-xs font-medium text-blue-700", showDiscountValue && "border-b border-dashed border-gray-200 pb-1")} placeholder="نسبة %" title="نسبة الخصم" />}
                                                        {showDiscountValue && <input type="number" min="0" value={item.discountValue} onChange={(e) => updateItem(item.id, {discountValue: e.target.value === '' ? '' : Number(e.target.value)})} className="w-full bg-transparent outline-none text-center print-hide-spinners text-xs font-medium text-red-600" placeholder="قيمة" title="قيمة الخصم" />}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="py-2 text-center font-bold text-gray-900 bg-gray-50/80">{rowTotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}

                                {/* Product Search Row */}
                                <tr className="border-b border-gray-300 print-hidden bg-gray-50/30">
                                    <td className="border-l border-gray-300 py-2 text-center text-gray-400"><Plus size={16} className="mx-auto" /></td>
                                    {showItemCode && <td className="border-l border-gray-300 py-2 text-center"></td>}
                                    <td className="border-l border-gray-300 py-2 px-3 relative text-center" ref={productSearchRef}>
                                        <input 
                                            type="text" 
                                            placeholder="ابحث عن صنف لإضافته للفاتورة..." 
                                            value={searchQuery}
                                            onChange={handleProductSearch}
                                            onFocus={() => setShowProductDropdown(true)}
                                            className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
                                        />
                                        {showProductDropdown && searchQuery && (
                                            <div className="absolute top-full right-0 w-[400px] mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] max-h-[300px] overflow-y-auto">
                                                {filteredProducts.map(p => (
                                                    <button key={p.id} onClick={() => addToCart(p)} className="w-full text-right p-3 border-b hover:bg-gray-50 flex justify-between items-center group">
                                                        <div>
                                                            <div className="font-bold group-hover:text-blue-600 transition-colors">{p.name}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{p.sku} <span className="mx-1">•</span> متوفر: <span className="font-bold text-gray-800">{p.stock}</span></div>
                                                        </div>
                                                        <div className="font-black text-blue-600">{p.baseSellingPrice}</div>
                                                    </button>
                                                ))}
                                                {filteredProducts.length === 0 && (
                                                    <div className="p-4 text-center text-gray-500 text-sm">لا توجد نتائج مطابقة</div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    {showUnit && <td className="border-l border-gray-300 py-2 text-center"></td>}
                                    <td className="border-l border-gray-300 py-2 text-center"></td>
                                    <td className="border-l border-gray-300 py-2 text-center"></td>
                                    {(showDiscountPercent || showDiscountValue) && <td className="border-l border-gray-300 py-2 text-center"></td>}
                                    <td className="py-2 text-center"></td>
                                </tr>
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
                                        {invoiceTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="border border-gray-800 p-3 text-center rounded bg-white relative">
                                <span className="absolute -top-3 right-4 bg-white px-2 text-xs font-bold text-gray-500">المبلغ بالحروف</span>
                                <p className="font-bold text-gray-900 text-lg leading-relaxed">
                                    فقط وقدره ( {tafqeet(invoiceTotal)} ) لا غير.
                                </p>
                            </div>
                        </div>

                        {/* Financial Balances */}
                        <div className="w-full md:w-72 border-2 border-gray-900 rounded-lg overflow-hidden bg-white" data-print-financials>
                            <div className="bg-gray-900 text-white text-center py-1 font-bold text-sm tracking-widest">
                                كشف الحساب
                            </div>
                            <div className="grid grid-cols-2 text-sm divide-x divide-x-reverse divide-gray-200">
                                <div className="bg-gray-100 p-2 font-bold text-gray-700 flex items-center">الرصيد السابق</div>
                                <div className="p-2 font-black text-center text-gray-700">
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={previousBalance} 
                                        onChange={e => setPreviousBalance(Math.max(0, Number(e.target.value) || 0))}
                                        className="w-full bg-transparent outline-none text-center print-hide-spinners" 
                                    />
                                </div>

                                <div className="bg-gray-100 p-2 font-bold text-gray-700 border-t border-gray-200 flex items-center">قيمة الفاتورة</div>
                                <div className="p-2 font-black text-center border-t border-gray-200 text-blue-700 flex items-center justify-center">{invoiceTotal.toFixed(2)}</div>

                                <div className="bg-gray-100 p-1.5 font-bold text-gray-700 border-t border-gray-200 flex flex-col justify-center relative">
                                    <span>المدفوع (كاش)</span>
                                    <input type="hidden" value="CASH" readOnly />
                                </div>
                                <div className="p-1 border-t border-gray-200 text-green-600 flex items-center justify-center group bg-green-50/30 hover:bg-green-50 transition-colors relative">
                                    <input 
                                        type="number" 
                                        min="0"
                                        value={amountPaid === '' ? '' : amountPaid} 
                                        onChange={e => setAmountPaid(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                                        placeholder="0"
                                        className="w-full bg-transparent outline-none text-center font-black text-lg print-hide-spinners" 
                                    />
                                </div>

                                <div className="bg-gray-200 p-2 font-black text-gray-900 border-t border-gray-300 flex items-center">الرصيد المتبقي</div>
                                <div className="p-2 font-black text-center text-xl border-t border-gray-300 bg-gray-50 text-red-600 flex items-center justify-center">
                                    {currentBalance.toLocaleString('ar-EG', { maximumFractionDigits: 2 })}
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

                {/* Sticky Bottom Bar for Mobile/Desktop */}
                <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 mt-8 -mx-4 md:-mx-8 -mb-4 md:-mb-8 bg-white/90 backdrop-blur-md border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-30 print-hidden">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                        <div className="hidden md:flex flex-col">
                            <span className="text-sm font-bold text-gray-500">الإجمالي العام</span>
                            <span className="text-2xl font-black text-gray-900">{invoiceTotal.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handleCheckoutAndPrint}
                            disabled={processing || cart.length === 0}
                            className={clsx(
                                "flex-1 md:flex-none md:w-auto font-black text-lg py-4 px-8 rounded-xl transition-all flex justify-center items-center gap-3 shadow-xl",
                                cart.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 active:scale-[0.98]"
                            )}
                        >
                            {processing ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <>
                                    <Download size={24} />
                                    <span>إصدار وتحميل الفاتورة</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Animation */}
            {showSuccess && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-300 print-hidden">
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in-50 duration-500 ease-out">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-green-500/20">
                            <Check size={40} strokeWidth={4} />
                        </div>
                        <div className="text-center">
                            <h2 className="text-3xl font-black tracking-tight mb-1">تم إصدار الفاتورة</h2>
                            <p className="text-gray-500 font-medium">جاري تحميل الفاتورة...</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
