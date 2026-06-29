"use client";

import { useState } from "react";
import Link from "next/link";
import { addToast } from "@heroui/toast";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { changePassword } from "@/modules/auth/api";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 pl-9 text-sm outline-none transition focus-visible:border-ring";

export function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!current) errs.current = "Enter your current password";
    if (next.length < 8) errs.next = "New password must be at least 8 characters";
    if (confirm !== next) errs.confirm = "Passwords do not match";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      addToast({ title: "Password changed", description: "Your password has been updated.", color: "success" });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (error: any) {
      addToast({ title: "Couldn't change password", description: error?.message ?? "Try again.", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-primary">
          <KeyRound className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">Change password</h2>
          <p className="text-sm text-muted-foreground">Update the password you use to sign in.</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 max-w-md space-y-4">
        <PwField label="Current password" value={current} onChange={setCurrent} error={errors.current} />
        <PwField label="New password" value={next} onChange={setNext} error={errors.next} />
        <PwField label="Confirm new password" value={confirm} onChange={setConfirm} error={errors.confirm} />

        <div className="flex items-center justify-between gap-3 pt-1">
          <Link href="/reset-password" className="text-sm font-medium text-primary hover:underline">
            Forgot your password?
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brand transition hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}

function PwField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="relative mt-1.5">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="password"
          className={cn(inputClass, error && "border-destructive")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error ? <p className="mt-1 text-xs font-medium text-destructive">{error}</p> : null}
    </label>
  );
}
