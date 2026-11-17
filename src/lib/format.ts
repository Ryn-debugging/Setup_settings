import { PCComponent } from '@/types/pc';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(amount: number): string {
  const rounded = Math.round(amount || 0);
  return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatCompactIDR(amount: number): string {
  if (!amount || amount <= 0) return 'Rp 0';
  if (amount >= 1000000) {
    const jt = amount / 1000000;
    return `Rp ${jt.toFixed(jt % 1 === 0 ? 0 : 2).replace('.', ',')} Jt`;
  }
  if (amount >= 1000) {
    return `Rp ${Math.round(amount / 1000)} Rb`;
  }
  return formatIDR(amount);
}

export function getComponentSpecBadges(comp: PCComponent): string[] {
  const s = comp.specs || {};
  const badges: string[] = [];

  switch (comp.category) {
    case 'CPU': {
      if (s.socket) badges.push(`Socket ${s.socket}`);
      if (s.cores && s.threads) badges.push(`${s.cores}C / ${s.threads}T`);
      if (s.boost_clock_ghz) badges.push(`Boost ${s.boost_clock_ghz} GHz`);
      if (s.supported_memory && Array.isArray(s.supported_memory)) {
        badges.push(s.supported_memory.join('/'));
      }
      badges.push(`${comp.wattage}W TDP`);
      if (s.includes_cooler === false) badges.push('Tanpa Stock Cooler');
      break;
    }
    case 'Motherboard': {
      if (s.socket) badges.push(`Socket ${s.socket}`);
      if (s.chipset) badges.push(`Chipset ${s.chipset}`);
      if (s.form_factor) badges.push(String(s.form_factor));
      if (s.ddr_type) badges.push(String(s.ddr_type));
      if (s.ram_slots) badges.push(`${s.ram_slots} Slot RAM`);
      if (s.m2_slots) badges.push(`${s.m2_slots}x M.2`);
      break;
    }
    case 'RAM': {
      if (s.ddr_type) badges.push(String(s.ddr_type));
      if (s.speed_mhz) badges.push(`${s.speed_mhz} MHz`);
      if (s.capacity_gb) badges.push(`${s.capacity_gb}GB`);
      if (s.modules) badges.push(`${s.modules} Keping`);
      if (s.cas_latency) badges.push(String(s.cas_latency));
      break;
    }
    case 'GPU': {
      if (s.vram_gb && s.vram_type) badges.push(`${s.vram_gb}GB ${s.vram_type}`);
      else if (s.vram_gb) badges.push(`${s.vram_gb}GB VRAM`);
      if (s.length_mm) badges.push(`Panjang ${s.length_mm}mm`);
      badges.push(`${comp.wattage}W TDP`);
      if (s.recommended_psu_watt) badges.push(`Rec. PSU ${s.recommended_psu_watt}W`);
      break;
    }
    case 'Storage': {
      if (s.storage_type) badges.push(String(s.storage_type));
      if (s.capacity_gb) {
        badges.push(s.capacity_gb >= 1000 ? `${s.capacity_gb / 1000}TB` : `${s.capacity_gb}GB`);
      }
      if (s.interface) badges.push(String(s.interface));
      if (s.read_speed_mbps) badges.push(`Read ${s.read_speed_mbps} MB/s`);
      break;
    }
    case 'PSU': {
      if (s.wattage_capacity) badges.push(`${s.wattage_capacity}W`);
      if (s.efficiency_rating) badges.push(String(s.efficiency_rating));
      if (s.modular) badges.push(String(s.modular));
      if (s.atx_3_0) badges.push('ATX 3.0 / PCIe 5.0');
      break;
    }
    case 'Case': {
      if (s.supported_form_factors && Array.isArray(s.supported_form_factors)) {
        badges.push(s.supported_form_factors.slice(0, 2).join(' / '));
      }
      if (s.max_gpu_mm) badges.push(`Maks GPU ${s.max_gpu_mm}mm`);
      if (s.max_cooler_mm) badges.push(`Maks Cooler ${s.max_cooler_mm}mm`);
      if (s.supported_radiator_mm && Array.isArray(s.supported_radiator_mm)) {
        badges.push(`Rad ${s.supported_radiator_mm.join('/')}mm`);
      }
      break;
    }
    case 'Cooler': {
      if (s.cooler_type) badges.push(String(s.cooler_type));
      if (s.radiator_size_mm) badges.push(`Radiator ${s.radiator_size_mm}mm`);
      if (s.height_mm) badges.push(`Tinggi ${s.height_mm}mm`);
      if (s.max_tdp_watt) badges.push(`Maks TDP ${s.max_tdp_watt}W`);
      break;
    }
  }

  return badges;
}
