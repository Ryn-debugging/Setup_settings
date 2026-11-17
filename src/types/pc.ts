export type ComponentCategory =
  | 'CPU'
  | 'Motherboard'
  | 'RAM'
  | 'GPU'
  | 'Storage'
  | 'PSU'
  | 'Case'
  | 'Cooler';

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'CPU',
  'Motherboard',
  'RAM',
  'GPU',
  'Storage',
  'PSU',
  'Case',
  'Cooler',
];

export type FormFactor = 'Mini-ITX' | 'Micro-ATX' | 'ATX' | 'E-ATX';
export type MemoryGeneration = 'DDR4' | 'DDR5';
export type CpuSocket = 'AM4' | 'AM5' | 'LGA1700' | 'LGA1851' | string;

export interface ComponentSpecs {
  // CPU
  socket?: CpuSocket;
  cores?: number;
  threads?: number;
  base_clock_ghz?: number;
  boost_clock_ghz?: number;
  supported_memory?: MemoryGeneration[];
  integrated_graphics?: boolean;
  includes_cooler?: boolean;
  generation?: string;

  // Motherboard
  chipset?: string;
  form_factor?: FormFactor | string;
  ddr_type?: MemoryGeneration;
  ram_slots?: number;
  max_ram_gb?: number;
  m2_slots?: number;
  sata_ports?: number;
  wifi?: string;

  // RAM
  speed_mhz?: number;
  capacity_gb?: number;
  modules?: number; // sticks per kit (e.g. 2 for 2x16GB)
  cas_latency?: string;
  profile?: string;

  // GPU
  vram_gb?: number;
  vram_type?: string;
  length_mm?: number;
  recommended_psu_watt?: number;
  slot_width?: number;

  // Storage
  storage_type?: 'NVMe M.2' | 'SATA SSD' | 'SATA HDD' | string;
  interface?: string;
  read_speed_mbps?: number;
  write_speed_mbps?: number;

  // PSU
  wattage_capacity?: number;
  efficiency_rating?: string;
  modular?: 'Full Modular' | 'Semi Modular' | 'Non-Modular' | string;
  atx_3_0?: boolean;

  // Case
  supported_form_factors?: string[];
  max_gpu_mm?: number;
  max_cooler_mm?: number;
  supported_radiator_mm?: number[];
  included_fans?: number;
  side_panel?: string;

  // Cooler
  cooler_type?: 'Air Cooler' | 'AIO Liquid Cooler' | string;
  height_mm?: number;
  radiator_size_mm?: number;
  max_tdp_watt?: number;
  supported_sockets?: string[];

  // Extensible key-value fallback
  [key: string]: unknown;
}

export interface PCComponent {
  id: string;
  category: ComponentCategory;
  name: string;
  brand: string;
  price: number; // IDR
  wattage: number; // TDP / Power draw in Watts (for PSU, wattage is 0 and specs.wattage_capacity holds capacity, or wattage holds capacity)
  performance_score: number; // 1 - 100
  image_url?: string;
  specs: ComponentSpecs;
  created_at?: string;
  updated_at?: string;
}

export interface BuildSlotItem {
  component: PCComponent;
  quantity: number;
}

export interface BuildSelections {
  CPU: BuildSlotItem | null;
  Motherboard: BuildSlotItem | null;
  RAM: BuildSlotItem | null; // quantity can be 1 or 2 kits
  GPU: BuildSlotItem | null;
  Storage: BuildSlotItem[]; // multi-slot storage drives
  PSU: BuildSlotItem | null;
  Case: BuildSlotItem | null;
  Cooler: BuildSlotItem | null;
}

export type CompatibilityStatus = 'Aman' | 'Peringatan' | 'Tidak Kompatibel';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface CompatibilityIssue {
  id: string;
  severity: IssueSeverity;
  category: string;
  title: string;
  message: string;
  affectedCategories: ComponentCategory[];
}

export interface CompatibilityReport {
  status: CompatibilityStatus;
  issues: CompatibilityIssue[];
  estimatedWattage: number;
  recommendedPsuWattage: number; // Total TDP + 25% safety margin
  psuCapacityWattage: number;
  psuHeadroomPercent: number | null;
  physicalChecks: {
    socketMatch: boolean | null;
    ddrMatch: boolean | null;
    ramSlotFit: boolean | null;
    formFactorFit: boolean | null;
    gpuLengthFit: boolean | null;
    coolerHeightFit: boolean | null;
    psuSufficient: boolean | null;
  };
}

export type TargetResolution =
  | '1080p Gaming'
  | '1440p Gaming'
  | '4K Gaming'
  | 'Produktivitas / Workstation';

export type BottleneckLimiter = 'CPU' | 'GPU' | 'Balanced' | 'Incomplete';

