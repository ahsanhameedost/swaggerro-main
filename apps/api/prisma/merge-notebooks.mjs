// One-off: consolidates the last remaining "Notebooks" duplication — an
// orphaned top-level row (0 products) plus two sub-categories under different
// parents (Office & Stationery, Corporate). Moves the Corporate-side product
// onto the Office & Stationery sub-category (the more natural home, and
// already holding more notebook products), then deletes the emptied rows.
// Run: node prisma/merge-notebooks.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const CANONICAL_SUBCATEGORY_ID = "cms4hs4he0004e0bgc7j6nhsj"; // Notebooks (parent: Office & Stationery)
const CANONICAL_CATEGORY_ID = "cmqi0dkim002he0xcvd7rpo0z"; // Office & Stationery
const CORPORATE_NOTEBOOKS_ID = "cms4hsrb00013e0bg4ex1218c"; // Notebooks (parent: Corporate)
const ORPHAN_TOPLEVEL_ID = "cmqp9fxv4000fe0ywo7o9rsy6"; // Notebooks (top-level, 0 products)

async function main() {
  const moved = await prisma.catalogProduct.updateMany({
    where: { subCategoryId: CORPORATE_NOTEBOOKS_ID },
    data: { categoryId: CANONICAL_CATEGORY_ID, subCategoryId: CANONICAL_SUBCATEGORY_ID }
  });
  console.log(`Moved ${moved.count} product(s) from Corporate/Notebooks to Office & Stationery/Notebooks`);

  await prisma.catalogCategory.delete({ where: { id: CORPORATE_NOTEBOOKS_ID } });
  console.log("Deleted Corporate's Notebooks sub-category");

  await prisma.catalogCategory.delete({ where: { id: ORPHAN_TOPLEVEL_ID } });
  console.log("Deleted the orphaned top-level Notebooks category");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
