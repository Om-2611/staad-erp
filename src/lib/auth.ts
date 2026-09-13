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

/** True if this profile may use the intern self-service tools (attendance,
 * work logs, tasks, academic details) — either because they *are* an intern,
 * or because they're an admin who's also been granted that access (e.g. a
 * co-founder who wants to track their own attendance/tasks too). */
export function canUseInternPortal(profile: Pick<Profile, "role" | "has_intern_access">): boolean {
  return profile.role === "intern" || (profile.role === "admin" && profile.has_intern_access);
}

/**
 * Guard for the /intern/* portal and its server actions. Unlike
 * requireRole("intern"), this also admits an admin with has_intern_access —
 * everything downstream (attendance, worklogs, tasks) already scopes by
 * profile.id, so it works the same for either.
 */
export async function requireInternPortalAccess(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/unauthorized");
  if (!canUseInternPortal(profile)) redirect(ROLE_HOME[profile.role]);

  return profile;
}
