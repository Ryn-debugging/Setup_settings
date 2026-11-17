'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Share2,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Zap,
  Gauge,
  Filter,
  Copy,
  Check,
  ExternalLink,
  Ruler,
  Layers,
} from 'lucide-react';
import {
  CATEGORY_METADATA,
  COMPONENT_CATEGORIES,
  ComponentCategory,
  PCComponent,
  TargetResolution,
} from '@/types/pc';
import {
  deserializeSelectionsFromParam,
  serializeSelectionsToParam,
  useBuilderStore,
} from '@/store/builder-store';
import {
  calculateTotalPrice,
  evaluateCompatibility,
} from '@/lib/compatibility';
import { calculateBottleneck } from '@/lib/bottleneck';
import { formatIDR, getComponentSpecBadges } from '@/lib/format';
import { ComponentPickerModal } from '@/components/ComponentPickerModal';
import { AutoBuildModal } from '@/components/AutoBuildModal';
import { BuildCardExportModal } from '@/components/BuildCardExportModal';
import { exportBuildToPdf } from '@/lib/export-utils';
import {
  PRESET_BUILD_TEMPLATES,
  buildSelectionsFromPreset,
} from '@/data/preset-builds';

interface BuilderWorkspaceProps {
  initialCatalog: PCComponent[];
}

const RESOLUTIONS: TargetResolution[] = [
  '1080p Gaming',
  '1440p Gaming',
  '4K Gaming',
  'Produktivitas / Workstation',
];

