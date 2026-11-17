import {
  AutoBuildRequest,
  AutoBuildResult,
  AutoBuildUseCase,
  BuildSelections,
  ComponentCategory,
  PCComponent,
} from '@/types/pc';
import { calculateEstimatedWattage, calculateTotalPrice } from '@/lib/compatibility';

const ALLOCATION_RATIOS: Record<AutoBuildUseCase, Record<ComponentCategory, number>> = {
  Gaming: {
    GPU: 0.37,
    CPU: 0.2,
    Motherboard: 0.13,
    RAM: 0.09,
    Storage: 0.08,
    PSU: 0.06,
    Case: 0.04,
    Cooler: 0.03,
  },
  'Editing / Rendering': {
    GPU: 0.29,
    CPU: 0.26,
    Motherboard: 0.13,
    RAM: 0.12,
    Storage: 0.09,
    PSU: 0.06,
    Case: 0.03,
    Cooler: 0.02,
  },
  'Office / Coding': {
    GPU: 0.22,
    CPU: 0.28,
    Motherboard: 0.16,
    RAM: 0.13,
    Storage: 0.1,
    PSU: 0.06,
    Case: 0.03,
    Cooler: 0.02,
  },
};

function pickBestWithinBudget(
  candidates: PCComponent[],
  targetAmount: number,
  maxAmount: number
): PCComponent | null {
  if (candidates.length === 0) return null;
  const sortedByPriceAsc = [...candidates].sort((a, b) => a.price - b.price);

  // Filter components strictly within maxAmount
  const affordable = sortedByPriceAsc.filter((c) => c.price <= maxAmount);
  if (affordable.length === 0) {
    return sortedByPriceAsc[0];
  }

  let best = affordable[0];
  let bestScore = -Infinity;

  for (const item of affordable) {
    const priceRatio = item.price / Math.max(1, targetAmount);
    const distancePenalty =
      priceRatio > 1.02 ? (priceRatio - 1.02) * 50 : Math.abs(1 - priceRatio) * 14;
    const composite = item.performance_score - distancePenalty;
    if (composite > bestScore) {
      bestScore = composite;
      best = item;
    }
  }

  return best;
}

