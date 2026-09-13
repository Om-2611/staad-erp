import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { PageHeader, Alert } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { checkIn, markDayStatus, submitWorkLog } from "@/app/intern/actions";

export default async function InternSubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await requireRole("intern");
  const supabase = await createClient();
  const today = todayISO();

  const { data: todayAttendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", profile.id)
    .eq("date", today)
    .maybeSingle();

  return (
    <div>
      <PageHeader title="Submit Today" description="Mark attendance and log today's work." />
      {error && <Alert kind="error">{decodeURIComponent(error)}</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardBody>
            {todayAttendance ? (
              <p className="text-sm text-slate-600">
                Already marked <span className="font-medium capitalize">{todayAttendance.status}</span> for today.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <form action={checkIn}>
                  <Button type="submit" className="w-full">
                    Check in (Present)
                  </Button>
                </form>
                <form action={markDayStatus} className="flex gap-2">
                  <input type="hidden" name="status" value="leave" />
                  <Input name="notes" placeholder="Reason (optional)" />
                  <Button type="submit" variant="secondary">
                    Mark Leave
                  </Button>
                </form>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit today&apos;s work</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={submitWorkLog} className="space-y-4">
              <input type="hidden" name="date" value={today} />
              <div>
                <Label htmlFor="description">What did you work on?</Label>
                <Textarea id="description" name="description" rows={4} required placeholder="Describe today's progress…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="link">Link / attachment (optional)</Label>
                  <Input id="link" name="link" placeholder="https://…" />
                </div>
                <div>
                  <Label htmlFor="time_spent_hours">Time spent (hours, optional)</Label>
                  <Input id="time_spent_hours" name="time_spent_hours" type="number" step="0.25" min="0" placeholder="e.g. 4" />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Submit for review
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
