import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, minutesToLabel } from "@/lib/dates";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea, Label } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Table";
import { approveWorkLog, rejectWorkLog } from "@/app/admin/actions";

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireRole("admin");
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("worklogs")
    .select("*, profiles!worklogs_user_id_fkey(name, email), teams(name)")
    .eq("status", "pending")
    .order("date", { ascending: true });

  return (
    <div>
      <PageHeader title="Approvals" description="Review and approve or reject pending work log submissions." />
      {error && <Alert kind="error">{decodeURIComponent(error)}</Alert>}

      <div className="space-y-3">
        {(logs ?? []).length === 0 && <EmptyState message="No pending submissions." />}

        {(logs ?? []).map((log: any) => (
          <div key={log.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {log.profiles?.name} <span className="font-normal text-slate-400">· {log.teams?.name ?? "No team"}</span>
                </p>
                <p className="text-xs text-slate-400">{formatDate(log.date)}</p>
              </div>
              {log.time_spent_minutes != null && <Badge>{minutesToLabel(log.time_spent_minutes)}</Badge>}
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{log.description}</p>

            {log.link && (
              <a href={log.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-sky-600 underline">
                View attachment / link
              </a>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <form action={approveWorkLog} className="space-y-2">
                <input type="hidden" name="id" value={log.id} />
                <Label htmlFor={`remark-approve-${log.id}`}>Approve (optional remark)</Label>
                <Textarea id={`remark-approve-${log.id}`} name="remark" rows={2} placeholder="Great work…" />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" name="is_milestone" className="rounded border-slate-300" />
                  Tag as milestone
                </label>
                <Button type="submit" size="sm">
                  Approve
                </Button>
              </form>

              <form action={rejectWorkLog} className="space-y-2">
                <input type="hidden" name="id" value={log.id} />
                <Label htmlFor={`remark-reject-${log.id}`}>Reject (comment required)</Label>
                <Textarea id={`remark-reject-${log.id}`} name="remark" rows={2} required placeholder="What needs to change…" />
                <Button type="submit" size="sm" variant="danger">
                  Reject
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
