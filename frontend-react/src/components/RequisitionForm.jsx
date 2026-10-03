import React, { useState, useEffect } from 'react';
import { ClipboardPen, RotateCcw, Sparkles, Sliders, Info, Zap, Loader2 } from 'lucide-react';
import { formatINR, inrToWords, sliderValueToINR, inrToSliderValue } from '../utils/formatters';

const PRESET_FRIENDLY_NAMES = {
  'case_exact_boundary': '₹50,000 Exact Limit (Direct Purchase)',
  'case_superseded_version_query': '₹50,000.01 (Requires Committee)',
  'case_missing_detail': 'Missing Price (Needs Info)',
  'case_below_threshold': 'Small Office Supplies (₹15,000)',
  'case_mid_band': 'Lab Equipment (₹1.5 Lakh)',
  'case_above_top_band': 'Campus Servers (₹35 Lakh Tender)',
  'case_emergency_exception': 'Lab Emergency (₹40,000)',
  'case_sole_source_exception': 'Single Brand / PAC (₹4 Lakh)',
  'case_unmapped_category': 'Consulting Service (Escalate)',
  'case_ambiguous_quotations': 'Only 1 Quotation (Escalate)',
};

export default function RequisitionForm({
  presets,
  formData,
  setFormData,
  omitValue,
  setOmitValue,
  onSubmit,
  onReset,
  loading,
}) {
  const [sliderVal, setSliderVal] = useState(25);

  useEffect(() => {
    if (!omitValue && formData.estimated_value_inr !== null) {
      setSliderVal(inrToSliderValue(formData.estimated_value_inr));
    }
  }, [formData.estimated_value_inr, omitValue]);

  const handleSliderChange = (e) => {
    const pct = parseFloat(e.target.value);
    setSliderVal(pct);
    if (omitValue) setOmitValue(false);
    const inr = sliderValueToINR(pct);
    setFormData((prev) => ({ ...prev, estimated_value_inr: inr }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getSliderBadge = (num) => {
    if (omitValue) {
      return {
        text: 'Gating Exception: Value Missing',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      };
    }
    if (num <= 50000) {
      return {
        text: 'Direct Purchase (HoD)',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      };
    } else if (num <= 500000) {
      return {
        text: 'Local Purchase Committee (Dean)',
        className: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      };
    } else if (num <= 2500000) {
      return {
        text: 'Limited Tender (Director)',
        className: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      };
    } else {
      return {
        text: 'Advertised Tender (Director / BoG)',
        className: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      };
    }
  };

  const numVal = omitValue ? null : parseFloat(formData.estimated_value_inr) || 0;
  const sliderBadge = getSliderBadge(numVal);

  return (
    <section id="intake-section" className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#1E293B] gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <ClipboardPen className="w-5 h-5 text-emerald-400" />
            1. Enter Purchase Details
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fill in what you need to buy or click a sample scenario below.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Form
        </button>
      </div>

      {/* Quick Scenarios Presets */}
      <div className="pt-5 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Quick Scenarios:
          </span>
          <span className="text-[11px] text-slate-500">Click any scenario to load and test</span>
        </div>
        <div className="flex flex-wrap gap-2 py-1">
          {presets.map((p) => {
            const displayName = PRESET_FRIENDLY_NAMES[p.id] || p.name;
            const dotColor =
              p.expected?.status === 'DECIDED'
                ? 'bg-emerald-400'
                : p.expected?.status === 'NEEDS_INFO'
                ? 'bg-amber-400'
                : 'bg-rose-400';

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const inp = { ...p.input };
                  if (inp.estimated_value_inr === null || inp.estimated_value_inr === undefined) {
                    setOmitValue(true);
                  } else {
                    setOmitValue(false);
                  }
                  setFormData(inp);
                  onSubmit(inp, inp.estimated_value_inr === null);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#070A11] border border-[#1E293B] hover:border-emerald-500/50 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Grid */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData, omitValue);
        }}
        className="mt-5 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Item Category <span className="text-emerald-400 font-mono">⚡ Required</span>
            </label>
            <select
              value={formData.category || 'goods'}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full bg-[#070A11] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="goods">Goods (Standard Consumables / Equipment)</option>
              <option value="services">Services (Consulting / AMC / Outsourced)</option>
              <option value="works">Civil Works (Repair / Construction / Fabrication)</option>
              <option value="Consultancy">Consultancy (Specialized Advisory)</option>
            </select>
          </div>

          {/* Estimated Value */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Estimated Cost (INR) <span className="text-emerald-400 font-mono">⚡ Required</span>
              </label>
              <span className={`font-mono text-xs font-bold ${omitValue ? 'text-amber-400' : 'text-emerald-400'}`}>
                {omitValue ? 'None (NEEDS_INFO)' : formatINR(formData.estimated_value_inr)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={omitValue}
                value={omitValue ? '' : formData.estimated_value_inr ?? 50000}
                onChange={(e) => handleInputChange('estimated_value_inr', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 50,000"
                className={`w-full bg-[#070A11] border border-[#1E293B] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition ${
                  omitValue ? 'opacity-40' : ''
                }`}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">
                {omitValue ? 'Value omitted for exception check' : inrToWords(formData.estimated_value_inr)}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  id="check-omit-value"
                  type="checkbox"
                  checked={omitValue}
                  onChange={(e) => setOmitValue(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="check-omit-value" className="text-[11px] text-slate-400 cursor-pointer">
                  Omit value (<code className="text-amber-400 font-mono">NEEDS_INFO</code>)
                </label>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Thresholds switch strictly at ₹50,000 and ₹5,00,000.</p>
          </div>

          {/* Quotations Received */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Quotations on Hand <span className="text-slate-500 font-normal">(Min 3 for LPC/LTE)</span>
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={formData.quotations_received ?? 0}
              onChange={(e) => handleInputChange('quotations_received', parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#070A11] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">Number of quotes collected so far</p>
          </div>
        </div>

        {/* Interactive Logarithmic Statutory Threshold Range Slider */}
        <div className="p-4 rounded-xl bg-[#070A11]/60 border border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Interactive Statutory Threshold Slider:
            </span>
            <span className={`font-mono text-[11px] px-2.5 py-0.5 rounded-full border ${sliderBadge.className}`}>
              {sliderBadge.text}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={sliderVal}
            onChange={handleSliderChange}
            className="w-full"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
            <span>₹0 (Direct)</span>
            <span className="text-emerald-400 font-semibold">₹50k (Direct Cap)</span>
            <span className="text-teal-400 font-semibold">₹5L (Committee Cap)</span>
            <span className="text-blue-400 font-semibold">₹25L (LTE Cap)</span>
            <span>₹1Cr+ (Open Tender)</span>
          </div>
        </div>

        {/* Secondary Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Description of Items Needed <span className="text-emerald-400 font-mono">⚡ Required</span>
            </label>
            <textarea
              rows="2"
              value={formData.item_description || ''}
              onChange={(e) => handleInputChange('item_description', e.target.value)}
              placeholder="e.g., High-performance GPU servers for ML research lab"
              className="w-full bg-[#070A11] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Funding Source</label>
              <input
                type="text"
                value={formData.funding_source || ''}
                onChange={(e) => handleInputChange('funding_source', e.target.value)}
                placeholder="e.g., Institute Budget, Sponsored Project Grant"
                className="w-full bg-[#070A11] border border-[#1E293B] rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Department / Lab</label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="e.g., Department of Computer Science"
                className="w-full bg-[#070A11] border border-[#1E293B] rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Exception Flags */}
            <div className="sm:col-span-2 flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#070A11] border border-[#1E293B] cursor-pointer hover:border-slate-700 transition flex-1">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_emergency)}
                  onChange={(e) => handleInputChange('is_emergency', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold text-rose-300">Urgent / Emergency Purchase</div>
                  <div className="text-[10px] text-slate-400">Check if emergency purchase under urgent rules</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#070A11] border border-[#1E293B] cursor-pointer hover:border-slate-700 transition flex-1">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_sole_source)}
                  onChange={(e) => handleInputChange('is_sole_source', e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-semibold text-amber-300">Proprietary Article (Single Brand / PAC)</div>
                  <div className="text-[10px] text-slate-400">Check if only one manufacturer makes this item</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-emerald-400" />
            <span>Engine automatically applies latest 2024 rules; flags outdated 2017/2022 clauses.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Rules...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Check Rules & Generate Steps</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
