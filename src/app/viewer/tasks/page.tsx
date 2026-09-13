import { CalendarClock, CalendarRange, CalendarDays, Users, User, Globe } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getViewerTeamIds } from "@/lib/viewerScope";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Select, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Table";
import { DownloadPdfButton } from "@/components/ui/DownloadPdfButton";
import type { TaskFrequency } from "@/lib/database.types";

const FREQUENCY_LABEL = { daily: "Day-to-day", weekly: "Weekly", monthly: "Monthly" } as const;
const FREQUENCY_ICON = { daily: CalendarClock, weekly: CalendarRange, monthly: CalendarDays } as const;

export default async function ViewerTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ frequency?: string; team?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole("viewer");
  const supabase = await createClient();
  const teamIds = await getViewerTeamIds(profile);

  let teamQuery = supabase.from("teams").select("*").order("name");
  if (teamIds) teamQuery = teamQuery.in("id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: teams } = await teamQuery;

  // RLS already scopes rows to what this viewer may see; the filters here
  // are just for narrowing the on-screen view within that allowed set.
  let query = supabase
    .from("tasks")
    .select("*, teams(name), profiles!tasks_assigned_to_fkey(name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (params.frequency) query = query.eq("frequency", params.frequency as TaskFrequency);
  if (params.team) query = query.eq("team_id", params.team);

  const { data: tasksRaw } = await query;
  const tasks: any[] = tasksRaw ?? [];

  return (
    <div>
      <PageHeader title="Tasks" description="Day-to-day, weekly, and monthly tasks assigned by admin." />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" name="frequency" defaultValue={params.frequency ?? ""}>
              <option value="">All</option>
              <option value="daily">Day-to-day</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </Select>
          </div>
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
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>

        <DownloadPdfButton
          filename="tasks-report"
          title="Tasks Report"
          meta={[
            `Frequency: ${params.frequency ? FREQUENCY_LABEL[params.frequency as keyof typeof FREQUENCY_LABEL] : "All"}`,
            `Team: ${params.team ? (teams ?? []).find((t) => t.id === params.team)?.name ?? "Selected" : "All (in scope)"}`,
          ]}
          stats={[{ label: "Active tasks", value: tasks.length }]}
          sections={[
            {
              heading: "Tasks",
              columns: ["Title", "Frequency", "Assigned To", "Description"],
              rows: tasks.map((t) => [
                t.title,
                FREQUENCY_LABEL[t.frequency as keyof typeof FREQUENCY_LABEL],
                t.profiles?.name ?? t.teams?.name ?? "Everyone",
                t.description ?? "",
              ]),
            },
          ]}
          disabled={tasks.length === 0}
        />
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const FreqIcon = FREQUENCY_ICON[task.frequency as keyof typeof FREQUENCY_ICON];
          const targetLabel = task.profiles?.name ?? task.teams?.name ?? "Everyone";
          const TargetIcon = task.profiles?.name ? User : task.teams?.name ? Users : Globe;
          return (
            <div key={task.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{task.title}</p>
              {task.description && <p className="mt-1 text-sm text-slate-600">{task.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="bg-indigo-50 text-indigo-700">
                  <FreqIcon className="mr-1 h-3 w-3" />
                  {FREQUENCY_LABEL[task.frequency as keyof typeof FREQUENCY_LABEL]}
                </Badge>
                <Badge>
                  <TargetIcon className="mr-1 h-3 w-3" />
                  {targetLabel}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-400">Created {formatDateTime(task.created_at)}</p>
            </div>
          );
        })}
        {tasks.length === 0 && <EmptyState message="No active tasks in this view." />}
      </div>
    </div>
  );
}
