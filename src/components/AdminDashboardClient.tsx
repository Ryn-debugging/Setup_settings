'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import {
  Plus,
  Trash2,
  Edit3,
  Upload,
  Download,
  DollarSign,
  Database,
  CheckCircle2,
  AlertTriangle,
  Search,
  LogOut,
  Save,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import {
  COMPONENT_CATEGORIES,
  ComponentCategory,
  ComponentSpecs,
  PCComponent,
} from '@/types/pc';
import { formatIDR, getComponentSpecBadges } from '@/lib/format';

interface AdminDashboardClientProps {
  initialCatalog: PCComponent[];
  dbStatus: {
    mode: string;
    supabaseConfigured: boolean;
    componentCount: number;
    savedBuildCount: number;
    updatedAt: string;
  };
}

type AdminTab = 'crud' | 'csv' | 'prices' | 'database';

const SAMPLE_CSV_CONTENT = `category,name,brand,price,wattage,performance_score,socket,ddr_type,form_factor,length_mm,capacity_gb,wattage_capacity,max_gpu_mm,height_mm
CPU,AMD Ryzen 5 7600 3.8GHz (6C/12T),AMD,2990000,65,71,AM5,DDR5,,,,,,
Motherboard,ASUS TUF GAMING B650M-PLUS WIFI,ASUS,3390000,42,80,AM5,DDR5,Micro-ATX,,,,,
GPU,Sapphire Nitro+ Radeon RX 7800 XT 16GB,Sapphire,8850000,263,82,,,,320,,,,
RAM,Kingston Fury Beast RGB 32GB (2x16GB) DDR5-6000,Kingston,1890000,12,85,,DDR5,,,32,,,
Storage,Crucial P3 Plus 1TB PCIe 4.0 NVMe M.2,Crucial,960000,5,74,,,,,1000,,,
PSU,Corsair RM750e 750W 80+ Gold ATX 3.0 Modular,Corsair,1750000,0,86,,,,,,750,,
Case,NZXT H6 Flow Compact Dual-Chamber ATX,NZXT,1790000,0,88,,,ATX,,,,365,163`;

