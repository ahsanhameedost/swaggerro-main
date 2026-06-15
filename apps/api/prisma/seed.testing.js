require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const image = (seed) => `https://picsum.photos/seed/${seed}/1200/1200`;

const ROLE_PERMISSIONS = {
  ADMIN: [
    "profile.read",
    "profile.update",
    "catalog.categories.read",
    "catalog.categories.write",
    "catalog.collections.read",
    "catalog.collections.write",
    "catalog.products.read",
    "catalog.products.write",
    "catalog.orders.read",
    "catalog.orders.update",
    "design.read",
    "design.write",
    "design.approve",
    "inventory.read",
    "inventory.adjust",
    "recipients.read",
    "recipients.write",
    "shipping.settings.read",
    "shipping.settings.write",
    "shipping.rates.read",
    "shipping.rates.write",
    "shipping.shipments.read",
    "shipping.shipments.write",
    "shipping.estimate",
    "contact.messages.read",
    "admin.users.read",
    "admin.users.write"
  ],
  EMPLOYEE: [
    "profile.read",
    "profile.update",
    "catalog.products.read",
    "orders.assigned.read",
    "design.assigned.read",
    "design.write",
    "inventory.assigned.read",
    "inventory.adjust",
    "shipping.rates.read",
    "shipping.shipments.assigned.read",
    "shipping.shipments.assigned.write",
    "shipping.assigned.estimate"
  ]
};

async function ensureTestingRole(name) {
  const role = await prisma.role.upsert({
    where: { name },
    update: { description: name.replaceAll("_", " ") },
    create: { name, description: name.replaceAll("_", " ") }
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: ROLE_PERMISSIONS[name] ?? [] } },
    select: { id: true }
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

  if (permissions.length) {
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id
      })),
      skipDuplicates: true
    });
  }

  return role;
}


async function getRoleId(name) {
  const role = await prisma.role.findUnique({ where: { name } });
  return role.id;
}

async function upsertUser({ email, firstName, lastName, roleName, phone }) {
  const passwordHash = bcrypt.hashSync("Password@123", 12);
  return prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      phone,
      passwordHash,
      roleId: await getRoleId(roleName),
    },
    create: {
      email,
      firstName,
      lastName,
      phone,
      passwordHash,
      roleId: await getRoleId(roleName),
    },
  });
}

const DEFAULT_SHIPPING_ZONES = [
  {
    code: "US",
    name: "United States",
    description: "Domestic shipping inside the United States",
    isDomestic: true,
    countries: [{ code: "US", name: "United States" }],
  },
  {
    code: "INTL_STANDARD",
    name: "International Standard",
    description: "Standard international destinations",
    isDomestic: false,
    countries: [
      { code: "CA", name: "Canada" },
      { code: "MX", name: "Mexico" },
      { code: "GB", name: "United Kingdom" },
      { code: "DE", name: "Germany" },
      { code: "FR", name: "France" },
    ],
  },
  {
    code: "PREMIUM",
    name: "Premium Delivery Zone",
    description: "Premium international destinations",
    isDomestic: false,
    countries: [
      { code: "AU", name: "Australia" },
      { code: "JP", name: "Japan" },
      { code: "IN", name: "India" },
    ],
  },
];

const DEFAULT_SHIPPING_PROFILES = [
  {
    name: "Standard Bulk Item",
    slug: "standard-bulk-item",
    packageType: "BULK_ITEM",
    shippingScope: "DOMESTIC_AND_INTERNATIONAL",
    maxUnitsPerPackage: 12,
  },
  {
    name: "Standard Pack",
    slug: "standard-pack",
    packageType: "PACK",
    shippingScope: "DOMESTIC_AND_INTERNATIONAL",
    maxUnitsPerPackage: 1,
  },
  {
    name: "Mailer Pack",
    slug: "mailer-pack",
    packageType: "MAILER_PACK",
    shippingScope: "DOMESTIC_AND_INTERNATIONAL",
    maxUnitsPerPackage: 1,
  },
  {
    name: "US Only Product",
    slug: "us-only-product",
    packageType: "BULK_ITEM",
    shippingScope: "DOMESTIC_ONLY",
    maxUnitsPerPackage: 6,
  },
];

