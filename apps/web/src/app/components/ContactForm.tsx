"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Textarea } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitContact } from "@/lib/contact";
import { Mail, Phone, User } from "lucide-react";

const schema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  contactName: z.string().min(2, "Name is too short").max(120),
  email: z.string().email("Invalid email").max(200),
  phone: z.string().min(6, "Phone too short").max(30),
  shippingAddress: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  eventName: z.string().max(200).optional(),
  inHandDate: z.string().optional(),
  budget: z.string().max(100).optional(),
  artworkReady: z.string().max(100).optional(),
  additionalNotes: z.string().max(4000).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContactForm() {
  const [loading, setLoading] = useState(false);

  const defaultValues = useMemo<FormValues>(
    () => ({ companyName: "", contactName: "", email: "", phone: "" }),
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      await submitContact(values);
      addToast({
        title: "Sent",
        description: "Thanks! We received your message.",
        color: "success",
      });
      reset(defaultValues);
    } catch (e: any) {
      addToast({
        title: "Failed",
        description: e?.message ?? "Could not send message",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <Card className="w-full max-w-xl">
      <CardHeader className="flex flex-col items-start gap-1">
        <span className="font-semibold">Contact us</span>
        <p className="text-sm text-foreground/70">Send a message while we’re building the full app.</p>
      </CardHeader>

      <CardBody>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Input
            label="Company name"
            placeholder="Acme Inc."
            isInvalid={!!errors.companyName}
            errorMessage={errors.companyName?.message}
            {...register("companyName")}
          />

          <Input
            label="Contact name"
            placeholder="John Doe"
            startContent={<User className="size-4" />}
            isInvalid={!!errors.contactName}
            errorMessage={errors.contactName?.message}
            {...register("contactName")}
          />

          <Input
            label="Email"
            placeholder="john@example.com"
            startContent={<Mail className="size-4" />}
            isInvalid={!!errors.email}
            errorMessage={errors.email?.message}
            {...register("email")}
          />

          <Input
            label="Phone"
            placeholder="+92 300 1234567"
            startContent={<Phone className="size-4" />}
            isInvalid={!!errors.phone}
            errorMessage={errors.phone?.message}
            {...register("phone")}
          />

          <Input
            label="Shipping address"
            placeholder="123 Main St"
            isInvalid={!!errors.shippingAddress}
            errorMessage={errors.shippingAddress?.message}
            {...register("shippingAddress")}
          />

          <div className="flex gap-4">
            <Input
              label="City"
              placeholder="New York"
              isInvalid={!!errors.city}
              errorMessage={errors.city?.message}
              {...register("city")}
            />
            <Input
              label="State"
              placeholder="NY"
              isInvalid={!!errors.state}
              errorMessage={errors.state?.message}
              {...register("state")}
            />
            <Input
              label="Zip"
              placeholder="10001"
              isInvalid={!!errors.zip}
              errorMessage={errors.zip?.message}
              {...register("zip")}
            />
          </div>

          <Input
            label="Event name"
            placeholder="Annual Conference 2026"
            isInvalid={!!errors.eventName}
            errorMessage={errors.eventName?.message}
            {...register("eventName")}
          />

          <Input
            label="In-hand date"
            type="date"
            isInvalid={!!errors.inHandDate}
            errorMessage={errors.inHandDate?.message}
            {...register("inHandDate")}
          />

          <Input
            label="Budget"
            placeholder="$5,000"
            isInvalid={!!errors.budget}
            errorMessage={errors.budget?.message}
            {...register("budget")}
          />

          <Input
            label="Artwork ready?"
            placeholder="Yes / No / Need help"
            isInvalid={!!errors.artworkReady}
            errorMessage={errors.artworkReady?.message}
            {...register("artworkReady")}
          />

          <Textarea
            label="Additional notes"
            placeholder="Anything else we should know?"
            minRows={5}
            isInvalid={!!errors.additionalNotes}
            errorMessage={errors.additionalNotes?.message}
            {...register("additionalNotes")}
          />

          <Button color="primary" type="submit" isLoading={loading}>
            Submit
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}