export function AdminDashboardClient({
  initialCatalog,
  dbStatus,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [components, setComponents] = useState<PCComponent[]>(initialCatalog);
  const [activeTab, setActiveTab] = useState<AdminTab>('crud');
  const [adminEmail, setAdminEmail] = useState<string>('admin@rakitpc.id');
  const [toast, setToast] = useState<string | null>(null);

  // Check session
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rakitpc_admin_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.email) setAdminEmail(parsed.email);
      }
    } catch {
      // ignore
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3800);
  };

  // ============================================================================
  // TAB 1: Manual CRUD State
  // ============================================================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<ComponentCategory>('CPU');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState<number>(2500000);
  const [wattage, setWattage] = useState<number>(65);
  const [performanceScore, setPerformanceScore] = useState<number>(70);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Dynamic spec fields
  const [socket, setSocket] = useState('AM5');
  const [cores, setCores] = useState<number>(6);
  const [threads, setThreads] = useState<number>(12);
  const [boostClock, setBoostClock] = useState<number>(5.0);
  const [ddrType, setDdrType] = useState<'DDR4' | 'DDR5'>('DDR5');
  const [includesCooler, setIncludesCooler] = useState<boolean>(true);
  const [integratedGraphics, setIntegratedGraphics] = useState<boolean>(true);
  const [chipset, setChipset] = useState('B650');
  const [formFactor, setFormFactor] = useState('Micro-ATX');
  const [ramSlots, setRamSlots] = useState<number>(4);
  const [m2Slots, setM2Slots] = useState<number>(2);
  const [speedMhz, setSpeedMhz] = useState<number>(6000);
  const [capacityGb, setCapacityGb] = useState<number>(32);
  const [modules, setModules] = useState<number>(2);
  const [vramGb, setVramGb] = useState<number>(12);
  const [lengthMm, setLengthMm] = useState<number>(260);
  const [recPsuWatt, setRecPsuWatt] = useState<number>(650);
  const [storageType, setStorageType] = useState('NVMe M.2');
  const [readSpeed, setReadSpeed] = useState<number>(5000);
  const [wattageCapacity, setWattageCapacity] = useState<number>(750);
  const [efficiencyRating, setEfficiencyRating] = useState('80+ Gold');
  const [modular, setModular] = useState('Full Modular');
  const [maxGpuMm, setMaxGpuMm] = useState<number>(350);
  const [maxCoolerMm, setMaxCoolerMm] = useState<number>(165);
  const [coolerType, setCoolerType] = useState('Air Cooler');
  const [heightMm, setHeightMm] = useState<number>(155);
  const [radiatorSizeMm, setRadiatorSizeMm] = useState<number>(0);

  const [filterCategory, setFilterCategory] = useState<ComponentCategory | 'ALL'>(
    'ALL'
  );
  const [searchCrud, setSearchCrud] = useState('');
  const [savingCrud, setSavingCrud] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setBrand('');
    setPrice(2500000);
    setWattage(65);
    setPerformanceScore(70);
    setImageUrl('');
  };

  const handleEditClick = (comp: PCComponent) => {
    setEditingId(comp.id);
    setCategory(comp.category);
    setName(comp.name);
    setBrand(comp.brand);
    setPrice(comp.price);
    setWattage(comp.wattage);
    setPerformanceScore(comp.performance_score);
    setImageUrl(comp.image_url || '');

    const s = comp.specs || {};
    if (s.socket) setSocket(String(s.socket));
    if (s.cores) setCores(Number(s.cores));
    if (s.threads) setThreads(Number(s.threads));
    if (s.boost_clock_ghz) setBoostClock(Number(s.boost_clock_ghz));
    if (s.ddr_type === 'DDR4' || s.ddr_type === 'DDR5') setDdrType(s.ddr_type);
    if (s.includes_cooler !== undefined) setIncludesCooler(Boolean(s.includes_cooler));
    if (s.integrated_graphics !== undefined)
      setIntegratedGraphics(Boolean(s.integrated_graphics));
    if (s.chipset) setChipset(String(s.chipset));
    if (s.form_factor) setFormFactor(String(s.form_factor));
    if (s.ram_slots) setRamSlots(Number(s.ram_slots));
    if (s.m2_slots) setM2Slots(Number(s.m2_slots));
    if (s.speed_mhz) setSpeedMhz(Number(s.speed_mhz));
    if (s.capacity_gb) setCapacityGb(Number(s.capacity_gb));
    if (s.modules) setModules(Number(s.modules));
    if (s.vram_gb) setVramGb(Number(s.vram_gb));
    if (s.length_mm) setLengthMm(Number(s.length_mm));
    if (s.recommended_psu_watt) setRecPsuWatt(Number(s.recommended_psu_watt));
    if (s.storage_type) setStorageType(String(s.storage_type));
    if (s.read_speed_mbps) setReadSpeed(Number(s.read_speed_mbps));
    if (s.wattage_capacity) setWattageCapacity(Number(s.wattage_capacity));
    if (s.efficiency_rating) setEfficiencyRating(String(s.efficiency_rating));
    if (s.modular) setModular(String(s.modular));
    if (s.max_gpu_mm) setMaxGpuMm(Number(s.max_gpu_mm));
    if (s.max_cooler_mm) setMaxCoolerMm(Number(s.max_cooler_mm));
    if (s.cooler_type) setCoolerType(String(s.cooler_type));
    if (s.height_mm) setHeightMm(Number(s.height_mm));
    if (s.radiator_size_mm) setRadiatorSizeMm(Number(s.radiator_size_mm));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildSpecsFromForm = (): ComponentSpecs => {
    switch (category) {
      case 'CPU':
        return {
          socket,
          cores: Number(cores),
          threads: Number(threads),
          boost_clock_ghz: Number(boostClock),
          supported_memory: socket === 'AM4' ? ['DDR4'] : socket === 'AM5' ? ['DDR5'] : ['DDR4', 'DDR5'],
          includes_cooler: includesCooler,
          integrated_graphics: integratedGraphics,
        };
      case 'Motherboard':
        return {
          socket,
          chipset,
          form_factor: formFactor,
          ddr_type: ddrType,
          ram_slots: Number(ramSlots),
          max_ram_gb: Number(ramSlots) * 48,
          m2_slots: Number(m2Slots),
          sata_ports: 4,
        };
      case 'RAM':
        return {
          ddr_type: ddrType,
          speed_mhz: Number(speedMhz),
          capacity_gb: Number(capacityGb),
          modules: Number(modules),
          cas_latency: ddrType === 'DDR5' ? 'CL30' : 'CL16',
        };
      case 'GPU':
        return {
          chipset,
          vram_gb: Number(vramGb),
          vram_type: 'GDDR6X',
          length_mm: Number(lengthMm),
          recommended_psu_watt: Number(recPsuWatt),
        };
      case 'Storage':
        return {
          storage_type: storageType,
          capacity_gb: Number(capacityGb),
          interface: storageType.includes('NVMe') ? 'PCIe 4.0 x4' : 'SATA III',
          read_speed_mbps: Number(readSpeed),
        };
      case 'PSU':
        return {
          wattage_capacity: Number(wattageCapacity),
          efficiency_rating: efficiencyRating,
          modular,
          form_factor: 'ATX',
        };
      case 'Case':
        return {
          supported_form_factors:
            formFactor === 'ATX'
              ? ['ATX', 'Micro-ATX', 'Mini-ITX']
              : formFactor === 'Micro-ATX'
              ? ['Micro-ATX', 'Mini-ITX']
              : ['Mini-ITX'],
          max_gpu_mm: Number(maxGpuMm),
          max_cooler_mm: Number(maxCoolerMm),
          supported_radiator_mm: [240, 360],
        };
      case 'Cooler':
        return {
          cooler_type: coolerType,
          height_mm: Number(heightMm),
          ...(radiatorSizeMm > 0 ? { radiator_size_mm: Number(radiatorSizeMm) } : {}),
          max_tdp_watt: 240,
          supported_sockets: ['AM4', 'AM5', 'LGA1700', 'LGA1851'],
        };
    }
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) {
      showToast('Nama dan Brand komponen wajib diisi.');
      return;
    }

    setSavingCrud(true);
    try {
      const specs = buildSpecsFromForm();
      if (editingId) {
        const res = await fetch(`/api/components/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            name,
            brand,
            price,
            wattage,
            performance_score: performanceScore,
            image_url: imageUrl || undefined,
            specs,
          }),
        });
        const data = await res.json();
        if (res.ok && data.component) {
          setComponents((prev) =>
            prev.map((c) => (c.id === editingId ? data.component : c))
          );
          showToast(`Komponen "${data.component.name}" berhasil diperbarui!`);
          resetForm();
        }
      } else {
        const res = await fetch('/api/components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            name,
            brand,
            price,
            wattage,
            performance_score: performanceScore,
            image_url: imageUrl || undefined,
            specs,
          }),
        });
        const data = await res.json();
        if (res.ok && data.component) {
          setComponents((prev) => [data.component, ...prev]);
          showToast(`Komponen baru "${data.component.name}" berhasil ditambahkan!`);
          resetForm();
        }
      }
    } catch {
      showToast('Gagal menyimpan komponen.');
    } finally {
      setSavingCrud(false);
    }
  };

  const handleDeleteComponent = async (id: string, compName: string) => {
    try {
      const res = await fetch(`/api/components/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setComponents((prev) => prev.filter((c) => c.id !== id));
        showToast(`Komponen "${compName}" telah dihapus.`);
      }
    } catch {
      showToast('Gagal menghapus komponen.');
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        showToast('Gambar komponen berhasil dimuat untuk preview & penyimpanan.');
      }
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // TAB 2: Bulk CSV Import State
  // ============================================================================
  const [csvText, setCsvText] = useState(SAMPLE_CSV_CONTENT);
  const [importingCsv, setImportingCsv] = useState(false);

  const parsedCsvPreview = useMemo(() => {
    if (!csvText.trim()) return { rows: [], errors: [] };
    const result = Papa.parse<Record<string, string>>(csvText.trim(), {
      header: true,
      skipEmptyLines: true,
    });

    const rows: Array<{
      valid: boolean;
      reason?: string;
      payload: Omit<PCComponent, 'id' | 'created_at'>;
    }> = [];

    result.data.forEach((raw, idx) => {
      const cat = String(raw.category || '').trim() as ComponentCategory;
      const nm = String(raw.name || '').trim();
      const br = String(raw.brand || '').trim();
      const pr = Number(raw.price);
      const wt = Number(raw.wattage || 0);
      const sc = Number(raw.performance_score || 65);

      const isCatValid = COMPONENT_CATEGORIES.includes(cat);
      const isValid = isCatValid && Boolean(nm) && Boolean(br) && !isNaN(pr) && pr >= 0;

      const specs: ComponentSpecs = {};
      if (raw.socket) specs.socket = raw.socket.trim();
      if (raw.ddr_type) specs.ddr_type = raw.ddr_type.trim() as 'DDR4' | 'DDR5';
      if (raw.form_factor) {
        specs.form_factor = raw.form_factor.trim();
        if (cat === 'Case') {
          specs.supported_form_factors = [raw.form_factor.trim(), 'Micro-ATX', 'Mini-ITX'];
        }
      }
      if (raw.length_mm && !isNaN(Number(raw.length_mm)))
        specs.length_mm = Number(raw.length_mm);
      if (raw.capacity_gb && !isNaN(Number(raw.capacity_gb)))
        specs.capacity_gb = Number(raw.capacity_gb);
      if (raw.wattage_capacity && !isNaN(Number(raw.wattage_capacity)))
        specs.wattage_capacity = Number(raw.wattage_capacity);
      if (raw.max_gpu_mm && !isNaN(Number(raw.max_gpu_mm)))
        specs.max_gpu_mm = Number(raw.max_gpu_mm);
      if (raw.height_mm && !isNaN(Number(raw.height_mm)))
        specs.height_mm = Number(raw.height_mm);

      rows.push({
        valid: isValid,
        reason: !isCatValid
          ? `Baris #${idx + 1}: Kategori "${cat}" tidak dikenali`
          : !nm || !br
          ? `Baris #${idx + 1}: Nama/Brand kosong`
          : isNaN(pr)
          ? `Baris #${idx + 1}: Harga tidak valid`
          : undefined,
        payload: {
          category: isCatValid ? cat : 'CPU',
          name: nm || '(Tanpa Nama)',
          brand: br || 'Generic',
          price: isNaN(pr) ? 0 : pr,
          wattage: isNaN(wt) ? 0 : wt,
          performance_score: isNaN(sc) ? 50 : sc,
          specs,
        },
      });
    });

    return { rows, errors: result.errors };
  }, [csvText]);

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
        showToast(`File CSV "${file.name}" berhasil dibaca.`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadCsvTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-komponen-rakitpc.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommitCsvImport = async () => {
    const validItems = parsedCsvPreview.rows
      .filter((r) => r.valid)
      .map((r) => r.payload);
    if (validItems.length === 0) {
      showToast('Tidak ada baris CSV yang valid untuk diimpor.');
      return;
    }

    setImportingCsv(true);
    try {
      const res = await fetch('/api/components/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems }),
      });
      const data = await res.json();
      if (res.ok && data.components) {
        setComponents((prev) => [...data.components, ...prev]);
        showToast(
          `Berhasil mengimpor ${data.insertedCount} komponen baru dari CSV ke database!`
        );
      } else {
        showToast(data.error || 'Gagal mengimpor CSV.');
      }
    } catch {
      showToast('Kesalahan jaringan saat bulk import CSV.');
    } finally {
      setImportingCsv(false);
    }
  };

  // ============================================================================
  // TAB 3: Bulk Price Update State (Update Harga Massal)
  // ============================================================================
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [priceCategoryFilter, setPriceCategoryFilter] = useState<
    ComponentCategory | 'ALL'
  >('ALL');
  const [savingBulkPrices, setSavingBulkPrices] = useState(false);

  const modifiedPriceCount = Object.keys(editedPrices).length;

  const applyPercentageAdjustment = (percentDelta: number) => {
    const next: Record<string, number> = { ...editedPrices };
    components.forEach((comp) => {
      if (priceCategoryFilter === 'ALL' || comp.category === priceCategoryFilter) {
        const current = next[comp.id] ?? comp.price;
        const adjusted = Math.round((current * (1 + percentDelta / 100)) / 10000) * 10000;
        next[comp.id] = Math.max(50000, adjusted);
      }
    });
    setEditedPrices(next);
    showToast(
      `Penyesuaian harga ${percentDelta > 0 ? `+${percentDelta}%` : `${percentDelta}%`} diterapkan ke preview.`
    );
  };

  const handleCommitBulkPrices = async () => {
    const updates = Object.entries(editedPrices).map(([id, newPrice]) => ({
      id,
      price: newPrice,
    }));
    if (updates.length === 0) return;

    setSavingBulkPrices(true);
    try {
      const res = await fetch('/api/components/prices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (res.ok) {
        setComponents((prev) =>
          prev.map((c) =>
            editedPrices[c.id] !== undefined ? { ...c, price: editedPrices[c.id] } : c
          )
        );
        setEditedPrices({});
        showToast(`Berhasil memperbarui harga ${data.updatedCount} komponen secara massal!`);
      }
    } catch {
      showToast('Gagal menyimpan perubahan harga massal.');
    } finally {
      setSavingBulkPrices(false);
    }
  };

  const filteredCrudList = useMemo(() => {
    return components.filter((c) => {
      if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
      if (searchCrud.trim()) {
        const q = searchCrud.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [components, filterCategory, searchCrud]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-sky-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-sky-300 shadow-2xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Admin Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0F1623] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-bold text-sky-400">
              Dashboard Kurator & Admin
            </span>
            <span className="font-mono text-xs text-slate-400">
              • {adminEmail}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-100">
            Manajemen Katalog Komponen, CSV Import & Harga Pasar
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs">
            <span className="text-slate-400">Total Komponen: </span>
            <strong className="font-mono text-sky-400">{components.length}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('rakitpc_admin_session');
              router.push('/admin/login');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (PRD Section 4.E) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          id="admin-tab-crud"
          onClick={() => setActiveTab('crud')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'crud'
              ? 'bg-sky-500 text-slate-950'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>1. Input & CRUD Komponen</span>
        </button>

        <button
          type="button"
          id="admin-tab-csv"
          onClick={() => setActiveTab('csv')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'csv'
              ? 'bg-sky-500 text-slate-950'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>2. Bulk Import (CSV)</span>
        </button>

        <button
          type="button"
          id="admin-tab-prices"
          onClick={() => setActiveTab('prices')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'prices'
              ? 'bg-sky-500 text-slate-950'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>3. Update Harga Massal</span>
          {modifiedPriceCount > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-950">
              {modifiedPriceCount} diubah
            </span>
          )}
        </button>

        <button
          type="button"
          id="admin-tab-database"
          onClick={() => setActiveTab('database')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
            activeTab === 'database'
              ? 'bg-sky-500 text-slate-950'
              : 'border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>4. Status Database & Supabase RLS</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: CRUD KOMPONEN MANUAL */}
      {/* ==================================================================== */}
      {activeTab === 'crud' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Form Input Manual (5 cols) */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleSaveComponent}
              className="rounded-xl border border-slate-800 bg-[#0F1623] p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-slate-100">
                  {editingId ? 'Edit Spesifikasi Komponen' : 'Tambah Komponen Baru'}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs font-semibold text-sky-400 hover:underline"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Kategori Komponen
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComponentCategory)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                  >
                    {COMPONENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Brand / Manufaktur
                  </label>
                  <input
                    type="text"
                    required
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Contoh: AMD, ASUS, MSI"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400">
                  Nama Lengkap Model Komponen
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: AMD Ryzen 7 7800X3D 4.2GHz (8C/16T)"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Harga Pasar (IDR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10000}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Konsumsi Daya TDP (Watt)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={wattage}
                    onChange={(e) => setWattage(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* Performance Score Slider + Live Preview */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Preview Skor Performa (1–100)
                  </span>
                  <span className="font-mono font-bold text-sky-400">
                    {performanceScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={performanceScore}
                  onChange={(e) => setPerformanceScore(Number(e.target.value))}
                  className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>Entry-Level (1-45)</span>
                  <span>Mid-Range (46-75)</span>
                  <span>High-End / Flagship (76-100)</span>
                </div>
              </div>

              {/* Image Upload / URL */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400">
                  Foto Komponen (Unggah File atau URL Gambar)
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="/hardware/gpu.svg atau https://..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                  />
                  <label className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">
                    <span>Unggah</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Dynamic Technical Specs JSONB Builder */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  Atribut Spesifik Kategori ({category} JSONB Specs)
                </div>

                {category === 'CPU' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Socket CPU</label>
                      <select
                        value={socket}
                        onChange={(e) => setSocket(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="AM5">AM5</option>
                        <option value="AM4">AM4</option>
                        <option value="LGA1700">LGA1700</option>
                        <option value="LGA1851">LGA1851</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Boost Clock (GHz)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={boostClock}
                        onChange={(e) => setBoostClock(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Jumlah Core</label>
                      <input
                        type="number"
                        value={cores}
                        onChange={(e) => setCores(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Jumlah Thread</label>
                      <input
                        type="number"
                        value={threads}
                        onChange={(e) => setThreads(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <label className="flex items-center gap-2 pt-1 text-slate-300">
                      <input
                        type="checkbox"
                        checked={includesCooler}
                        onChange={(e) => setIncludesCooler(e.target.checked)}
                      />
                      <span>Termasuk Stock Cooler</span>
                    </label>
                    <label className="flex items-center gap-2 pt-1 text-slate-300">
                      <input
                        type="checkbox"
                        checked={integratedGraphics}
                        onChange={(e) => setIntegratedGraphics(e.target.checked)}
                      />
                      <span>Memiliki iGPU</span>
                    </label>
                  </div>
                )}

                {category === 'Motherboard' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Socket</label>
                      <select
                        value={socket}
                        onChange={(e) => setSocket(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="AM5">AM5</option>
                        <option value="AM4">AM4</option>
                        <option value="LGA1700">LGA1700</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Chipset</label>
                      <input
                        type="text"
                        value={chipset}
                        onChange={(e) => setChipset(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Form Factor</label>
                      <select
                        value={formFactor}
                        onChange={(e) => setFormFactor(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="ATX">ATX</option>
                        <option value="Micro-ATX">Micro-ATX</option>
                        <option value="Mini-ITX">Mini-ITX</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Tipe Memori DDR</label>
                      <select
                        value={ddrType}
                        onChange={(e) => setDdrType(e.target.value as 'DDR4' | 'DDR5')}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="DDR5">DDR5</option>
                        <option value="DDR4">DDR4</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Jumlah Slot RAM</label>
                      <input
                        type="number"
                        value={ramSlots}
                        onChange={(e) => setRamSlots(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Slot M.2 NVMe</label>
                      <input
                        type="number"
                        value={m2Slots}
                        onChange={(e) => setM2Slots(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                )}

                {category === 'RAM' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Generasi DDR</label>
                      <select
                        value={ddrType}
                        onChange={(e) => setDdrType(e.target.value as 'DDR4' | 'DDR5')}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="DDR5">DDR5</option>
                        <option value="DDR4">DDR4</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Kecepatan (MHz)</label>
                      <input
                        type="number"
                        value={speedMhz}
                        onChange={(e) => setSpeedMhz(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Total Kapasitas (GB)</label>
                      <input
                        type="number"
                        value={capacityGb}
                        onChange={(e) => setCapacityGb(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Jumlah Keping / Kit</label>
                      <input
                        type="number"
                        value={modules}
                        onChange={(e) => setModules(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                )}

                {category === 'GPU' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Panjang Fisik GPU (mm)</label>
                      <input
                        type="number"
                        value={lengthMm}
                        onChange={(e) => setLengthMm(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Kapasitas VRAM (GB)</label>
                      <input
                        type="number"
                        value={vramGb}
                        onChange={(e) => setVramGb(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-slate-400">
                        Rekomendasi PSU Minimum (Watt)
                      </label>
                      <input
                        type="number"
                        value={recPsuWatt}
                        onChange={(e) => setRecPsuWatt(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                )}

                {category === 'Storage' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Tipe Storage</label>
                      <select
                        value={storageType}
                        onChange={(e) => setStorageType(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="NVMe M.2">NVMe M.2</option>
                        <option value="SATA SSD">SATA SSD</option>
                        <option value="SATA HDD">SATA HDD</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Kapasitas (GB)</label>
                      <input
                        type="number"
                        value={capacityGb}
                        onChange={(e) => setCapacityGb(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                )}

                {category === 'PSU' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Kapasitas Murni (Watt)</label>
                      <input
                        type="number"
                        value={wattageCapacity}
                        onChange={(e) => setWattageCapacity(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Sertifikasi Efisiensi</label>
                      <select
                        value={efficiencyRating}
                        onChange={(e) => setEfficiencyRating(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="80+ Bronze">80+ Bronze</option>
                        <option value="80+ Gold">80+ Gold</option>
                        <option value="80+ Platinum">80+ Platinum</option>
                      </select>
                    </div>
                  </div>
                )}

                {category === 'Case' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Maks Panjang GPU (mm)</label>
                      <input
                        type="number"
                        value={maxGpuMm}
                        onChange={(e) => setMaxGpuMm(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Maks Tinggi Cooler (mm)</label>
                      <input
                        type="number"
                        value={maxCoolerMm}
                        onChange={(e) => setMaxCoolerMm(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                )}

                {category === 'Cooler' && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400">Tipe Cooler</label>
                      <select
                        value={coolerType}
                        onChange={(e) => setCoolerType(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                      >
                        <option value="Air Cooler">Air Cooler</option>
                        <option value="AIO Liquid Cooler">AIO Liquid Cooler</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400">Tinggi Fisik (mm)</label>
                      <input
                        type="number"
                        value={heightMm}
                        onChange={(e) => setHeightMm(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                id="admin-save-component-btn"
                disabled={savingCrud}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>
                  {savingCrud
                    ? 'Menyimpan...'
                    : editingId
                    ? 'Simpan Perubahan Komponen'
                    : 'Tambahkan Komponen ke Database'}
                </span>
              </button>
            </form>
          </div>

          {/* Katalog Tabel CRUD (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-[#0F1623] p-3.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchCrud}
                  onChange={(e) => setSearchCrud(e.target.value)}
                  placeholder="Cari komponen untuk diedit atau dihapus..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-slate-100"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value as ComponentCategory | 'ALL')
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="ALL">Semua Kategori ({components.length})</option>
                {COMPONENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F1623]">
              <div className="max-h-[640px] overflow-y-auto divide-y divide-slate-800/80">
                {filteredCrudList.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-900/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase text-sky-400">
                          {comp.category}
                        </span>
                        <span className="text-[11px] text-slate-400">• {comp.brand}</span>
                        <span className="font-mono text-[10px] text-emerald-400">
                          Skor {comp.performance_score}
                        </span>
                      </div>
                      <div className="truncate text-xs font-semibold text-slate-100 mt-0.5">
                        {comp.name}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {getComponentSpecBadges(comp)
                          .slice(0, 3)
                          .map((b, i) => (
                            <span
                              key={i}
                              className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-800"
                            >
                              {b}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono text-xs font-bold text-slate-200">
                        {formatIDR(comp.price)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEditClick(comp)}
                        className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:text-sky-400"
                        title="Edit Komponen"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComponent(comp.id, comp.name)}
                        className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:border-rose-500/40 hover:text-rose-400"
                        title="Hapus Komponen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: BULK IMPORT CSV (PRD Section 4.E) */}
      {/* ==================================================================== */}
      {activeTab === 'csv' && (
        <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-5 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Bulk Import Katalog Komponen via CSV
              </h2>
              <p className="text-xs text-slate-400">
                Unggah file <code>.csv</code> hasil riset spreadsheet. Sistem memvalidasi format
                kolom secara otomatis sebelum disimpan ke database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5 text-sky-400" />
                <span>Download Template CSV</span>
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-xs font-semibold text-sky-400 hover:bg-slate-700">
                <Upload className="h-3.5 w-3.5" />
                <span>Pilih File .CSV</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Raw CSV Editor */}
            <div className="lg:col-span-5 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Data CSV (Dapat Diedit Langsung atau Diunggah):
              </label>
              <textarea
                rows={12}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Validation Preview Table */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Preview Validasi Kolom ({parsedCsvPreview.rows.filter((r) => r.valid).length}{' '}
                  Valid / {parsedCsvPreview.rows.length} Baris)
                </span>
                <button
                  type="button"
                  id="admin-csv-commit-btn"
                  disabled={importingCsv}
                  onClick={handleCommitCsvImport}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>
                    {importingCsv
                      ? 'Mengimpor ke Database...'
                      : `Simpan ${
                          parsedCsvPreview.rows.filter((r) => r.valid).length
                        } Komponen ke Database`}
                  </span>
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Kategori</th>
                      <th className="px-3 py-2">Nama & Brand</th>
                      <th className="px-3 py-2">Harga (IDR)</th>
                      <th className="px-3 py-2">Skor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {parsedCsvPreview.rows.map((r, i) => (
                      <tr key={i} className={r.valid ? '' : 'bg-rose-950/20'}>
                        <td className="px-3 py-2">
                          {r.valid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {r.reason}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-sky-400">
                          {r.payload.category}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-100">{r.payload.name}</div>
                          <div className="text-[10px] text-slate-400">{r.payload.brand}</div>
                        </td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-200">
                          {formatIDR(r.payload.price)}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300">
                          {r.payload.performance_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: UPDATE HARGA MASSAL (PRD Section 4.E) */}
      {/* ==================================================================== */}
      {activeTab === 'prices' && (
        <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-5 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Update Harga Pasar Massal (Tanpa Edit Spesifikasi Teknis)
              </h2>
              <p className="text-xs text-slate-400">
                Ubah nominal harga langsung pada kolom tabel atau gunakan tombol penyesuaian kurs
                persentase di kanan, lalu klik Simpan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPercentageAdjustment(-5)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-400 hover:bg-slate-800"
              >
                -5% Diskon Pasar
              </button>
              <button
                type="button"
                onClick={() => applyPercentageAdjustment(3)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs font-semibold text-amber-400 hover:bg-slate-800"
              >
                +3% Kenaikan Kurs
              </button>
              {modifiedPriceCount > 0 && (
                <button
                  type="button"
                  onClick={() => setEditedPrices({})}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset ({modifiedPriceCount})</span>
                </button>
              )}
              <button
                type="button"
                id="admin-bulk-price-save-btn"
                disabled={modifiedPriceCount === 0 || savingBulkPrices}
                onClick={handleCommitBulkPrices}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                <span>
                  {savingBulkPrices
                    ? 'Menyimpan...'
                    : `Simpan Perubahan (${modifiedPriceCount} Komponen)`}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPriceCategoryFilter('ALL')}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                priceCategoryFilter === 'ALL'
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              Semua Kategori
            </button>
            {COMPONENT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPriceCategoryFilter(c)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  priceCategoryFilter === c
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900 text-[11px] uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Kategori</th>
                  <th className="px-4 py-2.5">Nama Komponen</th>
                  <th className="px-4 py-2.5">Harga Saat Ini</th>
                  <th className="px-4 py-2.5">Harga Baru (IDR)</th>
                  <th className="px-4 py-2.5">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {components
                  .filter(
                    (c) =>
                      priceCategoryFilter === 'ALL' ||
                      c.category === priceCategoryFilter
                  )
                  .map((comp) => {
                    const currentVal = editedPrices[comp.id] ?? comp.price;
                    const diff = currentVal - comp.price;
                    return (
                      <tr
                        key={comp.id}
                        className={diff !== 0 ? 'bg-sky-950/20' : ''}
                      >
                        <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-sky-400">
                          {comp.category}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-slate-100">
                            {comp.name}
                          </span>{' '}
                          <span className="text-slate-500">({comp.brand})</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {formatIDR(comp.price)}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            step={10000}
                            min={0}
                            value={currentVal}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEditedPrices((prev) => ({
                                ...prev,
                                [comp.id]: val,
                              }));
                            }}
                            className="w-40 rounded border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-slate-100 focus:border-sky-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {diff === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : diff > 0 ? (
                            <span className="text-amber-400">
                              +{formatIDR(diff)}
                            </span>
                          ) : (
                            <span className="text-emerald-400">
                              -{formatIDR(Math.abs(diff))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: DATABASE & SUPABASE RLS INSPECTOR */}
      {/* ==================================================================== */}
      {activeTab === 'database' && (
        <div className="rounded-xl border border-slate-800 bg-[#0F1623] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Status Arsitektur Database & Row Level Security (RLS)
              </h2>
              <p className="text-xs text-slate-400">
                Skema tabel <code>components</code>, <code>saved_builds</code>, dan{' '}
                <code>build_items</code> sesuai Spesifikasi PRD Bagian 5 & 7.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
              Mode Aktif: {dbStatus.mode.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="text-slate-400">Tabel Katalog (`components`)</div>
              <div className="mt-1 font-mono text-xl font-bold text-sky-400">
                {components.length} Baris Aktif
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                RLS: Public READ • Admin Authenticated WRITE/UPDATE/DELETE
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="text-slate-400">
                Tabel Rakitan Publik (`saved_builds` + `build_items`)
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-400">
                {dbStatus.savedBuildCount} Tautan Tersimpan
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                RLS: Public READ & INSERT (`/build/[slug]`)
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="text-slate-400">File Migrasi Supabase SQL</div>
              <div className="mt-1 font-mono text-xs font-bold text-slate-200">
                supabase/migrations/001_initial_schema.sql
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Termasuk indeks GIN JSONB `specs` & kebijakan keamanan RLS.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
