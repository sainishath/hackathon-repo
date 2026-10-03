import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Database, Clock, ArrowRight, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function AuditLogModal({ isOpen, onClose, onLoadRecord }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mongoConnected, setMongoConnected] = useState(false);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/audits?limit=50');
      const data = await resp.json();
      setLogs(data.logs || []);
      setMongoConnected(Boolean(data.mongoConnected));
    } catch (err) {
      console.error('Failed to fetch audits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudits();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-[#090D16] border-l border-[#1E293B] shadow-2xl flex flex-col h-full z-10">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#1E293B] bg-[#0F172A] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-white">MongoDB Audit Trail</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${mongoConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'}`}>
                {mongoConnected ? 'MongoDB Live' : 'In-Memory Buffer'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Immutable ledger of all procurement compliance evaluations logged by Express.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAudits}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Refresh Audit Records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Records List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {loading && logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
              Loading audit records from MongoDB...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No audit records logged yet. Run an evaluation to see it recorded here.
            </div>
          ) : (
            logs.map((log, idx) => {
              const isDecided = log.decisionStatus === 'DECIDED';
              const isNeedsInfo = log.decisionStatus === 'NEEDS_INFO';
              const statusColor = isDecided
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : isNeedsInfo
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

              return (
                <div
                  key={log._id || idx}
                  className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-slate-700 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {log.decisionStatus}
                    </span>
                  </div>

                  <p className="text-xs text-white font-medium line-clamp-2 leading-relaxed">
                    "{log.rawText || log.summary || 'Procurement Requisition'}"
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">RULE ID</span>
                      <span className="text-emerald-400 font-semibold">{log.matchedRuleId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">APPROVER</span>
                      <span className="text-slate-200 truncate block">{log.approver}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500">
                    <span>Engine: <strong className="text-slate-400">{log.providerUsed}</strong></span>
                    <span>{log.latencyMs} ms</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#070A11] flex items-center justify-between text-xs text-slate-400">
          <span>Total Records: <strong className="text-white font-mono">{logs.length}</strong></span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Close Drawer
          </button>
        </div>

      </div>
    </div>
  );
}
