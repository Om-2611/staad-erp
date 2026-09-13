"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
