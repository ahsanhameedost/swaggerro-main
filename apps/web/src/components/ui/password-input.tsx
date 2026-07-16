"use client";

import { forwardRef, useState, type ComponentProps } from "react";
import { Input } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";

type InputProps = ComponentProps<typeof Input>;

/**
 * A password field with a show/hide (eye) toggle. Drop-in replacement for
 * HeroUI's <Input type="password"> — forwards all Input props (label, register
 * spread, startContent, classNames, etc.) and adds the visibility button.
 */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type" | "endContent">>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        endContent={
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
            onClick={() => setVisible((v) => !v)}
            className="flex items-center justify-center text-foreground/45 outline-none transition-colors hover:text-foreground/70 focus:outline-none"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />
    );
  }
);
