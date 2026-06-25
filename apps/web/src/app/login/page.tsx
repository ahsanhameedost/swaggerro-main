"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Divider, Input } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { login } from "@/lib/auth";
import { AuthShell } from "@/app/components/auth/AuthShell";
import { Lock, Mail, ShieldCheck } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type FormValues = z.infer<typeof schema>;

function LoginContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [loading, setLoading] = useState(false);

  const defaultValues = useMemo<FormValues>(() => ({ email: "", password: "" }), []);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);

    try {
      const result = await login(values.email.trim(), values.password);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      addToast({
        title: "Welcome back",
        description: "Logged in successfully",
        color: "success"
      });
      // Sellers land on their own dashboard unless a specific destination was set.
      const hasExplicitNext = next && next !== "/dashboard";
      if (!hasExplicitNext && result?.user?.role === "Seller") {
        router.push("/seller");
      } else {
        router.push(next);
      }
    } catch (error: any) {
      addToast({
        title: "Login failed",
        description: error?.message ?? "Invalid credentials",
        color: "primary"
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <AuthShell
      eyebrow="Swaggeroo access"
      title="Sign in"
      description="Access your Swaggeroo dashboard, manage catalog operations, review orders, and continue project work from one place."
      sideTitle="Run swag operations with a faster admin experience."
      sideDescription="A cleaner entry point for the same platform you are building: admin control, catalog workflow, order review, and project handoff."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href={next && next !== "/dashboard" ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            className="font-medium text-primary transition hover:opacity-80"
          >
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          label="Email address"
          placeholder="you@company.com"
          startContent={<Mail className="size-4 text-foreground/45" />}
          isInvalid={!!errors.email}
          errorMessage={errors.email?.message}
          classNames={{
            inputWrapper:
              "h-14 rounded-2xl border border-divider bg-content1 shadow-none data-[hover=true]:border-primary/40 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-primary/20"
          }}
          {...register("email")}
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          type="password"
          startContent={<Lock className="size-4 text-foreground/45" />}
          isInvalid={!!errors.password}
          errorMessage={errors.password?.message}
          classNames={{
            inputWrapper:
              "h-14 rounded-2xl border border-divider bg-content1 shadow-none data-[hover=true]:border-primary/40 group-data-[focus=true]:border-primary group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-primary/20"
          }}
          {...register("password")}
        />

        <div className="flex items-center justify-end">

          <Link href="/reset-password" className="text-sm font-medium text-primary transition hover:opacity-80">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="h-12 w-full rounded-2xl text-base font-semibold text-white"
          style={{ backgroundImage: "var(--primary-gradient)" }}
        >
          Sign in
        </Button>
      </form>

      <Divider />
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}
