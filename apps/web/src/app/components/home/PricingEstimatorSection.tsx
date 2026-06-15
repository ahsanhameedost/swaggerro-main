"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardBody,
  Divider,
  Slider,
  Select,
  SelectItem,
} from "@heroui/react";
import { Check, ChevronDown } from "lucide-react";
import PrimaryButton from "../PrimaryButton";
import { cx } from "@/lib/helpers";

type ScaleMode = "pack" | "bulk";
type Category = "tshirt" | "hoodie" | "bags" | "bottle" | "socks" | "mugs" | "boxes";
type LogoColor = "single" | "dual" | "tri" | "full";
type Region = "USA" | "Canada" | "EU" | "UK" | "UAE";

type PlanKey = "basic" | "silver" | "gold" | "platinum";

type PricingBreakdown = {
  label: string;
  amount: number;
};

type Plan = {
  key: PlanKey;
  name: string;
  total: number;
  breakdown?: PricingBreakdown[];
};

function padMoney(n: number) {
  return `$${Math.round(n)}`;
}

function CircleIndicator({ active }: { active: boolean }) {
  return (
    <span
      className={cx(
        "grid h-6 w-6 place-items-center rounded-full border",
        active ? "border-[var(--primary)] bg-[var(--primary)]" : "border-black/20 bg-white"
      )}
    >
      {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </span>
  );
}

function PillOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text2",
        "border transition-colors",
        active
          ? "border-[var(--primary)] bg-white text-black"
          : "border-black/10 bg-white text-black/70 hover:border-black/20"
      )}
    >
      <CircleIndicator active={active} />
      {label}
    </button>
  );
}

function TagOption({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cx(
        "inline-flex items-center gap-2 rounded-full px-3 py-2 text2 font-medium",
        "border bg-white transition-colors",
        active
          ? "border-[var(--primary)] text-black"
          : "border-black/10 text-black/70 hover:border-black/20"
      )}
    >
      <CircleIndicator active={active} />
      {label}
    </button>
  );
}

function LogoIconSingle() {
  return (
    <svg width="54" height="64" viewBox="0 0 44 44" aria-hidden>
      <path
        d="M22 8c4 6 7 9 7 14a7 7 0 1 1-14 0c0-5 3-8 7-14Z"
        fill="#1c83ff"
      />
    </svg>
  );
}

function LogoIconDual() {
  return (
    <svg width="54" height="64" viewBox="0 0 44 44" aria-hidden>
      <circle cx="17" cy="22" r="9" fill="#111" />
      <circle cx="27" cy="22" r="9" fill="#1c83ff" opacity="0.9" />
    </svg>
  );
}

function LogoIconTri() {
  return (
    <svg width="54" height="64" viewBox="0 0 44 44" aria-hidden>
      <circle cx="16" cy="18" r="8" fill="#111" opacity="0.9" />
      <circle cx="28" cy="18" r="8" fill="#1c83ff" opacity="0.9" />
      <circle cx="22" cy="28" r="8" fill="#777" opacity="0.9" />
    </svg>
  );
}

const FULL_LOGO_COLORS = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF", "#AF52DE"] as const;

function fmt3(n: number) {
  return (Math.round(n * 1000) / 1000).toFixed(3);
}

function buildPiePaths(colors: readonly string[]) {
  const r = 14;
  const cx0 = 22;
  const cy0 = 22;

  return colors.map((c, i) => {
    const start = (i * Math.PI * 2) / colors.length;
    const end = ((i + 1) * Math.PI * 2) / colors.length;

    const x1 = cx0 + r * Math.cos(start);
    const y1 = cy0 + r * Math.sin(start);
    const x2 = cx0 + r * Math.cos(end);
    const y2 = cy0 + r * Math.sin(end);

    const large = end - start > Math.PI ? 1 : 0;

    const d = `M ${cx0} ${cy0} L ${fmt3(x1)} ${fmt3(y1)} A ${r} ${r} 0 ${large} 1 ${fmt3(x2)} ${fmt3(y2)} Z`;
    return { c, d };
  });
}

function LogoIconFull() {
  const slices = React.useMemo(() => buildPiePaths(FULL_LOGO_COLORS), []);

  return (
    <svg width="54" height="64" viewBox="0 0 44 44" aria-hidden>
      {slices.map(({ c, d }, i) => (
        <path key={i} d={d} fill={c} opacity={0.9} />
      ))}
      <circle cx="22" cy="22" r="7.5" fill="white" />
    </svg>
  );
}

