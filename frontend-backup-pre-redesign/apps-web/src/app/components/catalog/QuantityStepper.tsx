"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Input } from "@heroui/react";
import { Minus, Plus } from "lucide-react";

type QuantityStepperProps = {
  label: string;
  value: number;
  minValue: number;
  onChange: (value: number) => void;
  maxValue?: number;
  disabled?: boolean;
  helperText?: string;
};

export function QuantityStepper({
  label,
  value,
  minValue,
  onChange,
  maxValue,
  disabled,
  helperText
}: QuantityStepperProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const getValidationMessage = (nextValue: number) => {
    if (nextValue < minValue) {
      return `Minimum quantity is ${minValue}.`;
    }

    if (maxValue && maxValue > 0 && nextValue > maxValue) {
      return `Maximum available quantity is ${maxValue}.`;
    }

    return null;
  };

  const parsedInputValue = useMemo(() => {
    if (!inputValue.trim()) return null;
    const parsed = Number.parseInt(inputValue, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [inputValue]);

  const stepBaseValue = parsedInputValue ?? value;

  const applyStepperValue = (nextValue: number) => {
    let safeValue = Math.max(minValue, Math.floor(nextValue));

    if (maxValue && maxValue > 0) {
      safeValue = Math.min(safeValue, maxValue);
    }

    setInputValue(String(safeValue));
    setValidationMessage(null);
    onChange(safeValue);
  };

  const handleInputChange = (nextRawValue: string) => {
    const sanitizedValue = nextRawValue.replace(/[^\d]/g, "");

    setInputValue(sanitizedValue);

    if (!sanitizedValue) {
      setValidationMessage(null);
      return;
    }

    const nextValue = Number.parseInt(sanitizedValue, 10);

    if (!Number.isFinite(nextValue)) {
      setValidationMessage("Enter a valid quantity.");
      return;
    }

    setValidationMessage(getValidationMessage(nextValue));
    onChange(nextValue);
  };

  const handleBlur = () => {
    if (!inputValue.trim()) {
      const fallbackValue = Math.max(value, minValue);
      setInputValue(String(fallbackValue));
      setValidationMessage(null);
      onChange(fallbackValue);
      return;
    }

    const nextValue = Number.parseInt(inputValue, 10);

    if (!Number.isFinite(nextValue)) {
      const fallbackValue = Math.max(value, minValue);
      setInputValue(String(fallbackValue));
      setValidationMessage(null);
      onChange(fallbackValue);
      return;
    }

    setInputValue(String(nextValue));
    setValidationMessage(getValidationMessage(nextValue));
  };

  const canDecrement = !disabled && stepBaseValue > minValue;
  const canIncrement = !disabled && !(maxValue && maxValue > 0 && stepBaseValue >= maxValue);

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-black">{label}</div>

      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white p-2 shadow-sm">
        <Button
          isIconOnly
          size="sm"
          radius="full"
          variant="light"
          isDisabled={!canDecrement}
          onPress={() => applyStepperValue(stepBaseValue - 1)}
        >
          <Minus className="size-4" />
        </Button>

        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={label}
          value={inputValue}
          onValueChange={handleInputChange}
          onBlur={handleBlur}
          isDisabled={disabled}
          isInvalid={Boolean(validationMessage)}
          className="w-24"
          classNames={{
            inputWrapper: "border-none bg-transparent shadow-none",
            input: "text-center text-base font-semibold [appearance:textfield]",
            innerWrapper: "justify-center"
          }}
        />

        <Button
          isIconOnly
          size="sm"
          radius="full"
          variant="light"
          isDisabled={!canIncrement}
          onPress={() => applyStepperValue(stepBaseValue + 1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {validationMessage ? (
        <div className="text-xs text-danger">{validationMessage}</div>
      ) : helperText ? (
        <div className="text-xs text-black/55">{helperText}</div>
      ) : null}
    </div>
  );
}