import { Users, Layers, Pencil } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Table";
import { createTeam, updateTeam } from "@/app/admin/actions";

const PALETTE = [
  "from-indigo-500 to-violet-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-sky-500 to-cyan-500",
  "from-fuchsia-500 to-purple-500",
];

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireRole("admin");
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("*, profiles(count)")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Teams"
        description="Create and manage teams — interns are assigned to a team from the Interns page."
      />
      {error && <Alert kind="error">{decodeURIComponent(error)}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(teams ?? []).map((team: any, i: number) => {
              const gradient = PALETTE[i % PALETTE.length];
              const memberCount = team.profiles?.[0]?.count ?? 0;
              return (
                <div
                  key={team.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white`}>
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="h-3 w-3" /> {memberCount} member{memberCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{team.description || "No description yet."}</p>

                    <details className="mt-3 border-t border-slate-100 pt-3">
                      <summary className="flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        <Pencil className="h-3 w-3" /> Edit team
                      </summary>
                      <form action={updateTeam} className="mt-3 space-y-2">
                        <input type="hidden" name="id" value={team.id} />
                        <Input name="name" defaultValue={team.name} required />
                        <Textarea name="description" defaultValue={team.description ?? ""} rows={2} placeholder="Description" />
                        <Button type="submit" size="sm" variant="secondary">
                          Save changes
                        </Button>
                      </form>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
          {(teams ?? []).length === 0 && <EmptyState message="No teams yet — create one." />}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create a team</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createTeam} className="space-y-3">
              <div>
                <Label htmlFor="name">Team name</Label>
                <Input id="name" name="name" required placeholder="e.g. Marketing" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} placeholder="Optional" />
              </div>
              <Button type="submit" className="w-full">
                Create team
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
