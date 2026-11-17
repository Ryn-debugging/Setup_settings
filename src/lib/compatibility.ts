import {
  BuildSelections,
  CompatibilityIssue,
  CompatibilityReport,
  CompatibilityStatus,
  PCComponent,
} from '@/types/pc';

const BASE_SYSTEM_OVERHEAD_WATT = 25; // Case fans, USB peripherals, RGB controller
const PSU_SAFETY_MARGIN_MULTIPLIER = 1.28; // 28% safety margin (within 20-30% PRD spec)

export function calculateEstimatedWattage(selections: BuildSelections): number {
  let total = 0;
  let hasAnyComponent = false;

  if (selections.CPU) {
    total += selections.CPU.component.wattage * selections.CPU.quantity;
    hasAnyComponent = true;
  }
  if (selections.Motherboard) {
    total += selections.Motherboard.component.wattage * selections.Motherboard.quantity;
    hasAnyComponent = true;
  }
  if (selections.RAM) {
    total += selections.RAM.component.wattage * selections.RAM.quantity;
    hasAnyComponent = true;
  }
  if (selections.GPU) {
    total += selections.GPU.component.wattage * selections.GPU.quantity;
    hasAnyComponent = true;
  }
  if (selections.Storage && selections.Storage.length > 0) {
    for (const item of selections.Storage) {
      total += item.component.wattage * item.quantity;
      hasAnyComponent = true;
    }
  }
  if (selections.Cooler) {
    total += selections.Cooler.component.wattage * selections.Cooler.quantity;
    hasAnyComponent = true;
  }

  return hasAnyComponent ? total + BASE_SYSTEM_OVERHEAD_WATT : 0;
}

export function calculateTotalPrice(selections: BuildSelections): number {
  let total = 0;
  if (selections.CPU) total += selections.CPU.component.price * selections.CPU.quantity;
  if (selections.Motherboard)
    total += selections.Motherboard.component.price * selections.Motherboard.quantity;
  if (selections.RAM) total += selections.RAM.component.price * selections.RAM.quantity;
  if (selections.GPU) total += selections.GPU.component.price * selections.GPU.quantity;
  if (selections.Storage) {
    for (const item of selections.Storage) {
      total += item.component.price * item.quantity;
    }
  }
  if (selections.PSU) total += selections.PSU.component.price * selections.PSU.quantity;
  if (selections.Case) total += selections.Case.component.price * selections.Case.quantity;
  if (selections.Cooler) total += selections.Cooler.component.price * selections.Cooler.quantity;
  return total;
}

