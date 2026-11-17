import { BottleneckAnalysis, PCComponent, TargetResolution } from '@/types/pc';

interface ScenarioWeightConfig {
  idealGpuToCpuRatio: number;
  cpuBoundSensitivity: number;
  gpuBoundSensitivity: number;
  description: string;
}

const SCENARIO_WEIGHTS: Record<TargetResolution, ScenarioWeightConfig> = {
  '1080p Gaming': {
    idealGpuToCpuRatio: 1.04,
    cpuBoundSensitivity: 1.25,
    gpuBoundSensitivity: 0.9,
    description:
      'Resolusi 1080p menghasilkan frame rate tinggi sehingga beban instruksi per frame pada prosesor (CPU) sangat intensif.',
  },
  '1440p Gaming': {
    idealGpuToCpuRatio: 1.18,
    cpuBoundSensitivity: 1.0,
    gpuBoundSensitivity: 1.05,
    description:
      'Resolusi 1440p (QHD) adalah titik keseimbangan ideal antara beban rasterisasi GPU dan pemrosesan logika CPU.',
  },
  '4K Gaming': {
    idealGpuToCpuRatio: 1.34,
    cpuBoundSensitivity: 0.75,
    gpuBoundSensitivity: 1.25,
    description:
      'Resolusi 4K (UHD) membebani kartu grafis (GPU) secara masif; prosesor kelas menengah ke atas sudah cukup menyuplai data ke GPU.',
  },
  'Produktivitas / Workstation': {
    idealGpuToCpuRatio: 0.92,
    cpuBoundSensitivity: 1.3,
    gpuBoundSensitivity: 0.85,
    description:
      'Beban kerja kompilasi kode, simulasi, video timeline, dan multi-tasking mengandalkan performa multi-core CPU secara dominan.',
  },
};

