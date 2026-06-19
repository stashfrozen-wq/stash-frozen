/* eslint-disable */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import getPrisma from './src/lib/prisma';

const prisma = getPrisma();

const data = {
  "بن تركي زون": [
    "ساده فاتح",
    "ساده وسط",
    "ساده غامق",
    "محوج فاتح",
    "محوج وسط",
    "محوج غامق",
    "فرنساوي كلاسيك",
    "فرنساوي بندق"
  ],
  "اسبرسوا loxor": [
    "لوكسر الترا كريما",
    "لوكسر سليكشن",
    "لوكسر كور"
  ],
  "صولو": [
    "صولو بيوريه",
    "صولو فلفر",
    "صولو بودر فانليا",
    "صولو بودر شوكلت",
    "صولو بودر كوفي"
  ],
  "اوستربيرج": [
    "اوستربيرج كراش"
  ],
  "دكتور بيكر": [
    "اسبريد ١ كيلوا اوريو",
    "اسبريد ١ كيلوا بسكوت كراميل",
    "اسبريد ١ كيلوا لوتس قرفه",
    "اسبريد ١ كيلوا كيندر",
    "اسبريد جردل وايت شوكلت",
    "اسبريد جردل شوكلت بندق",
    "اسبريد جردل كيندر",
    "اسبريد جردل بسكوت كراميل",
    "اسبريد جردل لوتس قرفه",
    "اسبريد جردل اوريو",
    "اسبريد جردل فسدق"
  ],
  "بوبا": [
    "بوبا"
  ],
  "Gsf": [
    "Gsf شوكلت",
    "Gsf كراميل"
  ],
  "لبن مكثف": [
    "لبن مكثف"
  ],
  "شاي احمد تي": [
    "احمد تي انجلش بريك فاست",
    "احمد تي قرنفل"
  ],
  "سكر باكت": [
    "سكر باكت"
  ],
  "لبن لمار": [
    "لبن لمار"
  ],
  "كوبيات": [
    "كوب سخن 6.5 اوينز",
    "كوب سخن 9 اوينز",
    "كوب سخن 12 اوينز",
    "كوب بلاستك يو شيب",
    "كوب 14 اوينز",
    "كوب 16 اوينز"
  ],
  "ادوات ومستلزمات": [
    "استلير خشب رفيع",
    "استيلر بلاستك اسود",
    "شوك",
    "معالق",
    "سكاكين"
  ],
  "مناديل": [
    "مناديل مناشف",
    "مناديل سفره",
    "مناديل بكر تويلت",
    "مناديل مطبخ"
  ],
  "شاليموهات": [
    "شاليمو كبير ٧",
    "شالميو صغير ٩"
  ]
};

async function main() {
  for (const [categoryName, products] of Object.entries(data)) {
    let category = await prisma.category.findUnique({
      where: { name: categoryName }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName }
      });
      console.log(`Created category: ${categoryName}`);
    } else {
      console.log(`Found category: ${categoryName}`);
    }

    for (const productName of products) {
      const existingProduct = await prisma.product.findFirst({
        where: { name: productName, categoryId: category.id }
      });

      if (!existingProduct) {
        await prisma.product.create({
          data: {
            name: productName,
            sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            categoryId: category.id,
            costPrice: 0,
            baseSellingPrice: 0,
            retailPrice: 0,
            lowestRetailPrice: 0,
            wholesalePrice: 0,
            lowestWholesalePrice: 0,
            unit: "piece"
          }
        });
        console.log(`Created product: ${productName}`);
      } else {
        console.log(`Product already exists: ${productName}`);
      }
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
