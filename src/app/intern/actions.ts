"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import type { AttendanceStatus } from "@/lib/database.types";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/** Check in for today. One row per user per day (enforced by DB unique + RLS). */
export async function checkIn() {
  const profile = await requireRole("intern");
  const supabase = await createClient();

  const { error } = await supabase.from("attendance").insert({
    user_id: profile.id,
    date: todayISO(),
    check_in_time: new Date().toISOString(),
    status: "present",
    marked_by: "self",
  });

  if (error) {
    fail("/intern/dashboard", "You've already marked attendance today.");
  }

  revalidatePath("/intern/dashboard");
  revalidatePath("/intern/attendance");
}

/** Mark today as leave/absent instead of present (no check-in). */
export async function markDayStatus(formData: FormData) {
  const profile = await requireRole("intern");
  const supabase = await createClient();
  const status = String(formData.get("status") ?? "leave") as AttendanceStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("attendance").insert({
    user_id: profile.id,
    date: todayISO(),
    status,
    marked_by: "self",
    notes,
  });

  if (error) {
    fail("/intern/dashboard", "You've already marked attendance today.");
  }

  revalidatePath("/intern/dashboard");
  revalidatePath("/intern/attendance");
}

/** Record check-out time against today's existing attendance row. */
export async function checkOut() {
  const profile = await requireRole("intern");
  const supabase = await createClient();

  const { error } = await supabase
    .from("attendance")
    .update({ check_out_time: new Date().toISOString() })
    .eq("user_id", profile.id)
    .eq("date", todayISO());

  if (error) {
    fail("/intern/dashboard", "Could not record check-out. Mark attendance first.");
  }

  revalidatePath("/intern/dashboard");
  revalidatePath("/intern/attendance");
}

export async function submitWorkLog(formData: FormData) {
  const profile = await requireRole("intern");
  const supabase = await createClient();

  const description = String(formData.get("description") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;
  const timeSpentRaw = String(formData.get("time_spent_hours") ?? "").trim();
  const timeSpentMinutes = timeSpentRaw ? Math.round(parseFloat(timeSpentRaw) * 60) : null;
  const date = String(formData.get("date") ?? todayISO());

  if (!description) {
    fail("/intern/submit", "Please describe today's work before submitting.");
  }

  const { error } = await supabase.from("worklogs").insert({
    user_id: profile.id,
    team_id: profile.team_id,
    date,
    description,
    link,
    time_spent_minutes: timeSpentMinutes,
    status: "pending",
  });

  if (error) {
    fail("/intern/submit", "Could not submit work log. Please try again.");
  }

  revalidatePath("/intern/worklogs");
  revalidatePath("/intern/dashboard");
  redirect("/intern/worklogs?submitted=1");
}

/** Resubmit a rejected (or edit a still-pending) work log — resets status to pending. */
export async function resubmitWorkLog(formData: FormData) {
  const profile = await requireRole("intern");
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;
  const timeSpentRaw = String(formData.get("time_spent_hours") ?? "").trim();
  const timeSpentMinutes = timeSpentRaw ? Math.round(parseFloat(timeSpentRaw) * 60) : null;

  if (!id || !description) {
    fail("/intern/worklogs", "Description is required.");
  }

  const { error } = await supabase
    .from("worklogs")
    .update({
      description,
      link,
      time_spent_minutes: timeSpentMinutes,
      status: "pending",
      admin_remark: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", id)
    .eq("user_id", profile.id);

  if (error) {
    fail("/intern/worklogs", "Could not resubmit — it may already be approved.");
  }

  revalidatePath("/intern/worklogs");
  redirect("/intern/worklogs?resubmitted=1");
}
