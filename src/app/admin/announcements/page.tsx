import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/dates";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Table";
import { createAnnouncement, deleteAnnouncement } from "@/app/admin/actions";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: announcements }, { data: teams }] = await Promise.all([
    supabase.from("announcements").select("*, teams(name)").order("created_at", { ascending: false }),
    supabase.from("teams").select("*").order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Announcements" description="Post updates visible to interns, leadership, or a specific team." />
      {error && <Alert kind="error">{decodeURIComponent(error)}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {(announcements ?? []).map((a: any) => (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge>{a.visible_to === "team" ? a.teams?.name ?? "Team" : a.visible_to}</Badge>
                    <span className="text-xs text-slate-400">{formatDateTime(a.created_at)}</span>
                  </div>
                </div>
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
          {(announcements ?? []).length === 0 && <EmptyState message="No announcements posted yet." />}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>New announcement</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createAnnouncement} className="space-y-3">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" name="body" rows={4} required />
              </div>
              <div>
                <Label htmlFor="visible_to">Visible to</Label>
                <Select id="visible_to" name="visible_to" defaultValue="all">
                  <option value="all">Everyone</option>
                  <option value="interns">Interns only</option>
                  <option value="viewers">Leadership only</option>
                  <option value="team">Specific team</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="team_id">Team (if specific team)</Label>
                <Select id="team_id" name="team_id" defaultValue="">
                  <option value="">—</option>
                  {(teams ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Post announcement
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
