'use client';

import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';
import {
  BuildSelections,
  CATEGORY_METADATA,
  ComponentCategory,
  PCComponent,
} from '@/types/pc';
import { checkCandidateCompatibility } from '@/lib/compatibility';
import { formatIDR, getComponentSpecBadges } from '@/lib/format';

interface ComponentPickerModalProps {
  isOpen: boolean;
  category: ComponentCategory | null;
  catalog: PCComponent[];
  selections: BuildSelections;
  smartFilterEnabled: boolean;
  onToggleSmartFilter: (enabled: boolean) => void;
  onSelect: (component: PCComponent) => void;
  onClose: () => void;
}

type SortOption = 'price-asc' | 'price-desc' | 'score-desc' | 'watt-asc';

export function ComponentPickerModal({
  isOpen,
  category,
  catalog,
  selections,
  smartFilterEnabled,
  onToggleSmartFilter,
  onSelect,
  onClose,
}: ComponentPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');

  const categoryItems = useMemo(() => {
    if (!category) return [];
    return catalog.filter((c) => c.category === category);
  }, [catalog, category]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    categoryItems.forEach((c) => set.add(c.brand));
    return ['ALL', ...Array.from(set).sort()];
  }, [categoryItems]);

  const annotatedItems = useMemo(() => {
    return categoryItems.map((comp) => {
      const check = checkCandidateCompatibility(comp, selections);
      return {
        component: comp,
        compatible: check.compatible,
        reasons: check.reasons,
      };
    });
  }, [categoryItems, selections]);

  const filteredItems = useMemo(() => {
    return annotatedItems
      .filter((entry) => {
        if (smartFilterEnabled && !entry.compatible) {
          return false;
        }
        if (selectedBrand !== 'ALL' && entry.component.brand !== selectedBrand) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const specBadges = getComponentSpecBadges(entry.component).join(' ').toLowerCase();
          const matchName = entry.component.name.toLowerCase().includes(q);
          const matchBrand = entry.component.brand.toLowerCase().includes(q);
          const matchSpec = specBadges.includes(q);
          if (!matchName && !matchBrand && !matchSpec) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Always prioritize compatible items first when "Show All" is active
        if (a.compatible !== b.compatible) {
          return a.compatible ? -1 : 1;
        }
        switch (sortBy) {
          case 'price-asc':
            return a.component.price - b.component.price;
          case 'price-desc':
            return b.component.price - a.component.price;
          case 'score-desc':
            return b.component.performance_score - a.component.performance_score;
          case 'watt-asc':
            return a.component.wattage - b.component.wattage;
          default:
            return 0;
        }
      });
  }, [annotatedItems, smartFilterEnabled, selectedBrand, searchQuery, sortBy]);

  const hiddenBySmartFilterCount = useMemo(() => {
    return annotatedItems.filter((i) => !i.compatible).length;
  }, [annotatedItems]);

  if (!isOpen || !category) return null;

  const meta = CATEGORY_METADATA[category];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0F1623] shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2
              id="picker-modal-title"
              className="text-lg font-bold tracking-tight text-slate-100"
            >
              Pilih {meta.label}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{meta.description}</p>
          </div>
          <button
            type="button"
            id="picker-modal-close"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Tutup modal pemilihan komponen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900/60 px-5 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="picker-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Cari ${meta.shortLabel}, seri chipset, socket, atau spesifikasi...`}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/90 py-2 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Smart Filter Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="picker-smart-filter-toggle"
                onClick={() => onToggleSmartFilter(!smartFilterEnabled)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  smartFilterEnabled
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>
                  {smartFilterEnabled ? 'Smart Filter: Kompatibel Saja' : 'Tampilkan Semua'}
                </span>
              </button>

              {/* Sort dropdown */}
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
                <select
                  id="picker-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-medium text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="price-asc">Harga: Terendah</option>
                  <option value="price-desc">Harga: Tertinggi</option>
                  <option value="score-desc">Skor Performa: Tertinggi</option>
                  <option value="watt-asc">Daya (TDP): Terendah</option>
                </select>
              </div>
            </div>
          </div>

          {/* Brand Pills + Smart Filter Info */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBrand(b)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedBrand === b
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {b === 'ALL' ? 'Semua Brand' : b}
                </button>
              ))}
            </div>

            {hiddenBySmartFilterCount > 0 && (
              <div className="text-[11px] text-slate-400">
                {smartFilterEnabled ? (
                  <span>
                    Menyembunyikan{' '}
                    <strong className="text-amber-400">{hiddenBySmartFilterCount}</strong> komponen
                    tidak cocok.{' '}
                    <button
                      type="button"
                      onClick={() => onToggleSmartFilter(false)}
                      className="text-sky-400 underline hover:text-sky-300"
                    >
                      Tampilkan Semua
                    </button>
                  </span>
                ) : (
                  <span>
                    Menampilkan seluruh komponen ({hiddenBySmartFilterCount} tidak kompatibel)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Component List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 px-5 py-2">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <p className="text-sm font-medium text-slate-300">
                Tidak ada komponen {meta.shortLabel} yang sesuai filter pencarian.
              </p>
              {smartFilterEnabled && hiddenBySmartFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => onToggleSmartFilter(false)}
                  className="mt-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-sky-400 hover:bg-slate-700"
                >
                  Nonaktifkan Smart Filter ({hiddenBySmartFilterCount} komponen tersembunyi)
                </button>
              )}
            </div>
          ) : (
            filteredItems.map(({ component, compatible, reasons }) => {
              const badges = getComponentSpecBadges(component);
              return (
                <div
                  key={component.id}
                  className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                    !compatible ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Hardware SVG thumbnail */}
                    <img
                      src={component.image_url || '/hardware/motherboard.svg'}
                      alt={component.name}
                      className="h-12 w-12 shrink-0 rounded-lg border border-slate-800 bg-slate-950 p-1.5 object-contain"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                          {component.brand}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-100">
                          {component.name}
                        </h3>
                        {compatible ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Kompatibel
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-400">
                            <AlertTriangle className="h-3 w-3" />
                            {reasons[0] || 'Tidak Kompatibel'}
                          </span>
                        )}
                      </div>

                      {/* Spec Badges */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {badges.map((badge, i) => (
                          <span
                            key={i}
                            className="rounded border border-slate-800 bg-slate-900/90 px-2 py-0.5 font-mono text-[11px] text-slate-300"
                          >
                            {badge}
                          </span>
                        ))}
                        <span className="rounded border border-slate-800 bg-slate-900/90 px-2 py-0.5 font-mono text-[11px] text-sky-400">
                          Skor: {component.performance_score}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Select Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-1 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-sm font-bold text-slate-100">
                        {formatIDR(component.price)}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {component.category === 'PSU'
                          ? `Kapasitas ${component.specs.wattage_capacity || 0}W`
                          : component.wattage > 0
                          ? `TDP ${component.wattage}W`
                          : 'Pasif / 0W'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelect(component);
                        onClose();
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                        compatible
                          ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                          : 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{compatible ? 'Pilih' : 'Tetap Pilih'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
