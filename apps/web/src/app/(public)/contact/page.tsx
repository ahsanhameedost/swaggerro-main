"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addToast } from "@heroui/toast";
import {
  Button,
  Card,
  CardBody,
  Divider,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitContact } from "@/lib/contact";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Clock, Mail, MessageCircleQuestion, Plus, Trash2 } from "lucide-react";

// ── Quick contact form (new design) ──────────────────────────────────────────
const quickSchema = z.object({
  contactName: z.string().min(2, "Please tell us your name").max(120),
  companyName: z.string().min(1, "Company is required").max(200),
  email: z.string().email("Enter a valid email").max(200),
  phone: z.string().min(6, "Phone is required").max(30),
  message: z.string().min(10, "A little more detail helps us help you").max(4000),
});
type QuickValues = z.infer<typeof quickSchema>;

function QuickContactForm() {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuickValues>({ resolver: zodResolver(quickSchema), mode: "onBlur" });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      // Same backend as the detailed form (POST /contact → live Postgres).
      await submitContact({
        companyName: values.companyName.trim(),
        contactName: values.contactName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        additionalNotes: values.message.trim(),
      });
      addToast({
        title: "Message sent",
        description: "Thanks for reaching out — we'll get back to you within one business day.",
        color: "success",
      });
      reset({ contactName: "", companyName: "", email: "", phone: "", message: "" });
    } catch (e: unknown) {
      addToast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Could not send message",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="font-display text-xl font-bold text-foreground">Send us a message</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We read every one — no bots, no ticket purgatory.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            isRequired
            isInvalid={!!errors.contactName}
            errorMessage={errors.contactName?.message}
            {...register("contactName")}
          />
          <Input
            label="Company"
            isRequired
            isInvalid={!!errors.companyName}
            errorMessage={errors.companyName?.message}
            {...register("companyName")}
          />
          <Input
            label="Email"
            type="email"
            isRequired
            isInvalid={!!errors.email}
            errorMessage={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Phone"
            type="tel"
            isRequired
            isInvalid={!!errors.phone}
            errorMessage={errors.phone?.message}
            {...register("phone")}
          />
        </div>
        <Textarea
          label="How can we help?"
          minRows={5}
          isRequired
          isInvalid={!!errors.message}
          errorMessage={errors.message?.message}
          {...register("message")}
        />
        <Button
          type="submit"
          isLoading={loading}
          className="h-11 font-semibold text-white"
          style={{ backgroundImage: "var(--primary-gradient)" }}
        >
          Send message
        </Button>
      </form>
    </div>
  );
}

const DETAILS = [
  { icon: Mail, label: "Email us", value: "sales@swaggeroo.com", href: "mailto:sales@swaggeroo.com" },
  { icon: Clock, label: "Response time", value: "Within one business day" },
  { icon: MessageCircleQuestion, label: "Quick answers", value: "Browse the FAQ", href: "/faq" },
];

