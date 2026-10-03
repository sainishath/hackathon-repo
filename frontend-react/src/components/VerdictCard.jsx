import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function VerdictCard({ response, providerUsed }) {
  if (!response || !response.decision) return null;

  const dec = response.decision;
  const isNeedsInfo = dec.status === 'NEEDS_INFO';
  const isEscalate = dec.status === 'ESCALATE';
  const isDecided = dec.status === 'DECIDED';

  let borderColor = 'border-emerald-500/30';
  let statusBadgeText = 'APPROVED TO PROCEED (Rule Matched)';
  let statusBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  let methodTitle = dec.method || 'Direct Purchase without Quotation';
  let iconWrapperClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  let StatusIcon = CheckCircle2;

  if (isNeedsInfo) {
    borderColor = 'border-amber-500/30';
    statusBadgeText = 'MORE INFORMATION NEEDED';
    statusBadgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    methodTitle = 'Information Missing';
    iconWrapperClass = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    StatusIcon = AlertTriangle;
  } else if (isEscalate) {
    borderColor = 'border-rose-500/30';
    statusBadgeText = 'ESCALATE TO HIGHER AUTHORITY';
    statusBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    methodTitle = 'Higher Approval Required';
    iconWrapperClass = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    StatusIcon = AlertOctagon;
  }

  const prov = (providerUsed || '').toLowerCase();
  let providerPill = {
    text: '🛡️ Deterministic Engine (Offline)',
    class: 'bg-slate-800 text-slate-300 border-slate-700',
    dot: 'bg-emerald-400',
  };

  if (prov.includes('gemini')) {
    providerPill = {
      text: '⚡ Powered by Gemini 2.5 Flash',
      class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
    };
  } else if (prov.includes('ollama') || prov.includes('llama')) {
    providerPill = {
      text: '🦙 Powered by Ollama Llama 3',
      class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      dot: 'bg-cyan-400',
    };
  }

  return (
    <div className={`bg-[#0F172A] border ${borderColor} rounded-2xl p-6 sm:p-8 transition-all shadow-xl`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1E293B]">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${iconWrapperClass}`}>
            <StatusIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono tracking-widest uppercase text-slate-400">
                Statutory Determination:
              </span>
              <span className={`font-extrabold text-sm px-3 py-0.5 rounded-full border ${statusBadgeClass}`}>
                {statusBadgeText}
              </span>
              <span className={`font-mono text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${providerPill.class}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${providerPill.dot}`} />
                <span>{providerPill.text}</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {methodTitle}
            </h2>
          </div>
        </div>

        <div className="text-right flex md:flex-col items-center md:items-end justify-between gap-1">
          <span className="text-xs text-slate-400">Authoritative Rule Match:</span>
          <span className="font-mono text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            {dec.matched_rule_id || 'NO_RULE_MATCH'}
          </span>
        </div>
      </div>

      {/* Escalation Banner */}
      {isEscalate && dec.escalation_reasons && dec.escalation_reasons.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-300">Statutory Escalation Mandated</h4>
              <p className="text-xs text-rose-200 mt-1">
                {dec.escalation_reasons.map((r, i) => (
                  <span key={i} className="block">• {r}</span>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Needs Info Banner */}
      {isNeedsInfo && dec.missing_fields && dec.missing_fields.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">Mandatory Details Missing</h4>
              <p className="text-xs text-amber-200 mt-1">
                Missing fields required for compliance check:{' '}
                {dec.missing_fields.map((f, i) => (
                  <code key={i} className="font-mono bg-black/40 text-amber-300 px-1.5 py-0.5 rounded mr-1">
                    {f}
                  </code>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Financial Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Allowed Purchase Method
          </span>
          <span className="text-sm font-bold text-white block">
            {dec.method || 'Escalation Required'}
          </span>
          <span className="text-[10px] text-slate-500">Manual 2024 Para 4.12</span>
        </div>

        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Required Approver
          </span>
          <span className="text-sm font-bold text-white block">
            {dec.approver || 'Not Determined'}
          </span>
          <span className="text-[10px] text-slate-500">Statutory Competent Authority</span>
        </div>

        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Minimum Quotations Required
          </span>
          <span className="text-sm font-bold text-white block">
            {dec.min_quotations ?? 0} Quotations
          </span>
          <span className="text-[10px] text-slate-500">
            {dec.min_quotations === 0 ? 'No quotation survey needed' : 'Competitive procurement'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B]">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Committee Requirement
          </span>
          <span className="text-sm font-bold text-white block">
            {dec.committee_required ? 'Mandatory (3 Members)' : 'Not Required'}
          </span>
          <span className="text-[10px] text-slate-500">
            {dec.committee_required ? 'Local Purchase Committee' : 'Individual sanction'}
          </span>
        </div>
      </div>

      {/* Summary Prose */}
      <div className="mt-6 pt-5 border-t border-[#1E293B]">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
          Executive Summary
        </span>
        <p className="text-sm text-slate-200 leading-relaxed font-normal">
          {response.summary || 'Statutory evaluation executed.'}
        </p>
      </div>
    </div>
  );
}