function LogoCard({
  active,
  title,
  icon,
  onPress,
}: {
  active: boolean;
  title: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cx(
        "relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border bg-white p-4",
        "transition-colors",
        active ? "border-[var(--primary)]" : "border-black/10 hover:border-black/20"
      )}
    >
      {active && (
        <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[var(--primary)]">
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </span>
      )}
      <div className="grid place-items-center">{icon}</div>
      <div className="text2">{title}</div>
    </button>
  );
}

function buildPricing({
  scale,
  quantity,
  category,
  logoColor,
  region,
}: {
  scale: ScaleMode;
  quantity: number;
  category: Category;
  logoColor: LogoColor;
  region: Region;
}): Plan[] {
  const categoryBase: Record<Category, number> = {
    tshirt: 1.0,
    hoodie: 1.6,
    bags: 1.3,
    bottle: 1.2,
    socks: 1.1,
    mugs: 1.15,
    boxes: 1.25,
  };

  const logoMult: Record<LogoColor, number> = {
    single: 1.0,
    dual: 1.08,
    tri: 1.14,
    full: 1.22,
  };

  const regionShip: Record<Region, number> = {
    USA: 20,
    Canada: 28,
    EU: 35,
    UK: 32,
    UAE: 42,
  };

  const q = Math.max(0, quantity);
  const minPack = 100;
  const effectiveQ = scale === "pack" ? Math.max(minPack, q) : Math.max(50, q);

  const base = 100 * categoryBase[category] * logoMult[logoColor];
  const discount =
    scale === "bulk"
      ? Math.max(0.78, 1 - Math.log10(effectiveQ + 10) * 0.08)
      : Math.max(0.84, 1 - Math.log10(effectiveQ + 10) * 0.06);

  const shipping = regionShip[region];
  const soaswag = Math.round(base * discount);

  const silverSoas = Math.round(soaswag * 2.3);
  const goldSoas = Math.round(soaswag * 3.1);
  const platSoas = Math.round(soaswag * 3.9);

  return [
    {
      key: "basic",
      name: "Basic Plan",
      total: soaswag + shipping,
      breakdown: [
        { label: "Swaggeroo", amount: soaswag },
        { label: "Shipping", amount: shipping },
      ],
    },
    { key: "silver", name: "Silver Plan", total: silverSoas + shipping },
    { key: "gold", name: "Gold Plan", total: goldSoas + shipping },
    { key: "platinum", name: "Platinum", total: platSoas + shipping },
  ];
}

