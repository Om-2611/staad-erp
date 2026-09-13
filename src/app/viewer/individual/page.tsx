import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getViewerTeamIds } from "@/lib/viewerScope";
import { formatDate, currentMonthRange, minutesToLabel } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Select, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";

export default async function ViewerIndividualPage({
  searchParams,
}: {
  searchParams: Promise<{ intern?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole("viewer");
  const supabase = await createClient();
  const teamIds = await getViewerTeamIds(profile);
  const { start: defaultFrom, end: defaultTo } = currentMonthRange();
  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;

  const internBaseQuery = supabase
    .from("profiles")
    .select("id, name, email, teams(name)")
    .eq("role", "intern")
    .order("name");
  const { data: internsRaw } = teamIds
    ? await internBaseQuery.in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
    : await internBaseQuery;
  const interns: any[] = internsRaw ?? [];

  const selectedId = params.intern || interns[0]?.id;
  const selected = interns.find((i) => i.id === selectedId);

  let attendance: any[] = [];
  let worklogs: any[] = [];
  if (selectedId) {
    const [{ data: att }, { data: logs }] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", selectedId)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false }),
      supabase
        .from("worklogs")
        .select("*")
        .eq("user_id", selectedId)
        .eq("status", "approved")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false }),
    ]);
    attendance = att ?? [];
    worklogs = logs ?? [];
  }

  const presentDays = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attendance.length ? Math.round((presentDays / attendance.length) * 100) : 0;
  const totalMinutes = worklogs.reduce((sum, w) => sum + (w.time_spent_minutes ?? 0), 0);

  return (
    <div>
      <PageHeader title="Individual View" description="Pick an intern to see their attendance and approved work history." />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <Label htmlFor="intern">Intern</Label>
          <Select id="intern" name="intern" defaultValue={selectedId ?? ""}>
            {(interns ?? []).map((i: any) => (
              <option key={i.id} value={i.id}>
                {i.name} {i.teams?.name ? `(${i.teams.name})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      {!selected && <EmptyState message="No interns available in your scope." />}

      {selected && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Attendance in range" value={`${attendancePct}%`} hint={`${presentDays}/${attendance.length} days present`} />
            <StatCard label="Approved work logs" value={worklogs.length} />
            <StatCard label="Time logged" value={minutesToLabel(totalMinutes)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Attendance</h2>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {attendance.map((a) => (
                    <Tr key={a.id}>
                      <Td>{formatDate(a.date)}</Td>
                      <Td>
                        <StatusBadge status={a.status} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {attendance.length === 0 && <EmptyState message="No attendance records in this range." />}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Approved work logs</h2>
              <div className="space-y-2">
                {worklogs.map((w) => (
                  <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">{formatDate(w.date)}</p>
                      {w.is_milestone && <Badge className="bg-violet-50 text-violet-700">Milestone</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{w.description}</p>
                  </div>
                ))}
                {worklogs.length === 0 && <EmptyState message="No approved work logs in this range." />}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
