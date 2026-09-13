import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();

export function parseEmail(value: FormDataEntryValue | null): { ok: true; email: string } | { ok: false; error: string } {
  const result = emailSchema.safeParse(String(value ?? ""));
  if (!result.success) return { ok: false, error: "Please enter a valid email address." };
  return { ok: true, email: result.data };
}
