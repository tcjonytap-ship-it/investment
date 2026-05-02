'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function calcGrowth(
  principal: number,
  monthly: number,
  rate: number,
  years: number,
  freq: Freq,
  inflation: number,
  tax: number,
): ChartPoint[] {
  const r = (rate / 100) * (1 - tax / 100);
  const mr = Math.pow(1 + r / freq, freq / 12) - 1;
  const pts: ChartPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const m = y * 12;
    const fvP = principal * Math.pow(1 + mr, m);
    const fvC = mr > 0 ? monthly * ((Math.pow(1 + mr, m) - 1) / mr) : monthly * m;
    const nom = fvP + fvC;
    const deflate = inflation > 0 ? Math.pow(1 + inflation / 100, y) : 1;
    pts.push({
      year: y,
      value: Math.round(nom / deflate),
      invested: Math.round(principal + monthly * m),
    });
  }
  return pts;
}

// ─── Input field: large editable number + slider ──────────────────────────────

function Field({
  label,
  value,
  min,
  max,
  step,
  prefix = '',
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <div className="flex items-center gap-1.5">
        {prefix && <span className="text-2xl font-bold text-slate-400">{prefix}</span>}
        <input
          type="number"
          value={raw}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            setRaw(e.target.value);
            const n = parseFloat(e.target.value);
            if (!isNaN(n)) onChange(clamp(n, min, max));
          }}
          onBlur={() => {
            const n = parseFloat(raw);
            const clamped = isNaN(n) ? min : clamp(n, min, max);
            onChange(clamped);
            setRaw(String(clamped));
          }}
          className="w-full text-3xl font-extrabold text-white bg-transparent outline-none border-b-2 border-slate-700 focus:border-indigo-500 transition-colors pb-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {suffix && <span className="text-2xl font-bold text-slate-400 flex-shrink-0">{suffix}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

// ─── AdSense block ────────────────────────────────────────────────────────────

