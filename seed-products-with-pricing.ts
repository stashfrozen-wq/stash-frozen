/* eslint-disable */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import getPrisma from './src/lib/prisma';

const prisma = getPrisma();

// ============================================================
// PRODUCT DATA WITH COST PRICES
// Organized by category → products with costPrice
// ============================================================
const productData: Record<string, { name: string; costPrice: number; unit?: string }[]> = {
  // ─── دكتور بيكر ١ كيلوا ────────────────────────────────
  "دكتور بيكر ١ كيلوا": [
    { name: "اسبريد ١ كيلوا اوريو", costPrice: 200 },
    { name: "اسبريد ١ كيلوا بسكوت كراميل", costPrice: 160 },
    { name: "اسبريد ١ كيلوا لوتس قرفه", costPrice: 160 },
    { name: "اسبريد ١ كيلوا كيندر", costPrice: 575 },
  ],

  // ─── دكتور بيكر جردل ────────────────────────────────────
  "دكتور بيكر جردل": [
    { name: "اسبريد جردل وايت شوكلت", costPrice: 640 },
    { name: "اسبريد جردل شوكلت بندق", costPrice: 925 },
    { name: "اسبريد جردل كيندر", costPrice: 1580 },
    { name: "اسبريد جردل بسكوت كراميل", costPrice: 450 },
    { name: "اسبريد جردل لوتس قرفه", costPrice: 425 },
    { name: "اسبريد جردل اوريو", costPrice: 560 },
    { name: "اسبريد جردل فسدق", costPrice: 1600 },
  ],

  // ─── Gsf ─────────────────────────────────────────────────
  "Gsf": [
    { name: "Gsf شوكلت", costPrice: 230 },
    { name: "Gsf كراميل", costPrice: 230 },
  ],

  // ─── لبن مكثف ────────────────────────────────────────────
  "لبن مكثف": [
    { name: "لبن مكثف ميلكوا", costPrice: 95 },
  ],

  // ─── شاي احمد ────────────────────────────────────────────
  "شاي احمد": [
    { name: "احمد تي انجلش بريك فاست", costPrice: 160 },
    { name: "احمد تي قرنفل", costPrice: 190 },
  ],

  // ─── سكر ──────────────────────────────────────────────────
  "سكر": [
    { name: "سكر باكت", costPrice: 450 },
  ],

  // ─── كوبيات ──────────────────────────────────────────────
  "كوبيات": [
    { name: "كوب يو شيب ١٤ اوينز", costPrice: 90 },
    { name: "كوب يو شيب ١٦ اوينز", costPrice: 95 },
  ],

  // ─── ادوات ومستلزمات ─────────────────────────────────────
  "ادوات ومستلزمات": [
    { name: "استلير خشب رفيع", costPrice: 150 },
    { name: "استيلر بلاستك اسود", costPrice: 100 },
    { name: "شوك", costPrice: 65 },
    { name: "معالق", costPrice: 75 },
    { name: "سكاكين", costPrice: 65 },
  ],

  // ─── مناديل ──────────────────────────────────────────────
  "مناديل": [
    { name: "مناديل مناشف", costPrice: 325 },
    { name: "مناديل سفره", costPrice: 350 },
    { name: "مناديل بكر تويلت", costPrice: 475 },
    { name: "مناديل مطبخ", costPrice: 465 },
  ],

  // ─── شاليموهات ───────────────────────────────────────────
  "شاليموهات": [
    { name: "شاليمو كبير", costPrice: 30 },
    { name: "شاليمو صغير", costPrice: 40 },
  ],

  // ─── مكسرات / اروما ─────────────────────────────────────
  "مكسرات": [
    { name: "فسدق اروما", costPrice: 510 },
  ],
};