const DEFAULT_SHIPPING_RATES = [
  ["US", "STANDARD", "PACK", "FLAT_PER_PACKAGE", 0, 16, null, null, 2, 4],
  ["US", "EXPRESS", "PACK", "FLAT_PER_PACKAGE", 0, 25, null, null, 2, 4],
  [
    "US",
    "STANDARD",
    "MAILER_PACK",
    "FLAT_PER_PACKAGE",
    0,
    12,
    null,
    null,
    1,
    4,
  ],
  [
    "INTL_STANDARD",
    "STANDARD",
    "PACK",
    "FLAT_PER_PACKAGE",
    0,
    45,
    null,
    null,
    3,
    6,
  ],
  ["PREMIUM", "STANDARD", "PACK", "FLAT_PER_PACKAGE", 0, 55, null, null, 3, 6],
  [
    "US",
    "STANDARD",
    "BULK_ITEM",
    "WEIGHT_AND_QUANTITY",
    0,
    10,
    0.35,
    1.2,
    2,
    4,
  ],
  [
    "INTL_STANDARD",
    "STANDARD",
    "BULK_ITEM",
    "WEIGHT_AND_QUANTITY",
    0,
    25,
    0.75,
    2.4,
    3,
    6,
  ],
  [
    "PREMIUM",
    "STANDARD",
    "BULK_ITEM",
    "WEIGHT_AND_QUANTITY",
    0,
    35,
    1.1,
    3.1,
    3,
    6,
  ],
];
async function seedShipping() {
  for (const zoneInput of DEFAULT_SHIPPING_ZONES) {
    const zone = await prisma.shippingZone.upsert({
      where: { code: zoneInput.code },
      update: {
        name: zoneInput.name,
        description: zoneInput.description,
        isDomestic: zoneInput.isDomestic,
        isActive: true,
      },
      create: {
        code: zoneInput.code,
        name: zoneInput.name,
        description: zoneInput.description,
        isDomestic: zoneInput.isDomestic,
        isActive: true,
      },
    });

    await prisma.shippingZoneCountry.deleteMany({ where: { zoneId: zone.id } });
    await prisma.shippingZoneCountry.createMany({
      data: zoneInput.countries.map((country) => ({
        zoneId: zone.id,
        countryCode: country.code,
        countryName: country.name,
      })),
      skipDuplicates: true,
    });
  }

  for (const profileInput of DEFAULT_SHIPPING_PROFILES) {
    await prisma.shippingProfile.upsert({
      where: { slug: profileInput.slug },
      update: profileInput,
      create: profileInput,
    });
  }

  const zones = await prisma.shippingZone.findMany();
  const zoneByCode = new Map(zones.map((zone) => [zone.code, zone.id]));

  for (const [
    zoneCode,
    serviceLevel,
    packageType,
    pricingModel,
    weightFromOz,
    baseRate,
    perItemRate,
    perPoundRate,
    handlingFee,
    fuelSurcharge,
  ] of DEFAULT_SHIPPING_RATES) {
    const zoneId = zoneByCode.get(zoneCode);
    if (!zoneId) continue;

    await prisma.shippingRate.upsert({
      where: {
        id: `${zoneCode}-${serviceLevel}-${packageType}-${pricingModel}`.toLowerCase(),
      },
      update: {
        zoneId,
        serviceLevel,
        packageType,
        pricingModel,
        weightFromOz,
        weightToOz: null,
        baseRate,
        perItemRate,
        perPoundRate,
        handlingFee,
        fuelSurcharge,
        currency: "USD",
        isActive: true,
      },
      create: {
        id: `${zoneCode}-${serviceLevel}-${packageType}-${pricingModel}`.toLowerCase(),
        zoneId,
        serviceLevel,
        packageType,
        pricingModel,
        weightFromOz,
        weightToOz: null,
        baseRate,
        perItemRate,
        perPoundRate,
        handlingFee,
        fuelSurcharge,
        currency: "USD",
        isActive: true,
      },
    });
  }
}

