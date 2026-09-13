import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO, formatTime } from "@/lib/dates";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";
import { correctAttendance } from "@/app/admin/actions";

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; error?: string }>;
}) {
  const params = await searchParams;
  const date = params.date || todayISO();
  await requireRole("admin");
  const supabase = await createClient();

  const [{ data: interns }, { data: attendance }] = await Promise.all([
    supabase.from("profiles").select("id, name, team_id, teams!team_id(name)").eq("role", "intern").eq("status", "active").order("name"),
    supabase.from("attendance").select("*").eq("date", date),
  ]);

  const attendanceByUser = new Map((attendance ?? []).map((a) => [a.user_id, a]));

  return (
    <div>
      <PageHeader title="Attendance" description="Full attendance table with manual correction." />
      {params.error && <Alert kind="error">{decodeURIComponent(params.error)}</Alert>}

      <form method="get" className="mb-4 flex items-center gap-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={date} className="w-auto" />
        <Button type="submit" size="sm" variant="secondary">
          View
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table>
            <Thead>
              <Tr>
                <Th>Intern</Th>
                <Th>Team</Th>
                <Th>Status</Th>
                <Th>Check-in</Th>
                <Th>Check-out</Th>
                <Th>Marked by</Th>
              </Tr>
            </Thead>
            <Tbody>
              {(interns ?? []).map((intern: any) => {
                const a = attendanceByUser.get(intern.id);
                return (
                  <Tr key={intern.id}>
                    <Td className="font-medium text-slate-900">{intern.name}</Td>
                    <Td>{intern.teams?.name ?? "—"}</Td>
                    <Td>{a ? <StatusBadge status={a.status} /> : <StatusBadge status="pending" />}</Td>
                    <Td>{a ? formatTime(a.check_in_time) : "—"}</Td>
                    <Td>{a ? formatTime(a.check_out_time) : "—"}</Td>
                    <Td className="capitalize">{a?.marked_by ?? "—"}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          {(interns ?? []).length === 0 && <EmptyState message="No active interns yet." />}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Manual correction</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={correctAttendance} className="space-y-3">
              <div>
                <Label htmlFor="user_id">Intern</Label>
                <Select id="user_id" name="user_id" required defaultValue="">
                  <option value="" disabled>
                    Select intern
                  </option>
                  {(interns ?? []).map((intern: any) => (
                    <option key={intern.id} value={intern.id}>
                      {intern.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="correction_date">Date</Label>
                <Input id="correction_date" name="date" type="date" defaultValue={date} required />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue="present">
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (audit reason)</Label>
                <Textarea id="notes" name="notes" rows={2} placeholder="e.g. forgot to check in, verified via chat" />
              </div>
              <Button type="submit" className="w-full">
                Save correction
              </Button>
              <p className="text-xs text-slate-400">
                All manual corrections are recorded in the audit log with your admin ID.
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
