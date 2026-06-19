"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { X, Calculator, Printer } from "lucide-react";

interface CustomerData {
  balance?: number | string;
  name?: string;
  governorate?: string | null;
}

interface PrePrintEditModalProps {
  customer: CustomerData;
  onClose: () => void;
  onPrint: () => void;
}

export default memo(function PrePrintEditModal({ customer, onClose, onPrint }: PrePrintEditModalProps) {
  const [balance, setBalance] = useState<number>(Number(customer.balance || 0));
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("FIXED");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleBalanceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBalance(Math.max(0, Number(e.target.value) || 0));
  }, []);

  const handleDiscountTypeFixed = useCallback(() => {
    setDiscountType("FIXED");
  }, []);

  const handleDiscountTypePercentage = useCallback(() => {
    setDiscountType("PERCENTAGE");
  }, []);

  const handleDiscountValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountValue(Math.max(0, Number(e.target.value) || 0));
  }, []);

  useEffect(() => {
    const computed =
      discountType === 'PERCENTAGE'
        ? balance - balance * (discountValue / 100)
        : balance - discountValue;
    setFinalTotal(Math.max(0, computed));
  }, [balance, discountType, discountValue]);

  const handlePrint = useCallback(async () => {
    // Optionally save to DB if we want this to be permanent before printing
    // For now we will assume it's just updating the view and we could trigger a save API here
    setIsSaving(true);
    try {
      // Execute the print callback which will trigger the print dialog
      onPrint();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      onClose();
    }
  }, [onPrint, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        
        <div className="p-6 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">تعديل الفاتورة قبل الطباعة</h2>
              <p className="text-sm text-gray-500 mt-1">{customer.name} - {customer.governorate}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-800 bg-gray-100/50 hover:bg-gray-200/80 border border-gray-200/60 hover:border-gray-300 rounded-xl transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:scale-105 active:scale-95 flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 transition-transform duration-300 hover:rotate-90" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">إجمالي المديونية (قبل الخصم)</label>
            <div className="relative">
              <input 
                type="number" 
                min="0"
                value={balance}
                onChange={handleBalanceChange}
                className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white/50"
              />
              <span className="absolute right-4 top-3 text-gray-400">EGP</span>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-800">تطبيق خصم</h3>
            </div>
            
            <div className="flex gap-2 p-1 bg-white rounded-lg border border-gray-200 mb-4">
              <button 
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${discountType === 'FIXED' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={handleDiscountTypeFixed}
              >
                مبلغ ثابت ($)
              </button>
              <button 
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${discountType === 'PERCENTAGE' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={handleDiscountTypePercentage}
              >
                نسبة مئوية (%)
              </button>
            </div>

            <div className="relative">
              <input 
                type="number" 
                min="0"
                value={discountValue}
                onChange={handleDiscountValueChange}
                className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <span className="absolute right-4 top-2.5 text-gray-400 font-medium">
                {discountType === 'PERCENTAGE' ? '%' : 'EGP'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-500">الإجمالي النهائي</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{finalTotal.toFixed(2)}</p>
            </div>
          </div>

        </div>

        <div className="p-4 bg-gray-50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-200/50 rounded-xl transition-colors"
          >
            إلغاء
          </button>
          <button 
            onClick={handlePrint}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all shadow-[0_8px_16px_rgba(37,99,235,0.2)] hover:shadow-[0_12px_24px_rgba(37,99,235,0.3)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            طباعة
          </button>
        </div>

      </div>
    </div>
  );
});
