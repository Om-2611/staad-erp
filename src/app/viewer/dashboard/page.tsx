import { Users, UserCheck, CalendarCheck, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getViewerTeamIds } from "@/lib/viewerScope";
import { todayISO, currentMonthRange } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/Card";

export default async function ViewerDashboardPage() {
  const profile = await requireRole("viewer");
  const supabase = await createClient();
  const teamIds = await getViewerTeamIds(profile);
  const today = todayISO();
  const { start: monthStart, end: monthEnd } = currentMonthRange();

  let internQuery = supabase.from("profiles").select("id").eq("role", "intern").eq("status", "active");
  if (teamIds) internQuery = internQuery.in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: interns } = await internQuery;
  const internIds = (interns ?? []).map((i) => i.id);

  const [{ data: todayAttendance }, { data: monthAttendance }, { count: pendingCount }, { count: approvedCount }] =
    await Promise.all([
      internIds.length
        ? supabase.from("attendance").select("user_id, status").eq("date", today).in("user_id", internIds)
        : Promise.resolve({ data: [] as { user_id: string; status: string }[] }),
      internIds.length
        ? supabase
            .from("attendance")
            .select("status")
            .gte("date", monthStart)
            .lte("date", monthEnd)
            .in("user_id", internIds)
        : Promise.resolve({ data: [] as { status: string }[] }),
      teamIds
        ? supabase
            .from("worklogs")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
            .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
        : supabase.from("worklogs").select("id", { count: "exact", head: true }).eq("status", "pending"),
      teamIds
        ? supabase
            .from("worklogs")
            .select("id", { count: "exact", head: true })
            .eq("status", "approved")
            .in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
        : supabase.from("worklogs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);

  const activeToday = (todayAttendance ?? []).filter((a) => a.status === "present").length;
  const presentDays = (monthAttendance ?? []).filter((a) => a.status === "present").length;
  const totalMarked = monthAttendance?.length ?? 0;
  const attendancePct = totalMarked ? Math.round((presentDays / totalMarked) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Organization Overview"
        description={teamIds ? "Scoped to your assigned team(s)." : "All teams and interns."}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total interns" value={internIds.length} icon={Users} accent="indigo" />
        <StatCard
          label="Active today"
          value={activeToday}
          hint={`out of ${internIds.length}`}
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          label="Attendance % (this month)"
          value={`${attendancePct}%`}
          icon={CalendarCheck}
          accent="sky"
        />
        <StatCard
          label="Work log submissions"
          value={`${approvedCount ?? 0} approved`}
          hint={`${pendingCount ?? 0} pending review`}
          icon={ClipboardList}
          accent="amber"
        />
      </div>
    </div>
  );
}
