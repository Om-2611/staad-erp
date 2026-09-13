"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile, canUseInternPortal } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Band } from "@/lib/database.types";

export interface SettingsState {
  error?: string;
  success?: string;
}

/**
 * Any signed-in user (any role) can update their own display name. This
 * intentionally bypasses the admin-only RLS policy on `profiles` by going
 * through the service-role client — but only ever touches the `name` field
 * on the caller's own row, so it can't be used to change role/team/status.
 */
export async function updateOwnName(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name can't be empty." };
  if (name.length > 120) return { error: "Name is too long." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ name }).eq("id", profile.id);

  if (error) return { error: "Could not update your name. Please try again." };

  revalidatePath("/settings", "layout");
  return { success: "Name updated." };
}

const VALID_BANDS: Band[] = ["A", "B", "C", "D"];

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

/**
 * Lets an intern fill in their own academic details — all optional, none of
 * this is used anywhere for access control. Intern-only: admin and viewer
 * profiles don't carry these fields in the UI.
 */
export async function updateAcademicDetails(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };
  if (!canUseInternPortal(profile)) return { error: "Academic details aren't available for this account." };

  const rollNumber = emptyToNull(formData.get("roll_number"));
  const year = emptyToNull(formData.get("year"));
  const branch = emptyToNull(formData.get("branch"));
  const section = emptyToNull(formData.get("section"));
  const backlog = emptyToNull(formData.get("backlog"));
  const spfBandRaw = emptyToNull(formData.get("spf_band"));
  const cdcBandRaw = emptyToNull(formData.get("cdc_band"));

  const spfBand = spfBandRaw && VALID_BANDS.includes(spfBandRaw as Band) ? (spfBandRaw as Band) : null;
  const cdcBand = cdcBandRaw && VALID_BANDS.includes(cdcBandRaw as Band) ? (cdcBandRaw as Band) : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      roll_number: rollNumber,
      year,
      branch,
      section,
      backlog,
      spf_band: spfBand,
      cdc_band: cdcBand,
    })
    .eq("id", profile.id);

  if (error) return { error: "Could not save academic details. Please try again." };

  revalidatePath("/settings", "layout");
  return { success: "Academic details saved." };
}

/**
 * Changes the signed-in user's password. Re-verifies the current password
 * first (a fresh signInWithPassword call) before applying the new one, so a
 * left-open session can't silently be used to lock the real owner out.
 */
export async function changePassword(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Fill in all three password fields." };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation don't match." };
  }
  if (newPassword === currentPassword) {
    return { error: "New password must be different from your current password." };
  }

  const supabase = await createClient();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword,
  });
  if (reauthError) {
    return { error: "Current password is incorrect." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { error: updateError.message || "Could not update your password." };
  }

  return { success: "Password changed successfully." };
}
