// Seeds packaging products (isPackaging=true) used by the Pack Studio packaging
// picker. Idempotent: upserts by slug. Run: node prisma/seed-packaging.mjs
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const PACKAGING = [
  { name: "Mailer Box", slug: "packaging-mailer-box", price: 3.5, description: "Branded corrugated mailer box — perfect for shipping packs." },
  { name: "Gift Box", slug: "packaging-gift-box", price: 4.25, description: "Premium rigid gift box with a clean unboxing experience." },
  { name: "Tote Bag", slug: "packaging-tote-bag", price: 2.75, description: "Reusable cotton tote that doubles as packaging and swag." },
  { name: "Backpack", slug: "packaging-backpack", price: 12.0, description: "Durable backpack packaging for premium welcome kits." },
  { name: "Custom Packaging", slug: "packaging-custom", price: 5.0, description: "Fully custom packaging — we design it with you." },
];

async function main() {
  for (const item of PACKAGING) {
    await prisma.catalogProduct.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        shortDescription: item.description,
        status: "ACTIVE",
        isPackaging: true,
        bulkPricingEnabled: true,
        basePrice: new Prisma.Decimal(item.price),
        baseStock: 100000,
        minQty: 1,
        currency: "USD",
      },
      create: {
        slug: item.slug,
        name: item.name,
        shortDescription: item.description,
        status: "ACTIVE",
        isPackaging: true,
        bulkPricingEnabled: true,
        basePrice: new Prisma.Decimal(item.price),
        baseStock: 100000,
        minQty: 1,
        currency: "USD",
      },
    });
    console.log(`upserted packaging: ${item.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
