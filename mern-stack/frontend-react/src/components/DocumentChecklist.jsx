import React from 'react';
import { CheckSquare, CheckCircle2, FileText } from 'lucide-react';

export default function DocumentChecklist({ checklist, onSelectForm, status }) {
  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-7 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-[#1E293B] mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            Mandatory Audit Checklist
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Documents and approvals you must keep on file
          </p>
        </div>
        <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-semibold">
          Mandatory Forms & Templates
        </span>
      </div>

      <div className="space-y-3">
        {!checklist || checklist.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center italic">
            No forms mandated ({status || 'IDLE'} status).
          </div>
        ) : (
          checklist.map((c, idx) => {
            const formDisplayName = (c.form_id || '').replace('.md', '').toUpperCase();

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#070A11] border border-[#1E293B]"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-white">{c.item}</span>
                  {c.mandatory ? (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      (Mandatory)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">(Optional)</span>
                  )}
                </div>
                <div>
                  {c.form_id && (
                    <button
                      type="button"
                      onClick={() => onSelectForm(c.form_id)}
                      className="text-[11px] font-mono font-medium text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                      title="Click to view, fill, and print required official forms"
                    >
                      <FileText className="w-3 h-3" /> View {formDisplayName}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
