"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayISO } from "@/lib/dates";
import { parseEmail } from "@/lib/validation";
import type {
  AccountStatus,
  AttendanceStatus,
  AnnouncementVisibility,
  ViewerScope,
} from "@/lib/database.types";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function generateTempPassword() {
  // Readable-ish random password: e.g. "8f2c1a9d4b7e6031"
  return crypto.randomBytes(8).toString("hex");
}

export interface CreateAccountState {
  error?: string;
  success?: boolean;
  email?: string;
  tempPassword?: string;
}

// ----------------------------------------------------------------------------
// Approvals
// ----------------------------------------------------------------------------
export async function approveWorkLog(formData: FormData) {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const isMilestone = formData.get("is_milestone") === "on";
  const remark = String(formData.get("remark") ?? "").trim() || null;

  const { error } = await supabase
    .from("worklogs")
    .update({
      status: "approved",
      admin_remark: remark,
      is_milestone: isMilestone,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) fail("/admin/approvals", "Could not approve this work log.");

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/dashboard");
}

export async function rejectWorkLog(formData: FormData) {
  const profile = await requireRole("admin");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const remark = String(formData.get("remark") ?? "").trim();

  if (!remark) fail("/admin/approvals", "Please add a comment explaining the rejection.");

  const { error } = await supabase
    .from("worklogs")
    .update({
      status: "rejected",
      admin_remark: remark,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) fail("/admin/approvals", "Could not reject this work log.");

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/dashboard");
}

// ----------------------------------------------------------------------------
// Teams — resolve an existing team id, or create one on the fly when the
// caller picked "+ Create new team" inline (used by the intern/viewer
// creation forms so admins never have to leave the page just to add a team).
// ----------------------------------------------------------------------------
async function resolveTeamId(
  admin: ReturnType<typeof createAdminClient>,
  formData: FormData
): Promise<{ teamId: string | null; error?: string }> {
  const rawTeamId = String(formData.get("team_id") ?? "");

  if (rawTeamId !== "__new__") {
    return { teamId: rawTeamId || null };
  }

  const newName = String(formData.get("new_team_name") ?? "").trim();
  if (!newName) return { teamId: null, error: "Enter a name for the new team." };

  const { data: existing } = await admin.from("teams").select("id").ilike("name", newName).maybeSingle();
  if (existing) return { teamId: existing.id };

  const { data: created, error } = await admin.from("teams").insert({ name: newName }).select("id").single();
  if (error || !created) {
    return { teamId: null, error: "Could not create that team — try a different name." };
  }
  return { teamId: created.id };
}

// ----------------------------------------------------------------------------
// Interns / accounts
// ----------------------------------------------------------------------------
export async function createIntern(
  _prev: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const emailResult = parseEmail(formData.get("email"));
  if (!emailResult.ok) return { error: emailResult.error };
  const email = emailResult.email;

  const admin = createAdminClient();

  const teamResult = await resolveTeamId(admin, formData);
  if (teamResult.error) return { error: teamResult.error };
  const teamId = teamResult.teamId;

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return { error: createErr?.message ?? "Could not create account." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    name,
    email,
    role: "intern",
    team_id: teamId,
    status: "active",
    joined_date: todayISO(),
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileErr.message };
  }

  revalidatePath("/admin/interns");
  revalidatePath("/admin/teams");
  return { success: true, email, tempPassword };
}

export async function updateInternTeam(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const userId = String(formData.get("user_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "") || null;

  const { error } = await supabase.from("profiles").update({ team_id: teamId }).eq("id", userId);
  if (error) fail("/admin/interns", "Could not update team assignment.");

  revalidatePath("/admin/interns");
}

export async function setAccountStatus(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const userId = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "active") as AccountStatus;

  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) fail("/admin/interns", "Could not update account status.");

  revalidatePath("/admin/interns");
  revalidatePath("/admin/viewers");
}

/**
 * Permanently deletes an intern or viewer account — the auth user, their
 * profile row, and (via FK cascade) every attendance record, work log, and
 * viewer-team-access row they own. Unlike deactivating, this cannot be
 * undone, so the UI confirms with the admin before ever submitting this.
 * Refuses to delete admin accounts (those aren't exposed to this action from
 * the UI at all, but the guard stays here too for defense in depth).
 */
export async function deleteAccount(formData: FormData) {
  const actor = await requireRole("admin");
  const userId = String(formData.get("user_id") ?? "");
  const redirectPath = String(formData.get("redirect_path") ?? "/admin/interns");

  if (!userId) fail(redirectPath, "No account specified.");
  if (userId === actor.id) fail(redirectPath, "You can't delete your own account.");

  const admin = createAdminClient();

  const { data: target } = await admin.from("profiles").select("role, name").eq("id", userId).single();
  if (!target) fail(redirectPath, "Account not found — it may already be deleted.");
  if (target.role === "admin") fail(redirectPath, "Admin accounts can't be deleted from here.");

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) fail(redirectPath, `Could not delete ${target.name}: ${error.message}`);

  revalidatePath("/admin/interns");
  revalidatePath("/admin/viewers");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/dashboard");
}