export function evaluateCompatibility(selections: BuildSelections): CompatibilityReport {
  const issues: CompatibilityIssue[] = [];
  const estimatedWattage = calculateEstimatedWattage(selections);
  const rawRecommended = Math.ceil((estimatedWattage * PSU_SAFETY_MARGIN_MULTIPLIER) / 50) * 50;
  const recommendedPsuWattage = estimatedWattage > 0 ? Math.max(450, rawRecommended) : 0;

  const cpu = selections.CPU?.component ?? null;
  const mobo = selections.Motherboard?.component ?? null;
  const ramSlot = selections.RAM;
  const ram = ramSlot?.component ?? null;
  const gpu = selections.GPU?.component ?? null;
  const psu = selections.PSU?.component ?? null;
  const pcCase = selections.Case?.component ?? null;
  const cooler = selections.Cooler?.component ?? null;
  const storages = selections.Storage ?? [];

  const physicalChecks: CompatibilityReport['physicalChecks'] = {
    socketMatch: null,
    ddrMatch: null,
    ramSlotFit: null,
    formFactorFit: null,
    gpuLengthFit: null,
    coolerHeightFit: null,
    psuSufficient: null,
  };

  // 1. CPU <-> Motherboard Socket & Chipset Check
  if (cpu && mobo) {
    const cpuSocket = String(cpu.specs.socket || '').toUpperCase();
    const moboSocket = String(mobo.specs.socket || '').toUpperCase();

    if (cpuSocket && moboSocket) {
      if (cpuSocket !== moboSocket) {
        physicalChecks.socketMatch = false;
        issues.push({
          id: 'cpu-mobo-socket-mismatch',
          severity: 'error',
          category: 'Socket CPU & Motherboard',
          title: `Socket Tidak Kompatibel (${cpuSocket} vs ${moboSocket})`,
          message: `${cpu.name} menggunakan socket ${cpuSocket}, sedangkan ${mobo.name} menggunakan socket ${moboSocket}. Pilih motherboard dengan socket ${cpuSocket}.`,
          affectedCategories: ['CPU', 'Motherboard'],
        });
      } else {
        physicalChecks.socketMatch = true;
        // Check if BIOS update might be needed for newer CPU generations
        const gen = String(cpu.specs.generation || '');
        const chipset = String(mobo.specs.chipset || '');
        if (
          (gen.includes('14th Gen') && chipset.startsWith('B760')) ||
          (gen.includes('Zen 5') && chipset.startsWith('B650'))
        ) {
          issues.push({
            id: 'cpu-mobo-bios-note',
            severity: 'info',
            category: 'Update BIOS Motherboard',
            title: `Catatan Versi BIOS (${chipset} + ${gen})`,
            message: `${mobo.name} kompatibel secara fisik dengan ${cpu.name}, namun stok produksi lama mungkin memerlukan update BIOS (BIOS Flashback) untuk mengenali seri prosesor terbaru.`,
            affectedCategories: ['CPU', 'Motherboard'],
          });
        }
      }
    }
  }

  // 2. CPU & Motherboard <-> RAM (DDR Type, Slot Count, Max Capacity)
  if (ram && mobo) {
    const ramDdr = String(ram.specs.ddr_type || '').toUpperCase();
    const moboDdr = String(mobo.specs.ddr_type || '').toUpperCase();

    if (ramDdr && moboDdr) {
      if (ramDdr !== moboDdr) {
        physicalChecks.ddrMatch = false;
        issues.push({
          id: 'ram-mobo-ddr-mismatch',
          severity: 'error',
          category: 'Tipe Memori RAM',
          title: `Generasi RAM Tidak Kompatibel (${ramDdr} vs ${moboDdr})`,
          message: `${ram.name} bertipe ${ramDdr}, tetapi motherboard ${mobo.name} hanya mendukung memori ${moboDdr}.`,
          affectedCategories: ['RAM', 'Motherboard'],
        });
      } else {
        physicalChecks.ddrMatch = true;
      }
    }

    // Check RAM stick count vs Motherboard RAM slots
    const modulesPerKit = Number(ram.specs.modules || 2);
    const kitQuantity = ramSlot?.quantity || 1;
    const totalSticks = modulesPerKit * kitQuantity;
    const moboSlots = Number(mobo.specs.ram_slots || 4);

    if (totalSticks > moboSlots) {
      physicalChecks.ramSlotFit = false;
      issues.push({
        id: 'ram-mobo-slot-overflow',
        severity: 'error',
        category: 'Slot Memori RAM',
        title: `Jumlah Keping RAM (${totalSticks} Keping) Melebihi Slot Motherboard (${moboSlots} Slot)`,
        message: `Konfigurasi ${kitQuantity}x kit ${ram.name} membutuhkan total ${totalSticks} slot DIMM, sedangkan ${mobo.name} hanya memiliki ${moboSlots} slot RAM.`,
        affectedCategories: ['RAM', 'Motherboard'],
      });
    } else {
      physicalChecks.ramSlotFit = true;
    }

    // Check total RAM capacity vs Motherboard max RAM
    const totalCapacityGb = Number(ram.specs.capacity_gb || 16) * kitQuantity;
    const maxRamGb = Number(mobo.specs.max_ram_gb || 128);
    if (totalCapacityGb > maxRamGb) {
      physicalChecks.ramSlotFit = false;
      issues.push({
        id: 'ram-mobo-capacity-overflow',
        severity: 'error',
        category: 'Kapasitas Memori RAM',
        title: `Total Kapasitas RAM (${totalCapacityGb}GB) Melebihi Batas Motherboard (${maxRamGb}GB)`,
        message: `${mobo.name} mendukung kapasitas RAM maksimal hingga ${maxRamGb}GB.`,
        affectedCategories: ['RAM', 'Motherboard'],
      });
    }
  }

  if (ram && cpu) {
    const ramDdr = String(ram.specs.ddr_type || '').toUpperCase();
    const cpuSupported = (cpu.specs.supported_memory || []).map((m) => String(m).toUpperCase());
    if (ramDdr && cpuSupported.length > 0 && !cpuSupported.includes(ramDdr)) {
      physicalChecks.ddrMatch = false;
      issues.push({
        id: 'ram-cpu-ddr-mismatch',
        severity: 'error',
        category: 'Kontroler Memori CPU',
        title: `CPU Tidak Mendukung Memori ${ramDdr}`,
        message: `Prosesor ${cpu.name} hanya mendukung memori ${cpuSupported.join(' / ')}, tidak kompatibel dengan ${ram.name} (${ramDdr}).`,
        affectedCategories: ['CPU', 'RAM'],
      });
    }
  }

  // 3. Motherboard <-> Case Form Factor Check
  if (mobo && pcCase) {
    const moboFormFactor = String(mobo.specs.form_factor || '');
    const supportedForms = (pcCase.specs.supported_form_factors || []).map((f) => String(f));

    if (moboFormFactor && supportedForms.length > 0) {
      if (!supportedForms.includes(moboFormFactor)) {
        physicalChecks.formFactorFit = false;
        issues.push({
          id: 'mobo-case-formfactor-mismatch',
          severity: 'error',
          category: 'Form Factor Motherboard & Casing',
          title: `Motherboard ${moboFormFactor} Tidak Muat di Casing`,
          message: `${mobo.name} berukuran ${moboFormFactor}, sedangkan casing ${pcCase.name} hanya mendukung form factor: ${supportedForms.join(', ')}.`,
          affectedCategories: ['Motherboard', 'Case'],
        });
      } else {
        physicalChecks.formFactorFit = true;
      }
    }
  }

  // 4. GPU <-> Case Physical Length Clearance Check
  if (gpu && pcCase) {
    const gpuLength = Number(gpu.specs.length_mm || 0);
    const maxGpuLength = Number(pcCase.specs.max_gpu_mm || 0);

    if (gpuLength > 0 && maxGpuLength > 0) {
      if (gpuLength > maxGpuLength) {
        physicalChecks.gpuLengthFit = false;
        issues.push({
          id: 'gpu-case-length-overflow',
          severity: 'error',
          category: 'Dimensi Fisik GPU & Casing',
          title: `Panjang GPU Melebihi Kapasitas Casing (${gpuLength}mm > ${maxGpuLength}mm)`,
          message: `${gpu.name} memiliki panjang ${gpuLength}mm, melebihi ruang maksimal GPU pada ${pcCase.name} (${maxGpuLength}mm).`,
          affectedCategories: ['GPU', 'Case'],
        });
      } else {
        physicalChecks.gpuLengthFit = true;
        const clearance = maxGpuLength - gpuLength;
        if (clearance <= 15) {
          issues.push({
            id: 'gpu-case-tight-clearance',
            severity: 'warning',
            category: 'Clearance Dimensi GPU',
            title: `Ruang Clearance GPU Sangat Sempit (Sisa ${clearance}mm)`,
            message: `${gpu.name} (${gpuLength}mm) muat di ${pcCase.name} (maks ${maxGpuLength}mm), namun menyisakan ruang hanya ${clearance}mm. Perhatikan penempatan radiator depan.`,
            affectedCategories: ['GPU', 'Case'],
          });
        }
      }
    }
  }

  // 5. Cooler <-> Case Physical Height & Radiator Check + CPU Socket/TDP Check
  if (cooler && pcCase) {
    const coolerHeight = Number(cooler.specs.height_mm || 0);
    const maxCoolerHeight = Number(pcCase.specs.max_cooler_mm || 0);

    if (coolerHeight > 0 && maxCoolerHeight > 0) {
      if (coolerHeight > maxCoolerHeight) {
        physicalChecks.coolerHeightFit = false;
        issues.push({
          id: 'cooler-case-height-overflow',
          severity: 'error',
          category: 'Dimensi CPU Cooler & Casing',
          title: `Tinggi CPU Cooler Melebihi Batas Casing (${coolerHeight}mm > ${maxCoolerHeight}mm)`,
          message: `${cooler.name} memiliki tinggi ${coolerHeight}mm, melebihi batas tinggi pendingin udara pada ${pcCase.name} (${maxCoolerHeight}mm). Panel samping tidak akan bisa ditutup.`,
          affectedCategories: ['Cooler', 'Case'],
        });
      } else {
        physicalChecks.coolerHeightFit = true;
      }
    }

    const radSize = Number(cooler.specs.radiator_size_mm || 0);
    const supportedRads = (pcCase.specs.supported_radiator_mm || []).map(Number);
    if (radSize > 0 && supportedRads.length > 0 && !supportedRads.includes(radSize)) {
      physicalChecks.coolerHeightFit = false;
      issues.push({
        id: 'cooler-case-radiator-mismatch',
        severity: 'error',
        category: 'Dukungan Radiator AIO',
        title: `Radiator AIO ${radSize}mm Tidak Didukung Casing`,
        message: `${cooler.name} menggunakan radiator ${radSize}mm, sedangkan ${pcCase.name} hanya mendukung ukuran radiator ${supportedRads.join('mm / ')}mm.`,
        affectedCategories: ['Cooler', 'Case'],
      });
    }
  }

  if (cpu) {
    if (cpu.specs.includes_cooler === false && !cooler) {
      issues.push({
        id: 'cpu-missing-cooler',
        severity: 'warning',
        category: 'Pendingin Prosesor (CPU Cooler)',
        title: 'CPU Tidak Menyertakan Stock Cooler',
        message: `${cpu.name} dijual tanpa fan pendingin bawaan (box/tray tanpa heatsink). Anda wajib menambahkan CPU Cooler terpisah.`,
        affectedCategories: ['CPU', 'Cooler'],
      });
    }

    if (cooler) {
      const cpuSocket = String(cpu.specs.socket || '').toUpperCase();
      const coolerSockets = (cooler.specs.supported_sockets || []).map((s) =>
        String(s).toUpperCase()
      );
      if (cpuSocket && coolerSockets.length > 0 && !coolerSockets.includes(cpuSocket)) {
        issues.push({
          id: 'cooler-cpu-socket-mismatch',
          severity: 'error',
          category: 'Bracket Socket Cooler',
          title: `Bracket Cooler Tidak Mendukung Socket ${cpuSocket}`,
          message: `${cooler.name} hanya mendukung socket ${coolerSockets.join(', ')}.`,
          affectedCategories: ['CPU', 'Cooler'],
        });
      }

      const maxTdp = Number(cooler.specs.max_tdp_watt || 0);
      if (maxTdp > 0 && cpu.wattage > maxTdp) {
        issues.push({
          id: 'cooler-tdp-insufficient',
          severity: 'warning',
          category: 'Kapasitas Termal Cooler',
          title: `TDP CPU (${cpu.wattage}W) Melebihi Rating Cooler (${maxTdp}W)`,
          message: `Disarankan memilih dual-tower air cooler atau AIO liquid cooler untuk menjaga suhu ${cpu.name} tetap optimal saat beban penuh.`,
          affectedCategories: ['CPU', 'Cooler'],
        });
      }
    }

    if (cpu.specs.integrated_graphics === false && !gpu) {
      issues.push({
        id: 'cpu-no-igpu-warning',
        severity: 'warning',
        category: 'Output Grafis Display',
        title: 'CPU Tanpa Integrated Graphics (Wajib GPU Diskrit)',
        message: `${cpu.name} tidak memiliki chip grafis terintegrasi (iGPU). PC tidak akan menampilkan gambar ke monitor tanpa kartu grafis (GPU) terpisah.`,
        affectedCategories: ['CPU', 'GPU'],
      });
    }
  }

  // 6. Storage <-> Motherboard M.2 / SATA Slots Check
  if (mobo && storages.length > 0) {
    let nvmeCount = 0;
    let sataCount = 0;
    for (const item of storages) {
      const stType = String(item.component.specs.storage_type || '');
      if (stType.toUpperCase().includes('NVME') || stType.toUpperCase().includes('M.2')) {
        nvmeCount += item.quantity;
      } else {
        sataCount += item.quantity;
      }
    }

    const m2Slots = Number(mobo.specs.m2_slots || 2);
    const sataPorts = Number(mobo.specs.sata_ports || 4);

    if (nvmeCount > m2Slots) {
      issues.push({
        id: 'storage-m2-slot-overflow',
        severity: 'error',
        category: 'Slot Storage M.2 NVMe',
        title: `Jumlah SSD M.2 (${nvmeCount} Unit) Melebihi Slot M.2 Motherboard (${m2Slots} Slot)`,
        message: `${mobo.name} hanya menyediakan ${m2Slots} slot M.2 NVMe.`,
        affectedCategories: ['Storage', 'Motherboard'],
      });
    }

    if (sataCount > sataPorts) {
      issues.push({
        id: 'storage-sata-port-overflow',
        severity: 'error',
        category: 'Port Storage SATA',
        title: `Jumlah Drive SATA (${sataCount} Unit) Melebihi Port SATA Motherboard (${sataPorts} Port)`,
        message: `${mobo.name} hanya menyediakan ${sataPorts} port SATA III.`,
        affectedCategories: ['Storage', 'Motherboard'],
      });
    }
  }

  // 7. Total Wattage <-> PSU Capacity & Form Factor Check
  const psuCapacityWattage = psu
    ? Number(psu.specs.wattage_capacity || psu.wattage || 0)
    : 0;
  let psuHeadroomPercent: number | null = null;

  if (psu && psuCapacityWattage > 0 && estimatedWattage > 0) {
    psuHeadroomPercent = Math.round(
      ((psuCapacityWattage - estimatedWattage) / psuCapacityWattage) * 100
    );

    if (psuCapacityWattage < estimatedWattage) {
      physicalChecks.psuSufficient = false;
      issues.push({
        id: 'psu-wattage-insufficient',
        severity: 'error',
        category: 'Kapasitas Daya PSU',
        title: `Daya PSU Tidak Mencukupi (${psuCapacityWattage}W < Estimasi Beban ${estimatedWattage}W)`,
        message: `Total TDP sistem mencapai ${estimatedWattage}W, melebihi kapasitas ${psu.name} (${psuCapacityWattage}W). Pilih PSU minimal ${recommendedPsuWattage}W.`,
        affectedCategories: ['PSU', 'GPU', 'CPU'],
      });
    } else if (psuCapacityWattage < Math.round(estimatedWattage * 1.2)) {
      physicalChecks.psuSufficient = true;
      issues.push({
        id: 'psu-wattage-tight-margin',
        severity: 'warning',
        category: 'Margin Keamanan Daya PSU',
        title: `Margin Daya PSU Kurang dari 20% (${psuCapacityWattage}W untuk Beban ${estimatedWattage}W)`,
        message: `Untuk mengantisipasi power spike GPU & efisiensi optimal, disarankan margin daya 20–30% (rekomendasi minimal ${recommendedPsuWattage}W).`,
        affectedCategories: ['PSU'],
      });
    } else {
      physicalChecks.psuSufficient = true;
    }

    // Check GPU recommended PSU wattage if much higher than PSU capacity
    if (gpu) {
      const gpuRecPsu = Number(gpu.specs.recommended_psu_watt || 0);
      if (gpuRecPsu > psuCapacityWattage && psuCapacityWattage >= estimatedWattage) {
        issues.push({
          id: 'psu-below-gpu-vendor-rec',
          severity: 'warning',
          category: 'Rekomendasi PSU Kartu Grafis',
          title: `PSU di Bawah Rekomendasi Pabrikan GPU (${psuCapacityWattage}W vs ${gpuRecPsu}W)`,
          message: `Pabrikan ${gpu.name} merekomendasikan PSU minimal ${gpuRecPsu}W untuk meredam lonjakan daya sesaat (transient spike).`,
          affectedCategories: ['PSU', 'GPU'],
        });
      }
    }
  }

  // Determine overall CompatibilityStatus
  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');

  let status: CompatibilityStatus = 'Aman';
  if (hasError) {
    status = 'Tidak Kompatibel';
  } else if (hasWarning) {
    status = 'Peringatan';
  }

  return {
    status,
    issues,
    estimatedWattage,
    recommendedPsuWattage,
    psuCapacityWattage,
    psuHeadroomPercent,
    physicalChecks,
  };
}

