'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Freq = 12 | 4 | 2 | 1;

interface Asset {
  id: string;
  name: string;
  amount: number;
  annual: number;
}

interface ChartPoint {
  year: number;
  value: number;
  invested: number;
  real?: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const short = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return usd(n);
};

function calcGrowth(
  principal: number,
  monthly: number,
  rate: number,
  years: number,
  freq: Freq,
  inflation: number,
  tax: number
): ChartPoint[] {
  const r = (rate / 100) * (1 - tax / 100);
  // effective monthly rate based on compound frequency
  const mr = Math.pow(1 + r / freq, freq / 12) - 1;
  const pts: ChartPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const m = y * 12;
    const fvP = principal * Math.pow(1 + mr, m);
    const fvC = mr > 0 ? monthly * ((Math.pow(1 + mr, m) - 1) / mr) : monthly * m;
    const nom = fvP + fvC;
    pts.push({
      year: y,
      value: Math.round(nom),
      invested: Math.round(principal + monthly * m),
      ...(inflation > 0 && { real: Math.round(nom / Math.pow(1 + inflation / 100, y)) }),
    });
  }
  return pts;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{label}</span>
          {hint && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {hint}
            </span>
          )}
        </div>
        <span className="text-sm font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-lg flex-shrink-0">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = 'white',
  large = false,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'white' | 'green' | 'indigo' | 'gold' | 'rose';
  large?: boolean;
}) {
  const cls = {
    white: 'text-white',
    green: 'text-emerald-400',
    indigo: 'text-indigo-400',
    gold: 'text-amber-400',
    rose: 'text-rose-400',
  }[color];
  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
      <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
        {label}
      </p>
      <p className={`${large ? 'text-3xl' : 'text-xl sm:text-2xl'} font-mono font-extrabold ${cls} leading-none`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1.5 leading-tight">{sub}</p>}
    </div>
  );
}

function AdBlock({ className = '' }: { className?: string }) {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (_) {
      /* suppress in dev */
    }
  }, []);
  return (
    <div className={`w-full ${className}`}>
      <p className="text-center text-[10px] text-slate-700 mb-1 uppercase tracking-widest">
        Advertisement
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2607428575036247"
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}

