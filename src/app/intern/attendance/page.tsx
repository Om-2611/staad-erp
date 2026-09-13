import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "@/components/ui/Table";

export default async function InternAttendancePage() {
  const profile = await requireRole("intern");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", profile.id)
    .order("date", { ascending: false })
    .limit(90);

  return (
    <div>
      <PageHeader title="My Attendance" description="Your attendance history (most recent 90 records)." />
      <Table>
        <Thead>
          <Tr>
            <Th>Date</Th>
            <Th>Status</Th>
            <Th>Check-in</Th>
            <Th>Check-out</Th>
            <Th>Marked by</Th>
            <Th>Notes</Th>
          </Tr>
        </Thead>
        <Tbody>
          {(rows ?? []).map((r) => (
            <Tr key={r.id}>
              <Td>{formatDate(r.date)}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td>{formatTime(r.check_in_time)}</Td>
              <Td>{formatTime(r.check_out_time)}</Td>
              <Td className="capitalize">{r.marked_by}</Td>
              <Td>{r.notes ?? "—"}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      {(rows ?? []).length === 0 && <EmptyState message="No attendance records yet." />}
    </div>
  );
}
