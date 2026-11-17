'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Copy,
  Check,
  Wrench,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Gauge,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import {
  BuildSelections,
  CATEGORY_METADATA,
  COMPONENT_CATEGORIES,
  PCComponent,
  SavedBuild,
  TargetResolution,
} from '@/types/pc';
import { evaluateCompatibility } from '@/lib/compatibility';
import { calculateBottleneck } from '@/lib/bottleneck';
import { formatIDR, getComponentSpecBadges } from '@/lib/format';
import { useBuilderStore } from '@/store/builder-store';
import { BuildCardExportModal } from '@/components/BuildCardExportModal';
import { exportBuildToPdf } from '@/lib/export-utils';

interface PublicBuildViewProps {
  build: SavedBuild;
  catalog: PCComponent[];
}

export function PublicBuildView({ build, catalog }: PublicBuildViewProps) {
  const router = useRouter();
  const loadFromSavedItems = useBuilderStore((s) => s.loadFromSavedItems);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Reconstruct BuildSelections from SavedBuild items
  const selections: BuildSelections = useMemo(() => {
    const next: BuildSelections = {
      CPU: null,
      Motherboard: null,
      RAM: null,
      GPU: null,
      Storage: [],
      PSU: null,
      Case: null,
      Cooler: null,
    };

    for (const item of build.items || []) {
      const comp =
        item.component || catalog.find((c) => c.id === item.component_id);
      if (!comp) continue;
      if (comp.category === 'Storage') {
        next.Storage.push({ component: comp, quantity: item.quantity || 1 });
      } else {
        next[comp.category] = { component: comp, quantity: item.quantity || 1 };
      }
    }
    return next;
  }, [build.items, catalog]);

  const compatibility = useMemo(
    () => evaluateCompatibility(selections),
    [selections]
  );

  const bottleneck = useMemo(() => {
    const scenario = (build.use_case as TargetResolution) || '1080p Gaming';
    return calculateBottleneck(
      selections.CPU?.component,
      selections.GPU?.component,
      scenario
    );
  }, [selections.CPU, selections.GPU, build.use_case]);

  const handleCloneAndEdit = () => {
    loadFromSavedItems(
      build.items,
      catalog,
      `${build.title} (Clone)`,
      (build.use_case as TargetResolution) || '1080p Gaming'
    );
    router.push('/builder');
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/build/${build.slug}`;
    navigator.clipboard?.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/builder"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Workspace Simulasi</span>
        </Link>
        <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-400">
          ID Rakitan: /build/{build.slug}
        </span>
      </div>

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-400">
                Spesifikasi Rakitan Publik (Read-Only)
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(build.created_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
              {build.title}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Skenario Target: <strong className="text-slate-200">{build.use_case}</strong> •
              Tekan tombol <em>Clone & Edit</em> untuk memodifikasi komponen sesuai preferensi Anda.
            </p>
          </div>

          {/* Primary Action Buttons per PRD Section 4.D & 6 */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              id="public-build-copy-link-btn"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Tautan Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-slate-400" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="public-build-export-png-btn"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <ImageIcon className="h-4 w-4 text-sky-400" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              id="public-build-export-pdf-btn"
              onClick={() =>
                exportBuildToPdf({
                  title: build.title,
                  selections,
                  compatibility,
                  bottleneck,
                  shareUrl: `${window.location.origin}/build/${build.slug}`,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <FileText className="h-4 w-4 text-sky-400" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              id="public-build-clone-btn"
              onClick={handleCloneAndEdit}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg hover:bg-sky-400 transition-colors"
            >
              <Wrench className="h-4 w-4" />
              <span>Clone & Edit Rakitan Ini</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-800 pt-5 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
            <div className="text-[11px] font-medium text-slate-400">
              Total Estimasi Harga
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-sky-400">
              {formatIDR(build.total_price)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
            <div className="text-[11px] font-medium text-slate-400">
              Status Kompatibilitas
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {compatibility.status === 'Aman' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">
                    Aman (Tervalidasi)
                  </span>
                </>
              ) : compatibility.status === 'Peringatan' ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Peringatan</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">
                    Tidak Kompatibel
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
            <div className="text-[11px] font-medium text-slate-400">
              Konsumsi Daya & Rekomendasi PSU
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-slate-100">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>
                {compatibility.estimatedWattage}W (Rec.{' '}
                {compatibility.recommendedPsuWattage}W)
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
            <div className="text-[11px] font-medium text-slate-400">
              Skor Bottleneck ({bottleneck.scenario})
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-slate-100">
              <Gauge className="h-4 w-4 text-sky-400" />
              <span>
                {bottleneck.limiter === 'Incomplete'
                  ? 'N/A'
                  : `${bottleneck.percentage}% (${bottleneck.severity})`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Specification Table & Diagnostic Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F1623]">
            <div className="border-b border-slate-800 bg-slate-900/70 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              Rincian Komponen Rakitan
            </div>

            <div className="divide-y divide-slate-800/80">
              {COMPONENT_CATEGORIES.map((cat) => {
                const meta = CATEGORY_METADATA[cat];
                if (cat === 'Storage') {
                  if (selections.Storage.length === 0) {
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-between px-5 py-3.5 text-xs text-slate-500"
                      >
                        <span className="font-mono font-bold uppercase">{meta.label}</span>
                        <span>Tidak dipilih</span>
                      </div>
                    );
                  }
                  return selections.Storage.map((st, idx) => (
                    <div
                      key={`${cat}-${idx}`}
                      className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={st.component.image_url || '/hardware/storage.svg'}
                          alt={st.component.name}
                          className="h-11 w-11 rounded-lg border border-slate-800 bg-slate-950 p-1.5"
                        />
                        <div>
                          <div className="text-[10px] font-mono font-bold uppercase text-sky-400">
                            {meta.label} #{idx + 1}
                          </div>
                          <div className="text-sm font-semibold text-slate-100">
                            {st.quantity > 1 ? `${st.quantity}x ` : ''}
                            {st.component.name}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {getComponentSpecBadges(st.component).map((b, i) => (
                              <span
                                key={i}
                                className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-800"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-100">
                        {formatIDR(st.component.price * st.quantity)}
                      </div>
                    </div>
                  ));
                }

                const slot = selections[cat];
                if (!slot) {
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between px-5 py-3.5 text-xs text-slate-500"
                    >
                      <span className="font-mono font-bold uppercase">{meta.label}</span>
                      <span>Tidak dipilih</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat}
                    className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={slot.component.image_url || '/hardware/motherboard.svg'}
                        alt={slot.component.name}
                        className="h-11 w-11 rounded-lg border border-slate-800 bg-slate-950 p-1.5"
                      />
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase text-sky-400">
                          {meta.label}
                        </div>
                        <div className="text-sm font-semibold text-slate-100">
                          {slot.quantity > 1 ? `${slot.quantity}x ` : ''}
                          {slot.component.name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {getComponentSpecBadges(slot.component).map((b, i) => (
                            <span
                              key={i}
                              className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-800"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-100">
                      {formatIDR(slot.component.price * slot.quantity)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Bottleneck & Compatibility Explanation */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Ringkasan Analisis Bottleneck
            </h2>
            <div className="text-sm font-bold text-slate-100">
              {bottleneck.headline}
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {bottleneck.explanation}
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
              <strong className="text-sky-400">Saran Teknis:</strong>{' '}
              {bottleneck.recommendation}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Laporan Kompatibilitas Fisik & Daya
            </h2>
            {compatibility.issues.length === 0 ? (
              <p className="text-xs leading-relaxed text-slate-300">
                Seluruh komponen dalam tautan rakitan ini telah lolos pemeriksaan Socket CPU,
                generasi RAM DDR, dimensi milimeter GPU/Cooler terhadap Casing, dan kecukupan daya
                PSU.
              </p>
            ) : (
              <div className="space-y-2">
                {compatibility.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300"
                  >
                    <div className="font-bold text-amber-400">{issue.title}</div>
                    <p className="mt-1 text-[11px] text-slate-400">{issue.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BuildCardExportModal
        isOpen={exportModalOpen}
        title={build.title}
        selections={selections}
        compatibility={compatibility}
        bottleneck={bottleneck}
        shareUrl={
          typeof window !== 'undefined'
            ? `${window.location.origin}/build/${build.slug}`
            : `/build/${build.slug}`
        }
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
