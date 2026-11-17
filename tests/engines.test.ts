import assert from 'node:assert/strict';
import { SEED_COMPONENTS } from '../src/data/seed-components';
import {
  PRESET_BUILD_TEMPLATES,
  buildSelectionsFromPreset,
} from '../src/data/preset-builds';
import {
  checkCandidateCompatibility,
  evaluateCompatibility,
} from '../src/lib/compatibility';
import { calculateBottleneck } from '../src/lib/bottleneck';
import { generateAutoBuild } from '../src/lib/auto-builder';
import {
  deserializeSelectionsFromParam,
  EMPTY_SELECTIONS,
  serializeSelectionsToParam,
} from '../src/store/builder-store';
import { BuildSelections } from '../src/types/pc';

function getComp(id: string) {
  const c = SEED_COMPONENTS.find((item) => item.id === id);
  assert.ok(c, `Component ${id} should exist in SEED_COMPONENTS`);
  return c;
}

console.log('Running RakitPC.id Core Engine Verification Suite...\n');

// 1. Verify all Preset Builds are 100% Compatible ('Aman')
for (const preset of PRESET_BUILD_TEMPLATES) {
  const selections = buildSelectionsFromPreset(preset);
  const report = evaluateCompatibility(selections);
  assert.equal(
    report.status,
    'Aman',
    `Preset "${preset.title}" should have status 'Aman', got '${report.status}' (${report.issues.map((i) => i.title).join(', ')})`
  );
  console.log(`✓ Preset Build "${preset.title}" verified compatible (Aman, ${report.estimatedWattage}W)`);
}

// 2. Verify Socket Mismatch Detection (AM5 CPU + LGA1700 Motherboard)
{
  const selections: BuildSelections = {
    ...EMPTY_SELECTIONS,
    CPU: { component: getComp('cpu-r5-7500f'), quantity: 1 },
    Motherboard: { component: getComp('mobo-b760m-bomber-d4'), quantity: 1 },
  };
  const report = evaluateCompatibility(selections);
  assert.equal(report.status, 'Tidak Kompatibel');
  assert.equal(report.physicalChecks.socketMatch, false);
  assert.ok(report.issues.some((i) => i.id === 'cpu-mobo-socket-mismatch'));
  console.log('✓ CPU <-> Motherboard Socket mismatch detection verified');
}

// 3. Verify DDR Generation & RAM Slot Overflow Detection
{
  const selections: BuildSelections = {
    ...EMPTY_SELECTIONS,
    CPU: { component: getComp('cpu-r5-7500f'), quantity: 1 },
    Motherboard: { component: getComp('mobo-b650m-hdv'), quantity: 1 }, // 2 RAM slots, DDR5
    RAM: { component: getComp('ram-dominator-96gb-d5'), quantity: 1 }, // 4 modules kit!
  };
  const report = evaluateCompatibility(selections);
  assert.equal(report.status, 'Tidak Kompatibel');
  assert.equal(report.physicalChecks.ramSlotFit, false);
  assert.ok(report.issues.some((i) => i.id === 'ram-mobo-slot-overflow'));
  console.log('✓ RAM stick count vs Motherboard DIMM slot overflow detection verified');
}

// 4. Verify Physical Dimension Clearance: GPU Length > Case Max GPU Length
{
  const selections: BuildSelections = {
    ...EMPTY_SELECTIONS,
    GPU: { component: getComp('gpu-rtx-4090'), quantity: 1 }, // 358mm length
    Case: { component: getComp('case-asus-ap201'), quantity: 1 }, // 338mm max GPU
  };
  const report = evaluateCompatibility(selections);
  assert.equal(report.status, 'Tidak Kompatibel');
  assert.equal(report.physicalChecks.gpuLengthFit, false);
  assert.ok(report.issues.some((i) => i.id === 'gpu-case-length-overflow'));
  console.log('✓ Physical GPU length (358mm > 338mm) clearance overflow detection verified');
}

// 5. Verify Physical Dimension Clearance: Cooler Height > Case Max Cooler Height
{
  const selections: BuildSelections = {
    ...EMPTY_SELECTIONS,
    Cooler: { component: getComp('cooler-nh-d15'), quantity: 1 }, // 165mm height
    Case: { component: getComp('case-tecware-forge-m'), quantity: 1 }, // 160mm max cooler
  };
  const report = evaluateCompatibility(selections);
  assert.equal(report.status, 'Tidak Kompatibel');
  assert.equal(report.physicalChecks.coolerHeightFit, false);
  assert.ok(report.issues.some((i) => i.id === 'cooler-case-height-overflow'));
  console.log('✓ Physical CPU Cooler height (165mm > 160mm) clearance overflow detection verified');
}

