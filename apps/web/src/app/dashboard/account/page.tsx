"use client";

import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { KeyRound, Mail, Phone, ShieldCheck, User as UserIcon } from "lucide-react";
import { useMe } from "@/queries/auth";

function getInitial(email: string) {
  const c = (email?.trim()?.[0] ?? "U").toUpperCase();
  return /[A-Z0-9]/.test(c) ? c : "U";
}

function Field({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-divider p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-default-100 text-foreground/70">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-foreground/50">{label}</div>
        <div className="truncate font-medium">{value?.trim() ? value : "—"}</div>
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  const { data: user, isLoading } = useMe();

  if (isLoading || !user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading account..." />
      </main>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const initial = getInitial(user.email);
  const permissions = user.permissions ?? [];

  return (
    <main className="bg-background">
      <div className="flex max-w-4xl flex-col gap-6">
        <div>
          <h1 className="font-jakarta text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-sm text-foreground/60">
            Your profile details and access. Contact an administrator to change your role.
          </p>
        </div>

        {/* Identity */}
        <Card className="border border-divider shadow-sm">
          <CardBody className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-foreground text-2xl font-semibold text-background">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold">{fullName || user.email.split("@")[0]}</div>
                <div className="truncate text-sm text-foreground/60">{user.email}</div>
                <Chip size="sm" variant="flat" color="primary" className="mt-2">
                  {user.role}
                </Chip>
              </div>
            </div>

            <Button
              as={Link}
              href="/reset-password"
              variant="flat"
              startContent={<KeyRound className="h-4 w-4" />}
              className="rounded-2xl"
            >
              Change password
            </Button>
          </CardBody>
        </Card>

        {/* Profile details */}
        <Card className="border border-divider shadow-sm">
          <CardHeader className="p-6 pb-2">
            <div className="text-lg font-semibold">Profile</div>
          </CardHeader>
          <CardBody className="grid gap-4 p-6 pt-2 sm:grid-cols-2">
            <Field icon={<UserIcon className="h-5 w-5" />} label="First name" value={user.firstName} />
            <Field icon={<UserIcon className="h-5 w-5" />} label="Last name" value={user.lastName} />
            <Field icon={<Mail className="h-5 w-5" />} label="Email" value={user.email} />
            <Field icon={<Phone className="h-5 w-5" />} label="Phone" value={user.phone} />
          </CardBody>
        </Card>

        {/* Access */}
        <Card className="border border-divider shadow-sm">
          <CardHeader className="flex items-center justify-between p-6 pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-foreground/70" />
              <div className="text-lg font-semibold">Access &amp; permissions</div>
            </div>
            <Chip size="sm" variant="flat">
              {permissions.length} permissions
            </Chip>
          </CardHeader>
          <CardBody className="p-6 pt-2">
            {permissions.length ? (
              <div className="flex max-h-48 flex-wrap gap-2 overflow-auto">
                {permissions.map((p) => (
                  <Chip key={p} size="sm" variant="flat" className="font-mono text-xs">
                    {p}
                  </Chip>
                ))}
              </div>
            ) : (
              <div className="text-sm text-foreground/60">No permissions assigned.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
