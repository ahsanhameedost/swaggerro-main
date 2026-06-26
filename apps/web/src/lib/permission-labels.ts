// Human-friendly labels + grouping for RBAC permission keys, so the dashboard
// shows "Manage Products" instead of "catalog.products.write".

export const PERMISSION_LABELS: Record<string, string> = {
  "profile.read": "View Profile",
  "profile.update": "Edit Profile",

  "catalog.categories.read": "View Categories",
  "catalog.categories.write": "Manage Categories",
  "catalog.collections.read": "View Collections",
  "catalog.collections.write": "Manage Collections",
  "catalog.products.read": "View Products",
  "catalog.products.write": "Manage Products",
  "catalog.orders.read": "View Orders",
  "catalog.orders.update": "Update Orders",

  "orders.self.read": "My Orders",
  "orders.assigned.read": "Assigned Orders",

  "design.read": "View Designs",
  "design.assigned.read": "Assigned Designs",
  "design.write": "Manage Designs",
  "design.approve": "Approve Designs",

  "inventory.read": "View Inventory",
  "inventory.assigned.read": "Assigned Inventory",
  "inventory.adjust": "Adjust Inventory",
  "inventory.self.read": "My Inventory",

  "recipients.read": "View Recipients",
  "recipients.write": "Manage Recipients",
  "recipients.self.read": "My Recipients",
  "recipients.self.write": "Edit My Recipients",

  "shipping.settings.read": "View Shipping Settings",
  "shipping.settings.write": "Manage Shipping Settings",
  "shipping.rates.read": "View Rates",
  "shipping.rates.write": "Manage Rates",
  "shipping.shipments.read": "View Shipments",
  "shipping.shipments.write": "Manage Shipments",
  "shipping.shipments.assigned.read": "Assigned Shipments",
  "shipping.shipments.assigned.write": "Update Assigned Shipments",
  "shipping.shipments.self.read": "My Shipments",
  "shipping.shipments.self.write": "Edit My Shipments",
  "shipping.estimate": "Shipping Estimates",
  "shipping.assigned.estimate": "Assigned Estimates",
  "shipping.self.estimate": "My Estimates",

  "contact.messages.read": "View Messages",
  "contact.messages.delete": "Delete Messages",

  "admin.users.read": "View Users",
  "admin.users.write": "Manage Users",
  "rbac.manage": "Manage Roles",

  "partners.applications.read": "View Seller Applications",
  "partners.applications.write": "Manage Seller Applications",
  "partners.stores.read": "View Stores",
  "partners.stores.write": "Manage Stores",

  "seller.store.read": "View My Store",
  "seller.store.write": "Manage My Store",
};

/** Friendly label for a permission key (falls back to a prettified key). */
export function permissionLabel(key: string): string {
  if (PERMISSION_LABELS[key]) return PERMISSION_LABELS[key];
  return key
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const GROUP_RULES: Array<{ test: (key: string) => boolean; group: string }> = [
  { test: (k) => k.startsWith("catalog.orders") || k.startsWith("orders."), group: "Orders" },
  { test: (k) => k.startsWith("catalog."), group: "Catalog" },
  { test: (k) => k.startsWith("design"), group: "Design" },
  { test: (k) => k.startsWith("inventory"), group: "Inventory" },
  { test: (k) => k.startsWith("recipients"), group: "Recipients" },
  { test: (k) => k.startsWith("shipping"), group: "Shipping" },
  { test: (k) => k.startsWith("contact"), group: "Messages" },
  { test: (k) => k.startsWith("admin.users"), group: "Users" },
  { test: (k) => k.startsWith("rbac"), group: "Roles & Access" },
  { test: (k) => k.startsWith("partners.applications"), group: "Seller Applications" },
  { test: (k) => k.startsWith("partners.stores"), group: "Stores" },
  { test: (k) => k.startsWith("seller."), group: "My Store" },
  { test: (k) => k.startsWith("profile"), group: "Account" },
];

/** Category a permission key belongs to, for grouped display. */
export function permissionGroup(key: string): string {
  return GROUP_RULES.find((rule) => rule.test(key))?.group ?? "Other";
}

/** Group an array of permission keys into ordered { group, keys } sections. */
export function groupPermissions(keys: string[]): Array<{ group: string; keys: string[] }> {
  const map = new Map<string, string[]>();
  for (const key of keys) {
    const group = permissionGroup(key);
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(key);
  }
  return Array.from(map.entries())
    .map(([group, groupKeys]) => ({ group, keys: groupKeys.sort() }))
    .sort((a, b) => a.group.localeCompare(b.group));
}
