import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getViewerTeamIds } from "@/lib/viewerScope";
import { formatDate, toISODate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Select, Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Table";

export default async function ViewerMilestonesPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole("viewer");
  const supabase = await createClient();
  const teamIds = await getViewerTeamIds(profile);

  const defaultFrom = toISODate(subWeeks(new Date(), 8));
  const defaultTo = toISODate(new Date());
  const from = params.from || defaultFrom;
  const to = params.to || defaultTo;

  let teamQuery = supabase.from("teams").select("*").order("name");
  if (teamIds) teamQuery = teamQuery.in("id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: teams } = await teamQuery;

  const logsBaseQuery = supabase
    .from("worklogs")
    .select("*, profiles!worklogs_user_id_fkey(name), teams(name)")
    .eq("status", "approved")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  const { data: logsRaw } = params.team
    ? await logsBaseQuery.eq("team_id", params.team)
    : teamIds
      ? await logsBaseQuery.in("team_id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
      : await logsBaseQuery;
  const logs: any[] = logsRaw ?? [];

  // Group into ISO weeks (Monday start), milestones first within each week.
  const weeks = new Map<string, { label: string; items: any[] }>();
  for (const log of logs) {
    const d = new Date(log.date);
    const weekStart = startOfWeek(d, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
    const key = toISODate(weekStart);
    if (!weeks.has(key)) {
      weeks.set(key, { label: `${formatDate(toISODate(weekStart))} – ${formatDate(toISODate(weekEnd))}`, items: [] });
    }
    weeks.get(key)!.items.push(log);
  }
  const sortedWeeks = Array.from(weeks.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div>
      <PageHeader title="Weekly Milestones" description="Rollup of admin-approved work, milestone items highlighted, grouped by week." />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <Label htmlFor="team">Team</Label>
          <Select id="team" name="team" defaultValue={params.team ?? ""}>
            <option value="">All teams (in your scope)</option>
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

      <div className="space-y-6">
        {sortedWeeks.map(([key, week]) => (
          <div key={key}>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Week of {week.label} <span className="font-normal text-slate-400">({week.items.length} items)</span>
            </h2>
            <div className="space-y-2">
              {week.items
                .sort((a, b) => Number(b.is_milestone) - Number(a.is_milestone))
                .map((log: any) => (
                  <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">
                        {formatDate(log.date)} · {log.profiles?.name} · {log.teams?.name ?? "No team"}
                      </p>
                      {log.is_milestone && <Badge className="bg-violet-50 text-violet-700">Milestone</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{log.description}</p>
                  </div>
                ))}
            </div>
          </div>
        ))}
        {sortedWeeks.length === 0 && <EmptyState message="No approved work in this range." />}
      </div>
    </div>
  );
}
