// One-off backfill: creates sub-categories (child CatalogCategory rows) and
// brands (CatalogBrand), then assigns every existing product's category,
// subCategory and brand. Brand names are placeholders grouped by product type —
// intended to be renamed later once real brand data is available.
// Idempotent: safe to re-run (upserts by name, updates products every time).
// Run: node prisma/backfill-subcategories-brands.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Product id -> top-level category name, sub-category name, brand name.
const PRODUCT_PLAN = {
  "cmqtysqmn0003e0osb0lfg8o7": { name: "Backpack", category: "Bags", subCategory: "Backpacks", brand: "Fieldstone Bag Co." },
  "cmqi0ewtw0053e0xcljj4p3jk": { name: "Bamboo Hardcover Notebook", category: "Office & Stationery", subCategory: "Notebooks", brand: "Basecamp Stationery" },
  "cmqp9lt5p00hre0ywe9b9i9ce": { name: "Bamboo Pen Set", category: "Office & Stationery", subCategory: "Pens & Writing", brand: "Basecamp Stationery" },
  "cmqp9ttqv00zke0ywc5ljxkoi": { name: "Ceramic Camp Mug", category: "Drinkware", subCategory: "Mugs", brand: "Northline Drinkware" },
  "cmqgwpbcv002ydzoo1car6n2i": { name: "Ceramic Mug", category: "Drinkware", subCategory: "Mugs", brand: "Northline Drinkware" },
  "cmqp9w0h4010ie0yw39io1ufv": { name: "Classic Cotton Tee", category: "Apparel", subCategory: "T-Shirts", brand: "Swaggeroo Apparel Co." },
  "cmqgwpba3002cdzoo13gafzcn": { name: "Classic Hoodie", category: "Apparel", subCategory: "Hoodies & Fleece", brand: "Swaggeroo Apparel Co." },
  "cmqi0fp6g006ie0xcrl0no4ue": { name: "Classic Snapback Cap", category: "Headwears", subCategory: "Caps", brand: "Peak Headwear" },
  "cmqp9l0i300epe0ywxoknb6hg": { name: "Commuter Laptop Backpack", category: "Bags", subCategory: "Backpacks", brand: "Fieldstone Bag Co." },
  "cmqtysqwa0004e0os4nev4hr7": { name: "Custom Packaging", category: "Packaging & Kits", subCategory: "Boxes & Mailers", brand: "Trailhead Packaging" },
  "cmqgwpbbg002ndzooh0atibnu": { name: "Dad Hat", category: "Apparel", subCategory: "Hats", brand: "Swaggeroo Apparel Co." },
  "cmqi0fwu80072e0xcxr6dy0f9": { name: "Die-Cut Sticker Pack", category: "Accessories", subCategory: "Stickers", brand: "Urban Anchor Accessories" },
  "cmqguxq680001dziwyhnrblaj": { name: "District Women's Tee", category: "Custom Tees", subCategory: "Women's Tees", brand: "District" },
  "cmrfbqhij0005e0dwm85x21ds": { name: "E2E Test Tee 1783711426261", category: "Apparel", subCategory: "T-Shirts", brand: "Swaggeroo Apparel Co." },
  "cmrfbttd60014e0dwloqi6mo2": { name: "E2E Test Tee 1783711580232", category: "Apparel", subCategory: "T-Shirts", brand: "Swaggeroo Apparel Co." },
  "cmqi0ef5x003me0xcc2o1pb97": { name: "Eco Fleece Hoodie", category: "Apparel", subCategory: "Hoodies & Fleece", brand: "Swaggeroo Apparel Co." },
  "cmqi0fk7a006be0xc0x1oh5k4": { name: "Enamel Pin Set", category: "Accessories", subCategory: "Pins & Patches", brand: "Urban Anchor Accessories" },
  "cmqi0f203005be0xchg5z9dul": { name: "Everyday Canvas Backpack", category: "Bags", subCategory: "Backpacks", brand: "Fieldstone Bag Co." },
  "cmqtysq9k0001e0os7bf8fdo6": { name: "Gift Box", category: "Packaging & Kits", subCategory: "Boxes & Mailers", brand: "Trailhead Packaging" },
  "cmqp9ljpx00gpe0ywfh06mpk5": { name: "Hardcover Notebook", category: "Office & Stationery", subCategory: "Notebooks", brand: "Basecamp Stationery" },
  "cmqp9kr2300dre0ywehzashmb": { name: "Heavyweight Canvas Tote", category: "Bags", subCategory: "Totes", brand: "Fieldstone Bag Co." },
  "cmqp9k6r800bue0yw9ll1u6y9": { name: "Insulated Tumbler 20oz", category: "Drinkware", subCategory: "Tumblers", brand: "Northline Drinkware" },
  "cmqtyspjf0000e0os1a6sog1q": { name: "Mailer Box", category: "Packaging & Kits", subCategory: "Boxes & Mailers", brand: "Trailhead Packaging" },
  "cmqgwpbg1003kdzoo4pvw7a5a": { name: "Notebook", category: "Corporate", subCategory: "Notebooks", brand: "Basecamp Stationery" },
  "cmqgwpbn70052dzoordkbiusf": { name: "Performance Tee", category: "Apparel", subCategory: "T-Shirts", brand: "Swaggeroo Apparel Co." },
  "cmqpa14ko0159e0ywpa69lwqg": { name: "Pocket Bluetooth Speaker", category: "Tech & Gadgets", subCategory: "Audio", brand: "Voltline Tech" },
  "cmqp9j1xy004ke0ywmf00ffcd": { name: "Premium Fleece Hoodie", category: "Apparel", subCategory: "Hoodies & Fleece", brand: "Swaggeroo Apparel Co." },
  "cmqgwpb7t0021dzoozxgfjupg": { name: "Premium Tee", category: "Apparel", subCategory: "T-Shirts", brand: "Swaggeroo Apparel Co." },
  "cmqgwpbhk003vdzoomjq8eaev": { name: "Quarter Zip", category: "Apparel", subCategory: "Hoodies & Fleece", brand: "Swaggeroo Apparel Co." },
  "cmqp9jmxe0088e0ywuig6cvet": { name: "Quarter-Zip Pullover", category: "Apparel", subCategory: "Hoodies & Fleece", brand: "Swaggeroo Apparel Co." },
  "cmrp89ahi0001dzvo4jwu4i8o": { name: "Sample Tee", category: "Apparel", subCategory: "T-Shirts", brand: "Swaggeroo Apparel Co." },
  "cmqi0e0g7002oe0xcx22ibjjm": { name: "Signature Cotton Tee", category: "Apparel", subCategory: "T-Shirts", brand: "Swaggeroo Apparel Co." },
  "cmqgwpbeh0039dzoomyg1la5m": { name: "Stainless Bottle", category: "Drinkware", subCategory: "Water Bottles", brand: "Northline Drinkware" },
  "cmqp9khx700cte0ywjz8c2e8r": { name: "Stainless Water Bottle", category: "Drinkware", subCategory: "Water Bottles", brand: "Northline Drinkware" },
  "cmqi0eo14004he0xcbpqvy7hs": { name: "Summit Insulated Tumbler", category: "Drinkware", subCategory: "Tumblers", brand: "Northline Drinkware" },
  "cmqtysqg20002e0osbeyz36v8": { name: "Tote Bag", category: "Bags", subCategory: "Totes", brand: "Fieldstone Bag Co." },
  "cmqgwpbru0069dzooi1ag0xsx": { name: "Travel Tumbler", category: "Drinkware", subCategory: "Tumblers", brand: "Northline Drinkware" },
  "cmqgwpbv80075dzoo0rgwm8ih": { name: "Welcome Pack Box", category: "Corporate", subCategory: "Welcome Kits", brand: "Basecamp Stationery" },
  "cmqpa0pr2014be0ywcwzx9ir8": { name: "Wireless Charging Pad", category: "Tech & Gadgets", subCategory: "Charging & Power", brand: "Voltline Tech" }
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueSlug(model, name) {
  const base = slugify(name);
  let slug = base;
  let counter = 2;
  while (await prisma[model].findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

async function ensureCategory(name, parentId) {
  const existing = await prisma.catalogCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, parentId: parentId ?? null }
  });
  if (existing) return existing;
  const slug = await ensureUniqueSlug("catalogCategory", name);
  return prisma.catalogCategory.create({ data: { name, slug, parentId: parentId ?? null } });
}

