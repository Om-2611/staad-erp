import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { ResetPasswordButton } from "@/components/ui/ResetPasswordButton";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";
import { setAccountStatus, deleteAccount } from "@/app/admin/actions";
import { CreateViewerForm } from "@/app/admin/viewers/CreateViewerForm";

export default async function AdminViewersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: viewers }, { data: teams }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "viewer").order("created_at", { ascending: false }),
    supabase.from("teams").select("*").order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Leadership / Viewer Accounts" description="Create read-only accounts for college leadership." />
      {error && <Alert kind="error">{decodeURIComponent(error)}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Scope</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(viewers ?? []).map((v) => (
                <Tr key={v.id}>
                  <Td className="font-medium text-slate-900">{v.name}</Td>
                  <Td>{v.email}</Td>
                  <Td>
                    <Badge>{v.viewer_scope === "all" ? "All teams" : "Specific team(s)"}</Badge>
                  </Td>
                  <Td>
                    <StatusBadge status={v.status} />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ResetPasswordButton userId={v.id} userName={v.name} />
                      <form action={setAccountStatus}>
                        <input type="hidden" name="user_id" value={v.id} />
                        <input type="hidden" name="status" value={v.status === "active" ? "inactive" : "active"} />
                        <Button type="submit" size="sm" variant={v.status === "active" ? "danger" : "secondary"}>
                          {v.status === "active" ? "Deactivate" : "Reactivate"}
                        </Button>
                      </form>
                      <form action={deleteAccount}>
                        <input type="hidden" name="user_id" value={v.id} />
                        <input type="hidden" name="redirect_path" value="/admin/viewers" />
                        <ConfirmSubmitButton
                          size="sm"
                          variant="ghost"
                          confirmMessage={`Permanently delete ${v.name}? This removes their account entirely. This cannot be undone.`}
                          className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {(viewers ?? []).length === 0 && <EmptyState message="No viewer accounts yet." />}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Add a leadership account</CardTitle>
          </CardHeader>
          <CardBody>
            <CreateViewerForm teams={teams ?? []} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
