import React from 'react';
import { ShieldAlert, Download, Edit3, Zap, Activity } from 'lucide-react';

export default function Header({ providerUsed, onExportAudit }) {
  const getProviderInfo = () => {
    const prov = (providerUsed || '').toLowerCase();
    if (prov.includes('gemini')) {
      return {
        text: '⚡ Powered by Gemini 2.5 Flash',
        color: 'text-emerald-400',
        dot: 'bg-emerald-400'
      };
    }
    if (prov.includes('ollama') || prov.includes('llama')) {
      return {
        text: '🦙 Powered by Ollama Llama 3',
        color: 'text-cyan-400',
        dot: 'bg-cyan-400'
      };
    }
    return {
      text: '🛡️ Deterministic Engine (Offline)',
      color: 'text-slate-300',
      dot: 'bg-emerald-400'
    };
  };

  const provider = getProviderInfo();

  return (
    <header className="sticky top-0 z-40 bg-[#070A11]/85 backdrop-blur-2xl border-b border-[#1E293B] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white font-mono">
                PROCURE<span className="text-emerald-400">GUARD</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                Ruleset: Goods Manual 2024 & GFR 2017
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Government & University Procurement Guide (GFR 2017 & Goods Manual 2024)
            </p>
          </div>
        </div>

        {/* Center: Live LLM Cascade Beacon */}
        <div className="hidden md:flex items-center bg-[#0F172A] border border-[#1E293B] px-3.5 py-1 rounded-full gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${provider.dot}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${provider.dot}`}></span>
          </span>
          <span className={`font-mono text-xs font-semibold tracking-wide ${provider.color}`}>
            {provider.text}
          </span>
          <span className="text-slate-600 font-mono text-xs">|</span>
          <span className="font-mono text-[11px] text-cyan-300 font-medium">Corpus: 69 Verified Rules & Forms</span>
        </div>

        {/* Action Buttons */}
        <nav className="flex items-center gap-2 sm:gap-3 text-xs font-medium">
          <a href="#intake-section" className="hover:text-white text-slate-300 transition hidden lg:flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-slate-800/60">
            <Edit3 className="w-3.5 h-3.5" /> Intake
          </a>
          <a href="#verdict-section" className="hover:text-white text-slate-300 transition hidden lg:flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-slate-800/60">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Directives
          </a>
          <a href="#telemetry-section" className="hover:text-white text-slate-300 transition hidden lg:flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-slate-800/60">
            <Activity className="w-3.5 h-3.5 text-cyan-400" /> Benchmarks
          </a>

          <button
            onClick={onExportAudit}
            className="px-3.5 py-1.5 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-slate-200 border border-[#1E293B] hover:border-slate-700 transition flex items-center gap-1.5 font-mono text-xs shadow-inner"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Audit</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