export function calculateBottleneck(
  cpu: PCComponent | null | undefined,
  gpu: PCComponent | null | undefined,
  scenario: TargetResolution = '1080p Gaming'
): BottleneckAnalysis {
  if (!cpu && !gpu) {
    return {
      scenario,
      percentage: 0,
      limiter: 'Incomplete',
      severity: 'Belum Lengkap',
      cpuScore: 0,
      gpuScore: 0,
      effectiveCpuScore: 0,
      effectiveGpuScore: 0,
      headline: 'Pilih CPU & GPU untuk Analisis Bottleneck',
      explanation:
        'Kalkulator bottleneck membutuhkan data skor performa dari Processor (CPU) dan Graphics Card (GPU) untuk menghitung keseimbangan sistem.',
      recommendation:
        'Pilih prosesor dan kartu grafis pada tabel komponen di samping untuk melihat simulasi rasio performa.',
    };
  }

  if (cpu && !gpu) {
    const hasIgpu = Boolean(cpu.specs.integrated_graphics);
    return {
      scenario,
      percentage: 0,
      limiter: 'Incomplete',
      severity: 'Belum Lengkap',
      cpuScore: cpu.performance_score,
      gpuScore: 0,
      effectiveCpuScore: cpu.performance_score,
      effectiveGpuScore: 0,
      headline: hasIgpu
        ? 'Menggunakan Grafis Terintegrasi (iGPU)'
        : 'Belum Ada Kartu Grafis (GPU) Terpilih',
      explanation: hasIgpu
        ? `${cpu.name} memiliki grafis bawaan untuk penggunaan Office/Coding ringan, namun analisis bottleneck gaming/rendering memerlukan GPU diskrit.`
        : `${cpu.name} membutuhkan kartu grafis (GPU) diskrit. Tambahkan GPU untuk menghitung persentase bottleneck pada skenario ${scenario}.`,
      recommendation:
        'Tambahkan kartu grafis (GPU) dengan skor performa sekitar ' +
        Math.min(100, Math.round(cpu.performance_score * 1.1)) +
        ' poin untuk pasangan seimbang.',
    };
  }

  if (!cpu && gpu) {
    return {
      scenario,
      percentage: 0,
      limiter: 'Incomplete',
      severity: 'Belum Lengkap',
      cpuScore: 0,
      gpuScore: gpu.performance_score,
      effectiveCpuScore: 0,
      effectiveGpuScore: gpu.performance_score,
      headline: 'Belum Ada Prosesor (CPU) Terpilih',
      explanation: `Anda telah memilih ${gpu.name} (Skor ${gpu.performance_score}/100). Pilih prosesor (CPU) untuk mengecek potensi bottleneck pada ${scenario}.`,
      recommendation:
        'Pilih CPU dengan skor performa minimal ' +
        Math.max(40, Math.round(gpu.performance_score * 0.85)) +
        ' poin agar GPU dapat bekerja maksimal.',
    };
  }

  // Both CPU and GPU exist
  const cpuScore = Math.max(1, Math.min(100, cpu!.performance_score));
  const gpuScore = Math.max(1, Math.min(100, gpu!.performance_score));
  const config = SCENARIO_WEIGHTS[scenario] || SCENARIO_WEIGHTS['1080p Gaming'];

  // Expected GPU score for this CPU in the chosen scenario
  const expectedGpuScore = cpuScore * config.idealGpuToCpuRatio;
  const rawDiff = gpuScore - expectedGpuScore;

  let percentage = 0;
  let limiter: BottleneckAnalysis['limiter'] = 'Balanced';

  if (rawDiff > 0) {
    // GPU is stronger than expected for this CPU -> CPU Bottleneck
    const ratio = (rawDiff / Math.max(gpuScore, 50)) * 100 * config.cpuBoundSensitivity;
    percentage = Math.min(65, Math.max(1, Math.round(ratio)));
    limiter = percentage <= 10 ? 'Balanced' : 'CPU';
  } else if (rawDiff < 0) {
    // CPU is stronger than GPU -> GPU Bottleneck
    const absDiff = Math.abs(rawDiff);
    const ratio = (absDiff / Math.max(expectedGpuScore, 50)) * 100 * config.gpuBoundSensitivity;
    percentage = Math.min(65, Math.max(1, Math.round(ratio)));
    limiter = percentage <= 10 ? 'Balanced' : 'GPU';
  } else {
    percentage = 2;
    limiter = 'Balanced';
  }

  let severity: BottleneckAnalysis['severity'] = 'Optimal';
  if (percentage <= 10) {
    severity = 'Optimal';
  } else if (percentage <= 18) {
    severity = 'Ringan';
  } else if (percentage <= 28) {
    severity = 'Sedang';
  } else {
    severity = 'Berat';
  }

  let headline = '';
  let explanation = '';
  let recommendation = '';

  if (severity === 'Optimal') {
    headline = `Kombinasi Sangat Seimbang pada ${scenario} (${percentage}%)`;
    explanation = `Pasangan ${cpu!.name} (Skor ${cpuScore}) dan ${gpu!.name} (Skor ${gpuScore}) bekerja harmonis pada skenario ${scenario} tanpa hambatan performa berarti. ${config.description}`;
    recommendation =
      'Kombinasi CPU dan GPU sudah berada di sweet-spot. Anda tidak perlu mengubah tingkatan prosesor maupun kartu grafis.';
  } else if (limiter === 'CPU') {
    headline = `CPU Bottleneck ${severity} (${percentage}%) pada ${scenario}`;
    explanation = `CPU terlalu lemah untuk GPU ini pada skenario ${scenario}. ${cpu!.name} (Skor ${cpuScore}) menahan potensi penuh dari ${gpu!.name} (Skor ${gpuScore}), sehingga utilitas GPU dapat turun di bawah 90%.`;
    recommendation =
      scenario === '1080p Gaming'
        ? `Upgrade ke CPU dengan skor minimal ${Math.min(98, Math.round(gpuScore / config.idealGpuToCpuRatio))} (seperti seri Ryzen 7 X3D / Core i5-14600K), atau gunakan monitor resolusi 1440p/4K agar beban berpindah ke GPU.`
        : `Pertimbangkan upgrade prosesor ke kelas yang lebih tinggi (skor ~${Math.min(98, Math.round(gpuScore / config.idealGpuToCpuRatio))}) atau turunkan seri GPU untuk menghemat anggaran.`;
  } else {
    headline = `GPU Bottleneck ${severity} (${percentage}%) pada ${scenario}`;
    explanation = `GPU terlalu lemah dibanding kapasitas CPU pada skenario ${scenario}. ${gpu!.name} (Skor ${gpuScore}) sudah bekerja 100% sementara ${cpu!.name} (Skor ${cpuScore}) masih memiliki banyak kapasitas menganggur.`;
    recommendation =
      scenario === 'Produktivitas / Workstation'
        ? `Untuk beban kerja CPU-heavy (coding/kompilasi/audio), konfigurasi ini sebenarnya tidak masalah. Namun untuk rendering 3D/GPU, tingkatkan GPU ke skor minimal ${Math.min(98, Math.round(cpuScore * 0.95))}.`
        : `Alokasikan ulang anggaran dari CPU ke kartu grafis yang lebih kuat (skor minimal ${Math.min(98, Math.round(cpuScore * config.idealGpuToCpuRatio * 0.9))}) untuk mendapatkan FPS jauh lebih tinggi di ${scenario}.`;
  }

  return {
    scenario,
    percentage,
    limiter,
    severity,
    cpuScore,
    gpuScore,
    effectiveCpuScore: cpuScore,
    effectiveGpuScore: Math.round(gpuScore / config.idealGpuToCpuRatio),
    headline,
    explanation,
    recommendation,
  };
}
