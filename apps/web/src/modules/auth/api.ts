
import { apiFetch } from "@/lib/api";
import type { User } from "./types";

export async function signup(input: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  return apiFetch<{ user: User }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function requestPasswordReset(email: string) {
  return apiFetch<{ ok: true; email: string; expiresInSeconds: number }>("/auth/forgot-password/request", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function verifyPasswordResetCode(email: string, code: string) {
  return apiFetch<{ ok: true; expiresAt: string }>("/auth/forgot-password/verify", {
    method: "POST",
    body: JSON.stringify({ email, code })
  });
}

export async function resetPasswordWithCode(input: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}) {
  return apiFetch<{ ok: true }>("/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function login(email: string, password: string) {
  return apiFetch<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function me() {
  return apiFetch<{ user: User | null }>("/auth/me", { method: "GET" });
}

export async function logout() {
  return apiFetch<{ ok: true }>("/auth/logout", { method: "POST" });
}