export default function PricingEstimatorSection() {
  const [scale, setScale] = React.useState<ScaleMode>("pack");
  const [quantity, setQuantity] = React.useState<number>(25);
  const [category, setCategory] = React.useState<Category>("tshirt");
  const [logoColor, setLogoColor] = React.useState<LogoColor>("single");
  const [region, setRegion] = React.useState<Region>("USA");
  const [activePlan, setActivePlan] = React.useState<PlanKey>("basic");

  const plans = React.useMemo(
    () => buildPricing({ scale, quantity, category, logoColor, region }),
    [scale, quantity, category, logoColor, region]
  );

  const current = plans.find((p) => p.key === activePlan) ?? plans[0];

  return (
    <section className="container">
      <div className="padding-section-md">
        <div
          className={cx(
            "overflow-hidden rounded-[22px] border border-black/5",
            "bg-primary",
            "shadow-[0_18px_50px_rgba(0,0,0,0.06)]"
          )}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr]">
            {/* Left */}
            <div className="bg-[#eff6ff] px-8 py-8">
              <div className="flex items-center gap-4">
                <h5 className="text-black">Scale</h5>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <PillOption active={scale === "pack"} label="Pack" onPress={() => setScale("pack")} />
                <PillOption active={scale === "bulk"} label="Bulk" onPress={() => setScale("bulk")} />
              </div>

              <Divider className="my-6 bg-black/10" />

              <div className="flex items-baseline gap-2">
                <h5 className="text-black">Quantity</h5>
                <div className="text3 text-[var(--primary)]">
                  (Min pack should be 100)
                </div>
              </div>

              <div className="mt-4">
                <Slider
                  value={quantity}
                  minValue={0}
                  maxValue={100}
                  step={1}
                  size="sm"
                  onChange={(v) => setQuantity(Array.isArray(v) ? Number(v[0]) : Number(v))}
                  className="text-[var(--primary)]"
                />
                <div className="mt-2 flex justify-between text1">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>

              <Divider className="my-6 bg-black/10" />

              <div className="flex items-center justify-between">
                <h5 className="text-black">Category</h5>
                <button type="button" className="text1 text-[var(--primary)]">
                  See All
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <TagOption active={category === "tshirt"} label="T-shirt" onPress={() => setCategory("tshirt")} />
                <TagOption active={category === "hoodie"} label="Hoddie" onPress={() => setCategory("hoodie")} />
                <TagOption active={category === "bags"} label="Bags" onPress={() => setCategory("bags")} />
                <TagOption active={category === "bottle"} label="Bottle" onPress={() => setCategory("bottle")} />
                <TagOption active={category === "socks"} label="Socks" onPress={() => setCategory("socks")} />
                <TagOption active={category === "mugs"} label="Mugs" onPress={() => setCategory("mugs")} />
                <TagOption active={category === "boxes"} label="Boxes" onPress={() => setCategory("boxes")} />
              </div>

              <Divider className="my-6 bg-black/10" />

              <h5 className="text-black">Color in your logo</h5>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <LogoCard
                  active={logoColor === "single"}
                  title="Single Tone"
                  icon={<LogoIconSingle />}
                  onPress={() => setLogoColor("single")}
                />
                <LogoCard
                  active={logoColor === "dual"}
                  title="Dual Accent"
                  icon={<LogoIconDual />}
                  onPress={() => setLogoColor("dual")}
                />
                <LogoCard
                  active={logoColor === "tri"}
                  title="Tri Color"
                  icon={<LogoIconTri />}
                  onPress={() => setLogoColor("tri")}
                />
                <LogoCard
                  active={logoColor === "full"}
                  title="Full Color"
                  icon={<LogoIconFull />}
                  onPress={() => setLogoColor("full")}
                />
              </div>

              <Divider className="my-6 bg-black/10" />

              <h5 className="text-black">Shipping Region</h5>
              <div className="mt-3">
                <Select
                  selectedKeys={[region]}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0] as Region | undefined;
                    if (v) setRegion(v);
                  }}
                  aria-label="Shipping region"
                  classNames={{
                    base: "w-full",
                    trigger:
                      "h-12 rounded-xl border border-black/10 bg-white shadow-none data-[hover=true]:border-black/20",
                    value: "text2 text-black/70",
                  }}
                  selectorIcon={<ChevronDown className="h-4 w-4 text-black/40" />}
                >
                  {(["USA", "Canada", "EU", "UK", "UAE"] as Region[]).map((r) => (
                    <SelectItem key={r}>{r}</SelectItem>
                  ))}
                </Select>
              </div>

              <div className="mt-8">
                <PrimaryButton className="h-12 w-full" text="Calculate" />
              </div>
            </div>

            {/* Right */}
            <div className="border-t border-black/5 bg-[#eff6ff] px-6 py-10 lg:border-l lg:border-t-0">
              <div className="flex h-full items-center justify-center">
                <Card className="w-full max-w-[520px] rounded-[18px] border border-black/5 bg-white shadow-none">
                  <CardBody className="p-8">
                    <h5 className="text-black">
                      Your estimated Pricing
                    </h5>

                    <div className="mt-6 space-y-4">
                      {plans.map((p) => {
                        const isActive = p.key === current.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setActivePlan(p.key)}
                            className={cx(
                              "w-full rounded-[14px] border p-5 text-left transition-colors",
                              isActive
                                ? "border-[var(--primary)] bg-[#eff6ff]"
                                : "border-black/10 bg-white hover:border-black/20"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-black">{p.name}</h5>
                              <div className="text-[24px] font-medium text-black">
                                {padMoney(p.total)}
                              </div>
                            </div>

                            {isActive && p.breakdown && (
                              <div className="mt-4 space-y-2">
                                {p.breakdown.map((b) => (
                                  <div
                                    key={b.label}
                                    className="flex items-center justify-between text-[20px] font-medium text-black/80"
                                  >
                                    <span>{b.label}</span>
                                    <span>
                                      {padMoney(b.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardBody>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}