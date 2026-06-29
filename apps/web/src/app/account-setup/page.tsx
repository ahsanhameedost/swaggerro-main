"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addToast } from "@heroui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Lock, Store, User2 } from "lucide-react";
import { completeAccountSetup, verifyAccountSetup } from "@/lib/auth";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring";

function AccountSetupContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string; confirm?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setVerifyError("This setup link is missing its token.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await verifyAccountSetup(token);
        if (!cancelled) setEmail(res.email);
      } catch (error: any) {
        if (!cancelled) setVerifyError(error?.message ?? "This setup link is invalid or has expired.");
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const validate = () => {
    const next: typeof errors = {};
    if (username.trim().length < 3) next.username = "Username must be at least 3 characters";
    else if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim()))
      next.username = "Use letters, numbers, dot, dash or underscore";
    if (password.length < 8) next.password = "Password must be at least 8 characters";
    if (confirm !== password) next.confirm = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await completeAccountSetup({ token, username: username.trim(), password });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      addToast({ title: "Account ready", description: "Welcome to your seller dashboard.", color: "success" });
      router.push("/seller");
    } catch (error: any) {
      addToast({ title: "Setup failed", description: error?.message ?? "Please try again.", color: "danger" });
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Verifying your setup link…
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-9" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold">Setup link problem</h1>
        <p className="mt-3 text-muted-foreground">{verifyError}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Please use the most recent email we sent you, or contact support.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-1.5 rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="swag-redesign mx-auto max-w-md px-6 py-14">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-primary">
          <Store className="size-3.5" /> Seller account setup
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Set up your account</h1>
        <p className="mt-2 text-muted-foreground">
          Your application was approved. Verify your email and choose a username and password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-success" />
          <span className="truncate">Email verified: <span className="font-medium">{email}</span></span>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Username</span>
          <div className="relative mt-1.5">
            <User2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cn(inputClass, "pl-9", errors.username && "border-destructive")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="acme-team"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          {errors.username ? <p className="mt-1 text-xs font-medium text-destructive">{errors.username}</p> : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Password</span>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              className={cn(inputClass, "pl-9", errors.password && "border-destructive")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          {errors.password ? <p className="mt-1 text-xs font-medium text-destructive">{errors.password}</p> : null}
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Confirm password</span>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              className={cn(inputClass, "pl-9", errors.confirm && "border-destructive")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
            />
          </div>
          {errors.confirm ? <p className="mt-1 text-xs font-medium text-destructive">{errors.confirm}</p> : null}
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Finish setup &amp; open dashboard
        </button>
      </form>
    </div>
  );
}

export default function AccountSetupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <AccountSetupContent />
    </Suspense>
  );
}
