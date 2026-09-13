import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/database.types";

const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  intern: "/intern/dashboard",
  viewer: "/viewer/dashboard",
};

/** Returns the signed-in user's profile, or null if not signed in / no profile row. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

/**
 * Server Component / Server Action guard. Redirects to /login if signed out,
 * to /unauthorized if the account is inactive, or to the caller's own portal
 * home if they're signed in with the wrong role. Returns the profile on success.
 */
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/unauthorized");
  if (profile.role !== role) redirect(ROLE_HOME[profile.role]);

  return profile;
}

export function homeForRole(role: Role) {
  return ROLE_HOME[role];
}

/**
 * Server Component / Server Action guard for pages any signed-in, active
 * role can reach (e.g. /settings) — no role check, just signed-in + active.
 */
export async function requireActiveProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/unauthorized");

  return profile;
}