// ----------------------------------------------------------------------------
// Teams
// ----------------------------------------------------------------------------
export async function createTeam(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) fail("/admin/teams", "Team name is required.");

  const { error } = await supabase.from("teams").insert({ name, description });
  if (error) fail("/admin/teams", "Could not create team — name may already exist.");

  revalidatePath("/admin/teams");
}

export async function updateTeam(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  const { error } = await supabase.from("teams").update({ name, description }).eq("id", id);
  if (error) fail("/admin/teams", "Could not update team.");

  revalidatePath("/admin/teams");
}

// ----------------------------------------------------------------------------
// Attendance corrections (manual, audit-logged)
// ----------------------------------------------------------------------------
export async function correctAttendance(formData: FormData) {
  const profile = await requireRole("admin");
  const supabase = await createClient();

  const userId = String(formData.get("user_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const status = String(formData.get("status") ?? "present") as AttendanceStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!userId || !date) fail("/admin/attendance", "Intern and date are required.");

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("attendance")
      .update({ status, notes, marked_by: "admin" })
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase
      .from("attendance")
      .insert({ user_id: userId, date, status, notes, marked_by: "admin" }));
  }

  if (error) fail("/admin/attendance", "Could not save the correction.");

  await supabase.from("audit_log").insert({
    actor_id: profile.id,
    action: existing ? "attendance_corrected" : "attendance_manually_added",
    target_table: "attendance",
    target_id: existing?.id ?? null,
    details: { user_id: userId, date, status, notes },
  });

  revalidatePath("/admin/attendance");
}

// ----------------------------------------------------------------------------
// Announcements
// ----------------------------------------------------------------------------
export async function createAnnouncement(formData: FormData) {
  const profile = await requireRole("admin");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const visibleTo = String(formData.get("visible_to") ?? "all") as AnnouncementVisibility;
  const teamId = String(formData.get("team_id") ?? "") || null;

  if (!title || !body) fail("/admin/announcements", "Title and body are required.");

  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    created_by: profile.id,
    visible_to: visibleTo,
    team_id: visibleTo === "team" ? teamId : null,
  });

  if (error) fail("/admin/announcements", "Could not post announcement.");

  revalidatePath("/admin/announcements");
  revalidatePath("/intern/dashboard");
}

export async function deleteAnnouncement(formData: FormData) {
  await requireRole("admin");
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/admin/announcements");
}

// ----------------------------------------------------------------------------
// Viewers (leadership accounts)
// ----------------------------------------------------------------------------
export async function createViewer(
  _prev: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  const scope = String(formData.get("viewer_scope") ?? "all") as ViewerScope;
  const teamIds = formData.getAll("team_ids").map(String).filter(Boolean);

  if (!name) return { error: "Name is required." };

  const emailResult = parseEmail(formData.get("email"));
  if (!emailResult.ok) return { error: emailResult.error };
  const email = emailResult.email;

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return { error: createErr?.message ?? "Could not create account." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    name,
    email,
    role: "viewer",
    status: "active",
    viewer_scope: scope,
    joined_date: todayISO(),
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileErr.message };
  }

  if (scope === "team" && teamIds.length > 0) {
    await admin
      .from("viewer_team_access")
      .insert(teamIds.map((teamId) => ({ viewer_id: created.user.id, team_id: teamId })));
  }

  revalidatePath("/admin/viewers");
  return { success: true, email, tempPassword };
}
