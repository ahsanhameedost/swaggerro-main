"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "../components/dashboard/app-shell";
import { useMe } from "@/queries/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading } = useMe();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login?next=/dashboard");
  }, [isLoading, user, router]);

  if (isLoading) return <main className="min-h-screen bg-background" />;
  if (!user) return <main className="min-h-screen bg-background" />;

  return <AppShell user={user}>{children}</AppShell>;
}
