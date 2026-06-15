
"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { Plus, Truck } from "lucide-react";
import { DeleteConfirmDialog } from "@/app/components/dashboard/shared/DeleteConfirmDialog";
import { RowActionsDropdown } from "@/app/components/dashboard/shared/RowActionsDropdown";
import { useMe } from "@/queries/auth";
import {
  useCreateShippingProfile,
  useCreateShippingRate,
  useCreateShippingZone,
  useDeleteShippingProfile,
  useDeleteShippingRate,
  useDeleteShippingZone,
  useShippingProfiles,
  useShippingRates,
  useShippingZones,
  useUpdateShippingProfile,
  useUpdateShippingRate,
  useUpdateShippingZone
} from "@/queries/shipping";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import type {
  CreateShippingProfileInput,
  CreateShippingRateInput,
  CreateShippingZoneInput,
  ShippingProfile,
  ShippingRate,
  ShippingZone,
  UpdateShippingProfileInput,
  UpdateShippingRateInput,
  UpdateShippingZoneInput
} from "@/modules/shipping/types";
import { formatMoney } from "@/lib/money";

const PACKAGE_TYPES = [
  { key: "BULK_ITEM", label: "Bulk item" },
  { key: "PACK", label: "Pack" },
  { key: "MAILER_PACK", label: "Mailer pack" }
] as const;

const SHIPPING_SCOPES = [
  { key: "DOMESTIC_ONLY", label: "US only" },
  { key: "DOMESTIC_AND_INTERNATIONAL", label: "Domestic + international" },
  { key: "INTERNATIONAL_REVIEW_REQUIRED", label: "International review required" }
] as const;

const SERVICE_LEVELS = [
  { key: "STANDARD", label: "Standard" },
  { key: "EXPRESS", label: "Express" }
] as const;

const PRICING_MODELS = [
  { key: "FLAT_PER_PACKAGE", label: "Flat per package" },
  { key: "FLAT_PER_SHIPMENT", label: "Flat per shipment" },
  { key: "WEIGHT_AND_QUANTITY", label: "Weight and quantity" }
] as const;

function getSingleSelection(keys: "all" | Set<Key>) {
  if (keys === "all") {
    return "";
  }

  return String(Array.from(keys)[0] ?? "");
}

function toCountryOptions(codes: string[]) {
  const byCode = new Map(SHIPPING_COUNTRIES.map((country) => [country.code, country.name]));
  return codes
    .filter(Boolean)
    .map((code) => ({
      code,
      name: byCode.get(code) ?? code
    }));
}

function formatPackageTypeLabel(value: ShippingProfile["packageType"] | ShippingRate["packageType"]) {
  return PACKAGE_TYPES.find((item) => item.key === value)?.label ?? value;
}

function formatScopeLabel(value: ShippingProfile["shippingScope"]) {
  return SHIPPING_SCOPES.find((item) => item.key === value)?.label ?? value;
}

function formatServiceLabel(value: ShippingRate["serviceLevel"]) {
  return SERVICE_LEVELS.find((item) => item.key === value)?.label ?? value;
}

