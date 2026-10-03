import React from 'react';
import { ShieldAlert, Database, Server, Cpu, History, Download } from 'lucide-react';

export default function Header({ providerUsed, gatewayStatus, onOpenAudits, onExportAudit }) {
  const getProviderInfo = () => {
    const prov = (providerUsed || '').toLowerCase();
    if (prov.includes('gemini')) {
      return {
        text: '⚡ Gemini 2.5 Flash',
        color: 'text-emerald-400',
        dot: 'bg-emerald-400',
      };
    }
    if (prov.includes('ollama') || prov.includes('llama')) {
      return {
        text: '🦙 Ollama Llama 3',
        color: 'text-cyan-400',
        dot: 'bg-cyan-400',
      };
    }
    return {
      text: '🛡️ Deterministic (Offline)',
      color: 'text-slate-300',
      dot: 'bg-emerald-400',
    };
  };

  const provider = getProviderInfo();
  const isMongoConnected = gatewayStatus?.mongodb?.connected;
  const isFastApiOnline = gatewayStatus?.fastApi?.online;

  return (
    <header className="sticky top-0 z-40 bg-[#070A11]/90 backdrop-blur-2xl border-b border-[#1E293B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white font-mono">
                PROCURE<span className="text-emerald-400">GUARD</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold hidden sm:inline">
                MERN Edition
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block">
              Institutional Procurement Compliance Engine (GFR 2017 & Goods Manual 2024)
            </p>
          </div>
        </div>

        {/* Live Architecture Status Badges */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Express Gateway Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F172A] border border-[#1E293B] text-[11px] font-mono">
            <Server className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">Express:</span>
            <span className="text-emerald-400 font-bold">:5000</span>
          </div>

          {/* FastAPI Core Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F172A] border border-[#1E293B] text-[11px] font-mono">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400">FastAPI:</span>
            <span className={isFastApiOnline !== false ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {isFastApiOnline !== false ? "Active" : "Connecting"}
            </span>
          </div>

          {/* MongoDB Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F172A] border border-[#1E293B] text-[11px] font-mono">
            <Database className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">MongoDB:</span>
            <span className={isMongoConnected ? "text-emerald-400 font-bold" : "text-teal-400 font-bold"}>
              {isMongoConnected ? "Connected" : "In-Memory"}
            </span>
          </div>

          {/* Active LLM Provider */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F172A] border border-[#1E293B] text-[11px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${provider.dot}`}></span>
            <span className={provider.color}>{provider.text}</span>
          </div>
        </div>

        {/* Action Controls: MongoDB Audits & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAudits}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/10"
            title="Open MongoDB Audit Trail Drawer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Logs</span>
          </button>

          <button
            onClick={onExportAudit}
            className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            title="Export JSON Compliance Verdict"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

      </div>
    </header>
  );
}
