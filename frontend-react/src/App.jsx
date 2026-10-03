import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RequisitionForm from './components/RequisitionForm';
import PipelineStepper from './components/PipelineStepper';
import VerdictCard from './components/VerdictCard';
import DirectivesList from './components/DirectivesList';
import DocumentChecklist from './components/DocumentChecklist';
import TelemetrySection from './components/TelemetrySection';
import ClauseDrawer from './components/ClauseDrawer';
import FormModal from './components/FormModal';

export default function App() {
  const [presets, setPresets] = useState([]);
  const [formData, setFormData] = useState({
    category: 'goods',
    estimated_value_inr: 50000,
    item_description: 'Department specialized printer and high yield cartridges',
    funding_source: 'Student Laboratory Budget',
    department: 'Mechanical Engineering',
    quotations_received: 0,
    is_emergency: false,
    is_sole_source: false,
  });
  const [omitValue, setOmitValue] = useState(false);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedClause, setSelectedClause] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);

  // Load presets on mount
  useEffect(() => {
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        setPresets(data);
      })
      .catch((err) => console.error('Failed to load presets:', err));

    // Run initial evaluation
    handleEvaluate(formData, false);
  }, []);

  const handleEvaluate = async (dataToSubmit, isOmitted) => {
    setLoading(true);
    const payload = {
      category: dataToSubmit.category || 'goods',
      estimated_value_inr: isOmitted ? null : parseFloat(dataToSubmit.estimated_value_inr) || 0,
      item_description: dataToSubmit.item_description || '',
      funding_source: dataToSubmit.funding_source || '',
      department: dataToSubmit.department || '',
      quotations_received: parseInt(dataToSubmit.quotations_received, 10) || 0,
      is_emergency: Boolean(dataToSubmit.is_emergency),
      is_sole_source: Boolean(dataToSubmit.is_sole_source),
    };

    try {
      const resp = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      setResponse(data);
    } catch (err) {
      console.error('Evaluation request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOmitValue(false);
    const resetData = {
      category: 'goods',
      estimated_value_inr: 50000,
      item_description: 'Department specialized printer and high yield cartridges',
      funding_source: 'Student Laboratory Budget',
      department: 'Mechanical Engineering',
      quotations_received: 0,
      is_emergency: false,
      is_sole_source: false,
    };
    setFormData(resetData);
    handleEvaluate(resetData, false);
  };

  const handleExportAudit = () => {
    if (!response) {
      alert('Please evaluate a requisition case first before exporting audit report.');
      return;
    }
    const report = {
      title: 'Procurement Statutory Compliance Audit Report',
      timestamp: new Date().toISOString(),
      standard: 'GFR 2017 & Manual for Procurement of Goods 2024',
      input: formData,
      response: response,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_report_${response.decision?.matched_rule_id || 'eval'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-500/25 selection:text-emerald-300">
      <Header
        providerUsed={response?._provider_used}
        onExportAudit={handleExportAudit}
      />

      {/* Hero Section */}
      <section className="relative pt-12 pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/60 text-slate-200 mb-5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono">Financial Rules & Purchase Compliance</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Know exactly how to buy, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              who must approve it, and what forms to sign.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Step-by-step rules, approval limits, and required forms based on{' '}
            <strong className="text-slate-200">GFR 2017</strong>, the{' '}
            <strong className="text-slate-200">2024 Goods Manual</strong>, and{' '}
            <strong className="text-slate-200">Campus Delegation of Powers</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto mt-8 text-left">
            <div className="p-3.5 rounded-xl bg-[#0F172A]/70 border border-[#1E293B]">
              <div className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">Zero Guesswork</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">Mathematical Rules</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">Rules decided mathematically, not guessed by AI</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F172A]/70 border border-[#1E293B]">
              <div className="text-[10px] font-mono text-amber-400 uppercase font-semibold">Automatic Escalation</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">Strict Safeguards</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">Never invents answers if info is missing</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F172A]/70 border border-[#1E293B]">
              <div className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">Always Up to Date</div>
              <div className="text-sm font-bold text-white font-mono mt-0.5">2024 Thresholds</div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">Uses 2024 limits, flags old 2017 rules</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0F172A]/70 border border-[#1E293B]">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Instant Response</div>
              <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
                {response?.latency_ms ? `~${response.latency_ms} ms` : '~1.8 ms'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">Deterministic lookup latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-10">
        {/* Section 1: Intake Form */}
        <RequisitionForm
          presets={presets}
          formData={formData}
          setFormData={setFormData}
          omitValue={omitValue}
          setOmitValue={setOmitValue}
          onSubmit={handleEvaluate}
          onReset={handleReset}
          loading={loading}
        />

        {/* Section 2: Pipeline Stepper */}
        <PipelineStepper
          decision={response?.decision}
          latencyMs={response?.latency_ms}
          loading={loading}
        />

        {/* Section 3: Verdict Determination & Procedural Directives */}
        <section id="verdict-section" className="space-y-6">
          <div className="pb-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              3. Official Purchase Decision & Next Steps
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic compliance result, required approvers, and step-by-step instructions.
            </p>
          </div>

          <VerdictCard
            response={response}
            providerUsed={response?._provider_used}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DirectivesList
              steps={response?.steps}
              onSelectClause={(cid) => setSelectedClause(cid)}
              status={response?.decision?.status}
            />

            <DocumentChecklist
              checklist={response?.checklist}
              onSelectForm={(fid) => setSelectedForm(fid)}
              status={response?.decision?.status}
            />
          </div>
        </section>

        {/* Section 4: System Accuracy & Automated Tests */}
        <TelemetrySection presets={presets} />
      </main>

      {/* Slide-over Drawer & Document Preview Modal */}
      <ClauseDrawer
        clauseId={selectedClause}
        onClose={() => setSelectedClause(null)}
      />

      <FormModal
        formId={selectedForm}
        onClose={() => setSelectedForm(null)}
      />

      {/* Footer */}
      <footer className="border-t border-[#1E293B] py-8 text-center text-xs text-slate-500 bg-[#070A11]/50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-mono text-slate-400">
              PROCUREGUARD React Engine v4.8 • GFR 2017 / MGP 2024
            </span>
          </div>
          <p className="text-slate-500 font-mono">
            Pure deterministic threshold validation. Zero fabricated citations.
          </p>
        </div>
      </footer>
    </div>
  );
}
