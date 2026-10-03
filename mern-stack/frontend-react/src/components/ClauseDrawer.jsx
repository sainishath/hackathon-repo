import React, { useState, useEffect } from 'react';
import { BookOpen, X, Loader2 } from 'lucide-react';

export default function ClauseDrawer({ clauseId, onClose }) {
  const [tab, setTab] = useState('verbatim');
  const [clauseData, setClauseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clauseId) {
      setClauseData(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/clause/${encodeURIComponent(clauseId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Clause '${clauseId}' not found`);
        return res.json();
      })
      .then((data) => {
        setClauseData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [clauseId]);

  if (!clauseId) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0F172A] border-l border-[#1E293B] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col">
      {/* Drawer Header */}
      <div className="p-5 border-b border-[#1E293B] flex items-center justify-between bg-[#070A11]/60">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-bold text-white font-mono">Official Rule Details</h3>
            <p className="text-[11px] text-slate-400">Inspecting original rule text and legal history.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1E293B] bg-[#070A11] px-4">
        <button
          onClick={() => setTab('verbatim')}
          className={`py-2.5 px-3 text-xs font-semibold transition border-b-2 ${
            tab === 'verbatim'
              ? 'text-emerald-400 border-emerald-400'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          Official Clause Text
        </button>
        <button
          onClick={() => setTab('diff')}
          className={`py-2.5 px-3 text-xs font-semibold transition border-b-2 ${
            tab === 'diff'
              ? 'text-cyan-400 border-cyan-400'
              : 'text-slate-400 hover:text-white border-transparent'
          }`}
        >
          Old vs. New Rule (2017 vs. 2024)
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
            <span>Loading official rule text...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            <strong>Error:</strong> {error}
          </div>
        ) : !clauseData ? null : tab === 'verbatim' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {clauseData.clause_id}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    clauseData.is_current
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {clauseData.is_current ? 'Active Statutory' : 'Superseded'}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-white">{clauseData.section_path}</h4>
              <p className="text-[11px] text-slate-400 mt-1">
                {clauseData.doc_title} (v{clauseData.version}, Effective {clauseData.effective_date})
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 font-mono">
                Official Clause Text
              </span>
              <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B] text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
                {clauseData.text}
              </div>
            </div>

            {clauseData.superseded_by && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                <strong>Superseded by:</strong> <code className="font-mono">{clauseData.superseded_by}</code>{' '}
                (Manual for Procurement of Goods 2024 update)
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1">
                Old vs. New Rule (2017 vs. 2024)
              </span>
              <h4 className="text-xs font-bold text-white">
                GFR 2017 Rule 154 vs. Goods Manual 2024 Para 4.12
              </h4>
            </div>

            <div className="p-4 rounded-xl bg-[#070A11] border border-rose-500/30 font-mono text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                Superseded Baseline (GFR 2017 Rule 154)
              </span>
              <p className="line-through text-rose-300/80">
                "Purchase of goods up to the value of Rs. 25,000 (Rupees twenty-five thousand) only on each
                occasion may be made without inviting quotations..."
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#070A11] border border-emerald-500/30 font-mono text-xs text-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Current Law (Goods Manual 2024 Para 4.12)
              </span>
              <p className="text-emerald-300 font-semibold">
                "Purchase of goods up to the value of Rs. 50,000 (Rupees fifty thousand) only on each occasion
                may be made without inviting quotations..."
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200">
              <span className="font-bold">Why this matters:</span> In 2024, the Ministry of Finance increased
              direct purchase thresholds from ₹25,000 to ₹50,000, and committee purchases from ₹2.5 Lakh to ₹5
              Lakh. Our engine enforces the latest 2024 rules.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
