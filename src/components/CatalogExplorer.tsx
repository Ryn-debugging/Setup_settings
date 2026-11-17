'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import {
  CATEGORY_METADATA,
  COMPONENT_CATEGORIES,
  ComponentCategory,
  PCComponent,
} from '@/types/pc';
import { checkCandidateCompatibility } from '@/lib/compatibility';
import { formatIDR, getComponentSpecBadges } from '@/lib/format';
import { useBuilderStore } from '@/store/builder-store';

interface CatalogExplorerProps {
  initialCatalog: PCComponent[];
}

export function CatalogExplorer({ initialCatalog }: CatalogExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    ComponentCategory | 'ALL'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedSocket, setSelectedSocket] = useState<string>('ALL');
  const [selectedDdr, setSelectedDdr] = useState<string>('ALL');
  const [maxPrice, setMaxPrice] = useState<number>(35000000);
  const [sortBy, setSortBy] = useState<
    'price-asc' | 'price-desc' | 'score-desc'
  >('price-asc');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const selections = useBuilderStore((s) => s.selections);
  const selectComponent = useBuilderStore((s) => s.selectComponent);

  const brands = useMemo(() => {
    const set = new Set<string>();
    initialCatalog.forEach((c) => {
      if (selectedCategory === 'ALL' || c.category === selectedCategory) {
        set.add(c.brand);
      }
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [initialCatalog, selectedCategory]);

  const filteredComponents = useMemo(() => {
    return initialCatalog
      .filter((comp) => {
        if (selectedCategory !== 'ALL' && comp.category !== selectedCategory) {
          return false;
        }
        if (selectedBrand !== 'ALL' && comp.brand !== selectedBrand) {
          return false;
        }
        if (comp.price > maxPrice) {
          return false;
        }
        if (selectedSocket !== 'ALL') {
          const sock = String(comp.specs.socket || '');
          const supportedSocks = (comp.specs.supported_sockets || []).map(String);
          if (sock !== selectedSocket && !supportedSocks.includes(selectedSocket)) {
            return false;
          }
        }
        if (selectedDdr !== 'ALL') {
          const ddr = String(comp.specs.ddr_type || '');
          const supMem = (comp.specs.supported_memory || []).map(String);
          if (ddr !== selectedDdr && !supMem.includes(selectedDdr)) {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const badges = getComponentSpecBadges(comp).join(' ').toLowerCase();
          if (
            !comp.name.toLowerCase().includes(q) &&
            !comp.brand.toLowerCase().includes(q) &&
            !badges.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return b.performance_score - a.performance_score;
      });
  }, [
    initialCatalog,
    selectedCategory,
    selectedBrand,
    selectedSocket,
    selectedDdr,
    maxPrice,
    searchQuery,
    sortBy,
  ]);

  const handleAddToBuild = (comp: PCComponent) => {
    selectComponent(comp);
    setToastMsg(`${comp.name} ditambahkan ke Workspace Simulasi.`);
    setTimeout(() => setToastMsg(null), 3200);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-sky-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-sky-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
          <Link
            href="/builder"
            className="ml-2 inline-flex items-center gap-1 rounded bg-sky-500 px-2.5 py-1 text-[11px] font-bold text-slate-950"
          >
            <span>Buka Simulasi</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
            <Cpu className="h-3.5 w-3.5" />
            <span>Database Perangkat Keras Indonesia</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-100 sm:text-3xl">
            Katalog & Spesifikasi Komponen PC
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Jelajahi {initialCatalog.length} komponen dengan filter teknis (Socket, DDR, Dimensi
            Fisik, Skor Performa) dan tambahkan langsung ke simulasi Anda.
          </p>
        </div>

        <Link
          href="/builder"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 transition-colors"
        >
          <span>Ke Workspace Simulasi</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setSelectedBrand('ALL');
          }}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            selectedCategory === 'ALL'
              ? 'bg-sky-500 text-slate-950 font-bold'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Semua Kategori ({initialCatalog.length})
        </button>

        {COMPONENT_CATEGORIES.map((cat) => {
          const count = initialCatalog.filter((c) => c.category === cat).length;
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedBrand('ALL');
              }}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {CATEGORY_METADATA[cat].shortLabel} ({count})
            </button>
          );
        })}
      </div>

      {/* Technical Filter Panel */}
      <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Search Input */}
          <div className="relative md:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="catalog-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama komponen, chipset (RTX 4070, B650), socket..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Brand Filter */}
          <div className="md:col-span-2">
            <select
              id="catalog-brand-select"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              aria-label="Filter Brand"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === 'ALL' ? 'Semua Brand' : b}
                </option>
              ))}
            </select>
          </div>

          {/* Socket Filter */}
          <div className="md:col-span-2">
            <select
              id="catalog-socket-select"
              value={selectedSocket}
              onChange={(e) => setSelectedSocket(e.target.value)}
              aria-label="Filter Socket CPU"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">Semua Socket</option>
              <option value="AM5">Socket AM5</option>
              <option value="AM4">Socket AM4</option>
              <option value="LGA1700">Socket LGA1700</option>
            </select>
          </div>

          {/* DDR Filter */}
          <div className="md:col-span-1">
            <select
              id="catalog-ddr-select"
              value={selectedDdr}
              onChange={(e) => setSelectedDdr(e.target.value)}
              aria-label="Filter Tipe Memori DDR"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">DDR4 & DDR5</option>
              <option value="DDR4">DDR4</option>
              <option value="DDR5">DDR5</option>
            </select>
          </div>

          {/* Sort */}
          <div className="md:col-span-2 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              id="catalog-sort-select"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'price-asc' | 'price-desc' | 'score-desc'
                )
              }
              aria-label="Urutkan Komponen"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="price-asc">Harga: Terendah</option>
              <option value="price-desc">Harga: Tertinggi</option>
              <option value="score-desc">Skor Performa</option>
            </select>
          </div>
        </div>

        {/* Max Price Slider */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-3 text-xs">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-slate-400 shrink-0">Batas Harga Maks:</span>
            <input
              type="range"
              min={500000}
              max={35000000}
              step={500000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
            />
            <span className="font-mono font-bold text-sky-400 shrink-0">
              {formatIDR(maxPrice)}
            </span>
          </div>

          <div className="text-slate-400">
            Menampilkan{' '}
            <strong className="text-slate-100">{filteredComponents.length}</strong>{' '}
            komponen
          </div>
        </div>
      </div>

      {/* Component Cards Grid */}
      {filteredComponents.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-[#0F1623] py-16 text-center">
          <p className="text-sm font-medium text-slate-300">
            Tidak ditemukan komponen yang sesuai kombinasi filter di atas.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedBrand('ALL');
              setSelectedSocket('ALL');
              setSelectedDdr('ALL');
              setMaxPrice(35000000);
              setSearchQuery('');
            }}
            className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-sky-400 hover:bg-slate-700"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredComponents.map((comp) => {
            const badges = getComponentSpecBadges(comp);
            const compat = checkCandidateCompatibility(comp, selections);
            const isSelectedInBuild =
              comp.category === 'Storage'
                ? selections.Storage.some((s) => s.component.id === comp.id)
                : selections[comp.category]?.component.id === comp.id;

            return (
              <div
                key={comp.id}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0F1623] p-4 transition-colors hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start gap-3">
                    <img
                      src={comp.image_url || '/hardware/motherboard.svg'}
                      alt={comp.name}
                      className="h-12 w-12 shrink-0 rounded-lg border border-slate-800 bg-slate-950 p-1.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-400">
                          {comp.category} • {comp.brand}
                        </span>
                        {compat.compatible ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Cocok
                          </span>
                        ) : (
                          <span
                            title={compat.reasons.join(', ')}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Cek Socket/DDR
                          </span>
                        )}
                      </div>
                      <h2 className="mt-0.5 text-sm font-bold text-slate-100 line-clamp-2">
                        {comp.name}
                      </h2>
                    </div>
                  </div>

                  {/* Technical Badges */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {badges.map((b, i) => (
                      <span
                        key={i}
                        className="rounded border border-slate-800 bg-slate-950/90 px-2 py-0.5 font-mono text-[10px] text-slate-300"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  {/* Performance Score Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Skor Performa Relatif</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {comp.performance_score}/100
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-400"
                        style={{ width: `${comp.performance_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Price & Add to Build Button */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                  <div>
                    <div className="font-mono text-base font-bold text-slate-100">
                      {formatIDR(comp.price)}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {comp.category === 'PSU'
                        ? `Kapasitas ${comp.specs.wattage_capacity || 0}W`
                        : comp.wattage > 0
                        ? `TDP ${comp.wattage}W`
                        : '0W Pasif'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToBuild(comp)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                      isSelectedInBuild
                        ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>
                      {isSelectedInBuild && comp.category !== 'Storage'
                        ? 'Terpilih di Simulasi'
                        : 'Pakai di Simulasi'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
