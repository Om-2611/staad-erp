import { requireInternPortalAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, minutesToLabel } from "@/lib/dates";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea, Input, Label } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Table";
import { resubmitWorkLog } from "@/app/intern/actions";

export default async function InternWorkLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; resubmitted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireInternPortalAccess();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("worklogs")
    .select("*")
    .eq("user_id", profile.id)
    .order("date", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader title="My Work Logs" description="Everything you've submitted, and its review status." />

      {params.submitted && <Alert kind="success">Work log submitted — awaiting admin review.</Alert>}
      {params.resubmitted && <Alert kind="success">Resubmitted — awaiting admin review.</Alert>}
      {params.error && <Alert kind="error">{decodeURIComponent(params.error)}</Alert>}

      <div className="space-y-3">
        {(logs ?? []).length === 0 && <EmptyState message="No work logs yet — submit today's work to get started." />}

        {(logs ?? []).map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-400">{formatDate(log.date)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{log.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {log.link && (
                    <a href={log.link} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">
                      Attachment / link
                    </a>
                  )}
                  {log.time_spent_minutes != null && (
                    <Badge>{minutesToLabel(log.time_spent_minutes)}</Badge>
                  )}
                  {log.is_milestone && <Badge className="bg-violet-50 text-violet-700">Milestone</Badge>}
                </div>
              </div>
              <StatusBadge status={log.status} />
            </div>

            {log.status === "rejected" && log.admin_remark && (
              <Alert kind="error">
                <span className="font-medium">Admin feedback:</span> {log.admin_remark}
              </Alert>
            )}

            {(log.status === "pending" || log.status === "rejected") && (
              <details className="mt-3 group">
                <summary className="cursor-pointer text-xs font-medium text-slate-600 underline">
                  {log.status === "rejected" ? "Edit & resubmit" : "Edit submission"}
                </summary>
                <form action={resubmitWorkLog} className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={log.id} />
                  <div>
                    <Label htmlFor={`desc-${log.id}`}>Description</Label>
                    <Textarea
                      id={`desc-${log.id}`}
                      name="description"
                      defaultValue={log.description}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`link-${log.id}`}>Link (optional)</Label>
                      <Input id={`link-${log.id}`} name="link" defaultValue={log.link ?? ""} />
                    </div>
                    <div>
                      <Label htmlFor={`time-${log.id}`}>Time spent (hours)</Label>
                      <Input
                        id={`time-${log.id}`}
                        name="time_spent_hours"
                        type="number"
                        step="0.25"
                        min="0"
                        defaultValue={log.time_spent_minutes ? (log.time_spent_minutes / 60).toString() : ""}
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm">
                    Resubmit
                  </Button>
                </form>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