/**
 * Smart Filter helper: checks if a candidate component is compatible with the currently selected components
 */
export function checkCandidateCompatibility(
  candidate: PCComponent,
  selections: BuildSelections
): { compatible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const cpu = selections.CPU?.component;
  const mobo = selections.Motherboard?.component;
  const ram = selections.RAM?.component;
  const gpu = selections.GPU?.component;
  const pcCase = selections.Case?.component;
  const cooler = selections.Cooler?.component;

  switch (candidate.category) {
    case 'CPU': {
      const candSocket = String(candidate.specs.socket || '');
      if (mobo && mobo.specs.socket && candSocket !== mobo.specs.socket) {
        reasons.push(`Socket ${candSocket} ≠ Motherboard (${mobo.specs.socket})`);
      }
      if (ram && ram.specs.ddr_type && candidate.specs.supported_memory) {
        if (!candidate.specs.supported_memory.includes(ram.specs.ddr_type)) {
          reasons.push(`Hanya mendukung ${candidate.specs.supported_memory.join('/')}`);
        }
      }
      break;
    }
    case 'Motherboard': {
      const candSocket = String(candidate.specs.socket || '');
      const candDdr = String(candidate.specs.ddr_type || '');
      const candForm = String(candidate.specs.form_factor || '');
      if (cpu && cpu.specs.socket && candSocket !== cpu.specs.socket) {
        reasons.push(`Socket ${candSocket} ≠ CPU (${cpu.specs.socket})`);
      }
      if (ram && ram.specs.ddr_type && candDdr !== ram.specs.ddr_type) {
        reasons.push(`Memori ${candDdr} ≠ RAM (${ram.specs.ddr_type})`);
      }
      if (
        pcCase &&
        pcCase.specs.supported_form_factors &&
        candForm &&
        !pcCase.specs.supported_form_factors.includes(candForm)
      ) {
        reasons.push(`Form factor ${candForm} tidak muat di ${pcCase.name}`);
      }
      break;
    }
    case 'RAM': {
      const candDdr = String(candidate.specs.ddr_type || '');
      const candModules = Number(candidate.specs.modules || 2);
      if (mobo && mobo.specs.ddr_type && candDdr !== mobo.specs.ddr_type) {
        reasons.push(`Tipe ${candDdr} ≠ Motherboard (${mobo.specs.ddr_type})`);
      } else if (
        cpu &&
        cpu.specs.supported_memory &&
        candDdr &&
        !cpu.specs.supported_memory.includes(candDdr as 'DDR4' | 'DDR5')
      ) {
        reasons.push(`CPU tidak mendukung ${candDdr}`);
      }
      if (mobo && mobo.specs.ram_slots && candModules > Number(mobo.specs.ram_slots)) {
        reasons.push(`Butuh ${candModules} slot (Mobo hanya ${mobo.specs.ram_slots} slot)`);
      }
      break;
    }
    case 'GPU': {
      const candLen = Number(candidate.specs.length_mm || 0);
      if (pcCase && pcCase.specs.max_gpu_mm && candLen > Number(pcCase.specs.max_gpu_mm)) {
        reasons.push(`Panjang ${candLen}mm > batas Casing (${pcCase.specs.max_gpu_mm}mm)`);
      }
      break;
    }
    case 'Case': {
      const maxGpu = Number(candidate.specs.max_gpu_mm || 999);
      const maxCooler = Number(candidate.specs.max_cooler_mm || 999);
      const forms = candidate.specs.supported_form_factors || [];
      if (mobo && mobo.specs.form_factor && !forms.includes(String(mobo.specs.form_factor))) {
        reasons.push(`Tidak mendukung Motherboard ${mobo.specs.form_factor}`);
      }
      if (gpu && gpu.specs.length_mm && Number(gpu.specs.length_mm) > maxGpu) {
        reasons.push(`Maks GPU ${maxGpu}mm < GPU terpilih (${gpu.specs.length_mm}mm)`);
      }
      if (cooler && cooler.specs.height_mm && Number(cooler.specs.height_mm) > maxCooler) {
        reasons.push(`Maks Cooler ${maxCooler}mm < Cooler terpilih (${cooler.specs.height_mm}mm)`);
      }
      break;
    }
    case 'Cooler': {
      const candHeight = Number(candidate.specs.height_mm || 0);
      const candRad = Number(candidate.specs.radiator_size_mm || 0);
      if (pcCase && pcCase.specs.max_cooler_mm && candHeight > Number(pcCase.specs.max_cooler_mm)) {
        reasons.push(`Tinggi ${candHeight}mm > batas Casing (${pcCase.specs.max_cooler_mm}mm)`);
      }
      if (
        pcCase &&
        candRad > 0 &&
        pcCase.specs.supported_radiator_mm &&
        !pcCase.specs.supported_radiator_mm.includes(candRad)
      ) {
        reasons.push(`Radiator ${candRad}mm tidak didukung Casing`);
      }
      break;
    }
    case 'PSU': {
      const estWatt = calculateEstimatedWattage(selections);
      const candCap = Number(candidate.specs.wattage_capacity || candidate.wattage || 0);
      if (estWatt > 0 && candCap < Math.round(estWatt * 1.15)) {
        reasons.push(`Kapasitas ${candCap}W terlalu kecil untuk beban ${estWatt}W`);
      }
      break;
    }
  }

  return {
    compatible: reasons.length === 0,
    reasons,
  };
}