function AdBlock({ className = '' }: { className?: string }) {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (_) { /* suppress in dev */ }
  }, []);
  return (
    <div className={`w-full ${className}`}>
      <p className="text-center text-[10px] text-slate-700 uppercase tracking-widest mb-1">Advertisement</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  // Calculator state
  const [principal, setPrincipal] = useState(10_000);
  const [monthly, setMonthly]     = useState(500);
  const [rate, setRate]           = useState(8);
  const [years, setYears]         = useState(20);
  const [freq, setFreq]           = useState<Freq>(12);
  const [inflation, setInflation] = useState(0);
  const [tax, setTax]             = useState(0);
  const [showAdv, setShowAdv]     = useState(false);

  // Portfolio state
  const [assets, setAssets] = useState<Asset[]>([
    { id: '1', name: 'S&P 500 ETF', amount: 10_000, annual: 10 },
    { id: '2', name: 'Bonds',       amount: 5_000,  annual: 4  },
    { id: '3', name: 'Gold',        amount: 3_000,  annual: 3  },
  ]);
  const [newName,   setNewName]   = useState('');
  const [newAmt,    setNewAmt]    = useState('');
  const [newRet,    setNewRet]    = useState('');

  const [copied,  setCopied]  = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Core calc
  const data = useMemo(
    () => calcGrowth(principal, monthly, rate, years, freq, inflation, tax),
    [principal, monthly, rate, years, freq, inflation, tax],
  );

  const last         = data[data.length - 1];
  const finalValue   = last.value;
  const totalInvest  = last.invested;
  const profit       = finalValue - totalInvest;
  const profitPct    = totalInvest > 0 ? (profit / totalInvest) * 100 : 0;
  const investedPct  = totalInvest > 0 ? (totalInvest / finalValue) * 100 : 100;
  const multiple     = totalInvest > 0 ? (finalValue / totalInvest).toFixed(2) : '1.00';
  const cagr         = principal > 0 && years > 0
    ? ((Math.pow(finalValue / principal, 1 / years) - 1) * 100).toFixed(1)
    : '0';

  // Comparison: start 5yr earlier vs 5yr later
  const earlyFinal = useMemo(
    () => calcGrowth(principal, monthly, rate, years + 5, freq, inflation, tax).at(-1)!.value,
    [principal, monthly, rate, years, freq, inflation, tax],
  );
  const lateFinal = useMemo(
    () => calcGrowth(principal, monthly, rate, Math.max(years - 5, 1), freq, inflation, tax).at(-1)!.value,
    [principal, monthly, rate, years, freq, inflation, tax],
  );

  // Portfolio
  const portfolioTotal = assets.reduce((s, a) => s + a.amount, 0);

  const addAsset = useCallback(() => {
    const amt = parseFloat(newAmt);
    const ret = parseFloat(newRet);
    if (!newName.trim() || isNaN(amt) || amt <= 0 || isNaN(ret)) return;
    setAssets(p => [...p, { id: Date.now().toString(), name: newName.trim(), amount: amt, annual: ret }]);
    setNewName(''); setNewAmt(''); setNewRet('');
  }, [newName, newAmt, newRet]);

  const share = useCallback(() => {
    const txt = `📈 My investment plan:\n💰 Final value: ${usd(finalValue)}\n📊 Profit: ${usd(profit)} (+${profitPct.toFixed(0)}%)\n⏱ ${years} years @ ${rate}% annual return\n\nhttps://investment-calculator-three-pi.vercel.app`;
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [finalValue, profit, profitPct, years, rate]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#0b0f1a]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm shadow-lg shadow-indigo-500/30">
              📈
            </div>
            <span className="font-bold text-white">InvestCalc</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#portfolio" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
              Portfolio
            </a>
            <button
              onClick={share}
              className="text-sm font-semibold px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-md shadow-indigo-500/20"
            >
              {copied ? '✓ Copied' : 'Share'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 space-y-6">

        {/* ── Page title ── */}
        <div className="text-center pb-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Investment Calculator
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            See how your money grows with compound interest — type any number to update instantly.
          </p>
        </div>

        {/* ── Inputs card ── */}
        <div className="bg-[#131929] border border-white/6 rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Field
              label="Initial Investment"
              prefix="$"
              value={principal}
              min={0}
              max={1_000_000}
              step={1000}
              onChange={setPrincipal}
            />
            <Field
              label="Monthly Contribution"
              prefix="$"
              value={monthly}
              min={0}
              max={10_000}
              step={50}
              onChange={setMonthly}
            />
            <Field
              label="Annual Return Rate"
              suffix="%"
              value={rate}
              min={1}
              max={30}
              step={0.5}
              onChange={setRate}
            />
            <Field
              label="Time Period"
              suffix=" yrs"
              value={years}
              min={1}
              max={50}
              step={1}
              onChange={setYears}
            />
          </div>

          {/* Advanced options */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <button
              onClick={() => setShowAdv(v => !v)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showAdv ? 'rotate-90' : ''}`}
                fill="currentColor" viewBox="0 0 20 20"
              >
                <path d="M6 6l8 4-8 4V6z" />
              </svg>
              Advanced options
            </button>

            {showAdv && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Compound frequency */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Compounding
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      [12, 'Monthly'],
                      [4,  'Quarterly'],
                      [2,  'Semi-Ann'],
                      [1,  'Annually'],
                    ] as [Freq, string][]).map(([f, label]) => (
                      <button
                        key={f}
                        onClick={() => setFreq(f)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          freq === f
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field
                  label="Inflation Rate"
                  suffix="%"
                  value={inflation}
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={setInflation}
                />
                <Field
                  label="Tax on Gains"
                  suffix="%"
                  value={tax}
                  min={0}
                  max={50}
                  step={1}
                  onChange={setTax}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Results card ── */}
        <div className="bg-[#131929] border border-white/6 rounded-2xl p-6 sm:p-8 space-y-6">

          {/* Main number */}
          <div>
            <p className="text-sm text-slate-400 mb-1">
              After {years} year{years !== 1 ? 's' : ''} you&apos;ll have
            </p>
            <p className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
              {short(finalValue)}
            </p>
            {inflation > 0 && (
              <p className="text-xs text-slate-500 mt-1">inflation-adjusted value</p>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, investedPct)}%` }}
              />
              <div className="h-full bg-emerald-500 flex-1 transition-all duration-500" />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                Invested {investedPct.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Profit {(100 - investedPct).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Invested', value: short(totalInvest), color: 'text-indigo-400' },
              { label: 'Total Profit',   value: short(profit),      color: 'text-emerald-400' },
              { label: `${multiple}× return`, value: `+${profitPct.toFixed(0)}%`, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/4 rounded-xl p-3 sm:p-4 text-center">
                <p className={`text-lg sm:text-2xl font-extrabold font-mono ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CAGR + Rule of 72 */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span>
              Est. CAGR: <strong className="text-white">{cagr}%</strong>
            </span>
            <span>·</span>
            <span>
              Money doubles every <strong className="text-amber-400">{rate > 0 ? (72 / rate).toFixed(1) : '—'} years</strong>
            </span>
          </div>
        </div>

        {/* ── Growth chart ── */}
        <div className="bg-[#131929] border border-white/6 rounded-2xl p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-5">Growth over time</h2>
          <div className="h-56 sm:h-72">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#475569" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#475569" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="year"
                    stroke="#1e293b"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `Yr ${v}`}
                    interval={Math.ceil(years / 5) - 1}
                  />
                  <YAxis
                    stroke="#1e293b"
                    tick={{ fill: '#475569', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={short}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: 4, fontSize: 11 }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => [
                      usd(Number(v)),
                      name === 'value' ? 'Portfolio value' : 'Amount invested',
                    ]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(l: any) => `Year ${l}`}
                  />
                  <Area type="monotone" dataKey="invested" stroke="#475569" strokeWidth={2}
                    strokeDasharray="4 3" fill="url(#gI)" dot={false} />
                  <Area type="monotone" dataKey="value"    stroke="#818cf8" strokeWidth={2.5}
                    fill="url(#gV)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-xl bg-white/3 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-5 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-indigo-400 rounded-full inline-block" /> Portfolio value
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-px border-t-2 border-dashed border-slate-600 inline-block" /> Amount invested
            </span>
          </div>
        </div>

        {/* ── Ad ── */}
        <AdBlock className="bg-[#131929] border border-white/5 rounded-2xl p-4 min-h-[90px] flex flex-col items-center justify-center" />

        {/* ── What if comparison ── */}
        <div className="bg-[#131929] border border-white/6 rounded-2xl p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">What if you started earlier?</h2>
          <p className="text-xs text-slate-500 mb-5">Every year of delay costs more than you think.</p>
          <div className="space-y-3">
            {[
              {
                label: `Start ${Math.min(years, 5)} years earlier`,
                value: earlyFinal,
                diff: earlyFinal - finalValue,
                sign: '+',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
              {
                label: 'Your current plan',
                value: finalValue,
                diff: 0,
                sign: '',
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10',
              },
              {
                label: `Start ${Math.min(years, 5)} years later`,
                value: lateFinal,
                diff: lateFinal - finalValue,
                sign: '',
                color: 'text-rose-400',
                bg: 'bg-rose-500/10',
              },
            ].map(s => (
              <div
                key={s.label}
                className={`flex items-center justify-between ${s.bg} rounded-xl px-4 py-3`}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{s.label}</p>
                  {s.diff !== 0 && (
                    <p className={`text-xs font-mono mt-0.5 ${s.color}`}>
                      {s.diff > 0 ? '+' : ''}{short(s.diff)} vs. your plan
                    </p>
                  )}
                </div>
                <p className={`text-xl font-extrabold font-mono ${s.color}`}>{short(s.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ad ── */}
        <AdBlock className="bg-[#131929] border border-white/5 rounded-2xl p-4 min-h-[90px] flex flex-col items-center justify-center" />

        {/* ── Portfolio tracker ── */}
        <div id="portfolio" className="bg-[#131929] border border-white/6 rounded-2xl p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-300">Portfolio Tracker</h2>
            <p className="text-xs text-slate-500 mt-0.5">Track your assets and see your allocation.</p>
          </div>

          {/* Add form */}
          <div className="grid grid-cols-[1fr_100px_80px_40px] gap-2">
            <input
              placeholder="Asset name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAsset()}
              className="bg-white/5 border border-white/8 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
            />
            <input
              placeholder="$ Amount"
              type="number"
              value={newAmt}
              onChange={e => setNewAmt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAsset()}
              className="bg-white/5 border border-white/8 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
            />
            <input
              placeholder="% Ret"
              type="number"
              value={newRet}
              onChange={e => setNewRet(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAsset()}
              className="bg-white/5 border border-white/8 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-colors"
            />
            <button
              onClick={addAsset}
              className="bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-lg transition-colors flex items-center justify-center shadow-md shadow-indigo-500/20"
            >
              +
            </button>
          </div>

          {/* Asset rows */}
          <div className="space-y-1.5">
            {assets.length === 0 && (
              <p className="text-center text-slate-600 text-sm py-6">No assets yet — add one above.</p>
            )}
            {assets.map((a, i) => {
              const pct = portfolioTotal > 0 ? (a.amount / portfolioTotal) * 100 : 0;
              return (
                <div key={a.id} className="flex items-center gap-3 group">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 text-sm font-medium text-white truncate">{a.name}</span>
                  <span className="text-sm font-mono text-slate-300 hidden sm:block">{usd(a.amount)}</span>
                  <span className="text-xs font-mono text-emerald-400 w-12 text-right">+{a.annual}%</span>
                  <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">{pct.toFixed(0)}%</span>
                  <button
                    onClick={() => setAssets(p => p.filter(x => x.id !== a.id))}
                    className="text-slate-700 hover:text-rose-400 transition-colors text-xs opacity-0 group-hover:opacity-100 w-5"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Total + mini pie */}
          {assets.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <span className="text-sm text-slate-400">Total Portfolio</span>
              <span className="text-lg font-extrabold font-mono text-white">{usd(portfolioTotal)}</span>
            </div>
          )}

          {/* Pie chart */}
          {mounted && assets.length > 0 && (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assets.map(a => ({ name: a.name, value: a.amount }))}
                    cx="50%" cy="50%"
                    innerRadius="45%" outerRadius="70%"
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
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Ad ── */}
        <AdBlock className="bg-[#131929] border border-white/5 rounded-2xl p-4 min-h-[90px] flex flex-col items-center justify-center" />

        {/* ── SEO content ── */}
        <div className="bg-[#131929] border border-white/6 rounded-2xl p-6 sm:p-8 space-y-5 text-sm text-slate-400 leading-relaxed">
          <h2 className="text-base font-bold text-white">How compound interest works</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <h3 className="text-white font-semibold mb-1.5 text-sm">The formula</h3>
              <p className="font-mono text-xs bg-white/4 rounded-lg p-3 text-indigo-300 leading-loose">
                FV = P(1+r/n)^(nt)<br />
                &nbsp;&nbsp;&nbsp;+ PMT×[(1+r/n)^(nt)−1]/(r/n)
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1.5 text-sm">Why time matters most</h3>
              <p>Starting just 5 years earlier can add hundreds of thousands to your final balance — time is the biggest multiplier in any compound interest calculator.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1.5 text-sm">Monthly contributions</h3>
              <p>Regular monthly investing (dollar-cost averaging) smooths out market volatility and dramatically accelerates growth compared to a lump sum alone.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1.5 text-sm">Investment returns</h3>
              <p>The S&P 500 has historically returned ~10% per year before inflation. Index funds with low fees are one of the most reliable ways to capture that growth.</p>
            </div>
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-7 text-center text-xs text-slate-700">
        <p>© {new Date().getFullYear()} InvestCalc · Free Compound Interest Calculator</p>
        <p className="mt-1">For educational purposes only. Not financial advice.</p>
      </footer>

    </div>
  );
}
