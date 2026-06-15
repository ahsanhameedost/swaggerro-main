import type { User } from "@/lib/auth";

export type NavItem = {
  key: string;
  label: string;
  href?: string;
  icon?: string;
  requiredPermissions?: string[];
  requiredAnyPermissions?: string[];
  children?: NavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  {
    key: "catalog",
    label: "Catalog",
    icon: "Tags",
    requiredPermissions: ["catalog.categories.read"],
    children: [
      {
        key: "catalog-categories",
        label: "Categories",
        href: "/dashboard/catalog/categories",
        requiredPermissions: ["catalog.categories.read"]
      },
      {
        key: "catalog-collections",
        label: "Collections",
        href: "/dashboard/catalog/collections",
        requiredPermissions: ["catalog.collections.read"]
      },
      {
        key: "catalog-products",
        label: "Products",
        href: "/dashboard/catalog/products",
        requiredPermissions: ["catalog.products.read"]
      }
    ]
  },
  {
    key: "orders",
    label: "Orders",
    href: "/dashboard/orders",
    icon: "ShoppingCart",
    requiredAnyPermissions: ["catalog.orders.read", "orders.assigned.read", "orders.self.read"]
  },
  {
    key: "designs",
    label: "Designs",
    href: "/dashboard/designs",
    icon: "Palette",
    requiredAnyPermissions: ["design.read", "design.assigned.read", "orders.self.read"]
  },
  {
    key: "recipients",
    label: "Recipients",
    href: "/dashboard/recipients",
    icon: "ContactRound",
    requiredAnyPermissions: ["recipients.read", "recipients.self.read"]
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: "Boxes",
    requiredAnyPermissions: ["inventory.read", "inventory.assigned.read", "inventory.self.read"]
  },
  {
    key: "shipments",
    label: "Shipments",
    href: "/dashboard/shipments",
    icon: "Truck",
    requiredAnyPermissions: ["shipping.shipments.read", "shipping.shipments.assigned.read", "shipping.shipments.self.read"]
  },
  {
    key: "shipping",
    label: "Shipping Settings",
    href: "/dashboard/shipping",
    icon: "Map",
    requiredPermissions: ["shipping.settings.read"]
  },
  {
    key: "users",
    label: "Users",
    icon: "Users",
    requiredPermissions: ["admin.users.read"],
    children: [
      {
        key: "users-all",
        label: "All Users",
        href: "/dashboard/users",
        requiredPermissions: ["admin.users.read"]
      },
      {
        key: "employees",
        label: "Employees",
        href: "/dashboard/employees",
        requiredPermissions: ["admin.users.read"]
      }
    ]
  },
  {
    key: "contact-messages",
    label: "Contact Messages",
    href: "/dashboard/contact-messages",
    icon: "Mail",
    requiredPermissions: ["contact.messages.read"]
  },
  {
    key: "permissions",
    label: "Permissions",
    href: "/dashboard/permissions",
    icon: "Settings",
    requiredPermissions: ["rbac.manage"]
  }
];

function hasAllPermissions(permissions: Set<string>, requiredPermissions?: string[]) {
  if (!requiredPermissions?.length) return true;
  return requiredPermissions.every((permission) => permissions.has(permission));
}

function hasAnyPermission(permissions: Set<string>, requiredAnyPermissions?: string[]) {
  if (!requiredAnyPermissions?.length) return true;
  return requiredAnyPermissions.some((permission) => permissions.has(permission));
}

export function buildNavForUser(user: User | null) {
  const permissions = new Set(user?.permissions ?? []);

  const filterItem = (item: NavItem): NavItem | null => {
    if (!hasAllPermissions(permissions, item.requiredPermissions)) {
      return null;
    }

    if (!hasAnyPermission(permissions, item.requiredAnyPermissions)) {
      return null;
    }

    if (item.children?.length) {
      const children = item.children.map(filterItem).filter(Boolean) as NavItem[];
      if (!children.length && !item.href) {
        return null;
      }
      return { ...item, children };
    }

    return item;
  };

  return NAV_ITEMS.map(filterItem).filter(Boolean) as NavItem[];
}
