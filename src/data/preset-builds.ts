import { SEED_COMPONENTS } from '@/data/seed-components';
import { BuildSelections, SavedBuild, TargetResolution } from '@/types/pc';
import { calculateEstimatedWattage, calculateTotalPrice } from '@/lib/compatibility';
import { calculateBottleneck } from '@/lib/bottleneck';

function findComp(id: string) {
  const found = SEED_COMPONENTS.find((c) => c.id === id);
  if (!found) throw new Error(`Seed component ${id} not found`);
  return found;
}

export interface PresetBuildTemplate {
  slug: string;
  badge: string;
  title: string;
  subtitle: string;
  useCase: TargetResolution;
  componentIds: {
    CPU: string;
    Motherboard: string;
    RAM: string;
    GPU?: string;
    Storage: string[];
    PSU: string;
    Case: string;
    Cooler?: string;
  };
}

export const PRESET_BUILD_TEMPLATES: PresetBuildTemplate[] = [
  {
    slug: 'esports-1080p-value',
    badge: 'Value 1080p King',
    title: 'Esports & AAA 1080p Sweet-Spot',
    subtitle: 'Ryzen 5 5600 + Radeon RX 6600 8GB + 16GB DDR4-3200 + 1TB NVMe Gen4',
    useCase: '1080p Gaming',
    componentIds: {
      CPU: 'cpu-r5-5600',
      Motherboard: 'mobo-b550m-ds3h',
      RAM: 'ram-klevv-16gb-d4',
      GPU: 'gpu-rx-6600',
      Storage: ['storage-mp44l-1tb'],
      PSU: 'psu-msi-a650bn',
      Case: 'case-tecware-forge-m',
      Cooler: 'cooler-ak400',
    },
  },
  {
    slug: 'qhd-1440p-am5-pro',
    badge: '1440p AM5 DDR5',
    title: 'Next-Gen QHD 1440p Ultra Rig',
    subtitle: 'Ryzen 5 7500F + GeForce RTX 4070 SUPER 12GB + 32GB DDR5-6000 CL30',
    useCase: '1440p Gaming',
    componentIds: {
      CPU: 'cpu-r5-7500f',
      Motherboard: 'mobo-b650m-gaming-plus',
      RAM: 'ram-flare-32gb-d5',
      GPU: 'gpu-rtx-4070-super',
      Storage: ['storage-sn850x-1tb'],
      PSU: 'psu-fsp-vita-750',
      Case: 'case-asus-ap201',
      Cooler: 'cooler-peerless-120',
    },
  },
  {
    slug: 'creator-4k-workstation',
    badge: 'Creator & 4K Studio',
    title: '3D Rendering & 4K Gaming Flagship',
    subtitle: 'Ryzen 7 7800X3D + RTX 4080 SUPER 16GB + 64GB DDR5-6000 + 2TB 990 PRO',
    useCase: '4K Gaming',
    componentIds: {
      CPU: 'cpu-r7-7800x3d',
      Motherboard: 'mobo-b650-aorus-elite',
      RAM: 'ram-corsair-64gb-d5',
      GPU: 'gpu-rtx-4080-super',
      Storage: ['storage-990pro-2tb'],
      PSU: 'psu-msi-a850gl',
      Case: 'case-lianli-lancool-216',
      Cooler: 'cooler-arctic-lf3-360',
    },
  },
  {
    slug: 'dev-office-compact-am5',
    badge: 'Coding & Produktivitas',
    title: 'Compact Dev & Multitasking Workstation',
    subtitle: 'Core i5-14600K (14C/20T) + RTX 4060 Ti 16GB VRAM + 32GB DDR5-6400',
    useCase: 'Produktivitas / Workstation',
    componentIds: {
      CPU: 'cpu-i5-14600k',
      Motherboard: 'mobo-b760m-aorus-d5',
      RAM: 'ram-trident-32gb-d5',
      GPU: 'gpu-rtx-4060-ti-16',
      Storage: ['storage-sn850x-1tb', 'storage-mp44l-1tb'],
      PSU: 'psu-fsp-vita-750',
      Case: 'case-montech-air-100',
      Cooler: 'cooler-peerless-120',
    },
  },
];

export function buildSelectionsFromPreset(preset: PresetBuildTemplate): BuildSelections {
  const cpu = findComp(preset.componentIds.CPU);
  const mobo = findComp(preset.componentIds.Motherboard);
  const ram = findComp(preset.componentIds.RAM);
  const gpu = preset.componentIds.GPU ? findComp(preset.componentIds.GPU) : null;
  const storages = preset.componentIds.Storage.map((id) => ({
    component: findComp(id),
    quantity: 1,
  }));
  const psu = findComp(preset.componentIds.PSU);
  const pcCase = findComp(preset.componentIds.Case);
  const cooler = preset.componentIds.Cooler ? findComp(preset.componentIds.Cooler) : null;

  return {
    CPU: { component: cpu, quantity: 1 },
    Motherboard: { component: mobo, quantity: 1 },
    RAM: { component: ram, quantity: 1 },
    GPU: gpu ? { component: gpu, quantity: 1 } : null,
    Storage: storages,
    PSU: { component: psu, quantity: 1 },
    Case: { component: pcCase, quantity: 1 },
    Cooler: cooler ? { component: cooler, quantity: 1 } : null,
  };
}

export const INITIAL_SAVED_BUILDS: SavedBuild[] = PRESET_BUILD_TEMPLATES.map((preset, idx) => {
  const selections = buildSelectionsFromPreset(preset);
  const totalPrice = calculateTotalPrice(selections);
  const totalWattage = calculateEstimatedWattage(selections);
  const bottleneck = calculateBottleneck(
    selections.CPU?.component,
    selections.GPU?.component,
    preset.useCase
  );

  const items = [];
  if (selections.CPU)
    items.push({ component_id: selections.CPU.component.id, quantity: 1, component: selections.CPU.component });
  if (selections.Motherboard)
    items.push({
      component_id: selections.Motherboard.component.id,
      quantity: 1,
      component: selections.Motherboard.component,
    });
  if (selections.RAM)
    items.push({ component_id: selections.RAM.component.id, quantity: 1, component: selections.RAM.component });
  if (selections.GPU)
    items.push({ component_id: selections.GPU.component.id, quantity: 1, component: selections.GPU.component });
  for (const st of selections.Storage) {
    items.push({ component_id: st.component.id, quantity: st.quantity, component: st.component });
  }
  if (selections.PSU)
    items.push({ component_id: selections.PSU.component.id, quantity: 1, component: selections.PSU.component });
  if (selections.Case)
    items.push({ component_id: selections.Case.component.id, quantity: 1, component: selections.Case.component });
  if (selections.Cooler)
    items.push({
      component_id: selections.Cooler.component.id,
      quantity: 1,
      component: selections.Cooler.component,
    });

  return {
    id: `preset-build-${idx + 1}`,
    slug: preset.slug,
    title: preset.title,
    use_case: preset.useCase,
    total_price: totalPrice,
    total_wattage: totalWattage,
    bottleneck_info: bottleneck,
    created_at: '2026-02-01T10:00:00Z',
    items,
  };
});
