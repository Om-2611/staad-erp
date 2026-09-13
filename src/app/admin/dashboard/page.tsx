import Link from "next/link";
import { Users, CalendarCheck, ClipboardCheck, Layers, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO, formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/Card";
import { StatusBadge, Avatar } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const today = todayISO();

  const [
    { count: internCount },
    { count: activeInternCount },
    { data: pendingLogs, count: pendingCount },
    { data: todayAttendance },
    { count: teamCount },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "intern"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "intern")
      .eq("status", "active"),
    supabase
      .from("worklogs")
      .select("*, profiles!worklogs_user_id_fkey(name)", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase.from("attendance").select("user_id, status").eq("date", today),
    supabase.from("teams").select("id", { count: "exact", head: true }),
  ]);

  const presentToday = (todayAttendance ?? []).filter((a) => a.status === "present").length;
  const attendancePctToday = internCount ? Math.round((presentToday / internCount) * 100) : 0;

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Organization overview." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total interns"
          value={internCount ?? 0}
          hint={`${activeInternCount ?? 0} active`}
          icon={Users}
          accent="indigo"
        />
        <StatCard
          label="Present today"
          value={`${attendancePctToday}%`}
          hint={`${presentToday}/${internCount ?? 0} marked present`}
          icon={CalendarCheck}
          accent="emerald"
        />
        <StatCard label="Pending approvals" value={pendingCount ?? 0} icon={ClipboardCheck} accent="amber" />
        <StatCard label="Teams" value={teamCount ?? 0} icon={Layers} accent="sky" />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Oldest pending approvals</h2>
          <Link href="/admin/approvals">
            <Button size="sm" variant="secondary">
              Go to approvals <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <Table>
          <Thead>
            <Tr>
              <Th>Intern</Th>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {(pendingLogs ?? []).map((log: any) => (
              <Tr key={log.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar name={log.profiles?.name ?? "?"} size="sm" />
                    {log.profiles?.name ?? "—"}
                  </div>
                </Td>
                <Td>{formatDate(log.date)}</Td>
                <Td className="max-w-md truncate">{log.description}</Td>
                <Td>
                  <StatusBadge status={log.status} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {(pendingLogs ?? []).length === 0 && <EmptyState message="No pending approvals — you're all caught up." />}
      </div>
    </div>
  );
}
