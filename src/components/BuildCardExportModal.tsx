'use client';

import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Gauge,
} from 'lucide-react';
import {
  BottleneckAnalysis,
  BuildSelections,
  CATEGORY_METADATA,
  CompatibilityReport,
  COMPONENT_CATEGORIES,
} from '@/types/pc';
import { formatIDR, getComponentSpecBadges } from '@/lib/format';
import { calculateTotalPrice } from '@/lib/compatibility';
import { exportBuildToPdf, exportElementToPng } from '@/lib/export-utils';

interface BuildCardExportModalProps {
  isOpen: boolean;
  title: string;
  selections: BuildSelections;
  compatibility: CompatibilityReport;
  bottleneck: BottleneckAnalysis;
  shareUrl?: string;
  onClose: () => void;
}

export function BuildCardExportModal({
  isOpen,
  title,
  selections,
  compatibility,
  bottleneck,
  shareUrl,
  onClose,
}: BuildCardExportModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exportingPng, setExportingPng] = useState(false);

  if (!isOpen) return null;

  const totalPrice = calculateTotalPrice(selections);

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setExportingPng(true);
    try {
      const safeName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      await exportElementToPng(cardRef.current, `rakitpc-${safeName || 'build'}.png`);
    } catch (err) {
      console.error('Export PNG failed:', err);
    } finally {
      setExportingPng(false);
    }
  };

  const handleDownloadPdf = () => {
    exportBuildToPdf({
      title,
      selections,
      compatibility,
      bottleneck,
      shareUrl,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0F1623] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 id="export-modal-title" className="text-base font-bold text-slate-100">
              Preview Build Card & Ekspor Spesifikasi (PNG / PDF)
            </h2>
            <p className="text-xs text-slate-400">
              Unduh ringkasan rakitan dalam format gambar sosial media (PNG) atau dokumen formal
              (PDF).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Build Card Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-950/90 p-4 sm:p-6">
          <div
            ref={cardRef}
            id="rakitpc-export-card"
            className="mx-auto w-full max-w-2xl rounded-xl border border-slate-800 bg-[#0B0F17] p-6 text-slate-100 shadow-xl"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500 text-slate-950">
                  <Cpu className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                      RakitPC.id — Build Card
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                      {bottleneck.scenario}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-100 mt-0.5">
                    {title}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total Estimasi
                </div>
                <div className="font-mono text-xl font-bold text-sky-400">
                  {formatIDR(totalPrice)}
                </div>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <div className="my-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Status Validasi</span>
                </div>
                <div
                  className={`mt-1 text-xs font-bold ${
                    compatibility.status === 'Aman'
                      ? 'text-emerald-400'
                      : compatibility.status === 'Peringatan'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {compatibility.status.toUpperCase()}
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Estimasi Daya</span>
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-slate-100">
                  {compatibility.estimatedWattage}W{' '}
                  <span className="font-normal text-slate-400">
                    (Rec. {compatibility.recommendedPsuWattage}W)
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Gauge className="h-3.5 w-3.5 text-sky-400" />
                  <span>Rasio Bottleneck</span>
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-slate-100">
                  {bottleneck.limiter === 'Incomplete'
                    ? 'Belum Lengkap'
                    : `${bottleneck.percentage}% (${bottleneck.severity})`}
                </div>
              </div>
            </div>

            {/* Component Rows */}
            <div className="divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-900/40 px-4">
              {COMPONENT_CATEGORIES.map((cat) => {
                const label = CATEGORY_METADATA[cat].shortLabel;
                if (cat === 'Storage') {
                  if (selections.Storage.length === 0) {
                    return (
                      <div key={cat} className="flex items-center justify-between py-2.5 text-xs">
                        <span className="w-24 font-mono font-semibold text-slate-500">
                          {label}
                        </span>
                        <span className="flex-1 text-slate-500 italic">Belum dipilih</span>
                        <span className="font-mono text-slate-500">Rp 0</span>
                      </div>
                    );
                  }
                  return selections.Storage.map((st, idx) => (
                    <div
                      key={`${cat}-${idx}`}
                      className="flex items-center justify-between py-2.5 text-xs gap-2"
                    >
                      <span className="w-24 shrink-0 font-mono font-semibold text-sky-400">
                        {idx === 0 ? label : `${label} #${idx + 1}`}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-100">
                          {st.quantity > 1 ? `${st.quantity}x ` : ''}
                          {st.component.name}
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-400">
                          {getComponentSpecBadges(st.component).slice(0, 3).join(' • ')}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono font-semibold text-slate-200">
                        {formatIDR(st.component.price * st.quantity)}
                      </span>
                    </div>
                  ));
                }

                const slot = selections[cat];
                if (!slot) {
                  return (
                    <div key={cat} className="flex items-center justify-between py-2.5 text-xs">
                      <span className="w-24 font-mono font-semibold text-slate-500">{label}</span>
                      <span className="flex-1 text-slate-500 italic">Belum dipilih</span>
                      <span className="font-mono text-slate-500">Rp 0</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between py-2.5 text-xs gap-2"
                  >
                    <span className="w-24 shrink-0 font-mono font-semibold text-sky-400">
                      {label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-100">
                        {slot.quantity > 1 ? `${slot.quantity}x ` : ''}
                        {slot.component.name}
                      </div>
                      <div className="truncate font-mono text-[10px] text-slate-400">
                        {getComponentSpecBadges(slot.component).slice(0, 3).join(' • ')}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono font-semibold text-slate-200">
                      {formatIDR(slot.component.price * slot.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer inside Card */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>Disimulasikan di RakitPC.id — Validasi Kompatibilitas Otomatis</span>
              <span className="font-mono">
                {new Date().toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/90 px-5 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertTriangle className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Siap dibagikan ke grup komunitas, Discord, atau toko komputer langganan.</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="export-download-pdf-btn"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
            >
              <FileText className="h-4 w-4 text-sky-400" />
              <span>Export ke PDF</span>
            </button>
            <button
              type="button"
              id="export-download-png-btn"
              disabled={exportingPng}
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition-colors"
            >
              <ImageIcon className="h-4 w-4" />
              <span>{exportingPng ? 'Menyiapkan PNG...' : 'Export ke PNG (Build Card)'}</span>
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