function ContactDetails() {
  return (
    <div className="space-y-4">
      {DETAILS.map((d) => {
        const inner = (
          <>
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-primary">
              <d.icon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {d.label}
              </p>
              <p className="mt-0.5 font-medium text-foreground">{d.value}</p>
            </div>
          </>
        );
        return d.href ? (
          <Link
            key={d.label}
            href={d.href}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40"
          >
            {inner}
          </Link>
        ) : (
          <div
            key={d.label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

// ── Detailed order-request form (kept, same backend) ─────────────────────────
const artworkOptions = [
  { key: "yes", label: "Yes — I have print-ready files" },
  { key: "no", label: "No — I need design help" },
  { key: "partial", label: "Partial — I have a logo but need layout" },
];

const decorationOptions = [
  { key: "screen-print", label: "Screen Print" },
  { key: "embroidery", label: "Embroidery" },
  { key: "dtg", label: "DTG (Direct to Garment)" },
  { key: "laser-engrave", label: "Laser Engrave" },
  { key: "heat-transfer", label: "Heat Transfer" },
  { key: "pad-print", label: "Pad Print" },
  { key: "deboss", label: "Deboss" },
  { key: "other", label: "Other" },
];

const productItemSchema = z.object({
  category: z.string().min(1, "Product category is required").max(200),
  quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Enter a valid quantity"),
  description: z.string().min(1, "Description is required").max(1000),
  colors: z.string().min(1, "Colors are required").max(200),
  targetPrice: z
    .string()
    .min(1, "Target price is required")
    .refine((v) => {
      const num = Number.parseFloat(v.replace(/[^0-9.]/g, ""));
      return Number.isFinite(num) && num >= 0;
    }, "Enter a valid price"),
  decorationMethod: z.string().min(1, "Decoration method is required").max(100),
  decorationNotes: z.string().min(1, "Decoration notes are required").max(1000),
});

const schema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  contactName: z.string().min(2, "Contact name is required").max(120),
  email: z.string().email("Enter a valid email").max(200),
  phone: z.string().min(6, "Phone is required").max(30),
  shippingAddress: z.string().min(1, "Shipping address is required").max(500),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  zip: z.string().min(1, "ZIP is required").max(20),
  eventName: z.string().min(1, "Event / project name is required").max(200),
  inHandDate: z.string().min(1, "In-hand date is required"),
  budget: z.string().min(1, "Budget is required").max(100),
  artworkReady: z.string().min(1, "Please select an option").max(100),
  additionalNotes: z.string().min(1, "Additional notes are required").max(4000),
  products: z.array(productItemSchema).min(1, "At least one product item is required"),
});
type FormValues = z.infer<typeof schema>;

const emptyItem = {
  category: "",
  quantity: "",
  description: "",
  colors: "",
  targetPrice: "",
  decorationMethod: "",
  decorationNotes: "",
};

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold text-white"
        style={{ background: "var(--primary-gradient)" }}
      >
        {number}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function OrderRequestForm() {
  const [loading, setLoading] = useState(false);

  const defaultValues = useMemo<FormValues>(
    () => ({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      shippingAddress: "",
      city: "",
      state: "",
      zip: "",
      eventName: "",
      inHandDate: "",
      budget: "",
      artworkReady: "",
      additionalNotes: "",
      products: [emptyItem],
    }),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues, mode: "onBlur" });

  const { fields, append, remove } = useFieldArray({ control, name: "products" });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const products = values.products.map((item) => ({
        productCategory: item.category.trim(),
        totalQuantity: Number.parseInt(item.quantity, 10),
        productDescription: item.description.trim(),
        colors: item.colors.trim(),
        targetUnitPrice: Number.parseFloat(item.targetPrice.replace(/[^0-9.]/g, "")),
        decorationMethod: item.decorationMethod.trim(),
        decorationNotes: item.decorationNotes.trim(),
      }));

      await submitContact({
        companyName: values.companyName.trim(),
        contactName: values.contactName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        shippingAddress: values.shippingAddress.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        zip: values.zip.trim(),
        eventName: values.eventName.trim(),
        inHandDate: values.inHandDate,
        budget: values.budget.trim(),
        artworkReady: values.artworkReady.trim(),
        additionalNotes: values.additionalNotes.trim(),
        products: products.length ? products : undefined,
      });

      addToast({
        title: "Request sent",
        description: "Thanks! We received your order request.",
        color: "success",
      });
      reset(defaultValues);
    } catch (e: unknown) {
      addToast({
        title: "Submission failed",
        description: e instanceof Error ? e.message : "Could not send message",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardBody className="px-5 py-6 sm:px-8">
        <form className="space-y-6" onSubmit={onSubmit}>
          <section className="space-y-4">
            <SectionTitle number="01" title="Customer Information" />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Company Name" isRequired isInvalid={!!errors.companyName} errorMessage={errors.companyName?.message} {...register("companyName")} />
              <Input label="Contact Name" isRequired isInvalid={!!errors.contactName} errorMessage={errors.contactName?.message} {...register("contactName")} />
              <Input label="Email" type="email" isRequired isInvalid={!!errors.email} errorMessage={errors.email?.message} {...register("email")} />
              <Input label="Phone" type="tel" isRequired isInvalid={!!errors.phone} errorMessage={errors.phone?.message} {...register("phone")} />
            </div>
            <div className="grid gap-4 md:grid-cols-12">
              <div className="md:col-span-6">
                <Input label="Shipping Address" isRequired isInvalid={!!errors.shippingAddress} errorMessage={errors.shippingAddress?.message} {...register("shippingAddress")} />
              </div>
              <div className="md:col-span-2">
                <Input label="City" isRequired isInvalid={!!errors.city} errorMessage={errors.city?.message} {...register("city")} />
              </div>
              <div className="md:col-span-2">
                <Input label="State" isRequired isInvalid={!!errors.state} errorMessage={errors.state?.message} {...register("state")} />
              </div>
              <div className="md:col-span-2">
                <Input label="ZIP" isRequired isInvalid={!!errors.zip} errorMessage={errors.zip?.message} {...register("zip")} />
              </div>
            </div>
          </section>

          <Divider />

          <section className="space-y-4">
            <SectionTitle number="02" title="Project Details" />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Event / Project Name" isRequired isInvalid={!!errors.eventName} errorMessage={errors.eventName?.message} {...register("eventName")} />
              <Input label="In-Hand Date" type="date" isRequired isInvalid={!!errors.inHandDate} errorMessage={errors.inHandDate?.message} {...register("inHandDate")} />
              <Input label="Budget" placeholder="$" isRequired isInvalid={!!errors.budget} errorMessage={errors.budget?.message} {...register("budget")} />
              <Controller
                control={control}
                name="artworkReady"
                render={({ field }) => (
                  <Select
                    label="Artwork Ready?"
                    placeholder="Select an option"
                    selectedKeys={field.value ? [field.value] : []}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0];
                      field.onChange(typeof value === "string" ? value : "");
                    }}
                    isRequired
                    isInvalid={!!errors.artworkReady}
                    errorMessage={errors.artworkReady?.message}
                  >
                    {artworkOptions.map((option) => (
                      <SelectItem key={option.key}>{option.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            </div>
          </section>

          <Divider />

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle number="03" title="Requested Products" />
              <Button
                type="button"
                variant="flat"
                className="text-white"
                style={{ background: "var(--primary-gradient)" }}
                startContent={<Plus className="size-4" />}
                onPress={() => append({ ...emptyItem })}
              >
                Add Product Item
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const itemError = errors.products?.[index];
                return (
                  <Card key={field.id} className="border border-border bg-muted/30 shadow-none">
                    <CardBody className="gap-4 p-4 sm:p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold text-white"
                            style={{ background: "var(--primary-gradient)" }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">Product Item {index + 1}</p>
                            <p className="text-xs text-foreground/55">Complete all fields for each item</p>
                          </div>
                        </div>
                        {fields.length > 1 && (
                          <Button type="button" variant="light" color="danger" isIconOnly onPress={() => remove(index)}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Input label="Product Category" isRequired isInvalid={!!itemError?.category} errorMessage={itemError?.category?.message} {...register(`products.${index}.category`)} />
                        <Input label="Total Quantity" isRequired isInvalid={!!itemError?.quantity} errorMessage={itemError?.quantity?.message} {...register(`products.${index}.quantity`)} />
                        <Input label="Product Description / Specific Item" isRequired isInvalid={!!itemError?.description} errorMessage={itemError?.description?.message} {...register(`products.${index}.description`)} />
                        <Input label="Color(s)" isRequired isInvalid={!!itemError?.colors} errorMessage={itemError?.colors?.message} {...register(`products.${index}.colors`)} />
                        <Input label="Target Unit Price" isRequired isInvalid={!!itemError?.targetPrice} errorMessage={itemError?.targetPrice?.message} {...register(`products.${index}.targetPrice`)} />
                        <Controller
                          control={control}
                          name={`products.${index}.decorationMethod`}
                          render={({ field }) => (
                            <Select
                              label="Decoration Method"
                              placeholder="Select method"
                              selectedKeys={field.value ? [field.value] : []}
                              onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0];
                                field.onChange(typeof value === "string" ? value : "");
                              }}
                              isRequired
                              isInvalid={!!itemError?.decorationMethod}
                              errorMessage={itemError?.decorationMethod?.message}
                            >
                              {decorationOptions.map((option) => (
                                <SelectItem key={option.key}>{option.label}</SelectItem>
                              ))}
                            </Select>
                          )}
                        />
                        <div className="md:col-span-2">
                          <Input label="Decoration Notes" isRequired isInvalid={!!itemError?.decorationNotes} errorMessage={itemError?.decorationNotes?.message} {...register(`products.${index}.decorationNotes`)} />
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </section>

          <Divider />

          <section className="space-y-4">
            <SectionTitle number="04" title="Additional Notes" />
            <Textarea
              label="Special Instructions"
              placeholder="Packaging needs, deadline notes, delivery instructions, preferred brands, logo notes, and anything else we should know."
              minRows={5}
              isRequired
              isInvalid={!!errors.additionalNotes}
              errorMessage={errors.additionalNotes?.message}
              {...register("additionalNotes")}
            />
          </section>

          <Button
            type="submit"
            size="lg"
            isLoading={loading}
            className="h-12 text-base font-semibold text-white"
            style={{ background: "var(--primary-gradient)" }}
          >
            Submit Order Request
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ContactPage() {
  return (
    <div className="swag-redesign">
      <PageHero
        eyebrow="Contact"
        title="Let's talk swag"
        subtitle="Planning a big order, a branded store, or recurring gifting? Tell us what you need and we'll help you get it out the door."
      />

      {/* Quick message */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <QuickContactForm />
          <ContactDetails />
        </div>
      </Section>

      {/* Detailed order request */}
      <Section muted>
        <SectionHeading
          eyebrow="Bulk & custom"
          title="Order Request Form"
          subtitle="Share your product details, quantities, artwork, and delivery needs — we'll come back with a tailored quote."
        />
        <div className="mt-10 mx-auto max-w-4xl">
          <OrderRequestForm />
        </div>
      </Section>
    </div>
  );
}
