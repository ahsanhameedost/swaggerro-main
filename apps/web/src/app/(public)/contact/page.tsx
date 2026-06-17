"use client";

import { useMemo, useState } from "react";
import { addToast } from "@heroui/toast";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
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
import {
  BriefcaseBusiness,
  CalendarDays,
  Mail,
  MapPin,
  Package2,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  User2,
} from "lucide-react";

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

export default function ContactPage() {
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });

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
    } catch (e: any) {
      addToast({
        title: "Submission failed",
        description: e?.message ?? "Could not send message",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <main className="min-h-screen bg-[#060606] text-white">
      <div className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(232,33,37,0.22), transparent 28%), radial-gradient(circle at top right, rgba(196,30,58,0.20), transparent 24%)",
          }}
        />

        <div className="relative container flex min-h-screen items-center py-8">
          <div className="grid w-full gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="hidden border border-white/10 bg-white/[0.03] text-white shadow-2xl lg:block">
              <CardBody className="flex h-full flex-col justify-between gap-8 p-7">
                <div className="space-y-6">
                  <Chip
                    variant="flat"
                    className="border border-white/10 bg-white/10 text-white"
                    startContent={<Sparkles className="size-4" />}
                  >
                    Swaggeroo Order Request
                  </Chip>

                  <div className="space-y-3">
                    <div>
                      <h1 className="text-3xl font-semibold leading-tight">
                        Share your project and we’ll turn it into a clear custom quote.
                      </h1>
                      <p className="mt-3 text-sm leading-6 text-white/65">
                        Submit your request with product details, quantities, artwork, and delivery needs.
                        Our team will review everything and come back with the best-fit options for your brand.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <InfoRow
                      icon={<BriefcaseBusiness className="size-4" />}
                      label="Tailored product recommendations"
                      value="We match your request with styles, decoration methods, and budget-friendly options."
                    />
                    <InfoRow
                      icon={<Package2 className="size-4" />}
                      label="Built around your order details"
                      value="Quantities, colors, branding notes, and product preferences help us prepare an accurate quote."
                    />
                    <InfoRow
                      icon={<CalendarDays className="size-4" />}
                      label="Fast review from our team"
                      value="Once submitted, we review your request and follow up with next steps and pricing."
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
                  Swaggeroo East LLC — Custom promotional products, branded apparel, and company swag solutions.
                </div>
              </CardBody>
            </Card>

            <Card className="border border-white/10 bg-white text-foreground shadow-2xl">
              <CardHeader className="flex flex-col items-start gap-3 border-b border-divider px-5 py-5 sm:px-7">
                <div className="flex items-center gap-3 lg:hidden">
                  <div
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white"
                    style={{ background: "var(--primary-gradient)" }}
                  >
                    S
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/70">Swaggeroo</p>
                    <h2 className="text-xl font-semibold">Order Request Form</h2>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <h2 className="text-2xl font-semibold">Order Request Form</h2>
                  <p className="mt-1 text-sm text-foreground/60">
                    Share your project details and product requirements.
                  </p>
                </div>
              </CardHeader>

              <CardBody className="px-5 py-5 sm:px-7">
                <form className="space-y-6" onSubmit={onSubmit}>
                  <section className="space-y-4">
                    <SectionTitle number="01" title="Customer Information" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Company Name"
                        placeholder="Acme Corp"
                        startContent={<BriefcaseBusiness className="size-4 text-foreground/40" />}
                        isRequired
                        isInvalid={!!errors.companyName}
                        errorMessage={errors.companyName?.message}
                        {...register("companyName")}
                      />
                      <Input
                        label="Contact Name"
                        placeholder="John Smith"
                        startContent={<User2 className="size-4 text-foreground/40" />}
                        isRequired
                        isInvalid={!!errors.contactName}
                        errorMessage={errors.contactName?.message}
                        {...register("contactName")}
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="john@company.com"
                        startContent={<Mail className="size-4 text-foreground/40" />}
                        isRequired
                        isInvalid={!!errors.email}
                        errorMessage={errors.email?.message}
                        {...register("email")}
                      />
                      <Input
                        label="Phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        startContent={<Phone className="size-4 text-foreground/40" />}
                        isRequired
                        isInvalid={!!errors.phone}
                        errorMessage={errors.phone?.message}
                        {...register("phone")}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-12">
                      <div className="md:col-span-6">
                        <Input
                          label="Shipping Address"
                          placeholder="123 Main St"
                          startContent={<MapPin className="size-4 text-foreground/40" />}
                          isRequired
                          isInvalid={!!errors.shippingAddress}
                          errorMessage={errors.shippingAddress?.message}
                          {...register("shippingAddress")}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="City"
                          placeholder="Atlanta"
                          isRequired
                          isInvalid={!!errors.city}
                          errorMessage={errors.city?.message}
                          {...register("city")}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="State"
                          placeholder="GA"
                          isRequired
                          isInvalid={!!errors.state}
                          errorMessage={errors.state?.message}
                          {...register("state")}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          label="ZIP"
                          placeholder="30301"
                          isRequired
                          isInvalid={!!errors.zip}
                          errorMessage={errors.zip?.message}
                          {...register("zip")}
                        />
                      </div>
                    </div>
                  </section>

                  <Divider />

                  <section className="space-y-4">
                    <SectionTitle number="02" title="Project Details" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="Event / Project Name"
                        placeholder="Q2 Trade Show"
                        isRequired
                        isInvalid={!!errors.eventName}
                        errorMessage={errors.eventName?.message}
                        {...register("eventName")}
                      />

                      <Input
                        label="In-Hand Date"
                        type="date"
                        isRequired
                        isInvalid={!!errors.inHandDate}
                        errorMessage={errors.inHandDate?.message}
                        {...register("inHandDate")}
                      />

                      <Input
                        label="Budget"
                        placeholder="$"
                        isRequired
                        isInvalid={!!errors.budget}
                        errorMessage={errors.budget?.message}
                        {...register("budget")}
                      />

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
                          <Card
                            key={field.id}
                            className="border border-divider bg-content1 shadow-none"
                          >
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
                                    <p className="text-xs text-foreground/55">
                                      Complete all fields for each item
                                    </p>
                                  </div>
                                </div>

                                {fields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="light"
                                    color="danger"
                                    isIconOnly
                                    onPress={() => remove(index)}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                )}
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <Input
                                  label="Product Category"
                                  placeholder="T-Shirts"
                                  isRequired
                                  isInvalid={!!itemError?.category}
                                  errorMessage={itemError?.category?.message}
                                  {...register(`products.${index}.category`)}
                                />

                                <Input
                                  label="Total Quantity"
                                  placeholder="100"
                                  isRequired
                                  isInvalid={!!itemError?.quantity}
                                  errorMessage={itemError?.quantity?.message}
                                  {...register(`products.${index}.quantity`)}
                                />

                                <Input
                                  label="Product Description / Specific Item"
                                  placeholder="Gildan 5000 tee"
                                  isRequired
                                  isInvalid={!!itemError?.description}
                                  errorMessage={itemError?.description?.message}
                                  {...register(`products.${index}.description`)}
                                />

                                <Input
                                  label="Color(s)"
                                  placeholder="Black, White"
                                  isRequired
                                  isInvalid={!!itemError?.colors}
                                  errorMessage={itemError?.colors?.message}
                                  {...register(`products.${index}.colors`)}
                                />

                                <Input
                                  label="Target Unit Price"
                                  placeholder="12.50"
                                  isRequired
                                  isInvalid={!!itemError?.targetPrice}
                                  errorMessage={itemError?.targetPrice?.message}
                                  {...register(`products.${index}.targetPrice`)}
                                />

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
                                  <Input
                                    label="Decoration Notes"
                                    placeholder="Left chest logo, 2 colors, 3 inches wide"
                                    isRequired
                                    isInvalid={!!itemError?.decorationNotes}
                                    errorMessage={itemError?.decorationNotes?.message}
                                    {...register(`products.${index}.decorationNotes`)}
                                  />
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

                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      type="submit"
                      size="lg"
                      isLoading={loading}
                      className="h-12 text-base font-semibold text-white"
                      style={{ background: "var(--primary-gradient)" }}
                    >
                      Submit Order Request
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-white/80">{icon}</div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs leading-5 text-white/55">{value}</p>
      </div>
    </div>
  );
}