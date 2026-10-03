import React, { useState } from 'react';
import { FileText, Copy, Check, ShieldCheck, AlertTriangle, Route, Award, FileCode } from 'lucide-react';

export default function ComplianceMemo({ response, onInspectClause, onOpenForm }) {
  const [copied, setCopied] = useState(false);

  if (!response) return null;

  const dec = response.decision || {};
  const memoText = response.compliance_memo || '';

  // Helper to extract sections from Markdown memo
  const extractSection = (titlePattern, fallback) => {
    if (!memoText) return fallback;
    const regex = new RegExp(`\\*\\*\\d+\\.\\s*${titlePattern}[^:]*\\*\\*:\\s*([\\s\\S]*?)(?=\\n\\n\\*\\*\\d+\\.|\$)`, 'i');
    const m = memoText.match(regex);
    return m ? m[1].trim() : fallback;
  };

  const understanding = extractSection(
    'Requisition Understanding',
    response.summary || 'Procurement evaluated deterministically against statutory rules.'
  );

  const ruleRationale = extractSection(
    'Why This Rule Applies',
    `Process governed under ${dec.matched_rule_id || 'STATUTORY_RULE'} authorizing '${dec.method || 'Standard Procedure'}'. Sanction authority designated as ${dec.approver || 'Competent Authority'}.`
  );

  const edgeCases = extractSection(
    'Identified Issues',
    dec.status === 'NEEDS_INFO'
      ? `Mandatory parameter(s) missing: ${(dec.missing_fields || []).join(', ')}`
      : dec.status === 'ESCALATE'
      ? `Statutory exception triggered: ${(dec.escalation_reasons || []).join('; ')}`
      : 'Verify GeM portal availability report (GeMAR&PTS) prior to outside market purchase.'
  );

  const actionRoadmap = extractSection(
    'Step-by-Step Action Roadmap|Next Operational Steps|Operational Roadmap',
    `Obtain required quotation(s), prepare comparative evaluation statement, and submit for financial sanction to ${dec.approver || 'Competent Authority'}.`
  );

  const approvalsAndForms = extractSection(
    'Required Forms & Approvals|Mandatory Approvals & Forms',
    `Mandatory completion of ${(dec.required_documents || ['Indent Form']).join(', ')} with formal sanction by ${dec.approver || 'Competent Authority'}.`
  );

  const handleCopy = () => {
    const fullMemo = memoText || 
      `### Statutory Procurement Compliance Memo\n\n` +
      `**1. Requisition Understanding**: ${understanding}\n\n` +
      `**2. Why This Rule Applies**: ${ruleRationale}\n\n` +
      `**3. Identified Issues / Precautions**: ${edgeCases}\n\n` +
      `**4. Step-by-Step Action Roadmap**: ${actionRoadmap}\n\n` +
      `**5. Mandatory Approvals & Forms**: ${approvalsAndForms}`;

    navigator.clipboard.writeText(fullMemo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-6 rounded-2xl bg-[#0F172A] border border-emerald-500/30 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E293B] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Statutory Procurement Compliance Memo</h3>
            <p className="text-xs text-slate-400">
              Plain-English guidance synthesized for department heads and audit officers
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Memo</span>
            </>
          )}
        </button>
      </div>

      {/* 5-Part Structured Memo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        
        {/* 1. Requisition Understanding */}
        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <span>📋</span>
            <span>1. Requisition Understanding</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {understanding}
          </p>
        </div>

        {/* 2. Why This Rule Applies */}
        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
            <span>⚖️</span>
            <span>2. Why This Rule Applies</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {ruleRationale}
          </p>
        </div>

        {/* 3. Identified Issues & Edge Cases */}
        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <span>⚠️</span>
            <span>3. Identified Issues / Precautions</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {edgeCases}
          </p>
        </div>

        {/* 4. Next Operational Steps */}
        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <span>🚀</span>
            <span>4. Step-by-Step Action Roadmap</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {actionRoadmap}
          </p>
        </div>

        {/* 5. Mandatory Approvals & Forms (Span 2) */}
        <div className="p-4 rounded-xl bg-[#070A11] border border-[#1E293B] space-y-2 md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
            <span>📝</span>
            <span>5. Mandatory Approvals & Forms</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {approvalsAndForms}
          </p>

          {/* Form & Citation Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-mono text-slate-400 font-semibold">Forms to Sign:</span>
            {dec.required_documents && dec.required_documents.length > 0 ? (
              dec.required_documents.map((doc, i) => (
                <button
                  key={i}
                  onClick={() => onOpenForm && onOpenForm(doc)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCode className="w-3 h-3" />
                  <span>{doc}</span>
                </button>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">None mandated</span>
            )}

            {dec.citations && dec.citations.length > 0 && (
              <>
                <span className="text-[11px] font-mono text-slate-400 font-semibold ml-2">Citations:</span>
                {dec.citations.map((cId, i) => (
                  <button
                    key={i}
                    onClick={() => onInspectClause && onInspectClause(cId)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer"
                  >
                    {cId}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
