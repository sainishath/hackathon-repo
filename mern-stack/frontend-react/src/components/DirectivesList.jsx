import React from 'react';
import { ListOrdered } from 'lucide-react';

export default function DirectivesList({ steps, onSelectClause, status }) {
  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-[#1E293B] mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-emerald-400" />
            Step-by-Step Action Plan
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Clear, cited steps generated strictly from verified rules
          </p>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
          Official Rules Cited
        </span>
      </div>

      <div className="space-y-4">
        {!steps || steps.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center italic">
            No operational sequence generated ({status || 'IDLE'} status).
          </div>
        ) : (
          steps.map((s, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-[#070A11] border border-[#1E293B]"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-mono font-bold text-emerald-400 shrink-0 mt-0.5">
                {s.n ?? idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-200 leading-relaxed font-normal">{s.action}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Official Rules Cited:</span>
                  {(s.clause_ids || []).map((cid) => (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => onSelectClause(cid)}
                      className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer font-semibold"
                      title="Click any clause to inspect original text and legal updates"
                    >
                      {cid}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
