'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wrench,
  Sparkles,
  CheckCircle2,
  Zap,
  Gauge,
  Share2,
  Ruler,
  Cpu,
  ArrowRight,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { PCComponent, TargetResolution } from '@/types/pc';
import {
  PRESET_BUILD_TEMPLATES,
  PresetBuildTemplate,
  buildSelectionsFromPreset,
} from '@/data/preset-builds';
import { calculateEstimatedWattage, calculateTotalPrice } from '@/lib/compatibility';
import { calculateBottleneck } from '@/lib/bottleneck';
import { formatIDR } from '@/lib/format';
import { useBuilderStore } from '@/store/builder-store';
import { AutoBuildModal } from '@/components/AutoBuildModal';

interface LandingHeroClientProps {
  catalog: PCComponent[];
}

export function LandingHeroClient({ catalog }: LandingHeroClientProps) {
  const router = useRouter();
  const loadSelections = useBuilderStore((s) => s.loadSelections);
  const [autoBuildOpen, setAutoBuildOpen] = useState(false);

  const handleLoadPreset = (preset: PresetBuildTemplate) => {
    const selections = buildSelectionsFromPreset(preset);
    loadSelections(selections, preset.title, preset.useCase);
    router.push('/builder');
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative border-b border-slate-800/80 bg-[#0D131F] pt-12 pb-16 sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs font-medium text-sky-400">
                <Cpu className="h-3.5 w-3.5" />
                <span>Platform Simulasi & Perencanaan Kustomisasi PC Indonesia</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 sm:text-5xl sm:leading-[1.12]">
                Rancang Spesifikasi PC Impian Tanpa Risiko Salah Beli Komponen.
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Simulasikan rakitan PC secara bebas sesuai anggaran. Dilengkapi mesin validasi
                kompatibilitas otomatis (Socket CPU, DDR4/DDR5, dimensi fisik GPU & Cooler, hingga
                margin daya PSU), kalkulator skor <em>bottleneck</em> 1080p/1440p/4K, serta ekspor
                instan ke PNG, PDF, dan tautan berbagi.
              </p>

              {/* Primary CTAs per PRD Section 6 */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  href="/builder"
                  id="hero-cta-start-builder"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg transition-all hover:bg-sky-400"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Mulai Rakit Sekarang</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  id="hero-cta-auto-build"
                  onClick={() => setAutoBuildOpen(true)}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3.5 text-sm font-semibold text-slate-100 transition-colors hover:border-sky-500/60 hover:bg-slate-800"
                >
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  <span>Rekomendasi Otomatis (Sesuai Budget)</span>
                </button>
              </div>

              {/* Quick Trust Specs */}
              <div className="grid grid-cols-3 gap-4 border-t border-slate-800/90 pt-6 text-xs text-slate-400">
                <div>
                  <div className="font-mono text-lg font-bold text-slate-100">
                    {catalog.length}+
                  </div>
                  <div>Katalog Komponen Kurasi</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-emerald-400">7 Lapis</div>
                  <div>Validasi Teknis & Fisik (mm)</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-sky-400">PNG & PDF</div>
                  <div>Ekspor Spesifikasi & Link</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Interactive Diagnostic Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-800 bg-[#0B0F17] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                      Contoh Validasi Real-Time
                    </span>
                    <h2 className="text-sm font-bold text-slate-100 mt-0.5">
                      QHD 1440p AM5 Gaming Simulation
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aman (100% Cocok)
                  </span>
                </div>

                {/* Sample Technical Telemetry */}
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                    <span className="text-slate-400">CPU ↔ Motherboard Socket</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      AM5 = AM5 (B650) ✓
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                    <span className="text-slate-400">Tipe & Slot Memori RAM</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      DDR5-6000 (2/4 Slot) ✓
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                    <span className="text-slate-400">Dimensi Fisik GPU ↔ Casing</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      234mm ≤ 338mm ✓
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                    <span className="text-slate-400">Tinggi Cooler ↔ Casing</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      155mm ≤ 170mm ✓
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                    <span className="text-slate-400">Estimasi Daya ↔ PSU</span>
                    <span className="font-mono font-semibold text-sky-400">
                      376W / 750W Gold (+50% Margin)
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
                    <span className="text-slate-400">Skor Bottleneck (1440p Gaming)</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      3% (Optimal / Seimbang)
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                  <div>
                    <div className="text-[11px] text-slate-400">Total Estimasi Rakitan</div>
                    <div className="font-mono text-lg font-bold text-slate-100">
                      Rp 21.840.000
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(PRESET_BUILD_TEMPLATES[1])}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-sky-400 hover:bg-slate-700 transition-colors"
                  >
                    <span>Buka Rakitan Ini</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preset Builds Section (PRD Section 6: Daftar Preset Build Populer) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Referensi Terkurasi
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100 mt-1">
              Preset Rakitan Populer (Siap Clone & Kustomisasi)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Pilih salah satu konfigurasi acuan di bawah ini untuk langsung dimodifikasi di
              Workspace Simulasi atau dilihat detailnya.
            </p>
          </div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            <span>Lihat Seluruh Katalog Komponen</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {PRESET_BUILD_TEMPLATES.map((preset) => {
            const selections = buildSelectionsFromPreset(preset);
            const totalPrice = calculateTotalPrice(selections);
            const totalWatt = calculateEstimatedWattage(selections);
            const bottleneck = calculateBottleneck(
              selections.CPU?.component,
              selections.GPU?.component,
              preset.useCase
            );

            return (
              <div
                key={preset.slug}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0F1623] p-5 transition-colors hover:border-slate-700"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-md bg-sky-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-sky-400">
                      {preset.badge}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      Target: {preset.useCase}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-100">{preset.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{preset.subtitle}</p>

                  {/* Key parts breakdown */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-2.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        Processor
                      </span>
                      <div className="truncate font-semibold text-slate-200 mt-0.5">
                        {selections.CPU?.component.name}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-2.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        Graphics Card
                      </span>
                      <div className="truncate font-semibold text-slate-200 mt-0.5">
                        {selections.GPU?.component.name}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-2.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        Motherboard & RAM
                      </span>
                      <div className="truncate font-semibold text-slate-200 mt-0.5">
                        {selections.Motherboard?.component.specs.chipset} •{' '}
                        {selections.RAM?.component.specs.capacity_gb}GB{' '}
                        {selections.RAM?.component.specs.ddr_type}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800/90 bg-slate-900/60 p-2.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        Daya & Bottleneck
                      </span>
                      <div className="truncate font-mono font-semibold text-emerald-400 mt-0.5">
                        {totalWatt}W • Bottleneck {bottleneck.percentage}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <div>
                    <div className="text-[11px] text-slate-400">Estimasi Total Harga</div>
                    <div className="font-mono text-lg font-bold text-sky-400">
                      {formatIDR(totalPrice)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/build/${preset.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Detail Link</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleLoadPreset(preset)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors"
                    >
                      <span>Clone & Edit di Simulasi</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Core Engine Capabilities Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-800 bg-[#0F1623] p-6 sm:p-10">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Arsitektur Validasi RakitPC.id
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-100">
              Empat Mesin Analitik untuk Perencanaan PC Presisi
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Dirancang khusus untuk Perakit Pemula, Enthusiast Gamer, hingga Kreator Profesional.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Ruler className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-100">
                Validasi Socket, DDR & Dimensi (mm)
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Mengecek otomatis kecocokan Socket CPU/Motherboard, generasi DDR4/DDR5, jumlah slot
                DIMM/M.2, hingga batas milimeter panjang GPU dan tinggi CPU Cooler terhadap Casing.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <Gauge className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-100">
                Kalkulator Skor Bottleneck Multi-Resolusi
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Simulasikan keseimbangan performa CPU vs GPU pada skenario 1080p Gaming, 1440p
                Gaming, 4K Gaming, maupun Produktivitas/Workstation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-100">
                Kalkulator Daya TDP & Margin PSU 25%+
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Menghitung total konsumsi daya seluruh komponen ditambah margin keamanan 20–30%
                untuk meredam lonjakan daya kartu grafis modern.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <Share2 className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-100">
                Ekspor Build Card PNG, PDF & Share Link
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                Unduh kartu gambar spesifikasi (PNG), dokumen rincian harga formal (PDF), atau
                bagikan tautan unik yang bisa di-clone oleh pengguna lain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AutoBuild Modal */}
      <AutoBuildModal
        isOpen={autoBuildOpen}
        catalog={catalog}
        onApplyBuild={(selections, title, resolution: TargetResolution) => {
          loadSelections(selections, title, resolution);
          router.push('/builder');
        }}
        onClose={() => setAutoBuildOpen(false)}
      />
    </div>
  );
}
