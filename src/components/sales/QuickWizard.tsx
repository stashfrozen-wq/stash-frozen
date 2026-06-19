'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { getProducts, processSale } from '@/app/actions/sales';
import { searchCustomers } from '@/app/actions/customers';
import { getCurrentUser } from '@/app/actions/permissions';
import InvoicePdfActions from './InvoicePdfActions';
import { Search, ShoppingCart, CreditCard, Check, ArrowRight, ArrowLeft, Trash2, Plus, Minus, Loader2, User, LayoutGrid, Pencil, X, Clock } from 'lucide-react';
import clsx from 'clsx';

type Product = {
    id: string;
    name: string;
    price: number;
    stock: number;
    sku?: string | null;
    [key: string]: unknown;
};

type Customer = {
    id: string;
    name: string;
    phone: string | null;
    balance: number;
    [key: string]: unknown;
};

type Step = 1 | 2 | 3 | 4;

interface QuickWizardProps {
    onSwitchMode: () => void;
}

export default function QuickWizard({ onSwitchMode }: QuickWizardProps) {
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const t = useTranslations('Sales');

    const [step, setStep] = useState<Step>(1);

    // Step 1: Customer
    const [customerQuery, setCustomerQuery] = useState('');
    const [customerResults, setCustomerResults] = useState<Customer[]>([]);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<{ id: string, name: string, phone: string, balance: number } | null>(null);

    // Step 2: Products
    const [productQuery, setProductQuery] = useState('');
    const [productResults, setProductResults] = useState<Product[]>([]);
    const [isSearchingProduct, setIsSearchingProduct] = useState(false);
    const [cart, setCart] = useState<{ id: string, name: string, price: number, basePrice: number, quantity: number, stock: number }[]>([]);
    const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
    const [editingPriceValue, setEditingPriceValue] = useState<string>('');

    // Step 3: Payment (always cash)
    const [amountPaid, setAmountPaid] = useState<string>('0');

    // Step 4: Submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [invoiceId, setInvoiceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingReview, setPendingReview] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        getCurrentUser().then(user => {
            if (user) setUserRole(user.role);
        });
    }, []);

    // Derived
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Debounced customer search
    useEffect(() => {
        if (customerQuery.length > 1) {
            setIsSearchingCustomer(true);
            const timer = setTimeout(async () => {
                const results = await searchCustomers(customerQuery);
                setCustomerResults(results as Customer[]);
                setIsSearchingCustomer(false);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setCustomerResults([]);
        }
    }, [customerQuery]);

    // Fetch products (initial load & search)
    useEffect(() => {
        setIsSearchingProduct(true);
        const timer = setTimeout(async () => {
            const products = await getProducts(productQuery || undefined, 100);
            setProductResults(products?.map((p: any) => ({ 
                id: p.id,
                name: p.name,
                price: p.baseSellingPrice,
                stock: p.stock,
                sku: p.sku
            })) || []);
            setIsSearchingProduct(false);
        }, productQuery.length >= 1 ? 300 : 0);
        return () => clearTimeout(timer);
    }, [productQuery]);

    const handleAddCustomer = useCallback(() => {
        if (customerQuery) {
            setSelectedCustomer({ id: 'new', name: customerQuery, phone: '', balance: 0 });
            setStep(2);
        }
    }, [customerQuery]);

    const handleAddToCart = useCallback((product: Product) => {
        const stock = product.stock ?? 0;
        if (stock <= 0) return;

        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                if (existing.quantity >= stock) return prev;
                return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, {
                id: product.id,
                name: product.name,
                price: Number(product.price),
                basePrice: Number(product.price),
                quantity: 1,
                stock
            }];
        });
    }, []);

    const updateQuantity = useCallback((id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return item;
                if (newQty > item.stock) return item;
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setCart(prev => prev.filter(i => i.id !== id));
    }, []);

    const handleStartEditPrice = useCallback((id: string, currentPrice: number) => {
        setEditingPriceId(id);
        setEditingPriceValue(String(currentPrice));
    }, []);

    const handleConfirmEditPrice = useCallback((id: string) => {
        const newPrice = Number(editingPriceValue);
        if (!isNaN(newPrice) && newPrice > 0) {
            setCart(prev => prev.map(item =>
                item.id === id ? { ...item, price: newPrice } : item
            ));
        }
        setEditingPriceId(null);
        setEditingPriceValue('');
    }, [editingPriceValue]);

    const handleCancelEditPrice = useCallback(() => {
        setEditingPriceId(null);
        setEditingPriceValue('');
    }, []);

    const handleSubmit = useCallback(async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const items = cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                unitPrice: item.price
            }));

            const buyerInfo = selectedCustomer ? {
                customerName: selectedCustomer.name,
                customerPhone: selectedCustomer.phone
            } : undefined;

            const customerId = selectedCustomer && selectedCustomer.id !== 'new' ? selectedCustomer.id : undefined;
            const paid = Number(amountPaid) || 0;

            const result = await processSale(
                items,
                'CASH',
                buyerInfo,
                undefined,
                undefined,
                paid,
                customerId
            );

            if (result.success && result.invoice) {
                if (result.needsReview) {
                    setPendingReview(true);
                }
                setInvoiceId(result.invoice.id);
            } else {
                setError(result.error || 'Failed to process sale');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    }, [cart, selectedCustomer, amountPaid]);

    const resetWizard = useCallback(() => {
        setSelectedCustomer(null);
        setCart([]);
        setAmountPaid('0');
        setInvoiceId(null);
        setStep(1);
        setCustomerQuery('');
        setProductQuery('');
        setError(null);
        setPendingReview(false);
    }, []);

    const handleSelectCustomer = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;
        const phone = e.currentTarget.dataset.phone || '';
        const balance = Number(e.currentTarget.dataset.balance || 0);
        if (id && name) {
            setSelectedCustomer({ id, name, phone, balance });
            setStep(2);
        }
    }, []);

    const handleSkipCustomer = useCallback(() => setStep(2), []);

    const handleUpdateQuantity = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        const delta = Number(e.currentTarget.dataset.delta || 0);
        if (id) updateQuantity(id, delta);
    }, [updateQuantity]);

    const handleRemoveFromCart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (id) removeFromCart(id);
    }, [removeFromCart]);

    const handleAddProductToCart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const id = e.currentTarget.dataset.id;
        if (!id) return;
        const product = productResults.find(p => p.id === id);
        if (product) handleAddToCart(product);
    }, [productResults, handleAddToCart]);

    const handleSetExactAmount = useCallback(() => {
        setAmountPaid(totalAmount.toString());
    }, [totalAmount]);

    const handleSetUnpaid = useCallback(() => {
        setAmountPaid('0');
    }, []);

    const handlePrevStep = useCallback(() => {
        setStep((step - 1) as 1 | 2 | 3 | 4);
    }, [step]);

    const handleNextStep = useCallback(() => {
        setStep((step + 1) as 1 | 2 | 3 | 4);
    }, [step]);

    const handleProductQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setProductQuery(e.target.value);
    }, []);

    const handleAmountPaidChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        if (v === '' || v === '-') return setAmountPaid('0');
        const n = Number(v);
        setAmountPaid(isNaN(n) ? '0' : String(Math.max(0, n)));
    }, []);

    const handleAmountPaidFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    }, []);

    const handleCustomerQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomerQuery(e.target.value);
    }, []);

    if (invoiceId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
                {pendingReview ? (
                    <>
                        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 shadow-sm animate-pulse">
                            <Clock size={40} strokeWidth={3} />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            {isRtl ? 'قيد المراجعة!' : 'Pending Review!'}
                        </h1>
                        <p className="text-muted-foreground mb-8 text-lg">
                            {isRtl ? 'تم إرسال الفاتورة للمراجعة بسبب تغيير السعر.' : 'The sale has been submitted for review because of custom pricing.'}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <Check size={40} strokeWidth={3} />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">
                            {isRtl ? 'اكتملت عملية البيع!' : 'Sale Complete!'}
                        </h1>
                        <p className="text-muted-foreground mb-8 text-lg">
                            {isRtl ? `فاتورة رقم #${invoiceId.slice(-6).toUpperCase()}` : `Invoice #${invoiceId.slice(-6).toUpperCase()}`}
                        </p>
                    </>
                )}
                
                <div className="flex flex-col gap-4 w-full max-w-md">
                    <InvoicePdfActions invoiceId={invoiceId} disabled={pendingReview && userRole === 'SALESPERSON'} />
                    <button
                        onClick={resetWizard}
                        className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-4 rounded-xl font-bold text-lg hover:bg-secondary/80"
                    >
                        <Plus size={24} />
                        {isRtl ? 'بيع جديد' : 'New Sale'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-24 relative min-h-[calc(100vh-80px)]" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Header & Progress */}
            <div className="mb-6 sticky top-0 bg-background/95 backdrop-blur z-10 pt-4 pb-2">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{isRtl ? 'تسجيل بيع سريع' : 'Quick Sale'}</h1>
                        <button
                            onClick={onSwitchMode}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-xs font-bold transition-all"
                        >
                            <LayoutGrid size={14} />
                            {isRtl ? 'وضع الكاشير الكامل' : 'Standard POS'}
                        </button>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                        {isRtl ? `الخطوة ${step} من 4` : `Step ${step} of 4`}
                    </span>
                </div>
                <div className="flex gap-2 h-2">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className={clsx("flex-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-secondary")} />
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <p className="font-medium text-sm pt-1">{error}</p>
                </div>
            )}

            {/* Step 1: Customer */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                        <div className="flex items-center gap-3 mb-6 text-primary">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <User size={24} />
                            </div>
                            <h2 className="text-xl font-bold">{isRtl ? 'بيانات العميل' : 'Customer Details'}</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">{isRtl ? 'ابحث أو أضف عميلاً' : 'Search or Add Customer'}</label>
                                <div className="relative">
                                    <Search className={clsx("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRtl ? "right-3" : "left-3")} size={20} />
                                    <input
                                        type="text"
                                        placeholder={isRtl ? "الاسم أو رقم الهاتف..." : "Name or phone..."}
                                        className={clsx("w-full py-4 rounded-xl border bg-background text-lg", isRtl ? "pr-10 pl-4" : "pl-10 pr-4")}
                                        value={customerQuery}
                                        onChange={handleCustomerQueryChange}
                                    />
                                    {isSearchingCustomer && <Loader2 className={clsx("absolute top-1/2 -translate-y-1/2 animate-spin text-muted-foreground", isRtl ? "left-3" : "right-3")} size={20} />}
                                </div>
                            </div>

                            {customerResults.length > 0 && (
                                <div className="bg-secondary/30 rounded-xl p-2 space-y-2 max-h-64 overflow-y-auto">
                                    {customerResults.map(c => (
                                        <button
                                            key={c.id}
                                            data-id={c.id}
                                            data-name={c.name}
                                            data-phone={c.phone || ''}
                                            data-balance={Number(c.balance)}
                                            onClick={handleSelectCustomer}
                                            className="w-full text-right bg-background p-4 rounded-lg flex justify-between items-center hover:border-primary border border-transparent transition-colors shadow-sm"
                                        >
                                            <div className="text-right">
                                                <div className="font-bold text-lg">{c.name}</div>
                                                {c.phone && <div className="text-sm text-muted-foreground">{c.phone}</div>}
                                            </div>
                                            {Number(c.balance) > 0 && (
                                                <div className="text-left">
                                                    <div className="text-xs text-muted-foreground">{isRtl ? 'الرصيد' : 'Balance'}</div>
                                                    <div className="font-bold text-red-500">{Number(c.balance).toLocaleString(locale)} {t('currency')}</div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {customerQuery.length > 2 && customerResults.length === 0 && (
                                <button
                                    onClick={handleAddCustomer}
                                    className="w-full py-4 border-2 border-dashed border-primary/50 text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/5"
                                >
                                    <Plus size={20} />
                                    {isRtl ? `إضافة "${customerQuery}" كعميل جديد` : `Add "${customerQuery}" as new customer`}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleSkipCustomer}
                            className="flex-1 py-4 font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                        >
                            {isRtl ? 'تخطي بدون عميل (عميل نقدي)' : 'Skip Without Customer'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Products */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center px-2">
                        <div>
                            {selectedCustomer ? (
                                <div className="flex items-center gap-2 text-primary font-medium">
                                    <User size={16} /> {selectedCustomer.name}
                                </div>
                            ) : (
                                <div className="text-muted-foreground font-medium">{isRtl ? 'عميل نقدي' : 'Walk-in Customer'}</div>
                            )}
                        </div>
                        <div className="font-bold text-lg">{totalAmount.toLocaleString(locale)} {t('currency')}</div>
                    </div>

                    {/* Cart Summary (if items exist) */}
                    {cart.length > 0 && (
                        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border mb-6">
                            <h3 className="font-bold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                                <ShoppingCart size={16} />
                                {isRtl ? `السلة (${cart.reduce((s, i) => s + i.quantity, 0)} أصناف)` : `Cart (${cart.reduce((s, i) => s + i.quantity, 0)} items)`}
                            </h3>
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 bg-secondary/20 p-3 rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold line-clamp-1">{item.name}</div>
                                            {editingPriceId === item.id ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="5"
                                                        className="w-28 px-3 py-1.5 bg-background border-2 border-primary text-foreground rounded-lg font-bold text-sm focus:outline-none"
                                                        value={editingPriceValue}
                                                        onChange={(e) => setEditingPriceValue(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleConfirmEditPrice(item.id)}
                                                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEditPrice}
                                                        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-xs mt-0.5">
                                                    <span className="text-muted-foreground">
                                                        {item.price.toLocaleString(locale)} {t('currency')}
                                                    </span>
                                                    {item.price !== item.basePrice && (
                                                        <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">
                                                            {isRtl ? 'سعر مخصص' : 'Custom'}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleStartEditPrice(item.id, item.price)}
                                                        className="text-primary hover:text-primary/80 p-0.5 rounded hover:bg-primary/10 transition-all flex items-center justify-center"
                                                        title={isRtl ? 'تعديل السعر' : 'Edit Price'}
                                                    >
                                                        <Pencil size={11} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-3 bg-background rounded-lg border p-1 border-border">
                                            <button 
                                                data-id={item.id}
                                                data-delta={-1}
                                                onClick={handleUpdateQuantity}
                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-secondary rounded-md"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="font-bold w-6 text-center">{item.quantity}</span>
                                            <button 
                                                data-id={item.id}
                                                data-delta={1}
                                                onClick={handleUpdateQuantity}
                                                disabled={item.quantity >= item.stock}
                                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground active:bg-secondary rounded-md disabled:opacity-30"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                        
                                        <div className="w-20 text-center font-bold text-primary">
                                            {(item.price * item.quantity).toLocaleString(locale)}
                                        </div>
                                        
                                        <button 
                                            data-id={item.id}
                                            onClick={handleRemoveFromCart}
                                            className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Product Search */}
                    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                        <div className="relative mb-6">
                            <Search className={clsx("absolute top-1/2 -translate-y-1/2 text-muted-foreground", isRtl ? "right-3" : "left-3")} size={20} />
                            <input
                                type="text"
                                placeholder={isRtl ? "ابحث عن صنف بالاسم أو SKU..." : "Search products..."}
                                className={clsx("w-full py-4 rounded-xl border bg-background text-lg", isRtl ? "pr-10 pl-4" : "pl-10 pr-4")}
                                value={productQuery}
                                onChange={handleProductQueryChange}
                            />
                            {isSearchingProduct && <Loader2 className={clsx("absolute top-1/2 -translate-y-1/2 animate-spin text-muted-foreground", isRtl ? "left-3" : "right-3")} size={20} />}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-[65vh] overflow-y-auto pb-4">
                            {productResults.map(p => {
                                const stock = p.stock ?? 0;
                                const isOutOfStock = stock <= 0;
                                const inCart = cart.find(i => i.id === p.id)?.quantity || 0;
                                
                                return (
                                    <button
                                        key={p.id}
                                        data-id={p.id}
                                        disabled={isOutOfStock}
                                        onClick={handleAddProductToCart}
                                        className={clsx(
                                            "p-2.5 rounded-xl flex flex-col justify-between min-h-[110px] transition-all border text-right",
                                            isOutOfStock ? "opacity-50 bg-secondary/50 cursor-not-allowed border-border" : "bg-background border-border hover:border-primary hover:shadow-sm active:scale-[0.98]",
                                            inCart > 0 && "border-primary/50 bg-primary/5"
                                        )}
                                    >
                                        <div>
                                            <div className="text-[10px] font-bold px-1.5 py-0.5 bg-secondary rounded w-fit mb-1.5 text-muted-foreground">
                                                {stock} {isRtl ? 'متاح' : 'in stock'}
                                            </div>
                                            <div className="font-semibold leading-tight line-clamp-2 text-[13px] text-foreground">{p.name}</div>
                                        </div>
                                        <div className="mt-2 flex justify-between items-center w-full">
                                            <div className="font-extrabold text-base text-primary">{Number(p.price).toLocaleString(locale)}</div>
                                            {inCart > 0 && (
                                                <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold">
                                                    {inCart}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            {productResults.length === 0 && !isSearchingProduct && (
                                <div className="col-span-3 sm:col-span-4 md:col-span-5 text-center py-10 text-muted-foreground">
                                    {isRtl ? 'لا توجد نتائج بحث للأصناف.' : 'No products found.'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                        <div className="flex items-center gap-3 mb-6 text-primary">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <CreditCard size={24} />
                            </div>
                            <h2 className="text-xl font-bold">{isRtl ? 'تفاصيل الدفع' : 'Payment Details'}</h2>
                        </div>

                        <div className="flex flex-row w-full items-stretch justify-between gap-1 sm:gap-2 mb-8 bg-secondary/10 p-2 sm:p-4 rounded-2xl border border-primary/10">
                            {selectedCustomer && selectedCustomer.balance > 0 ? (
                                <>
                                    <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-background/60 shadow-sm border border-border/50 min-w-0">
                                        <div className="text-[clamp(0.7rem,2.5vw,1rem)] font-medium text-muted-foreground mb-1 whitespace-nowrap">
                                            {isRtl ? 'فاتورة اليوم' : 'This Invoice'}
                                        </div>
                                        <div className="text-[clamp(1.2rem,5vw,2rem)] font-black text-primary flex items-baseline gap-1 whitespace-nowrap">
                                            <span>{totalAmount.toLocaleString(locale)}</span>
                                            <span className="text-[clamp(0.6rem,2vw,0.8rem)] font-bold">{t('currency')}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-center text-[clamp(1.5rem,4vw,2rem)] font-black text-muted-foreground/40">
                                        +
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-background/60 shadow-sm border border-border/50 min-w-0">
                                        <div className="text-[clamp(0.7rem,2.5vw,1rem)] font-medium text-muted-foreground mb-1 whitespace-nowrap">
                                            {isRtl ? 'رصيد سابق' : 'Previous Balance'}
                                        </div>
                                        <div className="text-[clamp(1.2rem,5vw,2rem)] font-black text-red-500 flex items-baseline gap-1 whitespace-nowrap">
                                            <span>{selectedCustomer.balance.toLocaleString(locale)}</span>
                                            <span className="text-[clamp(0.6rem,2vw,0.8rem)] font-bold">{t('currency')}</span>
                                        </div>
                                    </div>
                                    

                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl bg-background/60 shadow-sm border border-border/50 min-w-0">
                                    <div className="text-[clamp(1rem,4vw,1.5rem)] font-medium text-muted-foreground mb-2 whitespace-nowrap">
                                        {isRtl ? 'المطلوب سداده' : 'Total to Pay'}
                                    </div>
                                    <div className="text-[clamp(2.5rem,10vw,4rem)] font-black text-primary flex items-baseline gap-2 whitespace-nowrap">
                                        <span>{totalAmount.toLocaleString(locale)}</span>
                                        <span className="text-[clamp(1rem,4vw,1.5rem)] font-bold">{t('currency')}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mb-6 p-4 bg-secondary/20 rounded-xl border border-primary/10 flex items-center justify-between">
                            <span className="text-sm font-medium">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</span>
                            <span className="font-bold text-lg">💵 {t('sidebar.paymentMethods.CASH' as any)}</span>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium">{isRtl ? 'المبلغ المدفوع' : 'Amount Paid (EGP)'}</label>
                            <div className="relative">
                                <span className={clsx("absolute top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg", isRtl ? "right-4" : "left-4")}>{t('currency')}</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={clsx("w-full py-4 rounded-xl border-2 border-primary/20 focus:border-primary bg-background text-2xl font-black", isRtl ? "pr-16 pl-4" : "pl-16 pr-4")}
                                    value={amountPaid}
                                    onChange={handleAmountPaidChange}
                                    onFocus={handleAmountPaidFocus}
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleSetExactAmount}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-secondary/80"
                                >
                                    {isRtl ? 'المبلغ بالكامل' : 'Exact Amount'}
                                </button>
                                <button 
                                    onClick={handleSetUnpaid}
                                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:bg-secondary/80"
                                >
                                    {isRtl ? 'غير مدفوع' : 'Unpaid'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
                        <div className="flex items-center gap-3 mb-6 text-primary">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Check size={24} />
                            </div>
                            <h2 className="text-xl font-bold">{isRtl ? 'مراجعة وتأكيد' : 'Review & Confirm'}</h2>
                        </div>

                        {selectedCustomer && (
                            <div className="mb-6 p-4 bg-secondary/30 rounded-xl border border-secondary">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">{isRtl ? 'العميل' : 'Customer'}</div>
                                <div className="font-bold text-lg">{selectedCustomer.name}</div>
                                {selectedCustomer.phone && <div className="text-muted-foreground">{selectedCustomer.phone}</div>}
                                {selectedCustomer.balance > 0 && (
                                    <div className="mt-2 text-sm">
                                        {isRtl ? 'الرصيد السابق:' : 'Previous Balance:'} <span className="font-bold text-red-500">{selectedCustomer.balance.toLocaleString(locale)} {t('currency')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-6">
                            <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">{isRtl ? `الأصناف (${cart.length})` : `Items (${cart.length})`}</div>
                            <div className="space-y-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0 border-border">
                                        <div>
                                            <span className="font-medium">{item.name}</span>
                                            <span className="text-muted-foreground text-sm ml-2">×{item.quantity}</span>
                                        </div>
                                        <div className="font-bold">{(item.price * item.quantity).toLocaleString(locale)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground">{isRtl ? 'الإجمالي' : 'Total'}</span>
                                <span className="text-lg font-bold">{totalAmount.toLocaleString(locale)} {t('currency')}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted-foreground">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</span>
                                <span className="font-medium">💵 {t('sidebar.paymentMethods.CASH' as any)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">{isRtl ? 'المبلغ المدفوع' : 'Amount Paid'}</span>
                                <span className="font-bold text-green-600">
                                    {Number(amountPaid).toLocaleString(locale)} {t('currency')}
                                </span>
                            </div>
                            
                            {selectedCustomer && Number(amountPaid) < totalAmount && (
                                <div className="mt-4 pt-4 border-t border-primary/20 flex justify-between items-center">
                                    <span className="font-bold text-red-500">{isRtl ? 'الرصيد الجديد' : 'New Balance'}</span>
                                    <span className="font-black text-red-500">
                                        {(selectedCustomer.balance + totalAmount - Number(amountPaid)).toLocaleString(locale)} {t('currency')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-50">
                <div className="max-w-2xl mx-auto flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={handlePrevStep}
                            disabled={isSubmitting}
                            className="p-4 flex items-center justify-center bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors"
                        >
                            <ArrowLeft className={clsx("w-6 h-6", isRtl && "rotate-180")} />
                        </button>
                    )}
                    
                    {step < 4 ? (
                        <button
                            onClick={handleNextStep}
                            disabled={step === 2 && cart.length === 0}
                            className="flex-1 py-4 flex items-center justify-center relative bg-primary text-primary-foreground font-bold text-lg rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            <span>{isRtl ? 'الخطوة التالية' : 'Next Step'}</span>
                            <ArrowRight className={clsx("w-5 h-5 absolute", isRtl ? "left-6" : "right-6", isRtl && "rotate-180")} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 py-4 flex items-center justify-center relative bg-green-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className={clsx("w-6 h-6 animate-spin absolute", isRtl ? "right-6" : "left-6")} />
                                    <span>{isRtl ? 'جاري المعالجة...' : 'Processing...'}</span>
                                </>
                            ) : (
                                <>
                                    <Check className={clsx("w-6 h-6 absolute", isRtl ? "right-6" : "left-6")} />
                                    <span>{isRtl ? 'تأكيد عملية البيع' : 'Confirm Sale'}</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
