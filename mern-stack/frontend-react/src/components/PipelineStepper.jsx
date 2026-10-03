import React from 'react';
import { GitCommit, Check, X, AlertTriangle } from 'lucide-react';

export default function PipelineStepper({ decision, latencyMs, loading }) {
  const isNeedsInfo = decision?.status === 'NEEDS_INFO';
  const isEscalate = decision?.status === 'ESCALATE';
  const isDecided = decision?.status === 'DECIDED';

  const stages = [
    {
      id: 'step-intake',
      num: '01',
      title: '01 Input Check',
      desc: 'Verifies category, price, and required information.',
      state: isNeedsInfo ? 'error' : isDecided || isEscalate ? 'done' : 'idle',
    },
    {
      id: 'step-rules',
      num: '02',
      title: '02 Amount Limits',
      desc: 'Finds the exact statutory limit (GFR 2017 & 2024 Goods Manual).',
      state: isNeedsInfo ? 'skipped' : isEscalate ? 'warn' : isDecided ? 'done' : 'idle',
    },
    {
      id: 'step-retrieval',
      num: '03',
      title: '03 Policy Search',
      desc: 'Retrieves exact clauses and mandatory forms from the 69-document index.',
      state: isDecided ? 'done' : 'skipped',
    },
    {
      id: 'step-guardrails',
      num: '04',
      title: '04 Citation Check',
      desc: 'Ensures the AI output quotes only real, verified rules—no hallucinations.',
      state: isDecided ? 'done' : 'skipped',
    },
  ];

  return (
    <section className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <GitCommit className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              2. How Your Request Is Checked (4-Stage Compliance Gate)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Every purchase passes through four strict verification stages before any recommendation is made.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hidden sm:inline-block">
            REAL-TIME DETERMINISTIC PROOF
          </span>
          <div className="font-mono text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/60">
            Latency:{' '}
            <span className="text-emerald-400 font-bold">
              {loading ? 'Evaluating...' : latencyMs ? `${latencyMs} ms` : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
        {stages.map((st) => {
          let cardClass = 'border-slate-800 bg-[#070A11]';
          let badgeClass = 'bg-slate-800 text-slate-400 border border-slate-700';
          let icon = st.num;

          if (st.state === 'done') {
            cardClass = 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            badgeClass = 'bg-emerald-500 text-slate-950 font-bold';
            icon = <Check className="w-3.5 h-3.5" />;
          } else if (st.state === 'warn') {
            cardClass = 'border-rose-500/40 bg-rose-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
            badgeClass = 'bg-rose-500 text-white font-bold';
            icon = <X className="w-3.5 h-3.5" />;
          } else if (st.state === 'error') {
            cardClass = 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
            badgeClass = 'bg-amber-500 text-slate-950 font-bold';
            icon = '!';
          } else if (st.state === 'skipped') {
            cardClass = 'border-slate-800 bg-[#070A11] opacity-50';
          }

          return (
            <div
              key={st.id}
              className={`p-3.5 rounded-xl border transition relative overflow-hidden ${cardClass}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  STAGE {st.num}
                </span>
                <span
                  className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${badgeClass}`}
                >
                  {icon}
                </span>
              </div>
              <div className="text-xs font-semibold text-white">{st.title}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{st.desc}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