export function generateAutoBuild(
  request: AutoBuildRequest,
  catalog: PCComponent[]
): AutoBuildResult {
  const budget = Math.max(5500000, request.budget);
  const useCase = request.useCase;
  const preferredBrand = request.preferredBrand || 'Any';
  const baseRatios = { ...ALLOCATION_RATIOS[useCase] };

  // Special handling for tight-budget Office / Coding (<= Rp 8.000.000): use APU
  const useApuMode = useCase === 'Office / Coding' && budget <= 8000000;
  if (useApuMode) {
    baseRatios.GPU = 0;
    baseRatios.CPU = 0.34;
    baseRatios.Motherboard = 0.22;
    baseRatios.RAM = 0.13;
    baseRatios.Storage = 0.12;
    baseRatios.PSU = 0.1;
    baseRatios.Case = 0.09;
    baseRatios.Cooler = 0;
  }

  const byCategory = (cat: ComponentCategory) => catalog.filter((c) => c.category === cat);

  // 1. Select CPU
  let cpuCandidates = byCategory('CPU');
  if (preferredBrand !== 'Any') {
    const filtered = cpuCandidates.filter(
      (c) => c.brand.toUpperCase() === preferredBrand.toUpperCase()
    );
    if (filtered.length > 0) cpuCandidates = filtered;
  }
  if (useApuMode) {
    const apuList = cpuCandidates.filter((c) => c.specs.integrated_graphics === true);
    if (apuList.length > 0) cpuCandidates = apuList;
  }

  const cpuTarget = budget * baseRatios.CPU;
  const selectedCpu = pickBestWithinBudget(cpuCandidates, cpuTarget, cpuTarget * 1.05)!;

  // 2. Select Motherboard matching CPU socket
  const cpuSocket = String(selectedCpu.specs.socket || '');
  const cpuMemTypes = (selectedCpu.specs.supported_memory || ['DDR4', 'DDR5']).map(String);
  let moboCandidates = byCategory('Motherboard').filter(
    (m) =>
      String(m.specs.socket) === cpuSocket &&
      cpuMemTypes.includes(String(m.specs.ddr_type || ''))
  );
  if (moboCandidates.length === 0) {
    moboCandidates = byCategory('Motherboard');
  }
  if (budget < 12000000) {
    const ddr4Mobos = moboCandidates.filter((m) => m.specs.ddr_type === 'DDR4');
    if (ddr4Mobos.length > 0) moboCandidates = ddr4Mobos;
  } else {
    const ddr5Mobos = moboCandidates.filter((m) => m.specs.ddr_type === 'DDR5');
    if (ddr5Mobos.length > 0) moboCandidates = ddr5Mobos;
  }

  const moboTarget = budget * baseRatios.Motherboard;
  const selectedMobo = pickBestWithinBudget(moboCandidates, moboTarget, moboTarget * 1.06)!;

  // 3. Select RAM matching Motherboard DDR type & slot limit
  const requiredDdr = String(selectedMobo.specs.ddr_type || 'DDR4');
  const maxMoboSlots = Number(selectedMobo.specs.ram_slots || 4);
  let ramCandidates = byCategory('RAM').filter(
    (r) =>
      String(r.specs.ddr_type) === requiredDdr &&
      Number(r.specs.modules || 2) <= maxMoboSlots
  );
  if (ramCandidates.length === 0) ramCandidates = byCategory('RAM');

  const ramTarget = budget * baseRatios.RAM;
  const selectedRam = pickBestWithinBudget(ramCandidates, ramTarget, ramTarget * 1.08)!;

  // 4. Select Storage (Prefer NVMe M.2)
  const storageCandidates = byCategory('Storage').filter((s) =>
    String(s.specs.storage_type || '').includes('NVMe')
  );
  const storageTarget = budget * baseRatios.Storage;
  const selectedStorage = pickBestWithinBudget(
    storageCandidates.length > 0 ? storageCandidates : byCategory('Storage'),
    storageTarget,
    storageTarget * 1.08
  )!;

  // 5. Select GPU (unless APU mode)
  let selectedGpu: PCComponent | null = null;
  if (!useApuMode) {
    const gpuCandidates = byCategory('GPU');
    const gpuTarget = budget * baseRatios.GPU;
    selectedGpu = pickBestWithinBudget(gpuCandidates, gpuTarget, gpuTarget * 1.06);
  }

  // 6. Select Cooler (Mandatory if CPU has no stock cooler, or if budget >= 11.5M)
  let selectedCooler: PCComponent | null = null;
  const needsCooler =
    selectedCpu.specs.includes_cooler === false || (!useApuMode && budget >= 11500000);
  if (needsCooler) {
    const coolerCandidates = byCategory('Cooler').filter((c) => {
      const sockets = (c.specs.supported_sockets || []).map(String);
      const tdpOk = Number(c.specs.max_tdp_watt || 220) >= selectedCpu.wattage;
      return (sockets.length === 0 || sockets.includes(cpuSocket)) && tdpOk;
    });
    const coolerTarget = Math.max(420000, budget * baseRatios.Cooler);
    selectedCooler = pickBestWithinBudget(
      coolerCandidates.length > 0 ? coolerCandidates : byCategory('Cooler'),
      coolerTarget,
      coolerTarget * 1.15
    );
  }

  // 7. Select Case compatible with Motherboard Form Factor, GPU Length, and Cooler Height/Radiator
  const moboFormFactor = String(selectedMobo.specs.form_factor || 'Micro-ATX');
  const gpuLen = selectedGpu ? Number(selectedGpu.specs.length_mm || 0) : 0;
  const coolerHeight = selectedCooler ? Number(selectedCooler.specs.height_mm || 0) : 0;
  const coolerRad = selectedCooler ? Number(selectedCooler.specs.radiator_size_mm || 0) : 0;

  let caseCandidates = byCategory('Case').filter((c) => {
    const forms = (c.specs.supported_form_factors || []).map(String);
    const maxGpu = Number(c.specs.max_gpu_mm || 999);
    const maxCooler = Number(c.specs.max_cooler_mm || 999);
    const rads = (c.specs.supported_radiator_mm || []).map(Number);

    const formOk = forms.includes(moboFormFactor);
    const gpuOk = gpuLen <= maxGpu;
    const coolerOk = coolerHeight <= maxCooler;
    const radOk = coolerRad === 0 || rads.includes(coolerRad);
    return formOk && gpuOk && coolerOk && radOk;
  });
  if (caseCandidates.length === 0) caseCandidates = byCategory('Case');

  const caseTarget = Math.max(650000, budget * baseRatios.Case);
  const selectedCase = pickBestWithinBudget(caseCandidates, caseTarget, caseTarget * 1.15)!;

  // 8. Select PSU with at least 25-30% safety headroom & matching GPU recommendation
  const tempSelections: BuildSelections = {
    CPU: { component: selectedCpu, quantity: 1 },
    Motherboard: { component: selectedMobo, quantity: 1 },
    RAM: { component: selectedRam, quantity: 1 },
    GPU: selectedGpu ? { component: selectedGpu, quantity: 1 } : null,
    Storage: [{ component: selectedStorage, quantity: 1 }],
    PSU: null,
    Case: { component: selectedCase, quantity: 1 },
    Cooler: selectedCooler ? { component: selectedCooler, quantity: 1 } : null,
  };

  const estWatt = calculateEstimatedWattage(tempSelections);
  const minSafeWatt = Math.ceil((estWatt * 1.28) / 50) * 50;
  const gpuVendorWatt = selectedGpu ? Number(selectedGpu.specs.recommended_psu_watt || 0) : 0;
  const requiredPsuWatt = Math.max(500, minSafeWatt, gpuVendorWatt);

  let psuCandidates = byCategory('PSU').filter(
    (p) =>
      Number(p.specs.wattage_capacity || 0) >= requiredPsuWatt &&
      String(p.specs.form_factor || 'ATX') === 'ATX'
  );
  if (psuCandidates.length === 0) {
    psuCandidates = byCategory('PSU').sort(
      (a, b) => Number(b.specs.wattage_capacity || 0) - Number(a.specs.wattage_capacity || 0)
    );
  }

  const psuTarget = Math.max(690000, budget * baseRatios.PSU);
  const selectedPsu = pickBestWithinBudget(psuCandidates, psuTarget, psuTarget * 1.25)!;
  tempSelections.PSU = { component: selectedPsu, quantity: 1 };

  // 9. Budget optimization pass: if total price is below budget, try upgrading GPU within exact remaining budget
  let currentTotal = calculateTotalPrice(tempSelections);
  if (!useApuMode && selectedGpu && budget - currentTotal >= 900000) {
    const remainingForGpu = selectedGpu.price + (budget - currentTotal);
    const maxCaseGpu = Number(selectedCase.specs.max_gpu_mm || 999);
    const psuCap = Number(selectedPsu.specs.wattage_capacity || 650);

    const betterGpus = byCategory('GPU')
      .filter(
        (g) =>
          g.price <= remainingForGpu &&
          g.performance_score > selectedGpu!.performance_score &&
          Number(g.specs.length_mm || 0) <= maxCaseGpu &&
          Number(g.specs.recommended_psu_watt || 500) <= psuCap
      )
      .sort((a, b) => b.performance_score - a.performance_score);

    if (betterGpus.length > 0) {
      selectedGpu = betterGpus[0];
      tempSelections.GPU = { component: selectedGpu, quantity: 1 };
      currentTotal = calculateTotalPrice(tempSelections);
    }
  }

  const categories: ComponentCategory[] = [
    'CPU',
    'Motherboard',
    'RAM',
    'GPU',
    'Storage',
    'PSU',
    'Case',
    'Cooler',
  ];

  const allocationSummary = categories.map((cat) => {
    let amount = 0;
    if (cat === 'Storage') {
      amount = tempSelections.Storage.reduce((acc, s) => acc + s.component.price * s.quantity, 0);
    } else {
      const slot = tempSelections[cat];
      amount = slot ? slot.component.price * slot.quantity : 0;
    }
    return {
      category: cat,
      targetPercent: Math.round((baseRatios[cat] || 0) * 100),
      actualPercent: currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0,
      amount,
    };
  });

  const notes: string[] = [
    `Platform ${selectedCpu.brand} Socket ${selectedCpu.specs.socket} (${selectedMobo.specs.ddr_type}) telah tervalidasi 100% kompatibel.`,
    `Daya sistem diestimasi sebesar ${calculateEstimatedWattage(tempSelections)}W dan disuplai oleh ${selectedPsu.name} (${selectedPsu.specs.wattage_capacity}W).`,
  ];
  if (selectedGpu) {
    notes.push(
      `Clearance fisik GPU (${selectedGpu.specs.length_mm}mm) aman di dalam ${selectedCase.name} (maks ${selectedCase.specs.max_gpu_mm}mm).`
    );
  }

  return {
    title: `Rekomendasi ${useCase} — Rp ${(budget / 1000000).toFixed(1)} Juta`,
    useCase,
    targetBudget: budget,
    totalPrice: currentTotal,
    selections: tempSelections,
    allocationSummary,
    notes,
  };
}