async function main() {
  await ensureTestingRole("ADMIN");
  await ensureTestingRole("EMPLOYEE");
  await seedShipping();

  const admin = await upsertUser({
    email: "admin@example.com",
    firstName: "Ops",
    lastName: "Admin",
    roleName: "ADMIN",
    phone: "+1 555 100 0001",
  });

  const employeeA = await upsertUser({
    email: "designer.one@example.com",
    firstName: "Mia",
    lastName: "Lopez",
    roleName: "EMPLOYEE",
    phone: "+1 555 100 0002",
  });

  const employeeB = await upsertUser({
    email: "designer.two@example.com",
    firstName: "Noah",
    lastName: "Kim",
    roleName: "EMPLOYEE",
    phone: "+1 555 100 0003",
  });

  const customerA = await upsertUser({
    email: "customer.one@example.com",
    firstName: "Ava",
    lastName: "Johnson",
    roleName: "USER",
    phone: "+1 555 200 0001",
  });

  const customerB = await upsertUser({
    email: "customer.two@example.com",
    firstName: "Liam",
    lastName: "Martinez",
    roleName: "USER",
    phone: "+1 555 200 0002",
  });

  const categories = await Promise.all([
    prisma.catalogCategory.upsert({
      where: { slug: "apparel" },
      update: { name: "Apparel", description: "Wearables" },
      create: {
        slug: "apparel",
        name: "Apparel",
        description: "Wearables",
        imageUrl: image("apparel"),
      },
    }),
    prisma.catalogCategory.upsert({
      where: { slug: "drinkware" },
      update: { name: "Drinkware", description: "Cups and bottles" },
      create: {
        slug: "drinkware",
        name: "Drinkware",
        description: "Cups and bottles",
        imageUrl: image("drinkware"),
      },
    }),
    prisma.catalogCategory.upsert({
      where: { slug: "office" },
      update: { name: "Office", description: "Desk swag" },
      create: {
        slug: "office",
        name: "Office",
        description: "Desk swag",
        imageUrl: image("office"),
      },
    }),
  ]);

  const collections = await Promise.all([
    prisma.catalogCollection.upsert({
      where: { slug: "new-hire" },
      update: { name: "New Hire", description: "Starter kits" },
      create: {
        slug: "new-hire",
        name: "New Hire",
        description: "Starter kits",
        imageUrl: image("new-hire"),
      },
    }),
    prisma.catalogCollection.upsert({
      where: { slug: "conference" },
      update: { name: "Conference", description: "Event gear" },
      create: {
        slug: "conference",
        name: "Conference",
        description: "Event gear",
        imageUrl: image("conference"),
      },
    }),
  ]);

  const shippingProfiles = await prisma.shippingProfile.findMany();
  const profileBySlug = new Map(
    shippingProfiles.map((profile) => [profile.slug, profile.id]),
  );

  async function upsertSimpleProduct(index, input) {
    const product = await prisma.catalogProduct.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        status: "ACTIVE",
        categoryId: input.categoryId,
        shippingProfileId: input.shippingProfileId,
        basePrice: input.basePrice,
        compareAtPrice: input.compareAtPrice ?? null,
        baseStock: input.baseStock,
        minQty: input.minQty,
        weightOz: input.weightOz,
      },
      create: {
        slug: input.slug,
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        status: "ACTIVE",
        categoryId: input.categoryId,
        shippingProfileId: input.shippingProfileId,
        basePrice: input.basePrice,
        compareAtPrice: input.compareAtPrice ?? null,
        baseStock: input.baseStock,
        minQty: input.minQty,
        weightOz: input.weightOz,
      },
    });

    await prisma.catalogImage.deleteMany({ where: { productId: product.id } });
    await prisma.catalogImage.create({
      data: {
        productId: product.id,
        url: image(`product-${index}`),
        alt: input.name,
        sortOrder: 0,
      },
    });

    await prisma.catalogPricingOption.deleteMany({
      where: { productId: product.id },
    });
    await prisma.catalogPricingOption.createMany({
      data: [
        {
          productId: product.id,
          qtyFrom: 1,
          qtyTo: 24,
          price: input.basePrice,
          sortOrder: 0,
        },
        {
          productId: product.id,
          qtyFrom: 25,
          qtyTo: 99,
          price: Number(input.basePrice) - 1,
          sortOrder: 1,
        },
        {
          productId: product.id,
          qtyFrom: 100,
          qtyTo: null,
          price: Math.max(Number(input.basePrice) - 2, 1),
          isOnward: true,
          sortOrder: 2,
        },
      ],
    });

    for (const collection of input.collections) {
      await prisma.catalogProductCollection.upsert({
        where: {
          productId_collectionId: {
            productId: product.id,
            collectionId: collection.id,
          },
        },
        update: {},
        create: { productId: product.id, collectionId: collection.id },
      });
    }

    return product;
  }

  async function upsertVariantProduct(index, input) {
    const product = await prisma.catalogProduct.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        status: "ACTIVE",
        categoryId: input.categoryId,
        shippingProfileId: input.shippingProfileId,
        basePrice: input.basePrice,
        baseStock: 0,
        minQty: input.minQty,
        weightOz: input.weightOz,
      },
      create: {
        slug: input.slug,
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        status: "ACTIVE",
        categoryId: input.categoryId,
        shippingProfileId: input.shippingProfileId,
        basePrice: input.basePrice,
        baseStock: 0,
        minQty: input.minQty,
        weightOz: input.weightOz,
      },
    });

    await prisma.catalogImage.deleteMany({ where: { productId: product.id } });
    const mainImage = await prisma.catalogImage.create({
      data: {
        productId: product.id,
        url: image(`variant-product-${index}`),
        alt: input.name,
        sortOrder: 0,
      },
    });

    await prisma.variant.deleteMany({ where: { productId: product.id } });
    await prisma.catalogVariant.deleteMany({
      where: { productId: product.id },
    });

    const colorVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        name: "Color",
        type: "COLOR",
        sortOrder: 0,
      },
    });

    const options = [];
    for (const [sortOrder, option] of input.options.entries()) {
      options.push(
        await prisma.variantOption.create({
          data: {
            variantId: colorVariant.id,
            code: option.code,
            label: option.label,
            colorHex: option.colorHex,
            sortOrder,
          },
        }),
      );
    }

    for (const [sortOrder, option] of options.entries()) {
      const productVariant = await prisma.catalogVariant.create({
        data: {
          productId: product.id,
          title: option.label,
          price: Number(input.basePrice) + sortOrder,
          stock: 40 + sortOrder * 10,
          minQty: input.minQty,
          currency: "USD",
          isDefault: sortOrder === 0,
          sortOrder,
        },
      });

      await prisma.catalogVariantSelectedOption.create({
        data: {
          catalogVariantId: productVariant.id,
          variantOptionId: option.id,
        },
      });

      await prisma.catalogVariantImage.create({
        data: {
          catalogVariantId: productVariant.id,
          imageId: mainImage.id,
        },
      });

      await prisma.catalogPricingOption.createMany({
        data: [
          {
            productCatalogVariantId: productVariant.id,
            qtyFrom: 1,
            qtyTo: 24,
            price: Number(input.basePrice) + sortOrder,
            sortOrder: 0,
          },
          {
            productCatalogVariantId: productVariant.id,
            qtyFrom: 25,
            qtyTo: 99,
            price: Number(input.basePrice) + sortOrder - 1,
            sortOrder: 1,
          },
          {
            productCatalogVariantId: productVariant.id,
            qtyFrom: 100,
            qtyTo: null,
            price: Math.max(Number(input.basePrice) + sortOrder - 2, 1),
            isOnward: true,
            sortOrder: 2,
          },
        ],
      });
    }

    for (const collection of input.collections) {
      await prisma.catalogProductCollection.upsert({
        where: {
          productId_collectionId: {
            productId: product.id,
            collectionId: collection.id,
          },
        },
        update: {},
        create: { productId: product.id, collectionId: collection.id },
      });
    }

    return product;
  }

  const simpleProducts = [
    [
      "premium-tee",
      "Premium Tee",
      categories[0],
      "standard-bulk-item",
      18,
      250,
      8,
    ],
    [
      "classic-hoodie",
      "Classic Hoodie",
      categories[0],
      "standard-bulk-item",
      32,
      150,
      22,
    ],
    ["dad-hat", "Dad Hat", categories[0], "standard-bulk-item", 16, 120, 5],
    [
      "ceramic-mug",
      "Ceramic Mug",
      categories[1],
      "us-only-product",
      14,
      90,
      14,
    ],
    [
      "stainless-bottle",
      "Stainless Bottle",
      categories[1],
      "standard-bulk-item",
      24,
      100,
      18,
    ],
    ["notebook", "Notebook", categories[2], "standard-bulk-item", 9, 300, 6],
  ];

  for (const [
    index,
    [slug, name, category, profileSlug, basePrice, baseStock, weightOz],
  ] of simpleProducts.entries()) {
    await upsertSimpleProduct(index + 1, {
      slug,
      name,
      categoryId: category.id,
      shippingProfileId: profileBySlug.get(profileSlug),
      shortDescription: `${name} short description`,
      description: `${name} long description for testing`,
      basePrice,
      compareAtPrice: Number(basePrice) + 4,
      baseStock,
      minQty: 1,
      weightOz,
      collections,
    });
  }

  const variantProducts = [
    {
      slug: "quarter-zip",
      name: "Quarter Zip",
      categoryId: categories[0].id,
      shippingProfileId: profileBySlug.get("standard-bulk-item"),
      shortDescription: `short description`,
      description: `long description for testing`,
      basePrice: 38,
      minQty: 1,
      weightOz: 24,
      collections,
      options: [
        { code: "black", label: "Black", colorHex: "#111111" },
        { code: "navy", label: "Navy", colorHex: "#1d3557" },
        { code: "gray", label: "Gray", colorHex: "#9ca3af" },
      ],
    },
    {
      slug: "performance-tee",
      name: "Performance Tee",
      categoryId: categories[0].id,
      shippingProfileId: profileBySlug.get("standard-bulk-item"),
      shortDescription: `short description`,
      description: `long description for testing`,
      basePrice: 22,
      minQty: 1,
      weightOz: 7,
      collections,
      options: [
        { code: "white", label: "White", colorHex: "#f8fafc" },
        { code: "blue", label: "Blue", colorHex: "#2563eb" },
        { code: "green", label: "Green", colorHex: "#16a34a" },
      ],
    },
    {
      slug: "travel-tumbler",
      name: "Travel Tumbler",
      categoryId: categories[1].id,
      shippingProfileId: profileBySlug.get("standard-bulk-item"),
      shortDescription: `short description`,
      description: `long description for testing`,
      basePrice: 26,
      minQty: 1,
      weightOz: 16,
      collections,
      options: [
        { code: "matte-black", label: "Matte Black", colorHex: "#111111" },
        { code: "stone", label: "Stone", colorHex: "#d6d3d1" },
      ],
    },
    {
      slug: "welcome-pack-box",
      name: "Welcome Pack Box",
      categoryId: categories[2].id,
      shippingProfileId: profileBySlug.get("standard-pack"),
      shortDescription: `short description`,
      description: `long description for testing`,
      basePrice: 42,
      minQty: 1,
      weightOz: 28,
      collections,
      options: [
        { code: "starter", label: "Starter", colorHex: "#f59e0b" },
        { code: "premium", label: "Premium", colorHex: "#8b5cf6" },
      ],
    },
  ];

  for (const [index, input] of variantProducts.entries()) {
    await upsertVariantProduct(index + 1, input);
  }

  await prisma.recipient.upsert({
    where: { id: "seed-recipient-1" },
    update: {
      userId: customerA.id,
      firstName: "Ava",
      lastName: "Receiver",
      email: "ava.receiver@example.com",
      phone: "+1 555 900 0001",
      addressLine1: "350 5th Ave",
      city: "New York",
      state: "NY",
      postalCode: "10118",
      countryCode: "US",
      countryName: "United States",
      isDefault: true,
    },
    create: {
      id: "seed-recipient-1",
      userId: customerA.id,
      firstName: "Ava",
      lastName: "Receiver",
      email: "ava.receiver@example.com",
      phone: "+1 555 900 0001",
      addressLine1: "350 5th Ave",
      city: "New York",
      state: "NY",
      postalCode: "10118",
      countryCode: "US",
      countryName: "United States",
      isDefault: true,
    },
  });

  await prisma.recipient.upsert({
    where: { id: "seed-recipient-2" },
    update: {
      userId: customerB.id,
      firstName: "Liam",
      lastName: "Receiver",
      email: "liam.receiver@example.com",
      phone: "+44 20 5555 0101",
      addressLine1: "221B Baker Street",
      city: "London",
      postalCode: "NW1 6XE",
      countryCode: "GB",
      countryName: "United Kingdom",
      isDefault: true,
    },
    create: {
      id: "seed-recipient-2",
      userId: customerB.id,
      firstName: "Liam",
      lastName: "Receiver",
      email: "liam.receiver@example.com",
      phone: "+44 20 5555 0101",
      addressLine1: "221B Baker Street",
      city: "London",
      postalCode: "NW1 6XE",
      countryCode: "GB",
      countryName: "United Kingdom",
      isDefault: true,
    },
  });

  console.log("Testing seed complete");
  console.log({
    admin: admin.email,
    employeeA: employeeA.email,
    employeeB: employeeB.email,
    customerA: customerA.email,
    customerB: customerB.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