function formatPricingModelLabel(value: ShippingRate["pricingModel"]) {
  return PRICING_MODELS.find((item) => item.key === value)?.label ?? value;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatWeightBand(rate: ShippingRate) {
  if (rate.weightToOz == null) {
    return `${rate.weightFromOz} oz+`;
  }

  return `${rate.weightFromOz} - ${rate.weightToOz} oz`;
}

type ShippingProfileModalProps = {
  isOpen: boolean;
  profile: ShippingProfile | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (input: CreateShippingProfileInput | UpdateShippingProfileInput) => Promise<void>;
};

function ShippingProfileModal({
  isOpen,
  profile,
  isSubmitting,
  onClose,
  onSave
}: ShippingProfileModalProps) {
  const [name, setName] = useState("");
  const [packageType, setPackageType] = useState<CreateShippingProfileInput["packageType"]>("BULK_ITEM");
  const [shippingScope, setShippingScope] =
    useState<CreateShippingProfileInput["shippingScope"]>("DOMESTIC_AND_INTERNATIONAL");
  const [maxUnitsPerPackage, setMaxUnitsPerPackage] = useState("");
  const [allowCountries, setAllowCountries] = useState<string[]>([]);
  const [blockCountries, setBlockCountries] = useState<string[]>([]);
  const [flags, setFlags] = useState({
    isHazmat: false,
    containsBattery: false,
    containsFood: false,
    containsCosmetic: false,
    containsLiquid: false,
    containsWood: false,
    isOversized: false,
    requiresPhoneForInternational: true,
    requiresEmailForInternational: true
  });

  const reset = () => {
    setName(profile?.name ?? "");
    setPackageType(profile?.packageType ?? "BULK_ITEM");
    setShippingScope(profile?.shippingScope ?? "DOMESTIC_AND_INTERNATIONAL");
    setMaxUnitsPerPackage(profile?.maxUnitsPerPackage ? String(profile.maxUnitsPerPackage) : "");
    setAllowCountries(profile?.allowCountries.map((country) => country.code) ?? []);
    setBlockCountries(profile?.blockCountries.map((country) => country.code) ?? []);
    setFlags({
      isHazmat: profile?.isHazmat ?? false,
      containsBattery: profile?.containsBattery ?? false,
      containsFood: profile?.containsFood ?? false,
      containsCosmetic: profile?.containsCosmetic ?? false,
      containsLiquid: profile?.containsLiquid ?? false,
      containsWood: profile?.containsWood ?? false,
      isOversized: profile?.isOversized ?? false,
      requiresPhoneForInternational: profile?.requiresPhoneForInternational ?? true,
      requiresEmailForInternational: profile?.requiresEmailForInternational ?? true
    });
  };

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, profile]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const submit = async () => {
    const payload: CreateShippingProfileInput = {
      name: name.trim(),
      packageType,
      shippingScope,
      maxUnitsPerPackage: maxUnitsPerPackage ? Math.max(1, Number(maxUnitsPerPackage)) : null,
      allowCountries: toCountryOptions(allowCountries),
      blockCountries: toCountryOptions(blockCountries),
      ...flags
    };

    await onSave(payload);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="5xl" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{profile ? "Edit shipping profile" : "Create shipping profile"}</ModalHeader>
            <ModalBody className="space-y-5 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Profile name" value={name} onValueChange={setName} isRequired />
                <Input
                  label="Max units per package"
                  type="number"
                  min={1}
                  value={maxUnitsPerPackage}
                  onValueChange={setMaxUnitsPerPackage}
                />

                <Select
                  label="Package type"
                  selectedKeys={[packageType]}
                  onSelectionChange={(keys) =>
                    setPackageType(getSingleSelection(keys) as CreateShippingProfileInput["packageType"])
                  }
                >
                  {PACKAGE_TYPES.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Shipping scope"
                  selectedKeys={[shippingScope]}
                  onSelectionChange={(keys) =>
                    setShippingScope(getSingleSelection(keys) as CreateShippingProfileInput["shippingScope"])
                  }
                >
                  {SHIPPING_SCOPES.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Allowed countries"
                  selectionMode="multiple"
                  selectedKeys={new Set(allowCountries)}
                  onSelectionChange={(keys) =>
                    setAllowCountries(Array.from(keys === "all" ? [] : keys).map((item) => String(item)))
                  }
                >
                  {SHIPPING_COUNTRIES.map((country) => (
                    <SelectItem key={country.code}>{country.name}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Blocked countries"
                  selectionMode="multiple"
                  selectedKeys={new Set(blockCountries)}
                  onSelectionChange={(keys) =>
                    setBlockCountries(Array.from(keys === "all" ? [] : keys).map((item) => String(item)))
                  }
                >
                  {SHIPPING_COUNTRIES.map((country) => (
                    <SelectItem key={country.code}>{country.name}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="grid gap-3 rounded-2xl border border-divider p-4 md:grid-cols-2 xl:grid-cols-3">
                <Switch
                  isSelected={flags.isHazmat}
                  onValueChange={(value) => setFlags((current) => ({ ...current, isHazmat: value }))}
                >
                  Hazmat
                </Switch>
                <Switch
                  isSelected={flags.containsBattery}
                  onValueChange={(value) => setFlags((current) => ({ ...current, containsBattery: value }))}
                >
                  Contains battery
                </Switch>
                <Switch
                  isSelected={flags.containsFood}
                  onValueChange={(value) => setFlags((current) => ({ ...current, containsFood: value }))}
                >
                  Contains food
                </Switch>
                <Switch
                  isSelected={flags.containsCosmetic}
                  onValueChange={(value) => setFlags((current) => ({ ...current, containsCosmetic: value }))}
                >
                  Contains cosmetic
                </Switch>
                <Switch
                  isSelected={flags.containsLiquid}
                  onValueChange={(value) => setFlags((current) => ({ ...current, containsLiquid: value }))}
                >
                  Contains liquid
                </Switch>
                <Switch
                  isSelected={flags.containsWood}
                  onValueChange={(value) => setFlags((current) => ({ ...current, containsWood: value }))}
                >
                  Contains wood
                </Switch>
                <Switch
                  isSelected={flags.isOversized}
                  onValueChange={(value) => setFlags((current) => ({ ...current, isOversized: value }))}
                >
                  Oversized
                </Switch>
                <Switch
                  isSelected={flags.requiresEmailForInternational}
                  onValueChange={(value) =>
                    setFlags((current) => ({ ...current, requiresEmailForInternational: value }))
                  }
                >
                  Require email internationally
                </Switch>
                <Switch
                  isSelected={flags.requiresPhoneForInternational}
                  onValueChange={(value) =>
                    setFlags((current) => ({ ...current, requiresPhoneForInternational: value }))
                  }
                >
                  Require phone internationally
                </Switch>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                className="text-white"
                style={{ background: "var(--primary-gradient)" }}
                onPress={submit}
                isLoading={isSubmitting}
                isDisabled={!name.trim()}
              >
                {profile ? "Save changes" : "Create profile"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

type ShippingZoneModalProps = {
  isOpen: boolean;
  zone: ShippingZone | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (input: CreateShippingZoneInput | UpdateShippingZoneInput) => Promise<void>;
};

function ShippingZoneModal({
  isOpen,
  zone,
  isSubmitting,
  onClose,
  onSave
}: ShippingZoneModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDomestic, setIsDomestic] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [countries, setCountries] = useState<string[]>([]);

  const reset = () => {
    setCode(zone?.code ?? "");
    setName(zone?.name ?? "");
    setDescription(zone?.description ?? "");
    setIsDomestic(zone?.isDomestic ?? false);
    setIsActive(zone?.isActive ?? true);
    setCountries(zone?.countries.map((country) => country.code) ?? []);
  };

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, zone]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const submit = async () => {
    const payload: CreateShippingZoneInput = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || null,
      isDomestic,
      isActive,
      countries: toCountryOptions(countries)
    };

    await onSave(payload);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="4xl" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{zone ? "Edit shipping zone" : "Create shipping zone"}</ModalHeader>
            <ModalBody className="space-y-5 pb-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Zone code" value={code} onValueChange={setCode} isRequired />
                <Input label="Zone name" value={name} onValueChange={setName} isRequired />
              </div>

              <Textarea
                label="Description"
                value={description}
                minRows={3}
                onValueChange={setDescription}
                placeholder="Most international destinations"
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Switch isSelected={isDomestic} onValueChange={setIsDomestic}>
                  Domestic zone
                </Switch>
                <Switch isSelected={isActive} onValueChange={setIsActive}>
                  Active
                </Switch>
              </div>

              <Select
                label="Countries"
                selectionMode="multiple"
                selectedKeys={new Set(countries)}
                onSelectionChange={(keys) =>
                  setCountries(Array.from(keys === "all" ? [] : keys).map((item) => String(item)))
                }
              >
                {SHIPPING_COUNTRIES.map((country) => (
                  <SelectItem key={country.code}>{country.name}</SelectItem>
                ))}
              </Select>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                className="text-white"
                style={{ background: "var(--primary-gradient)" }}
                onPress={submit}
                isLoading={isSubmitting}
                isDisabled={!code.trim() || !name.trim()}
              >
                {zone ? "Save changes" : "Create zone"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

type ShippingRateModalProps = {
  isOpen: boolean;
  rate: ShippingRate | null;
  zones: ShippingZone[];
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (input: CreateShippingRateInput | UpdateShippingRateInput) => Promise<void>;
};

function ShippingRateModal({
  isOpen,
  rate,
  zones,
  isSubmitting,
  onClose,
  onSave
}: ShippingRateModalProps) {
  const [zoneId, setZoneId] = useState("");
  const [serviceLevel, setServiceLevel] = useState<CreateShippingRateInput["serviceLevel"]>("STANDARD");
  const [packageType, setPackageType] = useState<CreateShippingRateInput["packageType"]>("BULK_ITEM");
  const [pricingModel, setPricingModel] = useState<CreateShippingRateInput["pricingModel"]>("WEIGHT_AND_QUANTITY");
  const [weightFromOz, setWeightFromOz] = useState("0");
  const [weightToOz, setWeightToOz] = useState("");
  const [baseRate, setBaseRate] = useState("0");
  const [perItemRate, setPerItemRate] = useState("");
  const [perPoundRate, setPerPoundRate] = useState("");
  const [handlingFee, setHandlingFee] = useState("");
  const [fuelSurcharge, setFuelSurcharge] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isActive, setIsActive] = useState(true);

  const reset = () => {
    setZoneId(rate?.zoneId ?? zones[0]?.id ?? "");
    setServiceLevel(rate?.serviceLevel ?? "STANDARD");
    setPackageType(rate?.packageType ?? "BULK_ITEM");
    setPricingModel(rate?.pricingModel ?? "WEIGHT_AND_QUANTITY");
    setWeightFromOz(String(rate?.weightFromOz ?? 0));
    setWeightToOz(rate?.weightToOz != null ? String(rate.weightToOz) : "");
    setBaseRate(String(rate?.baseRate ?? 0));
    setPerItemRate(rate?.perItemRate != null ? String(rate.perItemRate) : "");
    setPerPoundRate(rate?.perPoundRate != null ? String(rate.perPoundRate) : "");
    setHandlingFee(rate?.handlingFee != null ? String(rate.handlingFee) : "");
    setFuelSurcharge(rate?.fuelSurcharge != null ? String(rate.fuelSurcharge) : "");
    setCurrency(rate?.currency ?? "USD");
    setIsActive(rate?.isActive ?? true);
  };

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, rate, zones]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const submit = async () => {
    const payload: CreateShippingRateInput = {
      zoneId,
      serviceLevel,
      packageType,
      pricingModel,
      weightFromOz: Number(weightFromOz || 0),
      weightToOz: weightToOz ? Number(weightToOz) : null,
      baseRate: Number(baseRate || 0),
      perItemRate: perItemRate ? Number(perItemRate) : null,
      perPoundRate: perPoundRate ? Number(perPoundRate) : null,
      handlingFee: handlingFee ? Number(handlingFee) : null,
      fuelSurcharge: fuelSurcharge ? Number(fuelSurcharge) : null,
      currency: currency.trim().toUpperCase() || "USD",
      isActive
    };

    await onSave(payload);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange} size="5xl" scrollBehavior="inside">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{rate ? "Edit shipping rate" : "Create shipping rate"}</ModalHeader>
            <ModalBody className="space-y-5 pb-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Select
                  label="Zone"
                  selectedKeys={zoneId ? [zoneId] : []}
                  onSelectionChange={(keys) => setZoneId(getSingleSelection(keys))}
                >
                  {zones.map((zoneItem) => (
                    <SelectItem key={zoneItem.id}>{zoneItem.name}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Service level"
                  selectedKeys={[serviceLevel]}
                  onSelectionChange={(keys) =>
                    setServiceLevel(getSingleSelection(keys) as CreateShippingRateInput["serviceLevel"])
                  }
                >
                  {SERVICE_LEVELS.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Package type"
                  selectedKeys={[packageType]}
                  onSelectionChange={(keys) =>
                    setPackageType(getSingleSelection(keys) as CreateShippingRateInput["packageType"])
                  }
                >
                  {PACKAGE_TYPES.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Pricing model"
                  selectedKeys={[pricingModel]}
                  onSelectionChange={(keys) =>
                    setPricingModel(getSingleSelection(keys) as CreateShippingRateInput["pricingModel"])
                  }
                >
                  {PRICING_MODELS.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>

                <Input
                  label="Weight from (oz)"
                  type="number"
                  min={0}
                  value={weightFromOz}
                  onValueChange={setWeightFromOz}
                />
                <Input
                  label="Weight to (oz)"
                  type="number"
                  min={0}
                  value={weightToOz}
                  onValueChange={setWeightToOz}
                />
                <Input label="Base rate" type="number" min={0} value={baseRate} onValueChange={setBaseRate} />
                <Input
                  label="Per item rate"
                  type="number"
                  min={0}
                  value={perItemRate}
                  onValueChange={setPerItemRate}
                />
                <Input
                  label="Per pound rate"
                  type="number"
                  min={0}
                  value={perPoundRate}
                  onValueChange={setPerPoundRate}
                />
                <Input
                  label="Handling fee"
                  type="number"
                  min={0}
                  value={handlingFee}
                  onValueChange={setHandlingFee}
                />
                <Input
                  label="Fuel surcharge"
                  type="number"
                  min={0}
                  value={fuelSurcharge}
                  onValueChange={setFuelSurcharge}
                />
                <Input label="Currency" value={currency} onValueChange={setCurrency} maxLength={8} />
              </div>

              <Switch isSelected={isActive} onValueChange={setIsActive}>
                Active
              </Switch>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                className="text-white"
                style={{ background: "var(--primary-gradient)" }}
                onPress={submit}
                isLoading={isSubmitting}
                isDisabled={!zoneId}
              >
                {rate ? "Save changes" : "Create rate"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default function ShippingSettingsPage() {
  const { data: user } = useMe();
  const canReadSettings = !!user?.permissions?.includes("shipping.settings.read");
  const canWriteSettings = !!user?.permissions?.includes("shipping.settings.write");
  const canReadRates = !!user?.permissions?.includes("shipping.rates.read");
  const canWriteRates = !!user?.permissions?.includes("shipping.rates.write");

  const { data: profiles = [], isLoading: profilesLoading } = useShippingProfiles(canReadSettings);
  const { data: zones = [], isLoading: zonesLoading } = useShippingZones(canReadSettings);
  const { data: rates = [], isLoading: ratesLoading } = useShippingRates(undefined, canReadRates);

  const createProfileMutation = useCreateShippingProfile();
  const updateProfileMutation = useUpdateShippingProfile();
  const deleteProfileMutation = useDeleteShippingProfile();

  const createZoneMutation = useCreateShippingZone();
  const updateZoneMutation = useUpdateShippingZone();
  const deleteZoneMutation = useDeleteShippingZone();

  const createRateMutation = useCreateShippingRate();
  const updateRateMutation = useUpdateShippingRate();
  const deleteRateMutation = useDeleteShippingRate();

  const [selectedProfile, setSelectedProfile] = useState<ShippingProfile | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [deleteProfile, setDeleteProfile] = useState<ShippingProfile | null>(null);

  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [deleteZone, setDeleteZone] = useState<ShippingZone | null>(null);

  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [deleteRate, setDeleteRate] = useState<ShippingRate | null>(null);

  const isLoading = (canReadSettings && (profilesLoading || zonesLoading)) || (canReadRates && ratesLoading);

  const sortedRates = useMemo(
    () =>
      [...rates].sort((left, right) => {
        if (left.zone?.name !== right.zone?.name) {
          return (left.zone?.name ?? "").localeCompare(right.zone?.name ?? "");
        }

        if (left.serviceLevel !== right.serviceLevel) {
          return left.serviceLevel.localeCompare(right.serviceLevel);
        }

        return left.packageType.localeCompare(right.packageType);
      }),
    [rates]
  );

  if (!canReadSettings && !canReadRates) {
    return (
      <Card>
        <CardBody>You do not have permission to manage shipping.</CardBody>
      </Card>
    );
  }

  const openCreateProfile = () => {
    setSelectedProfile(null);
    setProfileModalOpen(true);
  };

  const openCreateZone = () => {
    setSelectedZone(null);
    setZoneModalOpen(true);
  };

  const openCreateRate = () => {
    setSelectedRate(null);
    setRateModalOpen(true);
  };

  const handleSaveProfile = async (input: CreateShippingProfileInput | UpdateShippingProfileInput) => {
    try {
      if (selectedProfile) {
        await updateProfileMutation.mutateAsync({ id: selectedProfile.id, input });
        addToast({ title: "Shipping profile updated", color: "success" });
      } else {
        await createProfileMutation.mutateAsync(input as CreateShippingProfileInput);
        addToast({ title: "Shipping profile created", color: "success" });
      }

      setProfileModalOpen(false);
      setSelectedProfile(null);
    } catch (error: any) {
      addToast({ title: "Save failed", description: error?.message ?? "", color: "danger" });
    }
  };

  const handleSaveZone = async (input: CreateShippingZoneInput | UpdateShippingZoneInput) => {
    try {
      if (selectedZone) {
        await updateZoneMutation.mutateAsync({ id: selectedZone.id, input });
        addToast({ title: "Shipping zone updated", color: "success" });
      } else {
        await createZoneMutation.mutateAsync(input as CreateShippingZoneInput);
        addToast({ title: "Shipping zone created", color: "success" });
      }

      setZoneModalOpen(false);
      setSelectedZone(null);
    } catch (error: any) {
      addToast({ title: "Save failed", description: error?.message ?? "", color: "danger" });
    }
  };

  const handleSaveRate = async (input: CreateShippingRateInput | UpdateShippingRateInput) => {
    try {
      if (selectedRate) {
        await updateRateMutation.mutateAsync({ id: selectedRate.id, input });
        addToast({ title: "Shipping rate updated", color: "success" });
      } else {
        await createRateMutation.mutateAsync(input as CreateShippingRateInput);
        addToast({ title: "Shipping rate created", color: "success" });
      }

      setRateModalOpen(false);
      setSelectedRate(null);
    } catch (error: any) {
      addToast({ title: "Save failed", description: error?.message ?? "", color: "danger" });
    }
  };

  const confirmDeleteProfile = async () => {
    if (!deleteProfile) return;

    try {
      await deleteProfileMutation.mutateAsync(deleteProfile.id);
      addToast({ title: "Shipping profile deleted", color: "success" });
      setDeleteProfile(null);
    } catch (error: any) {
      addToast({ title: "Delete failed", description: error?.message ?? "", color: "danger" });
    }
  };

  const confirmDeleteZone = async () => {
    if (!deleteZone) return;

    try {
      await deleteZoneMutation.mutateAsync(deleteZone.id);
      addToast({ title: "Shipping zone deleted", color: "success" });
      setDeleteZone(null);
    } catch (error: any) {
      addToast({ title: "Delete failed", description: error?.message ?? "", color: "danger" });
    }
  };

  const confirmDeleteRate = async () => {
    if (!deleteRate) return;

    try {
      await deleteRateMutation.mutateAsync(deleteRate.id);
      addToast({ title: "Shipping rate deleted", color: "success" });
      setDeleteRate(null);
    } catch (error: any) {
      addToast({ title: "Delete failed", description: error?.message ?? "", color: "danger" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border border-divider shadow-sm">
        <CardBody className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Truck className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Shipping settings</h1>
              <p className="text-sm text-foreground/60">
                Manage country zones, shipping profiles, and rate cards for pack and bulk orders.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {canWriteSettings ? (
              <>
                <Button
                  startContent={<Plus className="size-4" />}
                  variant="flat"
                  onPress={openCreateProfile}
                >
                  Add profile
                </Button>
                <Button
                  startContent={<Plus className="size-4" />}
                  variant="flat"
                  onPress={openCreateZone}
                >
                  Add zone
                </Button>
              </>
            ) : null}

            {canWriteRates ? (
              <Button
                startContent={<Plus className="size-4" />}
                color="primary"
                className="text-white"
                style={{ background: "var(--primary-gradient)" }}
                onPress={openCreateRate}
              >
                Add rate
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <Card>
          <CardBody className="flex min-h-[260px] items-center justify-center">
            <Spinner label="Loading shipping settings..." />
          </CardBody>
        </Card>
      ) : null}

      {!isLoading && canReadSettings ? (
        <Card className="border border-divider shadow-sm">
          <CardHeader className="flex items-center justify-between px-6 py-5">
            <div>
              <div className="text-xl font-semibold">Shipping profiles</div>
              <div className="text-sm text-foreground/60">Attach shipping rules and restrictions to products.</div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <Table removeWrapper aria-label="Shipping profiles table">
              <TableHeader>
                <TableColumn>Profile</TableColumn>
                <TableColumn>Package</TableColumn>
                <TableColumn>Scope</TableColumn>
                <TableColumn>Rules</TableColumn>
                <TableColumn>Products</TableColumn>
                <TableColumn>Updated</TableColumn>
                <TableColumn>Action</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No shipping profiles found.">
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-xs text-foreground/50">{profile.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatPackageTypeLabel(profile.packageType)}</TableCell>
                    <TableCell>{formatScopeLabel(profile.shippingScope)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {profile.allowCountries.length ? (
                          <Chip size="sm" variant="flat">
                            Allow {profile.allowCountries.length}
                          </Chip>
                        ) : null}
                        {profile.blockCountries.length ? (
                          <Chip size="sm" variant="flat" color="warning">
                            Block {profile.blockCountries.length}
                          </Chip>
                        ) : null}
                        {profile.isHazmat ? <Chip size="sm" color="danger" variant="flat">Hazmat</Chip> : null}
                        {profile.containsBattery ? (
                          <Chip size="sm" color="warning" variant="flat">
                            Battery
                          </Chip>
                        ) : null}
                        {profile.containsFood ? (
                          <Chip size="sm" color="warning" variant="flat">
                            Food
                          </Chip>
                        ) : null}
                        {profile.isOversized ? (
                          <Chip size="sm" color="secondary" variant="flat">
                            Oversized
                          </Chip>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{profile.productCount}</TableCell>
                    <TableCell>{formatDateTime(profile.updatedAt)}</TableCell>
                    <TableCell>
                      <RowActionsDropdown
                        onEdit={
                          canWriteSettings
                            ? () => {
                                setSelectedProfile(profile);
                                setProfileModalOpen(true);
                              }
                            : undefined
                        }
                        onDelete={canWriteSettings ? () => setDeleteProfile(profile) : undefined}
                        isReadOnly={!canWriteSettings}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : null}

      {!isLoading && canReadSettings ? (
        <Card className="border border-divider shadow-sm">
          <CardHeader className="flex items-center justify-between px-6 py-5">
            <div>
              <div className="text-xl font-semibold">Shipping zones</div>
              <div className="text-sm text-foreground/60">Map countries to domestic, international, and premium zones.</div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <Table removeWrapper aria-label="Shipping zones table">
              <TableHeader>
                <TableColumn>Zone</TableColumn>
                <TableColumn>Countries</TableColumn>
                <TableColumn>Domestic</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Updated</TableColumn>
                <TableColumn>Action</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No shipping zones found.">
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{zone.name}</div>
                        <div className="text-xs text-foreground/50">{zone.code}</div>
                        {zone.description ? (
                          <div className="text-xs text-foreground/50">{zone.description}</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{zone.countries.length}</TableCell>
                    <TableCell>{zone.isDomestic ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Chip size="sm" color={zone.isActive ? "success" : "default"} variant="flat">
                        {zone.isActive ? "Active" : "Inactive"}
                      </Chip>
                    </TableCell>
                    <TableCell>{formatDateTime(zone.updatedAt)}</TableCell>
                    <TableCell>
                      <RowActionsDropdown
                        onEdit={
                          canWriteSettings
                            ? () => {
                                setSelectedZone(zone);
                                setZoneModalOpen(true);
                              }
                            : undefined
                        }
                        onDelete={canWriteSettings ? () => setDeleteZone(zone) : undefined}
                        isReadOnly={!canWriteSettings}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : null}

      {!isLoading && canReadRates ? (
        <Card className="border border-divider shadow-sm">
          <CardHeader className="flex items-center justify-between px-6 py-5">
            <div>
              <div className="text-xl font-semibold">Shipping rates</div>
              <div className="text-sm text-foreground/60">
                Versioned rate cards by zone, service level, package type, and weight.
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <Table removeWrapper aria-label="Shipping rates table">
              <TableHeader>
                <TableColumn>Zone</TableColumn>
                <TableColumn>Service</TableColumn>
                <TableColumn>Package</TableColumn>
                <TableColumn>Model</TableColumn>
                <TableColumn>Weight</TableColumn>
                <TableColumn>Base</TableColumn>
                <TableColumn>Extras</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Action</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No shipping rates found.">
                {sortedRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{rate.zone?.name ?? "-"}</div>
                        <div className="text-xs text-foreground/50">{rate.zone?.code ?? ""}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatServiceLabel(rate.serviceLevel)}</TableCell>
                    <TableCell>{formatPackageTypeLabel(rate.packageType)}</TableCell>
                    <TableCell>{formatPricingModelLabel(rate.pricingModel)}</TableCell>
                    <TableCell>{formatWeightBand(rate)}</TableCell>
                    <TableCell>{formatMoney(rate.baseRate, rate.currency)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-foreground/60">
                        <div>Per item: {formatMoney(rate.perItemRate ?? 0, rate.currency)}</div>
                        <div>Per pound: {formatMoney(rate.perPoundRate ?? 0, rate.currency)}</div>
                        <div>Handling: {formatMoney(rate.handlingFee ?? 0, rate.currency)}</div>
                        <div>Fuel: {formatMoney(rate.fuelSurcharge ?? 0, rate.currency)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" color={rate.isActive ? "success" : "default"} variant="flat">
                        {rate.isActive ? "Active" : "Inactive"}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <RowActionsDropdown
                        onEdit={
                          canWriteRates
                            ? () => {
                                setSelectedRate(rate);
                                setRateModalOpen(true);
                              }
                            : undefined
                        }
                        onDelete={canWriteRates ? () => setDeleteRate(rate) : undefined}
                        isReadOnly={!canWriteRates}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : null}

      <ShippingProfileModal
        isOpen={profileModalOpen}
        profile={selectedProfile}
        isSubmitting={createProfileMutation.isPending || updateProfileMutation.isPending}
        onClose={() => {
          setProfileModalOpen(false);
          setSelectedProfile(null);
        }}
        onSave={handleSaveProfile}
      />

      <ShippingZoneModal
        isOpen={zoneModalOpen}
        zone={selectedZone}
        isSubmitting={createZoneMutation.isPending || updateZoneMutation.isPending}
        onClose={() => {
          setZoneModalOpen(false);
          setSelectedZone(null);
        }}
        onSave={handleSaveZone}
      />

      <ShippingRateModal
        isOpen={rateModalOpen}
        rate={selectedRate}
        zones={zones}
        isSubmitting={createRateMutation.isPending || updateRateMutation.isPending}
        onClose={() => {
          setRateModalOpen(false);
          setSelectedRate(null);
        }}
        onSave={handleSaveRate}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteProfile}
        title="Delete shipping profile"
        message={`Delete ${deleteProfile?.name ?? "this shipping profile"}?`}
        isLoading={deleteProfileMutation.isPending}
        onClose={() => setDeleteProfile(null)}
        onConfirm={confirmDeleteProfile}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteZone}
        title="Delete shipping zone"
        message={`Delete ${deleteZone?.name ?? "this shipping zone"}?`}
        isLoading={deleteZoneMutation.isPending}
        onClose={() => setDeleteZone(null)}
        onConfirm={confirmDeleteZone}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteRate}
        title="Delete shipping rate"
        message={`Delete the ${deleteRate?.zone?.name ?? ""} ${deleteRate ? formatServiceLabel(deleteRate.serviceLevel) : ""} rate?`}
        isLoading={deleteRateMutation.isPending}
        onClose={() => setDeleteRate(null)}
        onConfirm={confirmDeleteRate}
      />
    </div>
  );
}
