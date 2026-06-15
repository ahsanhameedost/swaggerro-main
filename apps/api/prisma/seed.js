require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "profile.read", description: "Read own profile" },
  { key: "profile.update", description: "Update own profile" },

  { key: "catalog.categories.read", description: "Read catalog categories" },
  { key: "catalog.categories.write", description: "Manage catalog categories" },
  { key: "catalog.collections.read", description: "Read catalog collections" },
  { key: "catalog.collections.write", description: "Manage catalog collections" },
  { key: "catalog.products.read", description: "Read catalog products" },
  { key: "catalog.products.write", description: "Manage catalog products" },
  { key: "catalog.orders.read", description: "Read all team orders" },
  { key: "catalog.orders.update", description: "Update team order status" },

  { key: "orders.self.read", description: "Read own orders" },
  { key: "orders.assigned.read", description: "Read assigned orders" },

  { key: "design.read", description: "Read all design jobs" },
  { key: "design.assigned.read", description: "Read assigned design jobs" },
  { key: "design.write", description: "Manage design jobs" },
  { key: "design.approve", description: "Approve designs" },

  { key: "inventory.read", description: "Read all inventory" },
  { key: "inventory.assigned.read", description: "Read assigned inventory" },
  { key: "inventory.adjust", description: "Adjust inventory" },
  { key: "inventory.self.read", description: "Read own inventory" },

  { key: "recipients.read", description: "Read all recipients" },
  { key: "recipients.write", description: "Manage all recipients" },
  { key: "recipients.self.read", description: "Read own recipients" },
  { key: "recipients.self.write", description: "Manage own recipients" },

  { key: "shipping.settings.read", description: "Read shipping settings" },
  { key: "shipping.settings.write", description: "Manage shipping settings" },
  { key: "shipping.rates.read", description: "Read shipping rates" },
  { key: "shipping.rates.write", description: "Manage shipping rates" },
  { key: "shipping.shipments.read", description: "Read all shipments" },
  { key: "shipping.shipments.write", description: "Manage all shipments" },
  { key: "shipping.shipments.assigned.read", description: "Read assigned shipments" },
  { key: "shipping.shipments.assigned.write", description: "Manage assigned shipments" },
  { key: "shipping.shipments.self.read", description: "Read own shipments" },
  { key: "shipping.shipments.self.write", description: "Manage own shipments" },
  { key: "shipping.estimate", description: "Estimate any shipment" },
  { key: "shipping.assigned.estimate", description: "Estimate assigned shipment" },
  { key: "shipping.self.estimate", description: "Estimate own shipment" },

  { key: "contact.messages.read", description: "Read contact submissions" },
  { key: "contact.messages.delete", description: "Delete contact submissions" },

  { key: "admin.users.read", description: "Read users" },
  { key: "admin.users.write", description: "Manage users" },

  { key: "rbac.manage", description: "Manage RBAC" }
];

const SYSTEM_ROLE_NAMES = ["SUPER_ADMIN", "USER"];

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: PERMISSIONS.map((permission) => permission.key),
  USER: [
    "profile.read",
    "profile.update",
    "orders.self.read",
    "inventory.self.read",
    "recipients.self.read",
    "recipients.self.write",
    "shipping.shipments.self.read",
    "shipping.shipments.self.write",
    "shipping.self.estimate"
  ]
};

async function seedPermissionsAndRoles() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission
    });
  }

  for (const name of SYSTEM_ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name },
      update: {
        description: name.replaceAll("_", " ")
      },
      create: {
        name,
        description: name.replaceAll("_", " ")
      }
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  for (const roleName of SYSTEM_ROLE_NAMES) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;

    const desiredPermissionIds = (ROLE_PERMISSIONS[roleName] || [])
      .map((key) => permissionByKey.get(key))
      .filter(Boolean);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (desiredPermissionIds.length) {
      await prisma.rolePermission.createMany({
        data: desiredPermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId
        })),
        skipDuplicates: true
      });
    }
  }
}

async function seedSuperAdmin() {
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  const passwordHash = bcrypt.hashSync("Admin@12345", 12);

  await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      roleId: superAdminRole.id
    },
    create: {
      email: "superadmin@example.com",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      roleId: superAdminRole.id
    }
  });
}

async function main() {
  await seedPermissionsAndRoles();
  await seedSuperAdmin();
  console.log("Base seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