export interface BottleneckAnalysis {
  scenario: TargetResolution;
  percentage: number; // 0 - 100%
  limiter: BottleneckLimiter;
  severity: 'Optimal' | 'Ringan' | 'Sedang' | 'Berat' | 'Belum Lengkap';
  cpuScore: number;
  gpuScore: number;
  effectiveCpuScore: number;
  effectiveGpuScore: number;
  headline: string;
  explanation: string;
  recommendation: string;
}

export type AutoBuildUseCase = 'Gaming' | 'Editing / Rendering' | 'Office / Coding';

export interface AutoBuildRequest {
  budget: number; // IDR
  useCase: AutoBuildUseCase;
  preferredBrand?: 'Any' | 'AMD' | 'Intel';
}

export interface AutoBuildResult {
  title: string;
  useCase: AutoBuildUseCase;
  targetBudget: number;
  totalPrice: number;
  selections: BuildSelections;
  allocationSummary: {
    category: ComponentCategory;
    targetPercent: number;
    actualPercent: number;
    amount: number;
  }[];
  notes: string[];
}

export interface SavedBuildItemRecord {
  id?: string;
  build_id?: string;
  component_id: string;
  quantity: number;
  component?: PCComponent;
}

export interface SavedBuild {
  id: string;
  slug: string;
  title: string;
  use_case: TargetResolution | string;
  total_price: number;
  total_wattage: number;
  bottleneck_info: BottleneckAnalysis;
  created_at: string;
  items: SavedBuildItemRecord[];
}

export interface CategoryMeta {
  category: ComponentCategory;
  label: string;
  shortLabel: string;
  description: string;
  supportsMultiQuantity: boolean;
  supportsMultipleItems: boolean;
  requiredForBoot: boolean;
}

export const CATEGORY_METADATA: Record<ComponentCategory, CategoryMeta> = {
  CPU: {
    category: 'CPU',
    label: 'Processor (CPU)',
    shortLabel: 'CPU',
    description: 'Otak pemrosesan utama yang menentukan socket motherboard dan performa komputasi.',
    supportsMultiQuantity: false,
    supportsMultipleItems: false,
    requiredForBoot: true,
  },
  Motherboard: {
    category: 'Motherboard',
    label: 'Motherboard',
    shortLabel: 'Mobo',
    description: 'Papan sirkuit utama penghubung socket CPU, slot RAM, M.2 NVMe, dan ekspansi PCIe.',
    supportsMultiQuantity: false,
    supportsMultipleItems: false,
    requiredForBoot: true,
  },
  RAM: {
    category: 'RAM',
    label: 'Memory (RAM)',
    shortLabel: 'RAM',
    description: 'Memori kerja berkecepatan tinggi (DDR4 / DDR5). Pastikan sesuai dukungan Motherboard.',
    supportsMultiQuantity: true,
    supportsMultipleItems: false,
    requiredForBoot: true,
  },
  GPU: {
    category: 'GPU',
    label: 'Graphics Card (GPU)',
    shortLabel: 'GPU',
    description: 'Kartu grafis utama untuk gaming, rendering 3D, akselerasi AI, dan editing video.',
    supportsMultiQuantity: false,
    supportsMultipleItems: false,
    requiredForBoot: false,
  },
  Storage: {
    category: 'Storage',
    label: 'Storage (SSD / HDD)',
    shortLabel: 'Storage',
    description: 'Media penyimpanan sistem operasi, aplikasi, dan proyek (mendukung multi-slot).',
    supportsMultiQuantity: true,
    supportsMultipleItems: true,
    requiredForBoot: true,
  },
  PSU: {
    category: 'PSU',
    label: 'Power Supply (PSU)',
    shortLabel: 'PSU',
    description: 'Penyuplai daya listrik seluruh komponen dengan margin keamanan minimal 20–30%.',
    supportsMultiQuantity: false,
    supportsMultipleItems: false,
    requiredForBoot: true,
  },
  Case: {
    category: 'Case',
    label: 'Casing (PC Case)',
    shortLabel: 'Casing',
    description: 'Sasis pelindung dengan batas dimensi fisik panjang GPU, tinggi Cooler, dan form factor.',
    supportsMultiQuantity: false,
    supportsMultipleItems: false,
    requiredForBoot: true,
  },
  Cooler: {
    category: 'Cooler',
    label: 'CPU Cooler (Air / AIO)',
    shortLabel: 'Cooler',
    description: 'Pendingin prosesor udara (Tower Air) atau cairan (AIO Liquid) untuk menjaga suhu optimal.',
    supportsMultiQuantity: false,
    supportsMultipleItems: false,
    requiredForBoot: false,
  },
};
