// One-off cleanup: earlier CSV imports created duplicate top-level categories
// (same name, multiple rows — "Bottles" x6, "Notebooks" x6, "Tech" x6), left
// over as orphans because real products were assigned to differently-named
// categories instead (Drinkware, Office & Stationery, Tech & Gadgets). This
// merges each same-name group of TOP-LEVEL categories into one row: keeps the
// oldest, re-points any products/children from the rest onto it, then deletes
// the rest. Safe to re-run — a no-op once no duplicates remain.
// Run: node prisma/dedupe-categories.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.catalogCategory.findMany({
    where: { parentId: null },
    orderBy: { createdAt: "asc" }
  });

  const byName = new Map();
  for (const c of categories) {
    const key = c.name.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(c);
  }

  for (const [name, rows] of byName) {
    if (rows.length < 2) continue;

    const [canonical, ...duplicates] = rows;
    console.log(`\n"${canonical.name}": keeping ${canonical.id} (created ${canonical.createdAt.toISOString()}), merging ${duplicates.length} duplicate(s)`);

    for (const dup of duplicates) {
      const [movedProducts, movedSubCategoryProducts, movedChildren] = await prisma.$transaction([
        prisma.catalogProduct.updateMany({ where: { categoryId: dup.id }, data: { categoryId: canonical.id } }),
        prisma.catalogProduct.updateMany({ where: { subCategoryId: dup.id }, data: { subCategoryId: canonical.id } }),
        prisma.catalogCategory.updateMany({ where: { parentId: dup.id }, data: { parentId: canonical.id } })
      ]);

      await prisma.catalogCategory.delete({ where: { id: dup.id } });

      console.log(
        `  deleted ${dup.id} — moved ${movedProducts.count} product(s), ${movedSubCategoryProducts.count} sub-category product(s), ${movedChildren.count} child categor${movedChildren.count === 1 ? "y" : "ies"}`
      );
    }
  }

  console.log("\nDone.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
