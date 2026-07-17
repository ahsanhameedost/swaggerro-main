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
    key: "swag-packs",
    label: "My Swag Packs",
    href: "/dashboard/swag-packs",
    icon: "Gift",
    requiredAnyPermissions: ["orders.self.read"]
  },
  {
    key: "tracking",
    label: "Order Tracking",
    href: "/dashboard/tracking",
    icon: "Truck",
    requiredAnyPermissions: ["orders.self.read"]
  },
  {
    key: "recipients",
    label: "Recipients",
    href: "/dashboard/recipients",
    icon: "ContactRound",
    // Staff-only in the sidebar — customers manage recipients inside the shipping
    // flow, so recipients.self.read intentionally does NOT surface this nav item.
    requiredAnyPermissions: ["recipients.read"]
  },
  {
    key: "inventory",
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: "Boxes",
    // Staff-only in the sidebar — customers don't manage warehouse inventory, so
    // inventory.self.read intentionally does NOT surface this nav item.
    requiredAnyPermissions: ["inventory.read", "inventory.assigned.read"]
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
    key: "partners",
    label: "Seller Applications",
    href: "/dashboard/partners",
    icon: "Store",
    requiredPermissions: ["partners.applications.read"]
  },
  {
    key: "stores",
    label: "Stores",
    href: "/dashboard/stores",
    icon: "Building2",
    requiredPermissions: ["partners.stores.read"]
  },
  {
    key: "payouts",
    label: "Payouts",
    href: "/dashboard/payouts",
    icon: "Wallet",
    requiredPermissions: ["partners.stores.read"]
  },
  {
    key: "finance",
    label: "Finance",
    href: "/dashboard/finance",
    icon: "Landmark",
    // Admin-only financial hub: needs both platform revenue access and
    // store/payout access, so only full admins see it.
    requiredPermissions: ["catalog.orders.read", "partners.stores.read"]
  },
  {
    key: "permissions",
    label: "Permissions",
    href: "/dashboard/permissions",
    icon: "Settings",
    requiredPermissions: ["rbac.manage"]
  },
  {
    key: "settings",
    label: "Platform Settings",
    href: "/dashboard/settings",
    icon: "Settings2",
    requiredPermissions: ["settings.read"]
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

// A design-team member works only out of the Designs queue. They hold design
// permissions but not full order/catalog-management access (catalog.orders.read),
// which is what managers/admins/support have. Keep their sidebar focused on
// Designs — they still reach orders through the Designs queue, which uses
// orders.assigned.read behind the scenes.
const DESIGN_PERMISSIONS = ["design.read", "design.assigned.read", "design.write"];
const DESIGN_ONLY_NAV_KEYS = ["dashboard", "designs"];

function isDesignOnlyUser(permissions: Set<string>) {
  return (
    DESIGN_PERMISSIONS.some((permission) => permissions.has(permission)) &&
    !permissions.has("catalog.orders.read")
  );
}

export function buildNavForUser(user: User | null) {
  const permissions = new Set(user?.permissions ?? []);

  const items = isDesignOnlyUser(permissions)
    ? NAV_ITEMS.filter((item) => DESIGN_ONLY_NAV_KEYS.includes(item.key))
    : NAV_ITEMS;

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

  return items.map(filterItem).filter(Boolean) as NavItem[];
}