// 6. Verify PSU Wattage Insufficiency Detection
{
  const selections: BuildSelections = {
    ...EMPTY_SELECTIONS,
    CPU: { component: getComp('cpu-r9-7950x'), quantity: 1 }, // 170W
    Motherboard: { component: getComp('mobo-x670e-steel-legend'), quantity: 1 }, // 55W
    GPU: { component: getComp('gpu-rtx-4090'), quantity: 1 }, // 450W
    PSU: { component: getComp('psu-fsp-hv-550'), quantity: 1 }, // 550W capacity < ~700W load
  };
  const report = evaluateCompatibility(selections);
  assert.equal(report.status, 'Tidak Kompatibel');
  assert.equal(report.physicalChecks.psuSufficient, false);
  assert.ok(report.issues.some((i) => i.id === 'psu-wattage-insufficient'));
  console.log('✓ PSU Wattage insufficiency detection verified');
}

// 7. Verify Smart Filter Candidate Check
{
  const selections: BuildSelections = {
    ...EMPTY_SELECTIONS,
    CPU: { component: getComp('cpu-r7-7800x3d'), quantity: 1 }, // Socket AM5
  };
  const am4MoboCheck = checkCandidateCompatibility(
    getComp('mobo-b550m-ds3h'),
    selections
  );
  assert.equal(am4MoboCheck.compatible, false);

  const am5MoboCheck = checkCandidateCompatibility(
    getComp('mobo-b650-aorus-elite'),
    selections
  );
  assert.equal(am5MoboCheck.compatible, true);
  console.log('✓ Smart Filter candidate compatibility check verified');
}

// 8. Verify Bottleneck Calculator Across Scenarios
{
  const weakCpu = getComp('cpu-i3-12100f'); // score 42
  const flagshipGpu = getComp('gpu-rtx-4090'); // score 100
  const b1080 = calculateBottleneck(weakCpu, flagshipGpu, '1080p Gaming');
  const b4k = calculateBottleneck(weakCpu, flagshipGpu, '4K Gaming');

  assert.equal(b1080.limiter, 'CPU');
  assert.ok(
    b1080.percentage > b4k.percentage,
    'CPU bottleneck at 1080p should be higher than at 4K'
  );
  console.log(
    `✓ Bottleneck Calculator verified (i3-12100F + RTX 4090: 1080p=${b1080.percentage}% vs 4K=${b4k.percentage}%)`
  );
}

// 9. Verify Auto-Build Generator Produces 100% Compatible Builds Across Budgets & Use Cases
{
  const testCases = [
    { budget: 7500000, useCase: 'Office / Coding' as const },
    { budget: 10000000, useCase: 'Gaming' as const },
    { budget: 15000000, useCase: 'Gaming' as const },
    { budget: 22000000, useCase: 'Editing / Rendering' as const },
    { budget: 35000000, useCase: 'Gaming' as const },
  ];

  for (const tc of testCases) {
    const autoResult = generateAutoBuild(tc, SEED_COMPONENTS);
    const compat = evaluateCompatibility(autoResult.selections);
    assert.equal(
      compat.status,
      'Aman',
      `Auto-Build (${tc.useCase}, Rp ${tc.budget}) should be 100% 'Aman', got '${compat.status}': ${compat.issues.map((i) => i.title).join('; ')}`
    );
    console.log(
      `✓ Auto-Build (${tc.useCase} @ Rp ${(tc.budget / 1e6).toFixed(1)} Jt) -> Total Rp ${(autoResult.totalPrice / 1e6).toFixed(2)} Jt [Status: ${compat.status}]`
    );
  }
}

// 10. Verify URL Search Params Serialization & Deserialization
{
  const original = buildSelectionsFromPreset(PRESET_BUILD_TEMPLATES[3]);
  const encoded = serializeSelectionsToParam(original);
  const decoded = deserializeSelectionsFromParam(encoded, SEED_COMPONENTS);
  assert.ok(decoded, 'Decoded selections should not be null');
  assert.equal(decoded!.CPU?.component.id, original.CPU?.component.id);
  assert.equal(decoded!.GPU?.component.id, original.GPU?.component.id);
  assert.equal(decoded!.Storage.length, original.Storage.length);
  console.log('✓ URL Search Params round-trip serialization verified');
}

console.log('\nALL 10 CORE ENGINE SUITES PASSED SUCCESSFULLY!');
