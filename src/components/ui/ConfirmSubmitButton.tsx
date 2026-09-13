"use client";

import { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";

interface ConfirmSubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  confirmMessage: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
}

/**
 * A submit button that shows a native confirm() prompt before letting the
 * form submit go through — used for destructive actions (delete account)
 * where a stray click shouldn't be enough to trigger it.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    />
  );
}
