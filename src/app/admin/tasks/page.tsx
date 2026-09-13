import { CalendarClock, CalendarRange, CalendarDays, Users, User, Globe } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/dates";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { EmptyState } from "@/components/ui/Table";
import { setTaskActive, deleteTask } from "@/app/admin/actions";
import { CreateTaskForm } from "@/app/admin/tasks/CreateTaskForm";

const FREQUENCY_LABEL = { daily: "Day-to-day", weekly: "Weekly", monthly: "Monthly" } as const;
const FREQUENCY_ICON = { daily: CalendarClock, weekly: CalendarRange, monthly: CalendarDays } as const;

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: tasks }, { data: teams }, { data: interns }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, teams(name), profiles!tasks_assigned_to_fkey(name)")
      .order("created_at", { ascending: false }),
    supabase.from("teams").select("*").order("name"),
    supabase.from("profiles").select("*").eq("role", "intern").eq("status", "active").order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Tasks" description="Assign day-to-day, weekly, or monthly tasks. Leadership can see these too." />
      {error && <Alert kind="error">{decodeURIComponent(error)}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {(tasks ?? []).map((task: any) => {
            const FreqIcon = FREQUENCY_ICON[task.frequency as keyof typeof FREQUENCY_ICON];
            const targetLabel = task.profiles?.name
              ? task.profiles.name
              : task.teams?.name
                ? task.teams.name
                : "Everyone";
            const TargetIcon = task.profiles?.name ? User : task.teams?.name ? Users : Globe;

            return (
              <div
                key={task.id}
                className={`rounded-lg border bg-white p-4 shadow-sm ${task.is_active ? "border-slate-200" : "border-slate-100 opacity-60"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
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
                      {!task.is_active && <Badge className="bg-slate-100 text-slate-500">Inactive</Badge>}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Created {formatDateTime(task.created_at)}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <form action={setTaskActive}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="is_active" value={(!task.is_active).toString()} />
                      <Button type="submit" size="sm" variant="secondary">
                        {task.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                    <form action={deleteTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <ConfirmSubmitButton
                        size="sm"
                        variant="ghost"
                        confirmMessage={`Delete the task "${task.title}"? This cannot be undone.`}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
          {(tasks ?? []).length === 0 && <EmptyState message="No tasks yet — create one to get started." />}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New task</CardTitle>
          </CardHeader>
          <CardBody>
            <CreateTaskForm teams={teams ?? []} interns={interns ?? []} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
