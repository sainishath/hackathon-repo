import React, { useState, useEffect } from 'react';
import {
  ClipboardPen,
  RotateCcw,
  Sparkles,
  Sliders,
  Zap,
  Loader2,
  ChevronDown,
  CheckCheck,
  SlidersHorizontal,
} from 'lucide-react';
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

const SAMPLE_TEXT_PILLS = [
  {
    label: '🚨 Emergency Server Repair (₹45,000, Urgent)',
    text: 'Emergency breakdown repair for server cooling unit costing ₹45,000 urgently required in Server Room.',
  },
  {
    label: '💻 Lab Workstations (4.8 Lakhs, Single Vendor PAC)',
    text: 'Need 3 lab workstations for 4.8 lakhs from single vendor NVIDIA under Institute Research Grant.',
  },
  {
    label: '🪑 Classroom Desks (₹18 Lakhs, Open Tender)',
    text: 'Procurement of classroom dual-desk furniture worth ₹18 Lakhs for Academic Block. 4 quotations received.',
  },
  {
    label: '⚖️ Consultant Hiring (No price specified)',
    text: 'Need specialized curriculum consultancy advisory services for accreditation audit.',
  },
];

// Client-side extraction helper for instant live feedback
function extractClientFromText(text) {
  if (!text || !text.trim()) {
    return {
      estimated_value_inr: null,
      category: 'goods',
      is_sole_source: false,
      is_emergency: false,
      quotations_received: 0,
      department: null,
    };
  }
  const lower = text.toLowerCase();

  // Parse INR
  let amount = null;
  const m_cr = lower.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crores?|cr)\b/);
  if (m_cr) amount = parseFloat(m_cr[1]) * 10000000;
  if (amount === null) {
    const m_lakh = lower.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lakh|l)\b/);
    if (m_lakh) amount = parseFloat(m_lakh[1]) * 100000;
  }
  if (amount === null) {
    const m_k = lower.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*k\b/);
    if (m_k) amount = parseFloat(m_k[1]) * 1000;
  }
  if (amount === null) {
    const m_curr = lower.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)/);
    if (m_curr) amount = parseFloat(m_curr[1].replace(/,/g, ''));
  }

  const isSole = /\b(single vendor|single supplier|sole source|proprietary|single brand|pac|single manufacturer|oem only)\b/i.test(lower);
  const isUrg = /\b(urgent|urgently|emergency|breakdown|critical repair|immediately|asap)\b/i.test(lower);

  let cat = 'goods';
  if (/\b(consultancy|consultant|specialized advisory)\b/i.test(lower)) cat = 'Consultancy';
  else if (/\b(civil repair|civil works|construction|renovation)\b/i.test(lower)) cat = 'works';
  else if (/\b(annual maintenance|amc|housekeeping|outsourced service|service)\b/i.test(lower)) cat = 'services';

  let quotes = isSole ? 1 : 0;
  const qm = lower.match(/(\d+)\s*quotations?/);
  if (qm) quotes = parseInt(qm[1], 10);

  let dept = null;
  const dm = text.match(/\b([A-Za-z\s]+?(?:engineering|department|dept|lab|laboratory|center))\b/i);
  if (dm && dm[1].trim().length < 40) dept = dm[1].trim();

  return {
    estimated_value_inr: amount,
    category: cat,
    is_sole_source: isSole,
    is_emergency: isUrg,
    quotations_received: quotes,
    department: dept,
  };
}

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
  const [naturalText, setNaturalText] = useState('');
  const [extractedPreview, setExtractedPreview] = useState({
    estimated_value_inr: 50000,
    category: 'goods',
    is_sole_source: false,
    is_emergency: false,
    quotations_received: 0,
    department: null,
  });
  const [showManualFields, setShowManualFields] = useState(true);
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
    setExtractedPreview((prev) => ({ ...prev, estimated_value_inr: inr }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setExtractedPreview((prev) => ({ ...prev, [field]: value }));
  };

  const handleNaturalTextChange = (text) => {
    setNaturalText(text);
    const ext = extractClientFromText(text);
    setExtractedPreview(ext);

    // Sync into formData
    if (ext.estimated_value_inr !== null) {
      setOmitValue(false);
      setFormData((prev) => ({ ...prev, ...ext, item_description: text }));
    } else {
      setOmitValue(true);
      setFormData((prev) => ({ ...prev, ...ext, estimated_value_inr: null, item_description: text }));
    }
  };

  const handleNaturalSubmit = () => {
    if (naturalText.trim()) {
      onSubmit({ text: naturalText.trim(), ...formData }, omitValue);
    } else {
      onSubmit(formData, omitValue);
    }
  };

  const handleSelectTextPill = (sample) => {
    setNaturalText(sample.text);
    handleNaturalTextChange(sample.text);
    const ext = extractClientFromText(sample.text);
    onSubmit({ text: sample.text, ...ext }, ext.estimated_value_inr === null);
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
    <section id="intake-section" className="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E293B] gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <ClipboardPen className="w-5 h-5 text-emerald-400" />
            1. Enter Purchase Requisition
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Type your request naturally or adjust individual parameters below.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNaturalText('');
            onReset();
          }}
          className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Form
        </button>
      </div>

      {/* Natural Language Requisition Area */}
      <div className="p-5 rounded-2xl bg-gradient-to-b from-[#090D16] to-[#070A11] border border-emerald-500/30 space-y-4 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ✨ Natural Language AI Intake
            </span>
            <span className="text-xs font-bold text-white">Freeform Purchase Request</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            Auto-Extracts INR • Emergency • Sole Source • Category
          </span>
        </div>

        {/* Quick Sample Text Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
            Quick Scenarios:
          </span>
          {SAMPLE_TEXT_PILLS.map((pill, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectTextPill(pill)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Requisition Textarea */}
        <div className="relative">
          <textarea
            rows="3"
            value={naturalText}
            onChange={(e) => handleNaturalTextChange(e.target.value)}
            placeholder="e.g., Urgently need 3 high-performance GPU workstations for AI Lab costing approx 4.8 lakhs from NVIDIA single vendor under Institute Research Grant"
            className="w-full bg-[#070A11] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition leading-relaxed"
          />
        </div>

        {/* Action Button & Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={handleNaturalSubmit}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Evaluating via Express...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Analyze Request & Check Compliance</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowManualFields(!showManualFields)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showManualFields ? 'Hide Individual Fields' : 'Adjust Individual Fields'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showManualFields ? 'rotate-0' : '-rotate-90'}`}
            />
          </button>
        </div>

        {/* Extracted Parameters Badge Bar */}
        <div className="p-3.5 rounded-xl bg-[#070A11] border border-[#1E293B] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              Extracted Parameters:
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Synced</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Value:{' '}
              <strong className={extractedPreview.estimated_value_inr !== null ? 'text-emerald-400' : 'text-amber-400'}>
                {extractedPreview.estimated_value_inr !== null ? formatINR(extractedPreview.estimated_value_inr) : 'None (Missing)'}
              </strong>
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Category: <strong className="text-white">{extractedPreview.category || 'goods'}</strong>
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Sole Source:{' '}
              <strong className={extractedPreview.is_sole_source ? 'text-amber-300' : 'text-slate-400'}>
                {extractedPreview.is_sole_source ? 'Yes (PAC)' : 'No'}
              </strong>
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Emergency:{' '}
              <strong className={extractedPreview.is_emergency ? 'text-rose-400' : 'text-slate-400'}>
                {extractedPreview.is_emergency ? 'Yes (Urgent)' : 'No'}
              </strong>
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Quotes: <strong className="text-white">{extractedPreview.quotations_received ?? 0}</strong>
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Dept: <strong className="text-slate-400">{extractedPreview.department || '—'}</strong>
            </span>
          </div>
        </div>

      </div>

      {/* Benchmark Presets Bar */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Statutory Benchmark Presets:
          </span>
          <span className="text-[11px] text-slate-500">10 Verified Legal Edge Cases</span>
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
                  const isOmit = inp.estimated_value_inr === null || inp.estimated_value_inr === undefined;
                  setOmitValue(isOmit);
                  setFormData(inp);
                  setExtractedPreview({
                    estimated_value_inr: inp.estimated_value_inr,
                    category: inp.category || 'goods',
                    is_sole_source: Boolean(inp.is_sole_source),
                    is_emergency: Boolean(inp.is_emergency),
                    quotations_received: inp.quotations_received || 0,
                    department: inp.department,
                  });
                  setNaturalText(inp.item_description || '');
                  onSubmit(inp, isOmit);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#070A11] border border-[#1E293B] hover:border-emerald-500/50 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Input Fields (Collapsible) */}
      {showManualFields && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData, omitValue);
          }}
          className="space-y-6 pt-2 border-t border-[#1E293B]"
        >
          {/* Row 1: Category, Cost, Quotes */}
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
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={omitValue}
                    onChange={(e) => {
                      setOmitValue(e.target.checked);
                      if (e.target.checked) {
                        setFormData((prev) => ({ ...prev, estimated_value_inr: null }));
                      } else {
                        setFormData((prev) => ({ ...prev, estimated_value_inr: 50000 }));
                      }
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Omit value (<code className="text-amber-400 font-mono">NEEDS_INFO</code>)</span>
                </label>
              </div>
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

          {/* Interactive Threshold Slider */}
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
              className="w-full accent-emerald-500"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span>₹0 (Direct)</span>
              <span className="text-emerald-400 font-semibold">₹50k (Direct Cap)</span>
              <span className="text-teal-400 font-semibold">₹5L (Committee Cap)</span>
              <span className="text-blue-400 font-semibold">₹25L (LTE Cap)</span>
              <span>₹1Cr+ (Open Tender)</span>
            </div>
          </div>

          {/* Row 2: Description, Funding, Dept & Special Flags */}
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Funding Source
                </label>
                <input
                  type="text"
                  value={formData.funding_source || ''}
                  onChange={(e) => handleInputChange('funding_source', e.target.value)}
                  placeholder="e.g., Institute Research Grant"
                  className="w-full bg-[#070A11] border border-[#1E293B] rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Department / Lab
                </label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="e.g., AI Research Lab"
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
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-rose-300">Urgent / Emergency Purchase</div>
                    <div className="text-[10px] text-slate-400">Invoke emergency purchase rules</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#070A11] border border-[#1E293B] cursor-pointer hover:border-slate-700 transition flex-1">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.is_sole_source)}
                    onChange={(e) => handleInputChange('is_sole_source', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-amber-300">Single Vendor / Proprietary</div>
                    <div className="text-[10px] text-slate-400">Single brand / PAC certificate item</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Manual Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Evaluating Rules...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>Check Rules with Current Form Values</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

    </section>
  );
}
