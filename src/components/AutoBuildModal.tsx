'use client';

import React, { useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  Gamepad2,
  Film,
  Code2,
  CheckCircle2,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import {
  AutoBuildUseCase,
  BuildSelections,
  PCComponent,
  TargetResolution,
} from '@/types/pc';
import { generateAutoBuild } from '@/lib/auto-builder';
import { formatIDR } from '@/lib/format';

interface AutoBuildModalProps {
  isOpen: boolean;
  catalog: PCComponent[];
  onApplyBuild: (
    selections: BuildSelections,
    title: string,
    resolution: TargetResolution
  ) => void;
  onClose: () => void;
}

const BUDGET_PRESETS = [
  { label: 'Rp 7,5 Jt', value: 7500000 },
  { label: 'Rp 10 Jt', value: 10000000 },
  { label: 'Rp 12 Jt', value: 12000000 },
  { label: 'Rp 16 Jt', value: 16000000 },
  { label: 'Rp 22 Jt', value: 22000000 },
  { label: 'Rp 32 Jt', value: 32000000 },
];

export function AutoBuildModal({
  isOpen,
  catalog,
  onApplyBuild,
  onClose,
}: AutoBuildModalProps) {
  const [budget, setBudget] = useState<number>(12000000);
  const [useCase, setUseCase] = useState<AutoBuildUseCase>('Gaming');
  const [preferredBrand, setPreferredBrand] = useState<'Any' | 'AMD' | 'Intel'>('Any');

  const result = useMemo(() => {
    if (catalog.length === 0) return null;
    return generateAutoBuild({ budget, useCase, preferredBrand }, catalog);
  }, [budget, useCase, preferredBrand, catalog]);

  if (!isOpen) return null;

  const mapUseCaseToResolution = (
    uc: AutoBuildUseCase,
    b: number
  ): TargetResolution => {
    if (uc === 'Editing / Rendering' || uc === 'Office / Coding') {
      return 'Produktivitas / Workstation';
    }
    if (b >= 24000000) return '4K Gaming';
    if (b >= 13500000) return '1440p Gaming';
    return '1080p Gaming';
  };

  const useCaseOptions: {
    id: AutoBuildUseCase;
    label: string;
    desc: string;
    ratioHint: string;
    icon: React.ElementType;
  }[] = [
    {
      id: 'Gaming',
      label: 'Gaming (1080p / 1440p / 4K)',
      desc: 'Prioritas kartu grafis (GPU) untuk frame rate maksimal dan stabilitas tinggi.',
      ratioHint: '~37% GPU • ~20% CPU • ~13% Mobo',
      icon: Gamepad2,
    },
    {
      id: 'Editing / Rendering',
      label: 'Editing Video & Rendering 3D',
      desc: 'Keseimbangan prosesor multi-core, kapasitas RAM besar, dan akselerasi VRAM GPU.',
      ratioHint: '~29% GPU • ~26% CPU • ~12% RAM',
      icon: Film,
    },
    {
      id: 'Office / Coding',
      desc: 'Fokus kecepatan CPU, responsivitas NVMe SSD, dan efisiensi daya untuk kerja harian.',
      label: 'Office, Coding & Multitasking',
      ratioHint: '~28% CPU • ~16% Mobo • ~13% RAM',
      icon: Code2,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="autobuild-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0F1623] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="autobuild-modal-title"
                className="text-lg font-bold tracking-tight text-slate-100"
              >
                Rekomendasi Rakitan Otomatis (Auto-Build by Budget)
              </h2>
              <p className="text-xs text-slate-400">
                Masukkan target anggaran & kebutuhan — algoritma kami menyusun kombinasi optimal &
                100% kompatibel.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="autobuild-modal-close"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Step 1: Target Budget */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label
                htmlFor="autobuild-budget-input"
                className="text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                1. Target Anggaran (IDR)
              </label>
              <div className="font-mono text-xl font-bold text-sky-400">
                {formatIDR(budget)}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="autobuild-budget-slider"
                type="range"
                min={6000000}
                max={50000000}
                step={500000}
                value={Math.min(50000000, Math.max(6000000, budget))}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
              />
              <input
                id="autobuild-budget-input"
                type="number"
                min={5500000}
                max={100000000}
                step={500000}
                value={budget}
                onChange={(e) => setBudget(Math.max(5500000, Number(e.target.value || 0)))}
                className="w-full sm:w-44 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setBudget(p.value)}
                  className={`rounded-md px-3 py-1 font-mono text-xs font-medium transition-colors ${
                    budget === p.value
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Use Case & Platform Preference */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {useCaseOptions.map((opt) => {
              const Icon = opt.icon;
              const active = useCase === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUseCase(opt.id)}
                  className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    active
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          active
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {active && (
                        <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                          Terpilih
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-slate-100">{opt.label}</h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">{opt.desc}</p>
                  </div>
                  <div className="mt-3 border-t border-slate-800/80 pt-2 font-mono text-[11px] text-slate-400">
                    {opt.ratioHint}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step 3: Preferred CPU Platform */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <Cpu className="h-4 w-4 text-sky-400" />
              <span>Preferensi Platform Prosesor:</span>
            </div>
            <div className="flex items-center gap-2">
              {(['Any', 'AMD', 'Intel'] as const).map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => setPreferredBrand(brand)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    preferredBrand === brand
                      ? 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {brand === 'Any' ? 'Otomatis Terbaik' : `Platform ${brand}`}
                </button>
              ))}
            </div>
          </div>

          {/* Live Generated Build Preview */}
          {result && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Hasil Optimasi Tervalidasi Kompatibel
                  </span>
                  <h4 className="text-base font-bold text-slate-100 mt-0.5">
                    {result.title}
                  </h4>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-slate-400">Total Estimasi Rakitan</div>
                  <div className="font-mono text-lg font-bold text-sky-400">
                    {formatIDR(result.totalPrice)}
                  </div>
                </div>
              </div>

              {/* Selected Components Grid */}
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {result.allocationSummary.map((item) => {
                  const slot =
                    item.category === 'Storage'
                      ? result.selections.Storage[0]
                      : result.selections[item.category];
                  return (
                    <div
                      key={item.category}
                      className="flex items-center justify-between rounded-lg border border-slate-800/90 bg-slate-900/60 px-3 py-2"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold uppercase text-sky-400">
                            {item.category}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            ({item.actualPercent}% budget)
                          </span>
                        </div>
                        <div className="truncate text-xs font-medium text-slate-200 mt-0.5">
                          {slot ? slot.component.name : 'Grafis Terintegrasi (Tanpa GPU Diskrit)'}
                        </div>
                      </div>
                      <div className="shrink-0 font-mono text-xs font-semibold text-slate-300">
                        {slot ? formatIDR(item.amount) : 'Rp 0'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Technical notes */}
              <div className="mt-3 flex flex-wrap gap-2">
                {result.notes.map((note, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400 border border-slate-800"
                  >
                    • {note}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/80 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Batal
          </button>
          {result && (
            <button
              type="button"
              id="autobuild-apply-btn"
              onClick={() => {
                onApplyBuild(
                  result.selections,
                  result.title,
                  mapUseCaseToResolution(useCase, budget)
                );
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors"
            >
              <span>Terapkan Rakitan Ini ke Simulasi</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
