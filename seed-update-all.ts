/* eslint-disable */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import getPrisma from './src/lib/prisma';

const prisma = getPrisma();

// ============================================================
// HELPER: Generate unique SKU
// ============================================================
function genSku(): string {
  return `SKU-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// ============================================================
// HELPER: Create product with upsert-like behavior
// ============================================================
async function ensureProduct(
  categoryId: string,
  name: string,
  opts: {
    costPrice?: number;
    retailPrice?: number;
    unit?: string;
  }
) {
  const existing = await prisma.product.findFirst({
    where: { name, categoryId },
  });

  if (existing) {
    const updateData: Record<string, unknown> = {};
    if (opts.costPrice !== undefined) updateData.costPrice = opts.costPrice;
    if (opts.retailPrice !== undefined) updateData.retailPrice = opts.retailPrice;
    if (opts.unit !== undefined) updateData.unit = opts.unit;

    await prisma.product.update({
      where: { id: existing.id },
      data: updateData,
    });
    console.log(`   ✏️  Updated: "${name}" → cost=${opts.costPrice ?? '—'}, retail=${opts.retailPrice ?? '—'}`);
    return existing;
  }

  // Check across all categories
  const existingAnywhere = await prisma.product.findFirst({
    where: { name },
  });

  if (existingAnywhere) {
    const updateData: Record<string, unknown> = { categoryId };
    if (opts.costPrice !== undefined) updateData.costPrice = opts.costPrice;
    if (opts.retailPrice !== undefined) updateData.retailPrice = opts.retailPrice;
    if (opts.unit !== undefined) updateData.unit = opts.unit;

    await prisma.product.update({
      where: { id: existingAnywhere.id },
      data: updateData,
    });
    console.log(`   🔀 Moved & updated: "${name}" → cost=${opts.costPrice ?? '—'}, retail=${opts.retailPrice ?? '—'}`);
    return existingAnywhere;
  }

  const product = await prisma.product.create({
    data: {
      name,
      sku: genSku(),
      categoryId,
      costPrice: opts.costPrice ?? 0,
      baseSellingPrice: 0,
      retailPrice: opts.retailPrice ?? 0,
      lowestRetailPrice: 0,
      wholesalePrice: 0,
      lowestWholesalePrice: 0,
      unit: opts.unit ?? 'piece',
    },
  });
  console.log(`   ✅ Created: "${name}" (SKU: ${product.sku}) → cost=${opts.costPrice ?? 0}, retail=${opts.retailPrice ?? 0}`);

  // Small delay for unique SKUs
  await new Promise((r) => setTimeout(r, 5));
  return product;
}

// ============================================================
// HELPER: Ensure category exists
// ============================================================
async function ensureCategory(name: string) {
  let cat = await prisma.category.findUnique({ where: { name } });
  if (!cat) {
    cat = await prisma.category.create({ data: { name } });
    console.log(`📁 Created category: "${name}"`);
  } else {
    console.log(`📁 Found category: "${name}"`);
  }
  return cat;
}

// ============================================================
// HELPER: Add inventory for a product
// ============================================================
async function addInventory(productId: string, quantity: number) {
  // Get or create default location
  let location = await prisma.location.findFirst();
  if (!location) {
    location = await prisma.location.create({
      data: { name: 'Main Warehouse', type: 'WAREHOUSE' },
    });
  }

  // Upsert inventory
  const existing = await prisma.inventory.findFirst({
    where: { productId, locationId: location.id },
  });

  if (existing) {
    await prisma.inventory.update({
      where: { id: existing.id },
      data: { quantity },
    });
  } else {
    await prisma.inventory.create({
      data: { productId, locationId: location.id, quantity },
    });
  }

  // Create IN transaction for audit trail
  await prisma.transaction.create({
    data: {
      type: 'IN',
      toLocationId: location.id,
      notes: 'Initial stock from seed',
      items: {
        create: [{ productId, quantity }],
      },
    },
  });
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 COMPREHENSIVE UPDATE: Prices, Products, Inventory, Order');
  console.log('═══════════════════════════════════════════════════════\n');

  // ──────────────────────────────────────────────────────────
  // STEP 1: Fix existing products — move costPrice → retailPrice
  // The previous seed set costPrice but those were actually قطاعي (retail) prices
  // ──────────────────────────────────────────────────────────
  console.log('📝 STEP 1: Fixing existing product prices (costPrice → retailPrice)...\n');

  const existingProducts = await prisma.product.findMany();
  let fixedCount = 0;

  for (const p of existingProducts) {
    const currentCost = Number(p.costPrice);
    const currentRetail = Number(p.retailPrice);

    // Only fix products where costPrice > 0 and retailPrice is 0
    // (these are from the previous seed where we mistakenly set costPrice instead of retailPrice)
    if (currentCost > 0 && currentRetail === 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          retailPrice: currentCost,
          costPrice: 0,
        },
      });
      console.log(`   ✏️  Fixed "${p.name}": retailPrice=${currentCost}, costPrice=0`);
      fixedCount++;
    }
  }
  console.log(`   → Fixed ${fixedCount} products\n`);

  // ──────────────────────────────────────────────────────────
  // STEP 2: Add بن تركي زون products
  // Retail prices are per QUARTER kilo (ربع كيلوا)
  // Unit = "كيلوا", retail price stored per kilo (quarter × 4)
  // ──────────────────────────────────────────────────────────
  console.log('📝 STEP 2: Adding بن تركي زون products + inventory...\n');

  const catBun = await ensureCategory('بن تركي زون');

  // Product name → { quarterRetail, inventory (in kilos) }
  const bunProducts: { name: string; quarterRetail: number; inventory?: number }[] = [
    { name: 'ساده فاتح', quarterRetail: 145, inventory: 50 },
    { name: 'ساده وسط', quarterRetail: 145, inventory: 100 },
    { name: 'ساده غامق', quarterRetail: 165, inventory: 10 },
    { name: 'محوج فاتح', quarterRetail: 175, inventory: 20 },
    { name: 'محوج وسط', quarterRetail: 175, inventory: 30 },
    { name: 'محوج غامق', quarterRetail: 185, inventory: 10 },
    { name: 'فرنساوي كلاسيك', quarterRetail: 145, inventory: 20 },
    { name: 'فرنساوي بندق', quarterRetail: 155, inventory: 20 },
  ];

  for (const bp of bunProducts) {
    // Store per-kilo price (quarter × 4)
    const perKiloRetail = bp.quarterRetail * 4;
    const product = await ensureProduct(catBun.id, bp.name, {
      retailPrice: perKiloRetail,
      unit: 'كيلوا',
    });

    if (bp.inventory && bp.inventory > 0) {
      await addInventory(product.id, bp.inventory);
      console.log(`      📦 Inventory: ${bp.inventory} كيلوا`);
    }
  }
  console.log('');

  // ──────────────────────────────────────────────────────────
  // STEP 3: Add اسبرسوا لوكسر products
  // ──────────────────────────────────────────────────────────
  console.log('📝 STEP 3: Adding اسبرسوا لوكسر products + inventory...\n');

  const catLoxor = await ensureCategory('اسبرسوا لوكسر');

  const loxorProducts: { name: string; retailPrice: number; inventory?: number }[] = [
    { name: 'لوكسر الترا كريما', retailPrice: 600, inventory: 50 },
    { name: 'لوكسر سليكشن', retailPrice: 675, inventory: 20 },
    { name: 'لوكسر كور', retailPrice: 820, inventory: 10 },
  ];

  for (const lp of loxorProducts) {
    const product = await ensureProduct(catLoxor.id, lp.name, {
      retailPrice: lp.retailPrice,
      unit: 'كرتونة',
    });

    if (lp.inventory && lp.inventory > 0) {
      await addInventory(product.id, lp.inventory);
      console.log(`      📦 Inventory: ${lp.inventory} كرتونة`);
    }
  }
  console.log('');

  // ──────────────────────────────────────────────────────────
  // STEP 4: Add صولو products (with BOTH cost and retail prices)
  // "داخل علينا" = costPrice, first set of prices = retailPrice
  // ──────────────────────────────────────────────────────────
  console.log('📝 STEP 4: Adding صولو products (cost + retail)...\n');

  const catSolo = await ensureCategory('صولو');

  const soloProducts: { name: string; costPrice: number; retailPrice: number }[] = [
    { name: 'صولو بيوريه', costPrice: 160, retailPrice: 180 },
    { name: 'صولو فلفر', costPrice: 145, retailPrice: 170 },
    { name: 'صولو بودر شوكلت', costPrice: 292, retailPrice: 310 },
    { name: 'صولو بودر فانليا', costPrice: 245, retailPrice: 260 },
    { name: 'صولو بودر كوفي', costPrice: 280, retailPrice: 300 },
  ];

  for (const sp of soloProducts) {
    await ensureProduct(catSolo.id, sp.name, {
      costPrice: sp.costPrice,
      retailPrice: sp.retailPrice,
    });
  }
  console.log('');

  // ──────────────────────────────────────────────────────────
  // STEP 5: Add اوستربيرج products
  // Group 1 (260): اناناس, باشون فروت, خوخ, كريز, فراوله
  // Group 2 (285): بلوبيري, جوز هند, راسبري, كيوي
  // Group 3 (245): مانجا, ميكس بيري
  // ──────────────────────────────────────────────────────────
  console.log('📝 STEP 5: Adding اوستربيرج products...\n');

  const catOster = await ensureCategory('اوستربيرج');

  const osterProducts: { name: string; retailPrice: number }[] = [
    // Group 1 — 260 EGP
    { name: 'اوستربيرج اناناس', retailPrice: 260 },
    { name: 'اوستربيرج باشون فروت', retailPrice: 260 },
    { name: 'اوستربيرج خوخ', retailPrice: 260 },
    { name: 'اوستربيرج كريز', retailPrice: 260 },
    { name: 'اوستربيرج فراوله', retailPrice: 260 },
    // Group 2 — 285 EGP
    { name: 'اوستربيرج بلوبيري', retailPrice: 285 },
    { name: 'اوستربيرج جوز هند', retailPrice: 285 },
    { name: 'اوستربيرج راسبري', retailPrice: 285 },
    { name: 'اوستربيرج كيوي', retailPrice: 285 },
    // Group 3 — 245 EGP
    { name: 'اوستربيرج مانجا', retailPrice: 245 },
    { name: 'اوستربيرج ميكس بيري', retailPrice: 245 },
  ];

  for (const op of osterProducts) {
    await ensureProduct(catOster.id, op.name, { retailPrice: op.retailPrice });
  }
  console.log('');

  // ──────────────────────────────────────────────────────────
  // STEP 6: Add نسكافيه
  // ──────────────────────────────────────────────────────────
  console.log('📝 STEP 6: Adding نسكافيه...\n');

  const catNescafe = await ensureCategory('نسكافيه');
  await ensureProduct(catNescafe.id, 'نسكافيه map', { retailPrice: 200 });
  console.log('');


  // ──────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ──────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 FINAL PRODUCT CATALOG');
  console.log('═══════════════════════════════════════════════════════\n');

  const allProducts = await prisma.product.findMany({
    include: {
      category: true,
      inventoryItems: true,
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  let currentCat = '';
  for (const p of allProducts) {
    if (p.category.name !== currentCat) {
      currentCat = p.category.name;
      console.log(`\n  📁 ${currentCat}`);
    }
    const totalStock = p.inventoryItems.reduce((s, i) => s + Number(i.quantity), 0);
    const stockStr = totalStock > 0 ? ` | stock: ${totalStock}` : '';
    console.log(
      `     • ${p.name} — cost: ${Number(p.costPrice)} | retail: ${Number(p.retailPrice)}${stockStr}`
    );
  }

  // Customer count
  const customerCount = await prisma.customer.count();
  const invoiceCount = await prisma.invoice.count();

  console.log(`\n\n  📊 Totals: ${allProducts.length} products, ${customerCount} customers, ${invoiceCount} invoices`);
  console.log('\n✅ All done!\n');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
