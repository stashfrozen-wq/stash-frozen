"use client";

import { useState, useCallback, memo } from "react";
import { UploadCloud, CheckCircle, AlertCircle, X } from "lucide-react";

interface ParsedCustomer {
  name: string;
  phone?: string;
  address?: string;
  governorate?: string;
  balance?: string | number;
}

interface BulkImportDropzoneProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default memo(function BulkImportDropzone({ onSuccess, onClose }: BulkImportDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCustomer[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    const Papa = (await import("papaparse")).default;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as ParsedCustomer[];
        // Filter out completely empty rows
        const validData = data.filter(r => r.name && r.name.trim() !== "");
        if (validData.length === 0) {
          setError("No valid data found. Ensure your CSV has a 'name' column.");
          return;
        }
        setParsedData(validData);
        setError(null);
      },
      error: (error) => {
        setError("Error parsing CSV: " + error.message);
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  const handleUpload = useCallback(async () => {
    if (!parsedData) return;
    setIsUploading(true);
    try {
      const res = await fetch("/api/customers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [parsedData, onSuccess]);

  const handleCancelParse = useCallback(() => {
    setParsedData(null);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden transform transition-all">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">إضافة عملاء بالجملة (Bulk Import)</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {!parsedData ? (
            <div 
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${dragActive ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">اسحب وأفلت ملف CSV هنا</p>
              <p className="text-sm text-gray-500 mb-4">أو انقر لاختيار ملف</p>
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg cursor-pointer transition-colors shadow-lg shadow-blue-500/30">
                اختيار ملف
                <input type="file" accept=".csv" className="hidden" onChange={handleChange} />
              </label>
              <div className="mt-6 text-xs text-gray-400 text-left">
                <p>الحقول المدعومة (Header):</p>
                <code className="bg-gray-100 px-2 py-1 rounded">name, phone, address, governorate, balance</code>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-4 text-green-600 bg-green-50 p-4 rounded-lg">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">تم قراءة الملف بنجاح</p>
                  <p className="text-sm text-green-700">{parsedData.length} سجل جاهز للرفع</p>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg mb-6 shadow-inner">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-2">الاسم</th>
                      <th className="px-4 py-2">المحافظة</th>
                      <th className="px-4 py-2">المديونية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2">{row.governorate || '-'}</td>
                        <td className="px-4 py-2">{row.balance || '0'}</td>
                      </tr>
                    ))}
                    {parsedData.length > 50 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-gray-500 italic bg-gray-50">
                          ... و {parsedData.length - 50} سجل آخر
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={handleCancelParse}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isUploading}
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                  {isUploading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : null}
                  {isUploading ? 'جاري الرفع...' : 'تأكيد وحفظ'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg animate-in shake">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
