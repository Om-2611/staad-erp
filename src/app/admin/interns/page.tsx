import { Search, UsersRound } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { StatusBadge, Avatar, Badge } from "@/components/ui/Badge";
import { Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";
import { updateInternTeam, setAccountStatus } from "@/app/admin/actions";
import { CreateInternForm } from "@/app/admin/interns/CreateInternForm";

export default async function AdminInternsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const { error, q } = await searchParams;
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: interns }, { data: teams }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*, teams(name)")
      .eq("role", "intern")
      .order("joined_date", { ascending: false }),
    supabase.from("teams").select("*").order("name"),
  ]);

  const filtered = q
    ? (interns ?? []).filter(
        (i: any) =>
          i.name.toLowerCase().includes(q.toLowerCase()) ||
          i.email.toLowerCase().includes(q.toLowerCase())
      )
    : interns ?? [];

  return (
    <div>
      <PageHeader
        title="Interns"
        description="Manage intern accounts and team assignments."
        actions={
          <Badge className="bg-indigo-50 text-indigo-700">
            <UsersRound className="mr-1 h-3 w-3" /> {interns?.length ?? 0} total
          </Badge>
        }
      />
      {error && <Alert kind="error">{decodeURIComponent(error)}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form method="get" className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={q ?? ""} placeholder="Search by name or email…" className="pl-9" />
          </form>

          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Team</Th>
                <Th>Joined</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((intern: any) => (
                <Tr key={intern.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={intern.name} size="sm" />
                      <span className="font-medium text-slate-900">{intern.name}</span>
                    </div>
                  </Td>
                  <Td>{intern.email}</Td>
                  <Td>
                    <form action={updateInternTeam} className="flex items-center gap-1.5">
                      <input type="hidden" name="user_id" value={intern.id} />
                      <Select name="team_id" defaultValue={intern.team_id ?? ""} className="!py-1 text-xs">
                        <option value="">Unassigned</option>
                        {(teams ?? []).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" size="sm" variant="secondary">
                        Save
                      </Button>
                    </form>
                  </Td>
                  <Td>{formatDate(intern.joined_date)}</Td>
                  <Td>
                    <StatusBadge status={intern.status} />
                  </Td>
                  <Td>
                    <form action={setAccountStatus}>
                      <input type="hidden" name="user_id" value={intern.id} />
                      <input type="hidden" name="status" value={intern.status === "active" ? "inactive" : "active"} />
                      <Button type="submit" size="sm" variant={intern.status === "active" ? "danger" : "secondary"}>
                        {intern.status === "active" ? "Deactivate" : "Reactivate"}
                      </Button>
                    </form>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {filtered.length === 0 && <EmptyState message="No interns found." />}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a new intern</CardTitle>
          </CardHeader>
          <CardBody>
            <CreateInternForm teams={teams ?? []} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
