
"use client";

import { useDeferredValue, useState } from "react";
import {
  Card,
  CardBody,
  Chip,
  Input,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow
} from "@heroui/react";
import { Search } from "lucide-react";
import { useMe } from "@/queries/auth";
import { useUsers } from "@/lib/queries.catalog";

export default function UsersPage() {
  const { data: me } = useMe();
  const canRead = !!me?.permissions?.includes("admin.users.read");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: users = [], isLoading, isError, error } = useUsers({ search: deferredSearch });

  if (!canRead) {
    return (
      <Card>
        <CardBody>You do not have permission to view users.</CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-2 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-foreground/60">View signed up users and seeded admins.</p>
        </CardBody>
      </Card>

      <Card className="border border-divider shadow-sm">
        <CardBody className="border-b border-divider px-6 py-5">
          <Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search users"
            startContent={<Search className="size-4 text-foreground/40" />}
            className="w-full md:max-w-sm"
          />
        </CardBody>

        <CardBody className="p-0">
          <Table removeWrapper aria-label="Users table">
            <TableHeader>
              <TableColumn>User</TableColumn>
              <TableColumn>Role</TableColumn>
              <TableColumn>Phone</TableColumn>
              <TableColumn>Joined</TableColumn>
            </TableHeader>
            <TableBody
              isLoading={isLoading}
              loadingContent={<Spinner label="Loading users..." />}
              emptyContent="No users found."
            >
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed user"}
                      </div>
                      <div className="text-xs text-foreground/50">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {user.role.name}
                    </Chip>
                  </TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {isError ? (
            <div className="border-t border-divider px-6 py-4 text-sm text-danger">
              {error instanceof Error ? error.message : "Failed to load users."}
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