export function BuilderWorkspace({ initialCatalog }: BuilderWorkspaceProps) {
  const searchParams = useSearchParams();
  const [catalog] = useState<PCComponent[]>(initialCatalog);
  const [hydrated, setHydrated] = useState(false);

  const {
    buildTitle,
    targetResolution,
    smartFilterEnabled,
    selections,
    setBuildTitle,
    setTargetResolution,
    setSmartFilterEnabled,
    selectComponent,
    removeComponent,
    updateQuantity,
    loadSelections,
    clearBuild,
  } = useBuilderStore();

  // Modal states
  const [activeCategoryModal, setActiveCategoryModal] =
    useState<ComponentCategory | null>(null);
  const [storageEditSlotIndex, setStorageEditSlotIndex] = useState<
    number | undefined
  >(undefined);
  const [autoBuildOpen, setAutoBuildOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Shareable link state
  const [savingShareLink, setSavingShareLink] = useState(false);
  const [sharedSlug, setSharedSlug] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  // Hydrate & check URL search params ?b=...
  useEffect(() => {
    setHydrated(true);
    const bParam = searchParams.get('b');
    const titleParam = searchParams.get('title');
    if (bParam && catalog.length > 0) {
      const parsed = deserializeSelectionsFromParam(bParam, catalog);
      if (parsed) {
        loadSelections(parsed, titleParam || undefined);
      }
    }
  }, [searchParams, catalog, loadSelections]);

  // Keep URL query param updated without triggering navigation reload
  useEffect(() => {
    if (!hydrated) return;
    const serialized = serializeSelectionsToParam(selections);
    const url = new URL(window.location.href);
    if (serialized) {
      url.searchParams.set('b', serialized);
    } else {
      url.searchParams.delete('b');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selections, hydrated]);

  const totalPrice = useMemo(
    () => calculateTotalPrice(selections),
    [selections]
  );

  const compatibility = useMemo(
    () => evaluateCompatibility(selections),
    [selections]
  );

  const bottleneck = useMemo(
    () =>
      calculateBottleneck(
        selections.CPU?.component,
        selections.GPU?.component,
        targetResolution
      ),
    [selections.CPU, selections.GPU, targetResolution]
  );

  const hasAnyComponent = useMemo(() => {
    return (
      Boolean(
        selections.CPU ||
          selections.Motherboard ||
          selections.RAM ||
          selections.GPU ||
          selections.PSU ||
          selections.Case ||
          selections.Cooler
      ) || selections.Storage.length > 0
    );
  }, [selections]);

  const handleSaveShareableLink = async () => {
    if (!hasAnyComponent) {
      showToast('Pilih minimal 1 komponen terlebih dahulu untuk menyimpan tautan.');
      return;
    }

    setSavingShareLink(true);
    try {
      const items: Array<{ component_id: string; quantity: number }> = [];
      if (selections.CPU)
        items.push({
          component_id: selections.CPU.component.id,
          quantity: selections.CPU.quantity,
        });
      if (selections.Motherboard)
        items.push({
          component_id: selections.Motherboard.component.id,
          quantity: selections.Motherboard.quantity,
        });
      if (selections.RAM)
        items.push({
          component_id: selections.RAM.component.id,
          quantity: selections.RAM.quantity,
        });
      if (selections.GPU)
        items.push({
          component_id: selections.GPU.component.id,
          quantity: selections.GPU.quantity,
        });
      for (const st of selections.Storage) {
        items.push({
          component_id: st.component.id,
          quantity: st.quantity,
        });
      }
      if (selections.PSU)
        items.push({
          component_id: selections.PSU.component.id,
          quantity: selections.PSU.quantity,
        });
      if (selections.Case)
        items.push({
          component_id: selections.Case.component.id,
          quantity: selections.Case.quantity,
        });
      if (selections.Cooler)
        items.push({
          component_id: selections.Cooler.component.id,
          quantity: selections.Cooler.quantity,
        });

      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: buildTitle,
          use_case: targetResolution,
          total_price: totalPrice,
          total_wattage: compatibility.estimatedWattage,
          bottleneck_info: bottleneck,
          items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.build?.slug) {
        setSharedSlug(data.build.slug);
        const fullUrl = `${window.location.origin}/build/${data.build.slug}`;
        await navigator.clipboard?.writeText(fullUrl).catch(() => {});
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
        showToast(`Tautan rakitan /build/${data.build.slug} berhasil dibuat & disalin!`);
      } else {
        showToast(data.error || 'Gagal menyimpan tautan rakitan.');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat menyimpan rakitan.');
    } finally {
      setSavingShareLink(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
      </div>
    );
  }

  const gpuLen = Number(selections.GPU?.component.specs.length_mm || 0);
  const maxGpuLen = Number(selections.Case?.component.specs.max_gpu_mm || 0);
  const coolerHeight = Number(selections.Cooler?.component.specs.height_mm || 0);
  const maxCoolerHeight = Number(
    selections.Case?.component.specs.max_cooler_mm || 0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-sky-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-sky-300 shadow-2xl lg:bottom-6">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Workspace Header & Real-Time Summary Bar (PRD Section 4.A) */}
      <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Editable Build Title & Quick Preset Switcher */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                Workspace Simulasi Perakitan PC
              </span>
              <span className="text-slate-700">•</span>
              <button
                type="button"
                id="builder-smart-filter-btn"
                onClick={() => setSmartFilterEnabled(!smartFilterEnabled)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  smartFilterEnabled
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <Filter className="h-3 w-3" />
                <span>
                  Smart Filter: {smartFilterEnabled ? 'Aktif (Kompatibel)' : 'Nonaktif (Semua)'}
                </span>
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                id="builder-title-input"
                value={buildTitle}
                onChange={(e) => setBuildTitle(e.target.value)}
                aria-label="Judul Rakitan PC"
                className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-base font-bold text-slate-100 focus:border-sky-500 focus:outline-none"
                placeholder="Nama Rakitan PC Anda..."
              />

              {/* Quick Actions: Auto-Build, Load Preset, Reset */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="builder-open-autobuild-btn"
                  onClick={() => setAutoBuildOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Auto-Build Sesuai Budget</span>
                </button>

                <select
                  id="builder-preset-select"
                  aria-label="Muat Preset Rakitan"
                  defaultValue=""
                  onChange={(e) => {
                    const slug = e.target.value;
                    const preset = PRESET_BUILD_TEMPLATES.find((p) => p.slug === slug);
                    if (preset) {
                      loadSelections(
                        buildSelectionsFromPreset(preset),
                        preset.title,
                        preset.useCase
                      );
                      setSharedSlug(null);
                      showToast(`Preset "${preset.title}" berhasil dimuat.`);
                    }
                    e.target.value = '';
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Muat Preset Populer...
                  </option>
                  {PRESET_BUILD_TEMPLATES.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.badge}: {p.title}
                    </option>
                  ))}
                </select>

                {hasAnyComponent && (
                  <button
                    type="button"
                    id="builder-reset-btn"
                    onClick={() => {
                      clearBuild();
                      setSharedSlug(null);
                      showToast('Workspace rakitan dikosongkan.');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:border-rose-500/40 hover:text-rose-400 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real-Time Summary Bar Metrics */}
          <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-3 lg:border-t-0 lg:pt-0 lg:min-w-[410px]">
            {/* Compatibility Badge */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Status Kompatibilitas
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {compatibility.status === 'Aman' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-emerald-400">Aman</span>
                  </>
                ) : compatibility.status === 'Peringatan' ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-amber-400">Peringatan</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span className="text-xs font-bold text-rose-400">Konflik</span>
                  </>
                )}
              </div>
            </div>

            {/* Estimated Wattage */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Estimasi Daya
              </div>
              <div className="mt-1 flex items-center gap-1 font-mono text-xs font-bold text-slate-100">
                <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>{compatibility.estimatedWattage}W</span>
                {compatibility.recommendedPsuWattage > 0 && (
                  <span className="text-[10px] font-normal text-slate-400">
                    / {compatibility.recommendedPsuWattage}W
                  </span>
                )}
              </div>
            </div>

            {/* Total Price */}
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Estimasi
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-sky-400">
                {formatIDR(totalPrice)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Desktop Layout (PRD Section 7: Daftar Komponen di Kiri, Ringkasan & Skor di Kanan) */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* LEFT COLUMN (7 cols): Component Selection Table */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F1623]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Daftar Komponen Utama (8 Kategori)</span>
              <span>Harga & Kuantitas</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {COMPONENT_CATEGORIES.map((cat) => {
                const meta = CATEGORY_METADATA[cat];
                const categoryHasIssue = compatibility.issues.some((iss) =>
                  iss.affectedCategories.includes(cat)
                );

                // Special Multi-Slot Rendering for Storage (SSD/HDD)
                if (cat === 'Storage') {
                  const storageItems = selections.Storage;
                  return (
                    <div key={cat} className="p-4 transition-colors hover:bg-slate-900/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-400">
                            {meta.label}
                          </span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                            Multi-Slot Drive
                          </span>
                        </div>
                        <button
                          type="button"
                          id="builder-add-storage-btn"
                          onClick={() => {
                            setStorageEditSlotIndex(undefined);
                            setActiveCategoryModal('Storage');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-slate-700 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Tambah Storage</span>
                        </button>
                      </div>

                      {storageItems.length === 0 ? (
                        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
                          <span>{meta.description}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setStorageEditSlotIndex(undefined);
                              setActiveCategoryModal('Storage');
                            }}
                            className="shrink-0 font-semibold text-sky-400 hover:underline ml-3"
                          >
                            + Pilih SSD / HDD
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2.5">
                          {storageItems.map((slot, idx) => {
                            const badges = getComponentSpecBadges(slot.component);
                            return (
                              <div
                                key={`${slot.component.id}-${idx}`}
                                className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex items-start gap-3">
                                  <img
                                    src={slot.component.image_url || '/hardware/storage.svg'}
                                    alt={slot.component.name}
                                    className="h-11 w-11 shrink-0 rounded-lg border border-slate-800 bg-slate-900 p-1.5"
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-semibold text-slate-400">
                                        SLOT #{idx + 1}
                                      </span>
                                      <h3 className="text-sm font-semibold text-slate-100">
                                        {slot.component.name}
                                      </h3>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {badges.map((b, i) => (
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

                                <div className="flex items-center justify-between sm:justify-end gap-3">
                                  {/* Quantity selector */}
                                  <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity('Storage', slot.quantity - 1, idx)
                                      }
                                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
                                      aria-label="Kurangi jumlah drive"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 font-mono text-xs font-semibold text-slate-200">
                                      {slot.quantity}x
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuantity('Storage', slot.quantity + 1, idx)
                                      }
                                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
                                      aria-label="Tambah jumlah drive"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <div className="text-right min-w-[105px]">
                                    <div className="font-mono text-sm font-bold text-slate-100">
                                      {formatIDR(slot.component.price * slot.quantity)}
                                    </div>
                                    <div className="font-mono text-[10px] text-slate-400">
                                      {slot.component.wattage * slot.quantity}W TDP
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStorageEditSlotIndex(idx);
                                        setActiveCategoryModal('Storage');
                                      }}
                                      className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-slate-100"
                                    >
                                      Ganti
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeComponent('Storage', idx)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                                      aria-label="Hapus storage"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Standard Single-Slot Categories (with Quantity support for RAM)
                const slot = selections[cat];
                const badges = slot ? getComponentSpecBadges(slot.component) : [];

                return (
                  <div
                    key={cat}
                    className={`p-4 transition-colors hover:bg-slate-900/30 ${
                      categoryHasIssue ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left Info */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {slot ? (
                          <img
                            src={slot.component.image_url || '/hardware/motherboard.svg'}
                            alt={slot.component.name}
                            className="h-12 w-12 shrink-0 rounded-lg border border-slate-800 bg-slate-950 p-1.5"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 font-mono text-xs font-bold text-slate-400">
                            {meta.shortLabel}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-400">
                              {meta.label}
                            </span>
                            {slot && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                                {slot.component.brand}
                              </span>
                            )}
                          </div>

                          {slot ? (
                            <>
                              <h3 className="mt-0.5 text-sm font-semibold text-slate-100">
                                {slot.component.name}
                              </h3>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {badges.map((b, i) => (
                                  <span
                                    key={i}
                                    className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                                  >
                                    {b}
                                  </span>
                                ))}
                                <span className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-sky-400">
                                  Skor {slot.component.performance_score}/100
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="mt-1 text-xs text-slate-400">{meta.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Price & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                        {slot ? (
                          <>
                            {meta.supportsMultiQuantity && (
                              <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(cat, slot.quantity - 1)
                                  }
                                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
                                  aria-label="Kurangi kit RAM"
                                >
                                  -
                                </button>
                                <span className="px-2 font-mono text-xs font-semibold text-slate-200">
                                  {slot.quantity}x Kit
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(cat, slot.quantity + 1)
                                  }
                                  className="px-2 py-1 text-xs text-slate-400 hover:text-slate-100"
                                  aria-label="Tambah kit RAM"
                                >
                                  +
                                </button>
                              </div>
                            )}

                            <div className="text-right min-w-[108px]">
                              <div className="font-mono text-sm font-bold text-slate-100">
                                {formatIDR(slot.component.price * slot.quantity)}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {cat === 'PSU'
                                  ? `Maks ${slot.component.specs.wattage_capacity || 0}W`
                                  : slot.component.wattage > 0
                                  ? `${slot.component.wattage * slot.quantity}W TDP`
                                  : '0W'}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                id={`builder-change-${cat.toLowerCase()}`}
                                onClick={() => setActiveCategoryModal(cat)}
                                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                              >
                                Ganti
                              </button>
                              <button
                                type="button"
                                id={`builder-remove-${cat.toLowerCase()}`}
                                onClick={() => removeComponent(cat)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
                                aria-label={`Hapus ${meta.shortLabel}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            id={`builder-pick-${cat.toLowerCase()}`}
                            onClick={() => setActiveCategoryModal(cat)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 px-4 py-2 text-xs font-semibold text-sky-400 hover:bg-sky-500 hover:text-slate-950 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Pilih {meta.shortLabel}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Sticky Compatibility, Clearance, Bottleneck & Export Panel */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* 1. Save, Share & Export Actions Card (PRD Section 4.D) */}
          <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Simpan, Ekspor & Bagikan
              </span>
              <span className="font-mono text-xs font-semibold text-sky-400">
                {formatIDR(totalPrice)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="builder-export-png-btn"
                onClick={() => setExportModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Build Card (PNG)</span>
              </button>

              <button
                type="button"
                id="builder-export-pdf-btn"
                onClick={() =>
                  exportBuildToPdf({
                    title: buildTitle,
                    selections,
                    compatibility,
                    bottleneck,
                    shareUrl: sharedSlug
                      ? `${window.location.origin}/build/${sharedSlug}`
                      : undefined,
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-100 hover:bg-slate-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-sky-400" />
                <span>Dokumen PDF</span>
              </button>
            </div>

            <button
              type="button"
              id="builder-save-share-link-btn"
              disabled={savingShareLink}
              onClick={handleSaveShareableLink}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-xs font-semibold text-slate-200 hover:border-sky-500/50 hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <Share2 className="h-4 w-4 text-sky-400" />
              <span>
                {savingShareLink
                  ? 'Menyimpan Tautan...'
                  : 'Buat Shareable Link (/build/[slug])'}
              </span>
            </button>

            {sharedSlug && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs">
                <div className="truncate font-mono text-emerald-300">
                  /build/{sharedSlug}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/build/${sharedSlug}`;
                      navigator.clipboard?.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                  <Link
                    href={`/build/${sharedSlug}`}
                    className="inline-flex items-center gap-1 rounded bg-sky-500/20 px-2 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/30"
                  >
                    <span>Buka</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* 2. Mesin Validasi Kompatibilitas & Physical Clearance Panel (PRD Section 4.B) */}
          <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-sky-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Mesin Validasi Kompatibilitas
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  compatibility.status === 'Aman'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : compatibility.status === 'Peringatan'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {compatibility.status}
              </span>
            </div>

            {/* Physical & Electrical Telemetry Bars */}
            <div className="space-y-2.5 text-xs">
              {/* Socket Check */}
              <div className="flex items-center justify-between rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-800/80">
                <span className="text-slate-400">Socket CPU ↔ Mobo</span>
                <span className="font-mono font-semibold text-slate-200">
                  {selections.CPU && selections.Motherboard ? (
                    compatibility.physicalChecks.socketMatch ? (
                      <span className="text-emerald-400">
                        {selections.CPU.component.specs.socket} Cocok ✓
                      </span>
                    ) : (
                      <span className="text-rose-400">
                        {selections.CPU.component.specs.socket} ≠{' '}
                        {selections.Motherboard.component.specs.socket} ✗
                      </span>
                    )
                  ) : (
                    <span className="text-slate-500">Menunggu CPU & Mobo</span>
                  )}
                </span>
              </div>

              {/* DDR Check */}
              <div className="flex items-center justify-between rounded-lg bg-slate-900/70 px-3 py-2 border border-slate-800/80">
                <span className="text-slate-400">Memori RAM ↔ Mobo</span>
                <span className="font-mono font-semibold text-slate-200">
                  {selections.RAM && selections.Motherboard ? (
                    compatibility.physicalChecks.ddrMatch &&
                    compatibility.physicalChecks.ramSlotFit ? (
                      <span className="text-emerald-400">
                        {selections.RAM.component.specs.ddr_type} (
                        {(selections.RAM.component.specs.modules || 2) *
                          selections.RAM.quantity}
                        /{selections.Motherboard.component.specs.ram_slots} Slot) ✓
                      </span>
                    ) : (
                      <span className="text-rose-400">Konflik DDR / Slot ✗</span>
                    )
                  ) : (
                    <span className="text-slate-500">Menunggu RAM & Mobo</span>
                  )}
                </span>
              </div>

              {/* GPU Length vs Case Max Bar */}
              {gpuLen > 0 && maxGpuLen > 0 && (
                <div className="rounded-lg bg-slate-900/70 p-2.5 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Dimensi Panjang GPU ↔ Casing</span>
                    <span
                      className={`font-mono font-semibold ${
                        gpuLen <= maxGpuLen ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {gpuLen}mm / {maxGpuLen}mm
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        gpuLen <= maxGpuLen ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((gpuLen / maxGpuLen) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Cooler Height vs Case Max Bar */}
              {coolerHeight > 0 && maxCoolerHeight > 0 && (
                <div className="rounded-lg bg-slate-900/70 p-2.5 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Tinggi Cooler ↔ Casing</span>
                    <span
                      className={`font-mono font-semibold ${
                        coolerHeight <= maxCoolerHeight
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {coolerHeight}mm / {maxCoolerHeight}mm
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        coolerHeight <= maxCoolerHeight
                          ? 'bg-sky-400'
                          : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((coolerHeight / maxCoolerHeight) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* PSU Load & Headroom Bar */}
              {compatibility.estimatedWattage > 0 && (
                <div className="rounded-lg bg-slate-900/70 p-2.5 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Beban TDP Sistem ↔ PSU</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {compatibility.estimatedWattage}W{' '}
                      {compatibility.psuCapacityWattage > 0
                        ? `/ ${compatibility.psuCapacityWattage}W PSU`
                        : `(Rec. ${compatibility.recommendedPsuWattage}W)`}
                    </span>
                  </div>
                  {compatibility.psuCapacityWattage > 0 && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full ${
                          compatibility.psuCapacityWattage >=
                          compatibility.estimatedWattage * 1.2
                            ? 'bg-emerald-400'
                            : compatibility.psuCapacityWattage >=
                              compatibility.estimatedWattage
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (compatibility.estimatedWattage /
                                compatibility.psuCapacityWattage) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detailed Issues List */}
            {compatibility.issues.length === 0 ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  {hasAnyComponent
                    ? 'Seluruh komponen yang dipilih kompatibel secara teknis, dimensi fisik (mm), dan margin daya.'
                    : 'Pilih komponen di sebelah kiri untuk memulai pemeriksaan kompatibilitas otomatis.'}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {compatibility.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`rounded-lg border p-3 text-xs ${
                      issue.severity === 'error'
                        ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
                        : issue.severity === 'warning'
                        ? 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                        : 'border-sky-500/30 bg-sky-950/20 text-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {issue.severity === 'error' ? (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                      ) : issue.severity === 'warning' ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                      ) : (
                        <Info className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                      )}
                      <span>{issue.title}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                      {issue.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Kalkulator Skor Bottleneck Panel (PRD Section 4.C) */}
          <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-sky-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Analisis Skor Bottleneck
                </h2>
              </div>
              {bottleneck.limiter !== 'Incomplete' && (
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${
                    bottleneck.severity === 'Optimal'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : bottleneck.severity === 'Ringan'
                      ? 'bg-sky-500/15 text-sky-400'
                      : bottleneck.severity === 'Sedang'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {bottleneck.percentage}% • {bottleneck.severity}
                </span>
              )}
            </div>

            {/* Target Scenario / Resolution Selector */}
            <div>
              <label className="text-[11px] font-medium text-slate-400">
                Target Resolusi & Skenario Beban Kerja:
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {RESOLUTIONS.map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setTargetResolution(res)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                      targetResolution === res
                        ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* CPU vs GPU Score Comparison Bars */}
            <div className="space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">
                    Skor Performa CPU{' '}
                    {selections.CPU ? `(${selections.CPU.component.brand})` : ''}
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {bottleneck.cpuScore}/100
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all"
                    style={{ width: `${bottleneck.cpuScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">
                    Skor Performa GPU{' '}
                    {selections.GPU ? `(${selections.GPU.component.brand})` : ''}
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {bottleneck.gpuScore}/100
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${bottleneck.gpuScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Diagnostic Explanation */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-1.5">
              <div className="text-xs font-bold text-slate-100">
                {bottleneck.headline}
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {bottleneck.explanation}
              </p>
              <p className="border-t border-slate-800/80 pt-2 text-[11px] text-sky-400">
                <strong>Rekomendasi:</strong> {bottleneck.recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Mobile Sticky Bottom Summary Bar (PRD Section 7) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-[#0B0F17]/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  compatibility.status === 'Aman'
                    ? 'bg-emerald-400'
                    : compatibility.status === 'Peringatan'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-[11px] font-semibold text-slate-300">
                {compatibility.status} • {compatibility.estimatedWattage}W
              </span>
            </div>
            <div className="font-mono text-base font-bold text-sky-400">
              {formatIDR(totalPrice)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-bold text-slate-950"
            >
              Ekspor PNG / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ComponentPickerModal
        isOpen={activeCategoryModal !== null}
        category={activeCategoryModal}
        catalog={catalog}
        selections={selections}
        smartFilterEnabled={smartFilterEnabled}
        onToggleSmartFilter={setSmartFilterEnabled}
        onSelect={(comp) => {
          selectComponent(comp, storageEditSlotIndex);
          setSharedSlug(null);
          showToast(`${comp.name} ditambahkan ke rakitan.`);
        }}
        onClose={() => {
          setActiveCategoryModal(null);
          setStorageEditSlotIndex(undefined);
        }}
      />

      <AutoBuildModal
        isOpen={autoBuildOpen}
        catalog={catalog}
        onApplyBuild={(newSelections, title, resolution) => {
          loadSelections(newSelections, title, resolution);
          setSharedSlug(null);
          showToast(`Rakitan otomatis "${title}" berhasil diterapkan!`);
        }}
        onClose={() => setAutoBuildOpen(false)}
      />

      <BuildCardExportModal
        isOpen={exportModalOpen}
        title={buildTitle}
        selections={selections}
        compatibility={compatibility}
        bottleneck={bottleneck}
        shareUrl={
          sharedSlug ? `${window.location.origin}/build/${sharedSlug}` : undefined
        }
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}