// ============================================================
// MAIN SEED FUNCTION
// ============================================================
async function main() {
  console.log('🔄 Starting product reset and re-seed...\n');

  // ── Step 1: Check for products with existing transactions/invoices ──
  console.log('📋 Checking for products with transaction history...');
  const allProducts = await prisma.product.findMany({
    include: {
      _count: {
        select: {
          transactionItems: true,
          invoiceItems: true,
          refundItems: true,
        },
      },
    },
  });

  const productsWithHistory = allProducts.filter(
    (p) =>
      p._count.transactionItems > 0 ||
      p._count.invoiceItems > 0 ||
      p._count.refundItems > 0
  );

  if (productsWithHistory.length > 0) {
    console.log(
      `\n⚠️  WARNING: ${productsWithHistory.length} product(s) have transaction/invoice history:`
    );
    for (const p of productsWithHistory) {
      console.log(
        `   - "${p.name}" (SKU: ${p.sku}) → ${p._count.transactionItems} transactions, ${p._count.invoiceItems} invoices, ${p._count.refundItems} refunds`
      );
    }
    console.log(
      '\n   These products will be KEPT but updated with new pricing if matched.'
    );
    console.log(
      '   Products WITHOUT history will be deleted and recreated.\n'
    );
  }

  // ── Step 2: Delete products WITHOUT transaction history ──
  const productsToDelete = allProducts.filter(
    (p) =>
      p._count.transactionItems === 0 &&
      p._count.invoiceItems === 0 &&
      p._count.refundItems === 0
  );

  if (productsToDelete.length > 0) {
    console.log(`🗑️  Deleting ${productsToDelete.length} unused products...`);
    const deleteIds = productsToDelete.map((p) => p.id);

    await prisma.$transaction(async (tx) => {
      // Delete inventory for these products first
      await tx.inventory.deleteMany({
        where: { productId: { in: deleteIds } },
      });
      // Delete the products
      await tx.product.deleteMany({
        where: { id: { in: deleteIds } },
      });
    });
    console.log('   ✅ Done.\n');
  }

  // ── Step 3: Delete empty categories ──
  console.log('🗑️  Cleaning up empty categories...');
  const emptyCategories = await prisma.category.findMany({
    where: {
      products: { none: {} },
    },
  });

  if (emptyCategories.length > 0) {
    for (const cat of emptyCategories) {
      await prisma.category.delete({ where: { id: cat.id } });
      console.log(`   Deleted empty category: "${cat.name}"`);
    }
  }
  console.log('   ✅ Done.\n');

  // ── Step 4: Create/update categories and products ──
  console.log('📦 Creating categories and products with pricing...\n');

  let createdCount = 0;
  let updatedCount = 0;
  const skippedCount = 0;

  for (const [categoryName, products] of Object.entries(productData)) {
    // Upsert category
    let category = await prisma.category.findUnique({
      where: { name: categoryName },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName },
      });
      console.log(`📁 Created category: "${categoryName}"`);
    } else {
      console.log(`📁 Found category: "${categoryName}"`);
    }

    // Create/update products
    for (const product of products) {
      // Check if product already exists (by name + category)
      const existing = await prisma.product.findFirst({
        where: { name: product.name, categoryId: category.id },
      });

      if (existing) {
        // Update pricing
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            costPrice: product.costPrice,
          },
        });
        console.log(
          `   ✏️  Updated: "${product.name}" → costPrice: ${product.costPrice}`
        );
        updatedCount++;
      } else {
        // Check if product exists in a different category (by name only)
        const existingInOtherCat = await prisma.product.findFirst({
          where: { name: product.name },
        });

        if (existingInOtherCat) {
          // Update category and pricing
          await prisma.product.update({
            where: { id: existingInOtherCat.id },
            data: {
              categoryId: category.id,
              costPrice: product.costPrice,
            },
          });
          console.log(
            `   🔀 Moved & updated: "${product.name}" → category: "${categoryName}", costPrice: ${product.costPrice}`
          );
          updatedCount++;
        } else {
          // Create new
          const sku = `SKU-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await prisma.product.create({
            data: {
              name: product.name,
              sku,
              categoryId: category.id,
              costPrice: product.costPrice,
              baseSellingPrice: 0,
              retailPrice: 0,
              lowestRetailPrice: 0,
              wholesalePrice: 0,
              lowestWholesalePrice: 0,
              unit: product.unit || 'piece',
            },
          });
          console.log(
            `   ✅ Created: "${product.name}" (SKU: ${sku}) → costPrice: ${product.costPrice}`
          );
          createdCount++;

          // Small delay to ensure unique SKUs
          await new Promise((r) => setTimeout(r, 5));
        }
      }
    }
    console.log('');
  }

  // ── Summary ──
  console.log('═══════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`   Created:  ${createdCount} products`);
  console.log(`   Updated:  ${updatedCount} products`);
  console.log(`   Skipped:  ${skippedCount} products`);
  console.log(`   Deleted:  ${productsToDelete.length} unused products`);
  console.log(`   Categories: ${Object.keys(productData).length}`);
  console.log('═══════════════════════════════════════════\n');

  // ── Final verification ──
  const finalProducts = await prisma.product.findMany({
    include: { category: true },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  console.log('📋 Final Product List:');
  console.log('─────────────────────────────────────────');
  let currentCat = '';
  for (const p of finalProducts) {
    if (p.category.name !== currentCat) {
      currentCat = p.category.name;
      console.log(`\n  📁 ${currentCat}`);
    }
    console.log(
      `     • ${p.name} — costPrice: ${Number(p.costPrice)} EGP`
    );
  }
  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
