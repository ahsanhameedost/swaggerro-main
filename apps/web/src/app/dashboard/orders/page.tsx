"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip
} from "@heroui/react";
import { Search } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useEmployees } from "@/queries/users";
import {
  useAssignCatalogOrderEmployee,
  useCatalogOrders,
  useUpdateCatalogOrderStatus
} from "@/lib/queries.catalog";
import { DataPagination } from "@/app/components/dashboard/shared/DataPagination";
import { addToast } from "@heroui/toast";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUSES, buildUserDisplayName, formatOrderTypeLabel } from "@/lib/order-flow";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

export default function OrdersPage() {
  const { data: user } = useMe();
  const isCustomer = hasPermission(user, "orders.self.read");
  const canRead = hasAnyPermission(user, ["catalog.orders.read", "orders.assigned.read", "orders.self.read"]);
  const canUpdate = hasPermission(user, "catalog.orders.update");
  const canAssign = hasPermission(user, "admin.users.write");
  const isAssignedTeamView =
    hasPermission(user, "orders.assigned.read") && !hasPermission(user, "catalog.orders.read");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const deferredSearch = useDeferredValue(search);
  const query = useMemo(
    () => ({
      search: deferredSearch || undefined,
      status: (status || undefined) as any,
      assignedEmployeeId: assignedEmployeeId || undefined,
      page,
      pageSize
    }),
    [deferredSearch, status, assignedEmployeeId, page, pageSize]
  );

  const { data, isLoading, isFetching, isError, error } = useCatalogOrders(query, canRead);
  const { data: employees = [] } = useEmployees("", canAssign);
  const updateMutation = useUpdateCatalogOrderStatus();
  const assignMutation = useAssignCatalogOrderEmployee();

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page, pageSize, total: 0, totalPages: 1 };

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view orders.</CardBody>
      </Card>
    );
  }

  const assigneeOptions = [
    { key: "__all__", label: "All assignees" },
    { key: "__unassigned__", label: "Manage myself" },
    ...employees.map((employee) => ({
      key: String(employee.id),
      label: buildUserDisplayName({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email
      })
    }))
  ];

  const employeeAssignmentOptions = [
    { key: "__unassigned__", label: "Manage myself" },
    ...employees.map((employee) => ({
      key: String(employee.id),
      label: buildUserDisplayName({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email
      })
    }))
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-2 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isCustomer ? "My Orders" : "Submitted Orders"}
          </h1>
          <p className="text-sm text-foreground/60">
            {isCustomer
              ? "Track your submitted swag requests, review summaries, and continue to checkout once every product is approved."
              : isAssignedTeamView
                ? "Review the swag requests currently assigned to you and keep design and shipment work moving."
                : "Review submitted swag requests, assign designers, and manage approvals."}
          </p>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody
          className={[
            "flex flex-col gap-4 border-b border-divider px-6 py-5",
            isCustomer ? "xl:flex-row xl:items-center xl:justify-between" : "2xl:flex-row 2xl:items-center 2xl:justify-between"
          ].join(" ")}
        >
          <Input
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={isCustomer ? "Search by order id or product name" : "Search by customer, company, or project"}
            startContent={<Search className="size-4 text-foreground/40" />}
            className="w-full xl:max-w-sm"
          />

          <div className="flex w-full flex-col gap-4 xl:flex-row xl:justify-end">
            <Select
              label="Status"
              selectedKeys={status ? [status] : []}
              onSelectionChange={(keys) => {
                setStatus(Array.from(keys as Set<string>)[0] ?? "");
                setPage(1);
              }}
              className="w-full xl:max-w-xs"
            >
              {ORDER_STATUSES.map((value) => (
                <SelectItem key={value}>{value}</SelectItem>
              ))}
            </Select>

            {
              !isCustomer && canAssign ? (
                <Select
                  label="Assignee"
                  selectedKeys={[assignedEmployeeId || "__all__"]}
                  onSelectionChange={(keys) => {
                    const next = Array.from(keys as Set<React.Key>)[0]?.toString() ?? "__all__";
                    setAssignedEmployeeId(next === "__all__" ? "" : next);
                    setPage(1);
                  }}
                  className="w-full xl:max-w-xs"
                >
                  {assigneeOptions.map((option) => (
                    <SelectItem key={option.key}>{option.label}</SelectItem>
                  ))}
                </Select>
              ) : null
            }
          </div>
        </CardBody>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Orders table">
            <TableHeader>
              <TableColumn>{isCustomer ? "Order" : "Customer"}</TableColumn>
              <TableColumn>{isCustomer ? "Submitted" : "Project"}</TableColumn>
              <TableColumn>Type</TableColumn>
              <TableColumn>Status</TableColumn>
              <TableColumn>Assignee</TableColumn>
              <TableColumn>Total</TableColumn>
              <TableColumn>{isCustomer ? "Approval" : "Items"}</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading || isFetching}
              loadingContent={<Spinner label="Loading orders..." />}
              emptyContent="No orders found."
            >
              {items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{isCustomer ? `Order #${order.id}` : order.name}</div>
                      <div className="text-xs text-foreground/50">{order.email}</div>
                      {!isCustomer ? (
                        <div className="text-xs text-foreground/50">{order.companyName || "-"}</div>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {order.project?.swagPackName || order.project?.name || "-"}
                      </div>
                      <div className="text-xs text-foreground/50">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {formatOrderTypeLabel(order.type)}
                    </Chip>
                  </TableCell>

                  <TableCell>
                    {canUpdate && !isCustomer ? (
                      <Select
                        selectedKeys={[order.status]}
                        onSelectionChange={async (keys) => {
                          const next = Array.from(keys as Set<string>)[0] as (typeof ORDER_STATUSES)[number];
                          try {
                            await updateMutation.mutateAsync({ id: order.id, status: next });
                            addToast({ title: "Order updated", color: "success" });
                          } catch (e: any) {
                            addToast({
                              title: "Update failed",
                              description: e?.message ?? "Could not update order.",
                              color: "danger"
                            });
                          }
                        }}
                        className="min-w-[180px]"
                      >
                        {ORDER_STATUSES.map((value) => (
                          <SelectItem key={value}>{value}</SelectItem>
                        ))}
                      </Select>
                    ) : (
                      <Chip size="sm" variant="flat">
                        {order.status}
                      </Chip>
                    )}
                  </TableCell>

                  <TableCell>
                    {
                      !isCustomer ? (
                        canAssign ? (
                          <Select
                            placeholder="Manage myself"
                            selectedKeys={order.assignedEmployee ? [String(order.assignedEmployee.id)] : []}
                            onSelectionChange={async (keys) => {
                              const raw = Array.from(keys as Set<React.Key>)[0]?.toString() ?? null;
                              const next = raw === "__unassigned__" ? null : raw;

                              try {
                                await assignMutation.mutateAsync({
                                  id: order.id,
                                  assignedEmployeeId: next
                                });
                                addToast({
                                  title: "Assignee updated",
                                  color: "success"
                                });
                              } catch (e: any) {
                                addToast({
                                  title: "Assignment failed",
                                  description: e?.message ?? "Could not assign employee.",
                                  color: "danger"
                                });
                              }
                            }}
                            className="min-w-[220px]"
                          >
                            {employeeAssignmentOptions.map((option) => (
                              <SelectItem key={option.key}>{option.label}</SelectItem>
                            ))}
                          </Select>
                        ) : (
                          <span className="text-sm text-foreground/60">
                            {order.assignedEmployee
                              ? buildUserDisplayName(order.assignedEmployee)
                              : "Manage myself"}
                          </span>
                        )
                      ) : null
                    }
                  </TableCell>

                  <TableCell>{formatMoney(order.totalDue, order.currency)}</TableCell>

                  <TableCell>
                    {isCustomer ? (
                      <Tooltip
                        content={
                          order.allItemsReadyToOrder
                            ? "All products are approved and ready for checkout."
                            : "You can proceed with the Request once all the Products are Approved."
                        }
                      >
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                            order.allItemsReadyToOrder
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning"
                          ].join(" ")}
                        >
                          {order.allItemsReadyToOrder ? "Ready to continue" : "Waiting on approvals"}
                        </span>
                      </Tooltip>
                    ) : (
                      order.itemCount
                    )}
                  </TableCell>

                  <TableCell>
                    <Link href={`/dashboard/orders/${order.id}`}>
                      <Button size="sm" variant="bordered">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-divider px-6 py-4">
            <div className="text-sm text-foreground/60">
              Showing {items.length} of {pagination.total} orders
            </div>
            <DataPagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalPages={pagination.totalPages}
              disabled={isLoading || isFetching}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Failed to load orders."}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
