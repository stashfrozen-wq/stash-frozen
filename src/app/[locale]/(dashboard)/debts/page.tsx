/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-nested-conditional */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Filter, Printer, Edit2, Search, Landmark, Eye, X, ArrowLeft, FileText, CreditCard, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { canEditDebts } from '@/app/actions/permissions';
import BulkImportDropzone from '@/components/BulkImportDropzone';
import PrePrintEditModal from '@/components/PrePrintEditModal';
import { PageHeader, Th, Spinner } from '@/components/ui';
import { useLocale } from '@/hooks/useLocale';

interface Customer {
  id: string;
  name: string;
  address?: string | null;
  governorate?: string | null;
  phone?: string | null;
  balance: number;
  invoices?: { user?: { name?: string | null, username: string } | null }[];
}

interface TimelineEntry {
  id: string;
  date: string;
  type: 'INVOICE' | 'PAYMENT';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  salesperson: string | null;
  invoiceId?: string;
  paymentMethod?: string;
  status?: string;
}

interface AccountStatement {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    governorate: string | null;
    balance: number;
  };
  timeline: TimelineEntry[];
  totals: {
    totalDebit: number;
    totalCredit: number;
    currentBalance: number;
  };
}

export default function DebtsPage() {
  const { isRtl } = useLocale();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [governorates, setGovernorates] = useState<string[]>([]);
  const [selectedGov, setSelectedGov] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Account statement state
  const [statementData, setStatementData] = useState<AccountStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementCustomerId, setStatementCustomerId] = useState<string | null>(null);

  useEffect(() => {
    canEditDebts().then(setCanEdit);
  }, []);

  const fetchDebts = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const url = new URL("/api/reports/debts", window.location.origin);
      if (selectedGov) url.searchParams.append("governorate", selectedGov);
      
      const res = await fetch(url.toString());
      const data = await res.json();
      setCustomers(data.customers);
      if (data.governorates) setGovernorates(data.governorates);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGov]);

  useEffect(() => {
    fetchDebts(false);
  }, [fetchDebts]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchName.toLowerCase())
  );

  const handlePrintTable = useCallback(() => {
    window.print();
  }, []);

  const handleShowBulkImport = useCallback(() => setShowBulkImport(true), []);
  const handleCloseBulkImport = useCallback(() => setShowBulkImport(false), []);
  const handleBulkImportSuccess = useCallback(() => {
    setShowBulkImport(false);
    void fetchDebts(true);
  }, [fetchDebts]);

  const handleSearchNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearchName(e.target.value), []);
  const handleGovChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setSelectedGov(e.target.value), []);

  const handleEditCustomerClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.dataset.id;
    if (id) {
        const cust = customers.find(c => c.id === id);
        if (cust) setEditingCustomer(cust);
    }
  }, [customers]);

  const handleCloseEditModal = useCallback(() => setEditingCustomer(null), []);

  // Account statement handlers
  const handleViewStatement = useCallback(async (customerId: string) => {
    setStatementCustomerId(customerId);
    setStatementLoading(true);
    setStatementData(null);
    try {
      const res = await fetch(`/api/customers/${customerId}/account-statement`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStatementData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setStatementLoading(false);
    }
  }, []);

  const handleCloseStatement = useCallback(() => {
    setStatementCustomerId(null);
    setStatementData(null);
  }, []);

  const handleViewStatementClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const id = e.currentTarget.dataset.id;
    if (id) void handleViewStatement(id);
  }, [handleViewStatement]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <PageHeader
        icon={Landmark}
        title={
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tighter uppercase">{isRtl ? 'تقرير المديونيات' : 'Debts Report'}</h1>
            <p className="text-muted-foreground text-sm font-bold">{isRtl ? 'عرض مديونيات العملاء حسب المحافظة' : 'View customer debts by governorate'}</p>
          </div>
        }
        isRtl={isRtl}
        actions={
          <div className="flex gap-3">
            {canEdit && (
              <button
                onClick={handleShowBulkImport}
                className="flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-xl hover:bg-secondary transition-all shadow-sm text-xs font-black uppercase tracking-widest"
              >
                {isRtl ? 'إضافة بالجملة' : 'Bulk Import'}
              </button>
            )}
            <button
              onClick={handlePrintTable}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-xs font-black uppercase tracking-widest active:scale-95"
            >
              <Printer className="w-4 h-4" />
              {isRtl ? 'طباعة الجدول' : 'Print Table'}
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-row gap-2 sm:gap-4 max-w-2xl">
        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm flex items-center p-1">
          <div className="px-3 text-muted-foreground"><Search className="w-5 h-5" /></div>
          <input 
            type="text" 
            placeholder={isRtl ? 'بحث باسم العميل...' : 'Search by name...'} 
            value={searchName}
            onChange={handleSearchNameChange}
            className="w-full bg-transparent border-none focus:ring-0 px-3 py-2 text-foreground text-sm font-bold outline-none"
          />
        </div>

        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm flex items-center p-1">
          <div className="px-3 text-muted-foreground"><Filter className="w-5 h-5" /></div>
          <select 
            value={selectedGov}
            onChange={handleGovChange}
            className="w-full bg-transparent border-none focus:ring-0 px-3 py-2 text-foreground text-sm font-bold outline-none cursor-pointer"
          >
            <option value="">{isRtl ? 'كل المحافظات' : 'All Governorates'}</option>
            {governorates.map(gov => (
              <option key={gov} value={gov}>{gov}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Print Header */}
        <div className="hidden print:block p-8 text-center border-b border-border">
          <h1 className="text-2xl font-black">{isRtl ? 'كشف مديونيات العملاء' : 'Customer Debts Report'}</h1>
          <p className="text-muted-foreground">{selectedGov ? (isRtl ? `محافظة: ${selectedGov}` : `Governorate: ${selectedGov}`) : (isRtl ? 'جميع المحافظات' : 'All Governorates')}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/30 text-muted-foreground border-b border-border">
                <Th align="center">{isRtl ? 'اسم العميل' : 'Customer'}</Th>
                <Th align="center" className="hidden sm:table-cell">{isRtl ? 'المندوب' : 'Salesperson'}</Th>
                <Th align="center" className="hidden sm:table-cell">{isRtl ? 'المحافظة' : 'Governorate'}</Th>
                <Th align="center">{isRtl ? 'المديونية' : 'Debt'}</Th>
                <Th align="center" className="print:hidden">{isRtl ? 'كشف الحساب الكامل' : 'Full Account Statement'}</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-12 text-center text-muted-foreground">
                    <Spinner size={32} label={isRtl ? 'جاري التحميل...' : 'Loading...'} />
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Landmark size={40} className="mb-2 opacity-20" />
                      <p className="text-lg font-black uppercase tracking-tight">{isRtl ? 'لا يوجد عملاء' : 'No customers'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                      <div className="font-bold text-foreground text-xs sm:text-sm">{customer.name}</div>
                      {customer.phone && <div className="text-xs text-muted-foreground mt-1 tabular-nums" dir="ltr">{customer.phone}</div>}
                      {/* Show governorate & salesperson inline on mobile since columns are hidden */}
                      <div className="sm:hidden mt-1 flex flex-wrap items-center justify-center gap-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/50 text-muted-foreground border border-border">
                          {customer.governorate || (isRtl ? 'غير محدد' : 'N/A')}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-secondary/50 text-muted-foreground border border-border">
                          {customer.invoices?.[0]?.user?.name || customer.invoices?.[0]?.user?.username || (isRtl ? 'غير محدد' : 'N/A')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground hidden print:block mt-1">{customer.address}</div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-center text-muted-foreground text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/50 text-muted-foreground border border-border">
                        {customer.invoices?.[0]?.user?.name || customer.invoices?.[0]?.user?.username || (isRtl ? 'غير محدد' : 'N/A')}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-center text-muted-foreground">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/50 text-muted-foreground border border-border">
                        {customer.governorate || (isRtl ? 'غير محدد' : 'N/A')}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-center font-black text-red-600 tabular-nums text-xs sm:text-sm">
                      {Number(customer.balance).toFixed(2)}
                    </td>
                    <td className="px-2 sm:px-6 py-3 sm:py-4 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                          data-id={customer.id}
                          onClick={handleViewStatementClick}
                          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-black bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all active:scale-95"
                          title={isRtl ? 'عرض كشف الحساب الكامل' : 'View Full Account Statement'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isRtl ? 'كشف الحساب' : 'Statement'}</span>
                        </button>
                        {canEdit && (
                          <button 
                            data-id={customer.id}
                            onClick={handleEditCustomerClick}
                            className="p-1.5 sm:p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title={isRtl ? 'تعديل قبل الطباعة' : 'Edit before print'}
                          >
                            <Edit2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!isLoading && filteredCustomers.length > 0 && (
              <tfoot className="bg-secondary/30 border-t-2 border-border">
                <tr>
                  <td className="px-3 sm:px-6 py-4 font-black uppercase text-xs tracking-widest text-muted-foreground text-center">{isRtl ? 'الإجمالي العام' : 'Grand Total'}</td>
                  <td className="hidden sm:table-cell"></td>
                  <td className="hidden sm:table-cell"></td>
                  <td className="px-3 sm:px-6 py-4 text-center font-black text-primary text-lg tabular-nums">
                    {filteredCustomers.reduce((sum, c) => sum + Number(c.balance), 0).toFixed(2)}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modals */}
      {showBulkImport && (
        <BulkImportDropzone 
          onClose={handleCloseBulkImport}
          onSuccess={handleBulkImportSuccess}
        />
      )}

      {editingCustomer && (
        <PrePrintEditModal 
          customer={editingCustomer}
          onClose={handleCloseEditModal}
          onPrint={handlePrintTable}
        />
      )}

      {/* Account Statement Modal */}
      {statementCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseStatement} />
          
          {/* Modal */}
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    {isRtl ? 'كشف الحساب الكامل' : 'Full Account Statement'}
                  </h2>
                  {statementData && (
                    <p className="text-xs text-muted-foreground font-bold">
                      {statementData.customer.name}
                      {statementData.customer.phone && (
                        <span className="mx-2 tabular-nums" dir="ltr">• {statementData.customer.phone}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseStatement}
                className="p-2 hover:bg-secondary rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {statementLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Spinner size={40} label={isRtl ? 'جاري تحميل كشف الحساب...' : 'Loading account statement...'} />
                </div>
              ) : statementData ? (
                <div className="space-y-6">
                  {/* Summary Cards - horizontal, border-only */}
                  <div className="flex items-stretch gap-0 border border-border rounded-xl overflow-hidden">
                    <div className="flex-1 px-4 py-3 text-center border-e border-border">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                          {isRtl ? 'إجمالي المدين' : 'Total Debit'}
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-black text-red-600 tabular-nums">
                        {statementData.totals.totalDebit.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex-1 px-4 py-3 text-center border-e border-border">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <ArrowDownCircle className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                          {isRtl ? 'إجمالي المدفوع' : 'Total Paid'}
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-black text-green-600 tabular-nums">
                        {statementData.totals.totalCredit.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex-1 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Landmark className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground">
                          {isRtl ? 'الرصيد الحالي' : 'Current Balance'}
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-black text-primary tabular-nums">
                        {statementData.totals.currentBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Timeline Table */}
                  {statementData.timeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="font-black text-lg">{isRtl ? 'لا توجد حركات' : 'No transactions'}</p>
                      <p className="text-sm mt-1">{isRtl ? 'لم يتم تسجيل أي فواتير أو دفعات لهذا العميل' : 'No invoices or payments recorded for this customer'}</p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-secondary/30 text-muted-foreground border-b border-border">
                              <th className="px-2 sm:px-4 py-3 text-center font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                                {isRtl ? 'التاريخ' : 'Date'}
                              </th>
                              <th className="px-2 sm:px-4 py-3 text-center font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                                {isRtl ? 'النوع' : 'Type'}
                              </th>
                              <th className="px-2 sm:px-4 py-3 text-center font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                                {isRtl ? 'البيان' : 'Description'}
                              </th>
                              <th className="hidden sm:table-cell px-4 py-3 text-center font-black text-xs uppercase tracking-widest whitespace-nowrap">
                                {isRtl ? 'المندوب' : 'Salesperson'}
                              </th>
                              <th className="px-2 sm:px-4 py-3 text-center font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                                {isRtl ? 'الرصيد قبل' : 'Balance Before'}
                              </th>
                              <th className="px-2 sm:px-4 py-3 text-center font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                                {isRtl ? 'العملية' : 'Operation'}
                              </th>
                              <th className="px-2 sm:px-4 py-3 text-center font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap">
                                {isRtl ? 'الرصيد بعد' : 'Balance After'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {statementData.timeline.map((entry) => (
                              <tr key={entry.id} className="hover:bg-primary/5 transition-colors">
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center tabular-nums text-muted-foreground whitespace-nowrap text-[10px] sm:text-sm">
                                  {new Date(entry.date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">
                                  {entry.type === 'INVOICE' ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-red-500/10 text-red-600 border border-red-500/20">
                                      <FileText className="w-3 h-3 hidden sm:inline" />
                                      {isRtl ? 'فاتورة' : 'Invoice'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-green-500/10 text-green-600 border border-green-500/20">
                                      <CreditCard className="w-3 h-3 hidden sm:inline" />
                                      {isRtl ? 'دفعة' : 'Payment'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-foreground font-bold text-[10px] sm:text-xs whitespace-nowrap">
                                  {entry.description}
                                  {entry.paymentMethod && (
                                    <span className="mx-1 text-muted-foreground">
                                      ({entry.paymentMethod === 'CREDIT' ? (isRtl ? 'آجل' : 'Credit') : (isRtl ? 'نقداً' : 'Cash')})
                                    </span>
                                  )}
                                </td>
                                <td className="hidden sm:table-cell px-4 py-3 text-center">
                                  <span className="text-xs font-bold text-muted-foreground">
                                    {entry.salesperson || (isRtl ? '-' : '-')}
                                  </span>
                                </td>
                                {(() => {
                                  const operation = entry.debit > 0 ? entry.debit : -entry.credit;
                                  const balanceBefore = entry.balance - operation;
                                  return (
                                    <>
                                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-black tabular-nums text-[10px] sm:text-sm">
                                        <span className={balanceBefore > 0 ? 'text-red-600' : balanceBefore < 0 ? 'text-green-600' : 'text-muted-foreground'}>
                                          {balanceBefore.toFixed(2)}
                                        </span>
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-black tabular-nums text-[10px] sm:text-sm">
                                        <span className={operation > 0 ? 'text-red-600' : 'text-green-600'}>
                                          {operation > 0 ? '+' : ''}{operation.toFixed(2)}
                                        </span>
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-center font-black tabular-nums text-[10px] sm:text-sm">
                                        <span className={entry.balance > 0 ? 'text-red-600' : entry.balance < 0 ? 'text-green-600' : 'text-muted-foreground'}>
                                          {entry.balance.toFixed(2)}
                                        </span>
                                      </td>
                                    </>
                                  );
                                })()}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-secondary/30 border-t-2 border-border">
                            <tr>
                              <td colSpan={3} className="sm:hidden px-2 py-3 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-center">
                                {isRtl ? 'الإجمالي' : 'Total'}
                              </td>
                              <td colSpan={4} className="hidden sm:table-cell px-4 py-3 font-black uppercase text-xs tracking-widest text-muted-foreground text-center">
                                {isRtl ? 'الإجمالي' : 'Total'}
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-center font-black tabular-nums text-muted-foreground text-xs sm:text-base">
                                -
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-center font-black tabular-nums text-xs sm:text-base">
                                <span className="text-red-600">+{statementData.totals.totalDebit.toFixed(2)}</span>
                                {' / '}
                                <span className="text-green-600">-{statementData.totals.totalCredit.toFixed(2)}</span>
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-center font-black tabular-nums text-primary text-xs sm:text-base">
                                {statementData.totals.currentBalance.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <X size={48} className="mb-4 opacity-20" />
                  <p className="font-black text-lg">{isRtl ? 'حدث خطأ' : 'Error occurred'}</p>
                  <p className="text-sm mt-1">{isRtl ? 'لم نتمكن من تحميل كشف الحساب' : 'Could not load account statement'}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
              <button
                onClick={handleCloseStatement}
                className="flex items-center gap-2 px-4 py-2 text-sm font-black text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                {isRtl ? 'رجوع' : 'Back'}
              </button>
              {statementData && statementData.timeline.length > 0 && (
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <span>{isRtl ? 'عدد الحركات:' : 'Transactions:'}</span>
                  <span className="font-black text-foreground tabular-nums">{statementData.timeline.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
