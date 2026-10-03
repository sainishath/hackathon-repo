import React, { useState, useEffect } from 'react';
import { FileCheck2, Printer, X, Loader2 } from 'lucide-react';

export default function FormModal({ formId, onClose }) {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!formId) {
      setFormData(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/form/${encodeURIComponent(formId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Form template '${formId}' could not be retrieved.`);
        return res.json();
      })
      .then((data) => {
        setFormData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [formId]);

  if (!formId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#070A11]/80">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-bold text-white font-mono">
                {formData
                  ? `Form: ${formData.file_name.replace('.md', '').toUpperCase().replace(/_/g, ' ')}`
                  : 'Procurement Form Preview'}
              </h3>
              <span className="text-[11px] text-slate-400 font-normal block">
                Standard government format. Review required fields and signatures.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-200 font-mono whitespace-pre-wrap bg-[#070A11]/60 leading-relaxed border-t border-b border-[#1E293B]">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
              <span>Loading template...</span>
            </div>
          ) : error ? (
            <div className="text-rose-400 py-4">{error}</div>
          ) : (
            formData?.content || 'No content.'
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#070A11] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>GFR 2017 & Manual for Procurement of Goods 2024</span>
          <span className="text-emerald-400 font-semibold">Official Form Template</span>
        </div>
      </div>
    </div>
  );
}
