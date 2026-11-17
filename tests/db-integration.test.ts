import assert from 'node:assert/strict';
import {
  bulkInsertComponents,
  bulkUpdateComponentPrices,
  createComponent,
  createSavedBuild,
  deleteComponent,
  getAllComponents,
  getSavedBuildBySlug,
  updateComponent,
} from '../src/lib/db';
import { calculateBottleneck } from '../src/lib/bottleneck';

async function runDbIntegrationTests() {
  console.log('Running RakitPC.id Database & Persistence Integration Suite...\n');

  // 1. Fetch initial catalog
  const initial = await getAllComponents();
  assert.ok(initial.length >= 60, `Expected >= 60 seed components, got ${initial.length}`);
  console.log(`✓ Loaded ${initial.length} components from database layer`);

  // 2. Create a new component (Admin Manual CRUD)
  const created = await createComponent({
    category: 'GPU',
    name: 'Test GPU Radeon RX 7900 GRE 16GB',
    brand: 'Sapphire',
    price: 9250000,
    wattage: 260,
    performance_score: 84,
    specs: {
      chipset: 'Radeon RX 7900 GRE',
      vram_gb: 16,
      vram_type: 'GDDR6',
      length_mm: 280,
      recommended_psu_watt: 700,
    },
  });
  assert.ok(created.id.startsWith('gpu-'));
  console.log(`✓ Created component ${created.id} (${created.name})`);

  // 3. Update component
  const updated = await updateComponent(created.id, {
    price: 8990000,
    performance_score: 85,
  });
  assert.ok(updated);
  assert.equal(updated!.price, 8990000);
  assert.equal(updated!.performance_score, 85);
  console.log(`✓ Updated component ${created.id} price to Rp 8.990.000`);

  // 4. Bulk update prices
  const bulkPriceRes = await bulkUpdateComponentPrices([
    { id: created.id, price: 8750000 },
  ]);
  assert.equal(bulkPriceRes.updatedCount, 1);
  console.log('✓ Bulk price update verified');

  // 5. Delete test component
  const deleted = await deleteComponent(created.id);
  assert.equal(deleted, true);
  console.log(`✓ Deleted test component ${created.id}`);

  // 6. Bulk CSV import test & cleanup
  const csvBatch = await bulkInsertComponents([
    {
      category: 'RAM',
      name: 'CSV Test Kit 32GB DDR5-6000',
      brand: 'TeamGroup',
      price: 1690000,
      wattage: 12,
      performance_score: 84,
      specs: { ddr_type: 'DDR5', speed_mhz: 6000, capacity_gb: 32, modules: 2 },
    },
  ]);
  assert.equal(csvBatch.insertedCount, 1);
  await deleteComponent(csvBatch.components[0].id);
  console.log('✓ Bulk CSV insert & cleanup verified');

  // 7. Create & Retrieve Shareable Build Link (/build/[slug])
  const cpu = initial.find((c) => c.id === 'cpu-r5-7500f')!;
  const gpu = initial.find((c) => c.id === 'gpu-rtx-4070-super')!;
  const bottleneck = calculateBottleneck(cpu, gpu, '1440p Gaming');

  const savedBuild = await createSavedBuild({
    title: 'Integration Test 1440p Build',
    use_case: '1440p Gaming',
    total_price: cpu.price + gpu.price,
    total_wattage: 350,
    bottleneck_info: bottleneck,
    items: [
      { component_id: cpu.id, quantity: 1 },
      { component_id: gpu.id, quantity: 1 },
    ],
  });

  assert.ok(savedBuild.slug.length >= 6);
  const fetchedBuild = await getSavedBuildBySlug(savedBuild.slug);
  assert.ok(fetchedBuild);
  assert.equal(fetchedBuild!.title, 'Integration Test 1440p Build');
  assert.equal(fetchedBuild!.items.length, 2);
  assert.equal(fetchedBuild!.items[0].component?.name, cpu.name);
  console.log(`✓ Shareable build link /build/${savedBuild.slug} creation & hydration verified`);

  console.log('\nALL DATABASE & API PERSISTENCE TESTS PASSED!');
}

runDbIntegrationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
