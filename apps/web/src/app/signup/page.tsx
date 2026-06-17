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
import { AuthShell } from "@/app/components/auth/AuthShell";
import { signup } from "@/lib/auth";
import { isBusinessEmail } from "@/lib/business-email";
import {
  BriefcaseBusiness,
  Lock,
  Mail,
  Phone,
  User as UserIcon
} from "lucide-react";

const schema = z
  .object({
    firstName: z.string().trim().max(80).optional().or(z.literal("")),
    lastName: z.string().trim().max(80).optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    email: z.string().trim().email("Enter a valid email").refine(isBusinessEmail, {
      message: "Use your business email address"
    }),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

type FormValues = z.infer<typeof schema>;

function SignupContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [loading, setLoading] = useState(false);

  const defaultValues = useMemo<FormValues>(
    () => ({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: ""
    }),
    []
  );

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
      await signup({
        firstName: values.firstName?.trim() || undefined,
        lastName: values.lastName?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword
      });

      await queryClient.invalidateQueries({ queryKey: ["me"] });
      addToast({
        title: "Account created",
        description: "Welcome to Swaggeroo",
        color: "success"
      });
      router.push(next);
    } catch (error: any) {
      addToast({
        title: "Signup failed",
        description: error?.message ?? "Could not create account",
        color: "danger"
      });
    } finally {
      setLoading(false);
    }
  });

  const sharedInputClassNames = {
    inputWrapper:
      "h-14 rounded-2xl border border-divider bg-content1 shadow-none data-[hover=true]:border-danger/40 group-data-[focus=true]:border-danger group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-danger/20"
  };

  return (
    <AuthShell
      eyebrow="Create your account"
      title="Sign up"
      description="Create your Swaggeroo account with a valid business email address and start working from your dashboard."
      sideTitle="Start building a modern swag workflow."
      sideDescription="Launch with the same branded experience you already established on the contact page: bold, clean, and conversion focused."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-medium text-danger transition hover:opacity-80"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="First name"
            placeholder="John"
            startContent={<UserIcon className="size-4 text-foreground/45" />}
            isInvalid={!!errors.firstName}
            errorMessage={errors.firstName?.message}
            classNames={sharedInputClassNames}
            {...register("firstName")}
          />
          <Input
            label="Last name"
            placeholder="Doe"
            startContent={<UserIcon className="size-4 text-foreground/45" />}
            isInvalid={!!errors.lastName}
            errorMessage={errors.lastName?.message}
            classNames={sharedInputClassNames}
            {...register("lastName")}
          />
        </div>

        <Input
          label="Phone"
          placeholder="+92..."
          startContent={<Phone className="size-4 text-foreground/45" />}
          isInvalid={!!errors.phone}
          errorMessage={errors.phone?.message}
          classNames={sharedInputClassNames}
          {...register("phone")}
        />

        <Input
          label="Business email"
          placeholder="you@company.com"
          startContent={<BriefcaseBusiness className="size-4 text-foreground/45" />}
          isInvalid={!!errors.email}
          errorMessage={errors.email?.message}
          classNames={sharedInputClassNames}
          {...register("email")}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Password"
            placeholder="Create a password"
            type="password"
            startContent={<Lock className="size-4 text-foreground/45" />}
            isInvalid={!!errors.password}
            errorMessage={errors.password?.message}
            classNames={sharedInputClassNames}
            {...register("password")}
          />
          <Input
            label="Confirm password"
            placeholder="Confirm password"
            type="password"
            startContent={<Mail className="size-4 text-transparent" />}
            isInvalid={!!errors.confirmPassword}
            errorMessage={errors.confirmPassword?.message}
            classNames={sharedInputClassNames}
            {...register("confirmPassword")}
          />
        </div>

        <Button
          type="submit"
          isLoading={loading}
          className="h-12 w-full rounded-2xl text-base font-semibold text-white"
          style={{ backgroundImage: "var(--primary-gradient)" }}
        >
          Create account
        </Button>
      </form>

      <Divider />
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <SignupContent />
    </Suspense>
  );
}
