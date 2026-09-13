import Link from "next/link";
import { CalendarCheck, ListChecks, Megaphone, Clock, ArrowRight, ClipboardList } from "lucide-react";
import { requireInternPortalAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO, formatDateTime, currentMonthRange } from "@/lib/dates";
import { Alert } from "@/components/ui/PageHeader";
import { StatCard, Card } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { checkIn, checkOut, markDayStatus } from "@/app/intern/actions";

const FREQUENCY_LABEL = { daily: "Day-to-day", weekly: "Weekly", monthly: "Monthly" } as const;

export default async function InternDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await requireInternPortalAccess();
  const supabase = await createClient();
  const today = todayISO();
  const { start: monthStart, end: monthEnd } = currentMonthRange();

  const [{ data: todayAttendance }, { data: monthAttendance }, { data: recentLogs }, { data: announcements }, { data: tasks }] =
    await Promise.all([
      supabase.from("attendance").select("*").eq("user_id", profile.id).eq("date", today).maybeSingle(),
      supabase
        .from("attendance")
        .select("status")
        .eq("user_id", profile.id)
        .gte("date", monthStart)
        .lte("date", monthEnd),
      supabase
        .from("worklogs")
        .select("*")
        .eq("user_id", profile.id)
        .order("date", { ascending: false })
        .limit(5),
      supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3),
      // RLS scopes this to: tasks assigned to me, to my team, or org-wide.
      supabase.from("tasks").select("*").eq("is_active", true).order("frequency"),
    ]);

  const presentDays = (monthAttendance ?? []).filter((a) => a.status === "present").length;
  const totalMarked = monthAttendance?.length ?? 0;
  const attendancePct = totalMarked ? Math.round((presentDays / totalMarked) * 100) : 0;
  const pendingCount = (recentLogs ?? []).filter((w) => w.status === "pending").length;

  return (
    <div>
      <div className="brand-gradient relative mb-6 overflow-hidden rounded-2xl px-6 py-7 text-white shadow-lg shadow-indigo-500/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/10" />
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {profile.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-white/80">Here&apos;s your day at a glance.</p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="This month attendance"
          value={`${attendancePct}%`}
          hint={`${presentDays}/${totalMarked} days present`}
          icon={CalendarCheck}
          accent="emerald"
        />
        <StatCard
          label="Today's status"
          value={todayAttendance ? todayAttendance.status : "Not marked"}
          icon={Clock}
          accent="indigo"
        />
        <StatCard
          label="Pending submissions"
          value={pendingCount}
          hint="Awaiting admin review"
          icon={ListChecks}
          accent="amber"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarCheck className="h-4 w-4 text-emerald-600" /> Attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {todayAttendance
                ? `Marked ${todayAttendance.status} at ${formatDateTime(todayAttendance.check_in_time ?? todayAttendance.created_at)}`
                : "You haven't marked today's attendance yet."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!todayAttendance && (
                <>
                  <form action={checkIn}>
                    <Button type="submit">Check in (Present)</Button>
                  </form>
                  <form action={markDayStatus}>
                    <input type="hidden" name="status" value="leave" />
                    <Button type="submit" variant="secondary">
                      Mark as Leave
                    </Button>
                  </form>
                </>
              )}
              {todayAttendance && todayAttendance.status === "present" && !todayAttendance.check_out_time && (
                <form action={checkOut}>
                  <Button type="submit" variant="secondary">
                    Check out
                  </Button>
                </form>
              )}
              {todayAttendance?.check_out_time && (
                <span className="text-sm text-slate-500">
                  Checked out at {formatDateTime(todayAttendance.check_out_time)}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ListChecks className="h-4 w-4 text-indigo-600" /> Recent work logs
              </h2>
              <Link href="/intern/worklogs" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-slate-100">
              {(recentLogs ?? []).length === 0 && (
                <li className="py-4 text-sm text-slate-500">No submissions yet.</li>
              )}
              {(recentLogs ?? []).map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm text-slate-800 line-clamp-2">{log.description}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{log.date}</p>
                  </div>
                  <StatusBadge status={log.status} />
                </li>
              ))}
            </ul>
            <Link href="/intern/submit" className="mt-4 inline-block">
              <Button variant="secondary" size="sm">
                Submit today&apos;s work
              </Button>
            </Link>
          </Card>
        </div>

        <div className="space-y-6">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardList className="h-4 w-4 text-indigo-600" /> My Tasks
          </h2>
          <ul className="mt-3 space-y-2.5">
            {(tasks ?? []).length === 0 && <li className="text-sm text-slate-500">No tasks assigned right now.</li>}
            {(tasks ?? []).map((t) => (
              <li key={t.id} className="rounded-lg border border-slate-100 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-800">{t.title}</p>
                  <Badge className="shrink-0 bg-indigo-50 text-indigo-700">
                    {FREQUENCY_LABEL[t.frequency as keyof typeof FREQUENCY_LABEL]}
                  </Badge>
                </div>
                {t.description && <p className="mt-1 text-xs text-slate-500">{t.description}</p>}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Megaphone className="h-4 w-4 text-amber-600" /> Announcements
          </h2>
          <ul className="mt-3 space-y-3">
            {(announcements ?? []).length === 0 && (
              <li className="text-sm text-slate-500">No announcements yet.</li>
            )}
            {(announcements ?? []).map((a) => (
              <li key={a.id} className="rounded-lg bg-gradient-to-br from-slate-50 to-indigo-50/40 p-3">
                <p className="text-sm font-medium text-slate-900">{a.title}</p>
                <p className="mt-1 text-xs text-slate-600 line-clamp-3">{a.body}</p>
              </li>
            ))}
          </ul>
        </Card>
        </div>
      </div>
    </div>
  );
}