async function ensureBrand(name) {
  const existing = await prisma.catalogBrand.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });
  if (existing) return existing;
  const slug = await ensureUniqueSlug("catalogBrand", name);
  return prisma.catalogBrand.create({ data: { name, slug } });
}

async function main() {
  const categoryCache = new Map();
  const subCategoryCache = new Map();
  const brandCache = new Map();

  for (const [productId, plan] of Object.entries(PRODUCT_PLAN)) {
    const product = await prisma.catalogProduct.findUnique({ where: { id: productId } });
    if (!product) {
      console.warn(`skip: product not found (${plan.name}, ${productId})`);
      continue;
    }

    if (!categoryCache.has(plan.category)) {
      categoryCache.set(plan.category, await ensureCategory(plan.category, null));
    }
    const category = categoryCache.get(plan.category);

    const subCategoryKey = `${plan.category}::${plan.subCategory}`;
    if (!subCategoryCache.has(subCategoryKey)) {
      subCategoryCache.set(subCategoryKey, await ensureCategory(plan.subCategory, category.id));
    }
    const subCategory = subCategoryCache.get(subCategoryKey);

    if (!brandCache.has(plan.brand)) {
      brandCache.set(plan.brand, await ensureBrand(plan.brand));
    }
    const brand = brandCache.get(plan.brand);

    await prisma.catalogProduct.update({
      where: { id: productId },
      data: { categoryId: category.id, subCategoryId: subCategory.id, brandId: brand.id }
    });

    console.log(`${product.name} -> ${plan.category} / ${plan.subCategory} / ${plan.brand}`);
  }

  console.log(`\nDone: ${Object.keys(PRODUCT_PLAN).length} products, ${categoryCache.size} categories, ${subCategoryCache.size} sub-categories, ${brandCache.size} brands.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
