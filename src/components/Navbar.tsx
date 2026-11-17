'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cpu,
  Layers,
  Wrench,
  ShieldCheck,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { useBuilderStore } from '@/store/builder-store';
import { calculateTotalPrice, calculateEstimatedWattage } from '@/lib/compatibility';
import { formatCompactIDR } from '@/lib/format';

export function Navbar() {
  const pathname = usePathname();
  const selections = useBuilderStore((s) => s.selections);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalPrice = mounted ? calculateTotalPrice(selections) : 0;
  const totalWatt = mounted ? calculateEstimatedWattage(selections) : 0;

  const selectedCount = mounted
    ? [
        selections.CPU,
        selections.Motherboard,
        selections.RAM,
        selections.GPU,
        selections.PSU,
        selections.Case,
        selections.Cooler,
      ].filter(Boolean).length + (selections.Storage?.length > 0 ? 1 : 0)
    : 0;

  const navItems = [
    { href: '/', label: 'Beranda', icon: Layers },
    { href: '/builder', label: 'Simulasi Rakit PC', icon: Wrench },
    { href: '/catalog', label: 'Katalog Komponen', icon: Cpu },
    { href: '/admin/dashboard', label: 'Panel Admin', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          id="nav-brand-logo"
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 border border-slate-700 text-sky-400 transition-colors group-hover:bg-sky-500 group-hover:text-slate-950">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-slate-100">
              RakitPC<span className="text-sky-400">.id</span>
            </span>
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
              Simulasi & Validasi Kustomisasi PC
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Navigasi Utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href.replace('/dashboard', ''));
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-link-${item.href.replace(/\//g, '') || 'home'}`}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-800/90 text-sky-400'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.href === '/builder' && selectedCount > 0 && (
                  <span className="ml-1 rounded-full bg-sky-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-sky-300">
                    {selectedCount}/8
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Live Build Status Pill on Desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {selectedCount > 0 ? (
            <Link
              href="/builder"
              id="nav-live-build-summary"
              className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-1.5 text-xs transition-colors hover:border-slate-700"
            >
              <div className="flex items-center gap-1.5 text-slate-300">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-mono">{totalWatt}W</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="font-mono font-semibold text-sky-400">
                {formatCompactIDR(totalPrice)}
              </div>
            </Link>
          ) : (
            <Link
              href="/builder"
              id="nav-cta-builder"
              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400"
            >
              Mulai Rakit PC
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          id="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
          aria-label="Buka menu navigasi"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-800 bg-[#0B0F17] px-4 pt-2 pb-4 md:hidden">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href.replace('/dashboard', ''));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active
                      ? 'bg-slate-800 text-sky-400'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.href === '/builder' && selectedCount > 0 && (
                    <span className="font-mono text-xs text-sky-400">
                      {selectedCount}/8 • {formatCompactIDR(totalPrice)}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
