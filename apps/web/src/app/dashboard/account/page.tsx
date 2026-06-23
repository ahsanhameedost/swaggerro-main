"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader, Chip, Input, Spinner } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Camera, KeyRound, Loader2, Mail, Phone, ShieldCheck, User as UserIcon } from "lucide-react";
import { useMe, useUpdateProfile } from "@/queries/auth";
import { createCatalogImageUpload, uploadFileToPresignedUrl } from "@/lib/catalog";

const SUPER_ADMIN_ROLE = "SUPER_ADMIN";
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function getInitial(email: string) {
  const c = (email?.trim()?.[0] ?? "U").toUpperCase();
  return /[A-Z0-9]/.test(c) ? c : "U";
}

export default function AccountSettingsPage() {
  const { data: user, isLoading } = useMe();
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Seed the form once the user loads (and whenever the server copy changes).
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

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
  const isSuperAdmin = user.role === SUPER_ADMIN_ROLE;
  // Mirrors the API guard on PATCH /auth/me — only users with this permission may edit.
  const canEdit = permissions.includes("profile.update");

  const dirty =
    firstName.trim() !== (user.firstName ?? "").trim() ||
    lastName.trim() !== (user.lastName ?? "").trim() ||
    email.trim().toLowerCase() !== (user.email ?? "").trim().toLowerCase() ||
    phone.trim() !== (user.phone ?? "").trim();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSave =
    canEdit &&
    dirty &&
    !!firstName.trim() &&
    !!lastName.trim() &&
    emailValid &&
    !updateProfile.isPending;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await updateProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null
      });
      addToast({ title: "Profile updated", color: "success" });
    } catch (err) {
      addToast({
        title: "Could not update profile",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger"
      });
    }
  };

  const handleReset = () => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  };

  // Persist an avatar change immediately, reusing the user's saved name/email so a
  // photo update never depends on (or commits) unsaved text edits.
  const persistAvatar = async (avatarUrl: string | null, avatarKey: string | null) => {
    await updateProfile.mutateAsync({
      firstName: (user.firstName ?? "").trim(),
      lastName: (user.lastName ?? "").trim(),
      email: user.email,
      phone: user.phone ?? null,
      avatarUrl,
      avatarKey
    });
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type as (typeof AVATAR_TYPES)[number])) {
      addToast({ title: "Unsupported image", description: "Use a JPG, PNG, or WebP file.", color: "danger" });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      addToast({ title: "Image too large", description: "Maximum size is 5 MB.", color: "danger" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const { uploadUrl, publicUrl, key } = await createCatalogImageUpload("projects", {
        filename: file.name,
        contentType: file.type as (typeof AVATAR_TYPES)[number]
      });
      await uploadFileToPresignedUrl(uploadUrl, file);
      await persistAvatar(publicUrl, key);
      addToast({ title: "Photo updated", color: "success" });
    } catch (err) {
      addToast({
        title: "Could not update photo",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    try {
      await persistAvatar(null, null);
      addToast({ title: "Photo removed", color: "success" });
    } catch (err) {
      addToast({
        title: "Could not remove photo",
        description: err instanceof Error ? err.message : "Please try again.",
        color: "danger"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

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
              <div className="relative shrink-0">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-foreground text-2xl font-semibold text-background">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={fullName || "Profile photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                  {uploadingAvatar ? (
                    <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  ) : null}
                </div>

                {canEdit ? (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarPick}
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      aria-label="Change profile photo"
                      className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-primary text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold">{fullName || user.email.split("@")[0]}</div>
                <div className="truncate text-sm text-foreground/60">{user.email}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Chip size="sm" variant="flat" color="primary">
                    {user.role}
                  </Chip>
                  {canEdit && user.avatarUrl ? (
                    <button
                      type="button"
                      onClick={handleAvatarRemove}
                      disabled={uploadingAvatar}
                      className="text-xs font-medium text-foreground/50 underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
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

        {/* Profile details — editable */}
        <Card className="border border-divider shadow-sm">
          <CardHeader className="flex items-center justify-between p-6 pb-2">
            <div className="text-lg font-semibold">Profile</div>
            {canEdit ? null : (
              <Chip size="sm" variant="flat">
                Read only
              </Chip>
            )}
          </CardHeader>
          <CardBody className="grid gap-4 p-6 pt-2 sm:grid-cols-2">
            <Input
              label="First name"
              labelPlacement="outside"
              placeholder="First name"
              value={firstName}
              onValueChange={setFirstName}
              isRequired={canEdit}
              isReadOnly={!canEdit}
              isInvalid={canEdit && !firstName.trim()}
              errorMessage={canEdit && !firstName.trim() ? "First name is required" : undefined}
              startContent={<UserIcon className="h-4 w-4 text-foreground/40" />}
              variant="bordered"
            />
            <Input
              label="Last name"
              labelPlacement="outside"
              placeholder="Last name"
              value={lastName}
              onValueChange={setLastName}
              isRequired={canEdit}
              isReadOnly={!canEdit}
              isInvalid={canEdit && !lastName.trim()}
              errorMessage={canEdit && !lastName.trim() ? "Last name is required" : undefined}
              startContent={<UserIcon className="h-4 w-4 text-foreground/40" />}
              variant="bordered"
            />
            <Input
              type="email"
              label="Email"
              labelPlacement="outside"
              placeholder="you@example.com"
              value={email}
              onValueChange={setEmail}
              isRequired={canEdit}
              isReadOnly={!canEdit}
              isInvalid={canEdit && !!email && !emailValid}
              errorMessage={canEdit && !!email && !emailValid ? "Enter a valid email" : undefined}
              startContent={<Mail className="h-4 w-4 text-foreground/40" />}
              variant="bordered"
            />
            <Input
              type="tel"
              label="Phone"
              labelPlacement="outside"
              placeholder="Add a phone number"
              value={phone}
              onValueChange={setPhone}
              isReadOnly={!canEdit}
              startContent={<Phone className="h-4 w-4 text-foreground/40" />}
              variant="bordered"
            />

            {canEdit ? (
              <div className="flex items-center justify-end gap-3 sm:col-span-2">
                <Button
                  variant="flat"
                  onPress={handleReset}
                  isDisabled={!dirty || updateProfile.isPending}
                  className="rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSave}
                  isDisabled={!canSave}
                  isLoading={updateProfile.isPending}
                  className="rounded-2xl text-white"
                  style={{ backgroundImage: "var(--primary-gradient)" }}
                >
                  Save changes
                </Button>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Access — visible to super admins only */}
        {isSuperAdmin ? (
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
        ) : null}
      </div>
    </main>
  );
}