const PIE_COLORS = ['#818cf8', '#fbbf24', '#34d399', '#f87171', '#38bdf8', '#c084fc', '#fb923c', '#4ade80'];

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0f172a',
    border: '1px solid rgba(100,116,139,0.25)',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: 13,
  },
  labelStyle: { color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: 600 },
  itemStyle: { color: '#e2e8f0' },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Page() {
  // ── Calculator inputs ──
  const [principal, setPrincipal] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);
  const [freq, setFreq] = useState<Freq>(12);
  const [inflation, setInflation] = useState(0);
  const [tax, setTax] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Portfolio ──
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'S&P 500 ETF', amount: 10000, annual: 10 },
    { id: '2', name: 'Bonds', amount: 5000, annual: 4 },
    { id: '3', name: 'Gold', amount: 3000, annual: 3 },
  ]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newReturn, setNewReturn] = useState('');

  // ── UI state ──
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Calculations ──
  const chartData = useMemo(
    () => calcGrowth(principal, monthly, rate, years, freq, inflation, tax),
    [principal, monthly, rate, years, freq, inflation, tax]
  );

  const last = chartData[chartData.length - 1];
  const totalInvested = last.invested;
  const finalValue = last.value;
  const profit = finalValue - totalInvested;
  const profitPct = totalInvested > 0 ? ((profit / totalInvested) * 100).toFixed(1) : '0';
  const cagr = principal > 0 && years > 0 ? ((Math.pow(finalValue / principal, 1 / years) - 1) * 100).toFixed(1) : '0';
  const multiple = totalInvested > 0 ? (finalValue / totalInvested).toFixed(2) : '1.00';
  const ruleOf72 = rate > 0 ? (72 / rate).toFixed(1) : '—';

  // ── Comparison data ──
  const earlyData = useMemo(
    () => calcGrowth(principal, monthly, rate, years + 5, freq, inflation, tax),
    [principal, monthly, rate, years, freq, inflation, tax]
  );
  const lateYears = Math.max(years - 5, 1);
  const lateData = useMemo(
    () => calcGrowth(principal, monthly, rate, lateYears, freq, inflation, tax),
    [principal, monthly, rate, lateYears, freq, inflation, tax]
  );

  // ── Portfolio ──
  const portfolioTotal = assets.reduce((s, a) => s + a.amount, 0);

  const addAsset = useCallback(() => {
    const amt = parseFloat(newAmount);
    const ret = parseFloat(newReturn);
    if (!newName.trim() || isNaN(amt) || amt <= 0 || isNaN(ret)) return;
    setAssets((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newName.trim(), amount: amt, annual: ret },
    ]);
    setNewName('');
    setNewAmount('');
    setNewReturn('');
  }, [newName, newAmount, newReturn]);

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleShare = useCallback(() => {
    const text = `My Investment Plan 📈\n\n💰 Final Value: ${usd(finalValue)}\n📊 Total Profit: ${usd(profit)} (+${profitPct}%)\n⏱️ Duration: ${years} years @ ${rate}% annual return\n\nCalculate yours free → https://investment-calculator-three-pi.vercel.app`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [finalValue, profit, profitPct, years, rate]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#020817] text-white">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#020817]/90 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-base">
              📈
            </div>
            <div className="leading-none">
              <p className="font-extrabold text-white tracking-tight text-base">InvestCalc</p>
              <p className="text-indigo-400 text-[10px] font-medium mt-0.5">Investment Calculator</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <a href="#calculator" className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
                Calculator
              </a>
              <a href="#portfolio" className="px-3 py-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
                Portfolio
              </a>
            </nav>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
            >
              {copied ? '✓ Copied!' : '↑ Share'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative pt-16 pb-10 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/8 blur-3xl rounded-full pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-400 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Free Investment Returns Calculator
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-4">
            <span className="text-white">Compound Interest</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Calculator
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            See exactly how your investments grow with compound interest. Adjust any variable
            and watch your future wealth update in real time.
          </p>
        </div>
      </section>

      {/* ── Calculator + Results ─────────────────────────────────── */}
      <section id="calculator" className="max-w-6xl mx-auto px-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

          {/* ── Inputs ── */}
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
            <h2 className="text-base font-bold text-white mb-6">Investment Parameters</h2>
            <div className="space-y-7">
              <Slider
                label="Initial Investment"
                value={principal}
                min={1000}
                max={500000}
                step={1000}
                display={usd(principal)}
                onChange={setPrincipal}
              />
              <Slider
                label="Monthly Contribution"
                value={monthly}
                min={0}
                max={5000}
                step={50}
                display={monthly === 0 ? '$0' : usd(monthly)}
                onChange={setMonthly}
              />
              <Slider
                label="Annual Return Rate"
                hint="S&P 500 avg ≈ 10%"
                value={rate}
                min={1}
                max={30}
                step={0.5}
                display={`${rate}%`}
                onChange={setRate}
              />
              <Slider
                label="Investment Duration"
                value={years}
                min={1}
                max={50}
                step={1}
                display={`${years} yr${years !== 1 ? 's' : ''}`}
                onChange={setYears}
              />

              {/* Advanced toggle */}
              <div>
                <button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors group"
                >
                  <span
                    className={`w-4 h-4 flex items-center justify-center transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
                  >
                    ▶
                  </span>
                  Advanced Options
                  <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                    {showAdvanced ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-5 pl-5 border-l-2 border-slate-700/60 space-y-6">
                    {/* Compound frequency */}
                    <div className="space-y-2.5">
                      <p className="text-sm font-medium text-slate-200">Compound Frequency</p>
                      <div className="grid grid-cols-4 gap-2">
                        {(
                          [
                            [12, 'Monthly'],
                            [4, 'Quarterly'],
                            [2, 'Semi-Ann'],
                            [1, 'Annually'],
                          ] as [Freq, string][]
                        ).map(([f, label]) => (
                          <button
                            key={f}
                            onClick={() => setFreq(f)}
                            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                              freq === f
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Slider
                      label="Inflation Adjustment"
                      hint="avg US ≈ 3%"
                      value={inflation}
                      min={0}
                      max={10}
                      step={0.5}
                      display={`${inflation}%`}
                      onChange={setInflation}
                    />
                    <Slider
                      label="Tax Rate on Gains"
                      value={tax}
                      min={0}
                      max={40}
                      step={1}
                      display={`${tax}%`}
                      onChange={setTax}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Results ── */}
          <div className="flex flex-col gap-4">
            {/* Hero result card */}
            <div className="bg-gradient-to-br from-indigo-900/60 to-violet-900/40 border border-indigo-700/30 rounded-3xl p-6 sm:p-7 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">
                Final Portfolio Value
              </p>
              <p className="text-5xl sm:text-6xl font-mono font-black text-white leading-none mb-2">
                {short(finalValue)}
              </p>
              <p className="text-sm text-indigo-300/80">after {years} year{years !== 1 ? 's' : ''}</p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Invested" value={short(totalInvested)} color="indigo" />
              <StatCard
                label="Total Profit"
                value={short(profit)}
                sub={`+${profitPct}% gain`}
                color="green"
              />
              <StatCard
                label="Return Multiple"
                value={`${multiple}×`}
                sub="money multiplied"
                color="gold"
              />
              <StatCard label="Est. CAGR" value={`${cagr}%`} sub="annual growth rate" />
            </div>

            {/* Rule of 72 + Share */}
            <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Rule of 72 — money doubles in</p>
                <p className="text-2xl font-mono font-black text-amber-400">
                  {ruleOf72} <span className="text-sm font-semibold text-amber-500/70">years</span>
                </p>
              </div>
              <button
                onClick={handleShare}
                className="flex-shrink-0 px-4 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-all"
              >
                {copied ? '✓ Copied' : '↑ Share results'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Growth Chart ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="bg-slate-900/70 border border-slate-700/50 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-white">Investment Growth Over Time</h2>
              <p className="text-xs text-slate-500 mt-1">
                Compound interest growth vs. simple contributions
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-0.5 bg-indigo-400 rounded-full inline-block" />
                Portfolio Value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-px bg-slate-500 border-dashed inline-block" style={{ borderTop: '2px dashed #64748b' }} />
                Amount Invested
              </span>
              {inflation > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 bg-amber-400 rounded-full inline-block" />
                  Real Value (inflation-adj)
                </span>
              )}
            </div>
          </div>

          <div className="h-72 sm:h-96">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                  <defs>
                    <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#475569" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#475569" stopOpacity={0.02} />
                    </linearGradient>
                    {inflation > 0 && (
                      <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.02} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.1)" />
                  <XAxis
                    dataKey="year"
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    label={{ value: 'Year', position: 'insideBottom', offset: -12, fill: '#475569', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#334155"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={short}
                    width={72}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP_STYLE}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => [
                      usd(Number(v)),
                      name === 'value'
                        ? 'Portfolio Value'
                        : name === 'invested'
                        ? 'Amount Invested'
                        : 'Real Value',
                    ]}
                    labelFormatter={(l) => `Year ${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    stroke="#475569"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    fill="url(#gInv)"
                    dot={false}
                  />
                  {inflation > 0 && (
                    <Area
                      type="monotone"
                      dataKey="real"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      fill="url(#gReal)"
                      dot={false}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    fill="url(#gVal)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-2xl bg-slate-800/40 animate-pulse" />
            )}
          </div>
        </div>
      </section>

      {/* ── Ad Unit 1 ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <AdBlock className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 min-h-[100px] flex flex-col items-center justify-center" />
      </div>

      {/* ── What If? Comparison ──────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-10">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            What If? Scenarios
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm">
            Every year you delay costs more than you think — see the difference compounding makes.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: `Start ${Math.min(years, 5)} Years Earlier`,
              finalValue: earlyData[earlyData.length - 1].value,
              diff: earlyData[earlyData.length - 1].value - finalValue,
              badge: '+5 years compounding',
              variant: 'early' as const,
            },
            {
              title: 'Your Plan',
              finalValue,
              diff: 0,
              badge: 'current plan',
              variant: 'center' as const,
            },
            {
              title: `Start ${Math.min(years, 5)} Years Later`,
              finalValue: lateData[lateData.length - 1].value,
              diff: lateData[lateData.length - 1].value - finalValue,
              badge: `only ${lateYears} yr${lateYears !== 1 ? 's' : ''}`,
              variant: 'late' as const,
            },
          ].map((s) => (
            <div
              key={s.title}
              className={`rounded-2xl p-5 sm:p-6 border transition-all ${
                s.variant === 'center'
                  ? 'bg-indigo-900/30 border-indigo-600/40 ring-1 ring-indigo-500/25'
                  : s.variant === 'early'
                  ? 'bg-emerald-950/30 border-emerald-700/30'
                  : 'bg-rose-950/20 border-rose-800/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="text-sm font-bold text-white leading-tight">{s.title}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                    s.variant === 'center'
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : s.variant === 'early'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {s.badge}
                </span>
              </div>
              <p
                className={`text-3xl sm:text-4xl font-mono font-black leading-none mb-1 ${
                  s.variant === 'center'
                    ? 'text-white'
                    : s.variant === 'early'
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {short(s.finalValue)}
              </p>
              <p className="text-xs text-slate-500 mb-3">final value</p>
              {s.variant !== 'center' && (
                <p
                  className={`text-sm font-bold ${s.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {s.diff >= 0 ? '+' : ''}
                  {short(s.diff)} vs. your plan
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Ad Unit 2 ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <AdBlock className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 min-h-[100px] flex flex-col items-center justify-center" />
      </div>

      {/* ── Portfolio Tracker ────────────────────────────────────── */}
      <section id="portfolio" className="max-w-6xl mx-auto px-4 pb-10">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Portfolio Tracker
          </h2>
          <p className="text-slate-400 mt-1.5 text-sm">
            Track multiple assets and visualize your allocation breakdown.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Asset list */}
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-sm space-y-5">
            {/* Add asset form */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px_100px_44px] gap-2">
              <input
                placeholder="Asset name (e.g. AAPL)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAsset()}
                className="bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />
              <input
                placeholder="Amount $"
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAsset()}
                className="bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />
              <input
                placeholder="Return %"
                type="number"
                value={newReturn}
                onChange={(e) => setNewReturn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAsset()}
                className="bg-slate-800 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
              />
              <button
                onClick={addAsset}
                className="h-full bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white text-lg transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center"
              >
                +
              </button>
            </div>

            {/* Asset rows */}
            <div className="space-y-2">
              {assets.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-8">
                  Add your first asset above to get started
                </p>
              )}
              {assets.map((a, i) => {
                const pct = portfolioTotal > 0 ? ((a.amount / portfolioTotal) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800/80 border border-transparent hover:border-slate-700/40 rounded-xl px-4 py-3 transition-all group"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="flex-1 text-sm font-semibold text-white truncate">{a.name}</span>
                    <span className="text-sm font-mono text-slate-300 hidden sm:block">{usd(a.amount)}</span>
                    <span className="text-xs font-mono text-emerald-400 w-10 text-right">
                      +{a.annual}%
                    </span>
                    <span className="text-xs text-slate-500 w-10 text-right font-mono">{pct}%</span>
                    <button
                      onClick={() => removeAsset(a.id)}
                      className="text-slate-700 hover:text-rose-400 transition-colors text-sm opacity-0 group-hover:opacity-100 ml-1"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Total row */}
            {assets.length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                <span className="text-sm text-slate-400 font-medium">Total Portfolio Value</span>
                <span className="text-xl font-mono font-extrabold text-white">{usd(portfolioTotal)}</span>
              </div>
            )}
          </div>

          {/* Pie chart */}
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-3xl p-6 backdrop-blur-sm flex flex-col">
            <p className="text-sm font-bold text-slate-400 mb-4">Allocation</p>
            {mounted && assets.length > 0 ? (
              <div className="flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assets.map((a) => ({ name: a.name, value: a.amount }))}
                      cx="50%"
                      cy="50%"
                      innerRadius="45%"
                      outerRadius="72%"
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {assets.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [usd(Number(v)), 'Value']}
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(100,116,139,0.25)',
                        borderRadius: '12px',
                        fontSize: 13,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="space-y-1.5 mt-4">
                  {assets.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-slate-400 truncate max-w-[120px]">{a.name}</span>
                      </div>
                      <span className="font-mono text-slate-300 ml-2">
                        {portfolioTotal > 0 ? ((a.amount / portfolioTotal) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-600 text-sm text-center">Add assets to see your allocation chart</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Ad Unit 3 ───────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <AdBlock className="bg-slate-900/40 border border-slate-800/40 rounded-2xl p-4 min-h-[100px] flex flex-col items-center justify-center" />
      </div>

      {/* ── SEO / Educational Content ───────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 sm:p-10">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-6">
            How Compound Interest Works
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 text-sm text-slate-400 leading-relaxed">
            <div>
              <h3 className="text-white font-bold mb-2 text-sm">What is Compound Interest?</h3>
              <p>
                Compound interest is interest earned on both your original principal and the
                accumulated interest from prior periods. Unlike simple interest, it grows
                exponentially — often called &quot;the eighth wonder of the world.&quot;
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-2 text-sm">The Formula</h3>
              <div className="font-mono text-xs bg-slate-800/80 border border-slate-700/50 rounded-xl p-3.5 text-indigo-300 leading-relaxed">
                FV = P(1 + r/n)^(nt)<br />
                &nbsp;&nbsp;&nbsp;+ PMT × [(1+r/n)^(nt) − 1] / (r/n)
              </div>
              <p className="mt-2 text-xs">
                P = principal · r = annual rate · n = compound freq · t = years · PMT = monthly contribution
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-2 text-sm">Why Starting Early Matters</h3>
              <p>
                Starting 10 years earlier can more than double your final portfolio. Time is the
                most powerful variable in any compound interest calculator — small monthly
                contributions grow substantially over decades.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-2 text-sm">Investment Strategies</h3>
              <p>
                Dollar-cost averaging — investing a fixed amount monthly — reduces risk by
                buying at different price points. Combined with low-cost index funds (historical
                avg. 7–10% annually), it&apos;s one of the most reliable long-term wealth-building
                strategies available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 py-8 px-4 text-center">
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} InvestCalc · Free Investment Returns Calculator &amp; Compound Interest Tool
        </p>
        <p className="text-slate-700 text-xs mt-1">
          Results are for educational purposes only. Not financial advice.
        </p>
      </footer>
    </div>
  );
}
