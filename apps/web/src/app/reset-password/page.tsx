"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Chip, Divider, Input } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthShell } from "@/app/components/auth/AuthShell";
import { OtpCodeInput } from "@/app/components/auth/OtpCodeInput";
import {
  requestPasswordReset,
  resetPasswordWithCode,
  verifyPasswordResetCode
} from "@/lib/auth";
import { Lock, Mail, RefreshCcw, ShieldCheck } from "lucide-react";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address")
});

const passwordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type Step = "request" | "verify" | "reset";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const emailDefaults = useMemo<EmailFormValues>(() => ({ email: "" }), []);
  const passwordDefaults = useMemo<PasswordFormValues>(
    () => ({ password: "", confirmPassword: "" }),
    []
  );

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors }
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: emailDefaults
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: passwordDefaults
  });

  const submitEmail = handleSubmitEmail(async (values) => {
    setIsRequesting(true);

    try {
      const response = await requestPasswordReset(values.email.trim());
      setEmail(response.email);
      setCode("");
      setStep("verify");
      addToast({
        title: "Code sent",
        description: "Check your email for the 6-digit code.",
        color: "success"
      });
    } catch (error: any) {
      addToast({
        title: "Could not continue",
        description: error?.message ?? "Failed to send reset code",
        color: "danger"
      });
    } finally {
      setIsRequesting(false);
    }
  });

  const handleVerify = async () => {
    setIsVerifying(true);

    try {
      await verifyPasswordResetCode(email, code);
      setStep("reset");
      addToast({
        title: "Code verified",
        description: "Set your new password.",
        color: "success"
      });
    } catch (error: any) {
      addToast({
        title: "Verification failed",
        description: error?.message ?? "Invalid or expired code",
        color: "danger"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const submitPassword = handleSubmitPassword(async (values) => {
    setIsResetting(true);

    try {
      await resetPasswordWithCode({
        email,
        code,
        password: values.password,
        confirmPassword: values.confirmPassword
      });

      addToast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
        color: "success"
      });

      window.location.href = "/login";
    } catch (error: any) {
      addToast({
        title: "Update failed",
        description: error?.message ?? "Could not update password",
        color: "danger"
      });
    } finally {
      setIsResetting(false);
    }
  });

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset password"
      description="Verify your email, confirm the 6-digit code, then create a new password."
      sideTitle="Recover access without losing momentum."
      sideDescription="A clean recovery flow with a short-lived verification code, clear steps, and the same SOASWAG visual language."
      footer={
        <>
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-danger transition hover:opacity-80">
            Go to login
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "request", label: "1. Email" },
            { key: "verify", label: "2. Verify" },
            { key: "reset", label: "3. New password" }
          ].map((item) => (
            <Chip
              key={item.key}
              variant={step === item.key ? "solid" : "flat"}
              classNames={{
                base:
                  step === item.key
                    ? "border border-danger/20 text-white"
                    : "border border-divider bg-content1 text-foreground/65"
              }}
              style={step === item.key ? { backgroundImage: "var(--primary-gradient)" } : undefined}
            >
              {item.label}
            </Chip>
          ))}
        </div>

        {step === "request" ? (
          <form className="space-y-4" onSubmit={submitEmail}>
            <Input
              label="Email address"
              placeholder="you@company.com"
              startContent={<Mail className="size-4 text-foreground/45" />}
              isInvalid={!!emailErrors.email}
              errorMessage={emailErrors.email?.message}
              classNames={{
                inputWrapper:
                  "h-14 rounded-2xl border border-divider bg-content1 shadow-none data-[hover=true]:border-danger/40 group-data-[focus=true]:border-danger group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-danger/20"
              }}
              {...registerEmail("email")}
            />

            <Button
              type="submit"
              isLoading={isRequesting}
              className="h-12 w-full rounded-2xl text-base font-semibold text-white"
              style={{ backgroundImage: "var(--primary-gradient)" }}
            >
              Continue
            </Button>
          </form>
        ) : null}

        {step === "verify" ? (
          <Card className="border border-divider bg-content1 shadow-none">
            <CardBody className="space-y-4 p-5">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Enter verification code</div>
                <div className="text-sm text-foreground/60">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 10 minutes.
                </div>
              </div>

              <OtpCodeInput value={code} onChange={setCode} isDisabled={isVerifying} />

              <div className="flex flex-wrap gap-3">
                <Button
                  onPress={handleVerify}
                  isLoading={isVerifying}
                  isDisabled={code.length !== 6}
                  className="h-12 rounded-2xl px-6 font-semibold text-white"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                >
                  Verify code
                </Button>

                <Button
                  variant="flat"
                  startContent={<RefreshCcw className="size-4" />}
                  onPress={() => {
                    setStep("request");
                    setCode("");
                  }}
                >
                  Use another email
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {step === "reset" ? (
          <form className="space-y-4" onSubmit={submitPassword}>
            <div className="rounded-3xl border border-danger/10 bg-danger/5 p-4 text-sm text-foreground/70">
              Code verified for <span className="font-medium text-foreground">{email}</span>.
            </div>

            <Input
              label="New password"
              placeholder="Create a new password"
              type="password"
              startContent={<Lock className="size-4 text-foreground/45" />}
              isInvalid={!!passwordErrors.password}
              errorMessage={passwordErrors.password?.message}
              classNames={{
                inputWrapper:
                  "h-14 rounded-2xl border border-divider bg-content1 shadow-none data-[hover=true]:border-danger/40 group-data-[focus=true]:border-danger group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-danger/20"
              }}
              {...registerPassword("password")}
            />

            <Input
              label="Confirm new password"
              placeholder="Confirm your new password"
              type="password"
              startContent={<ShieldCheck className="size-4 text-foreground/45" />}
              isInvalid={!!passwordErrors.confirmPassword}
              errorMessage={passwordErrors.confirmPassword?.message}
              classNames={{
                inputWrapper:
                  "h-14 rounded-2xl border border-divider bg-content1 shadow-none data-[hover=true]:border-danger/40 group-data-[focus=true]:border-danger group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-danger/20"
              }}
              {...registerPassword("confirmPassword")}
            />

            <Button
              type="submit"
              isLoading={isResetting}
              className="h-12 w-full rounded-2xl text-base font-semibold text-white"
              style={{ backgroundImage: "var(--primary-gradient)" }}
            >
              Save new password
            </Button>
          </form>
        ) : null}
      </div>

      <Divider />
    </AuthShell>
  );
}
