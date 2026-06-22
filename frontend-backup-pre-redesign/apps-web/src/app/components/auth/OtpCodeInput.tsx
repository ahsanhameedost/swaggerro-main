"use client";

import { useMemo } from "react";
import { Input } from "@heroui/react";

type OtpCodeInputProps = {
  value: string;
  length?: number;
  onChange: (nextValue: string) => void;
  isDisabled?: boolean;
};

export function OtpCodeInput({
  value,
  length = 6,
  onChange,
  isDisabled
}: OtpCodeInputProps) {
  const digits = useMemo(() => {
    const chars = value.split("").slice(0, length);
    while (chars.length < length) chars.push("");
    return chars;
  }, [length, value]);

  const focusInput = (index: number) => {
    const element = document.getElementById(`otp-input-${index}`) as HTMLInputElement | null;
    element?.focus();
  };

  const updateAt = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(""));

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const onPaste = (text: string) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, length);
    if (!digitsOnly) return;
    onChange(digitsOnly);
    focusInput(Math.min(digitsOnly.length, length - 1));
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {digits.map((digit, index) => (
        <Input
          key={index}
          id={`otp-input-${index}`}
          value={digit}
          isDisabled={isDisabled}
          inputMode="numeric"
          maxLength={1}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              focusInput(index - 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            onPaste(event.clipboardData.getData("text"));
          }}
          onValueChange={(nextValue) => updateAt(index, nextValue)}
          classNames={{
            inputWrapper:
              "h-14 rounded-2xl border border-divider bg-content1 shadow-none data-[hover=true]:border-danger/40 group-data-[focus=true]:border-danger group-data-[focus=true]:ring-2 group-data-[focus=true]:ring-danger/20",
            input: "text-center text-xl font-semibold tracking-[0.25em]"
          }}
        />
      ))}
    </div>
  );
}
