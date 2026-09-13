import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Layers,
  CalendarDays,
  GraduationCap,
  CalendarCheck,
  ListChecks,
  ClipboardList,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, minutesToLabel } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody, StatCard } from "@/components/ui/Card";
import { Avatar, StatusBadge, Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { ResetPasswordButton } from "@/components/ui/ResetPasswordButton";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";
import { updateInternTeam, setAccountStatus, deleteAccount } from "@/app/admin/actions";

const FREQUENCY_LABEL = { daily: "Day-to-day", weekly: "Weekly", monthly: "Monthly" } as const;

export default async function AdminInternDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("admin");
  const supabase = await createClient();

  const { data: internRaw } = await supabase
    .from("profiles")
    .select("*, teams!team_id(name)")
    .eq("id", id)
    .eq("role", "intern")
    .maybeSingle();

  if (!internRaw) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intern: any = internRaw;

  const [{ data: teams }, { data: attendance }, { data: worklogs }, { data: tasks }] = await Promise.all([
    supabase.from("teams").select("*").order("name"),
    supabase.from("attendance").select("*").eq("user_id", id).order("date", { ascending: false }).limit(90),
    supabase.from("worklogs").select("*").eq("user_id", id).order("date", { ascending: false }),
    supabase.from("tasks").select("*").eq("assigned_to", id).order("created_at", { ascending: false }),
  ]);

  const attendanceRows = attendance ?? [];
  const worklogRows = worklogs ?? [];
  const taskRows = tasks ?? [];

  const presentDays = attendanceRows.filter((a) => a.status === "present").length;
  const attendancePct = attendanceRows.length ? Math.round((presentDays / attendanceRows.length) * 100) : 0;
  const approvedCount = worklogRows.filter((w) => w.status === "approved").length;
  const pendingCount = worklogRows.filter((w) => w.status === "pending").length;
  const totalMinutes = worklogRows.reduce((sum, w) => sum + (w.time_spent_minutes ?? 0), 0);

  const academicFields: [string, string | null][] = [
    ["Roll number", intern.roll_number],
    ["Year", intern.year],
    ["Branch", intern.branch],
    ["Section", intern.section],
    ["SPF Band", intern.spf_band],
    ["CDC Band", intern.cdc_band],
    ["Backlog", intern.backlog],
  ];
  const setAcademicFields = academicFields.filter(([, v]) => v);

  return (
    <div>
      <Link href="/admin/interns" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Interns
      </Link>

      <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={intern.name} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">{intern.name}</h1>
                <StatusBadge status={intern.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {intern.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> {intern.teams?.name ?? "Unassigned"}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Joined {formatDate(intern.joined_date)}
                </span>
              </div>
            </div>
          </div>

          <DownloadPdfButton
            filename={`${intern.name.replace(/\s+/g, "-")}-full-report`}
            title={`Intern Report — ${intern.name}`}
            meta={[
              `Email: ${intern.email}`,
              `Team: ${intern.teams?.name ?? "Unassigned"}`,
              `Status: ${intern.status}`,
              ...setAcademicFields.map(([label, value]) => `${label}: ${value}`),
            ]}
            stats={[
              { label: "Attendance", value: `${attendancePct}%` },
              { label: "Approved logs", value: approvedCount },
              { label: "Pending logs", value: pendingCount },
              { label: "Time logged", value: minutesToLabel(totalMinutes) },
            ]}
            sections={[
              {
                heading: "Attendance",
                columns: ["Date", "Status"],
                rows: attendanceRows.map((a) => [formatDate(a.date), a.status]),
              },
              {
                heading: "Work Logs",
                columns: ["Date", "Status", "Description", "Milestone"],
                rows: worklogRows.map((w) => [formatDate(w.date), w.status, w.description, w.is_milestone ? "Yes" : ""]),
              },
            ]}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <ResetPasswordButton userId={intern.id} userName={intern.name} />
          <form action={updateInternTeam} className="flex items-center gap-1.5">
            <input type="hidden" name="user_id" value={intern.id} />
            <Select name="team_id" defaultValue={intern.team_id ?? ""} className="!py-1.5 text-xs">
              <option value="">Unassigned</option>
              {(teams ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <Button type="submit" size="sm" variant="secondary">
              Save team
            </Button>
          </form>
          <form action={setAccountStatus}>
            <input type="hidden" name="user_id" value={intern.id} />
            <input type="hidden" name="status" value={intern.status === "active" ? "inactive" : "active"} />
            <Button type="submit" size="sm" variant={intern.status === "active" ? "danger" : "secondary"}>
              {intern.status === "active" ? "Deactivate" : "Reactivate"}
            </Button>
          </form>
          <form action={deleteAccount}>
            <input type="hidden" name="user_id" value={intern.id} />
            <input type="hidden" name="redirect_path" value="/admin/interns" />
            <ConfirmSubmitButton
              size="sm"
              variant="ghost"
              confirmMessage={`Permanently delete ${intern.name}? This removes their account and ALL of their attendance and work log history. This cannot be undone.`}
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>

        {setAcademicFields.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
            {setAcademicFields.map(([label, value]) => (
              <div key={label}>
                <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {label === "Roll number" && <GraduationCap className="h-3 w-3" />} {label}
                </p>
                <p className="text-sm text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Attendance" value={`${attendancePct}%`} hint={`${presentDays}/${attendanceRows.length} days`} icon={CalendarCheck} accent="emerald" />
        <StatCard label="Approved logs" value={approvedCount} icon={ListChecks} accent="indigo" />
        <StatCard label="Pending logs" value={pendingCount} icon={ClipboardList} accent="amber" />
        <StatCard label="Time logged" value={minutesToLabel(totalMinutes)} icon={CalendarDays} accent="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Attendance history</h2>
          <Table>
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Marked by</Th>
              </Tr>
            </Thead>
            <Tbody>
              {attendanceRows.map((a) => (
                <Tr key={a.id}>
                  <Td>{formatDate(a.date)}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td className="capitalize">{a.marked_by}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {attendanceRows.length === 0 && <EmptyState message="No attendance records yet." />}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Work logs (all statuses)</h2>
          <div className="space-y-2">
            {worklogRows.map((w) => (
              <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">{formatDate(w.date)}</p>
                  <div className="flex items-center gap-1.5">
                    {w.is_milestone && <Badge className="bg-violet-50 text-violet-700">Milestone</Badge>}
                    <StatusBadge status={w.status} />
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-700">{w.description}</p>
                {w.admin_remark && (
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium">Remark:</span> {w.admin_remark}
                  </p>
                )}
              </div>
            ))}
            {worklogRows.length === 0 && <EmptyState message="No work logs submitted yet." />}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Assigned tasks</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {taskRows.map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                <Badge className="bg-indigo-50 text-indigo-700">
                  {FREQUENCY_LABEL[t.frequency as keyof typeof FREQUENCY_LABEL]}
                </Badge>
              </div>
              {t.description && <p className="mt-1 text-xs text-slate-500">{t.description}</p>}
              <p className="mt-1 text-[11px] text-slate-400">{t.is_active ? "Active" : "Inactive"} · Created {formatDateTime(t.created_at)}</p>
            </div>
          ))}
        </div>
        {taskRows.length === 0 && <EmptyState message="No tasks assigned directly to this intern (team/org-wide tasks aren't listed here)." />}
      </div>
    </div>
  );
}
