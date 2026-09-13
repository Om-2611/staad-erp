import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getViewerTeamIds } from "@/lib/viewerScope";
import { formatDate, currentMonthRange } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";

export default async function ViewerTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole("viewer");
  const supabase = await createClient();
  const teamIds = await getViewerTeamIds(profile);
  const { start: defaultFrom, end: defaultTo } = currentMonthRange();
  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;

  let teamQuery = supabase.from("teams").select("*").order("name");
  if (teamIds) teamQuery = teamQuery.in("id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: teams } = await teamQuery;

  const selectedTeamId = params.team || teams?.[0]?.id;
  const selectedTeam = (teams ?? []).find((t) => t.id === selectedTeamId);

  let members: any[] = [];
  let attendance: any[] = [];
  let worklogs: any[] = [];

  if (selectedTeamId) {
    // Team roster includes interns, plus any admin with intern-portal access
    // who's on this team (e.g. a co-founder tracking their own work here).
    const { data: m } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("team_id", selectedTeamId)
      .or("role.eq.intern,and(role.eq.admin,has_intern_access.eq.true)");
    members = m ?? [];
    const memberIds = members.map((m) => m.id);

    const [{ data: att }, { data: logs }] = await Promise.all([
      memberIds.length
        ? supabase.from("attendance").select("date, status, user_id").in("user_id", memberIds).gte("date", from).lte("date", to)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("worklogs")
        .select("*, profiles!worklogs_user_id_fkey(name)")
        .eq("team_id", selectedTeamId)
        .eq("status", "approved")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false }),
    ]);
    attendance = att ?? [];
    worklogs = logs ?? [];
  }

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const attendancePct = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;
  const milestoneCount = worklogs.filter((w) => w.is_milestone).length;

  // Day-wise attendance breakdown
  const byDate = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    const entry = byDate.get(a.date) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (a.status === "present") entry.present += 1;
    byDate.set(a.date, entry);
  }
  const dayRows = Array.from(byDate.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div>
      <PageHeader title="Team View" description="Aggregated attendance and approved work for a team." />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <Label htmlFor="team">Team</Label>
          <Select id="team" name="team" defaultValue={selectedTeamId ?? ""}>
            {(teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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

      {!selectedTeam && <EmptyState message="No teams available in your scope." />}

      {selectedTeam && (
        <>
          <div className="mb-4 flex justify-end">
            <DownloadPdfButton
              filename={`${selectedTeam.name.replace(/\s+/g, "-")}-team-report-${from}-to-${to}`}
              title={`Team Report — ${selectedTeam.name}`}
              meta={[`Range: ${formatDate(from)} – ${formatDate(to)}`, `Members: ${members.length}`]}
              stats={[
                { label: "Members", value: members.length },
                { label: "Attendance", value: `${attendancePct}%` },
                { label: "Approved logs", value: worklogs.length },
                { label: "Milestones", value: milestoneCount },
              ]}
              sections={[
                {
                  heading: "Day-wise Attendance",
                  columns: ["Date", "Present"],
                  rows: dayRows.map(([date, v]) => [formatDate(date), `${v.present}/${v.total}`]),
                },
                {
                  heading: "Approved Work Logs",
                  columns: ["Date", "Intern", "Description", "Milestone"],
                  rows: worklogs.map((w: any) => [
                    formatDate(w.date),
                    w.profiles?.name ?? "—",
                    w.description,
                    w.is_milestone ? "Yes" : "",
                  ]),
                },
              ]}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard label="Team members" value={members.length} />
            <StatCard label="Attendance in range" value={`${attendancePct}%`} />
            <StatCard label="Approved work logs" value={worklogs.length} />
            <StatCard label="Milestones" value={milestoneCount} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Day-wise attendance</h2>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Present</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {dayRows.map(([date, v]) => (
                    <Tr key={date}>
                      <Td>{formatDate(date)}</Td>
                      <Td>
                        {v.present}/{v.total}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {dayRows.length === 0 && <EmptyState message="No attendance in this range." />}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Approved work (day-wise)</h2>
              <div className="space-y-2">
                {worklogs.map((w: any) => (
                  <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {formatDate(w.date)} · {w.profiles?.name}
                      </p>
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
