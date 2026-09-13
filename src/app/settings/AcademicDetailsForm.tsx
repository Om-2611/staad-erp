"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateAcademicDetails, type SettingsState } from "@/app/settings/actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/PageHeader";
import type { Profile } from "@/lib/database.types";

const initialState: SettingsState = {};

export function AcademicDetailsForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateAcademicDetails, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <Alert kind="error">{state.error}</Alert>}
      {state?.success && <Alert kind="success">{state.success}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="roll_number">Roll number</Label>
          <Input id="roll_number" name="roll_number" defaultValue={profile.roll_number ?? ""} placeholder="e.g. 21CS1042" />
        </div>
        <div>
          <Label htmlFor="year">Year</Label>
          <Select id="year" name="year" defaultValue={profile.year ?? ""}>
            <option value="">—</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
            <option value="Graduated">Graduated</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="branch">Branch</Label>
          <Input id="branch" name="branch" defaultValue={profile.branch ?? ""} placeholder="e.g. Computer Science" />
        </div>
        <div>
          <Label htmlFor="section">Section</Label>
          <Input id="section" name="section" defaultValue={profile.section ?? ""} placeholder="e.g. B" />
        </div>
        <div>
          <Label htmlFor="spf_band">SPF Band</Label>
          <Select id="spf_band" name="spf_band" defaultValue={profile.spf_band ?? ""}>
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="cdc_band">CDC Band</Label>
          <Select id="cdc_band" name="cdc_band" defaultValue={profile.cdc_band ?? ""}>
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="backlog">Backlog</Label>
          <Input id="backlog" name="backlog" defaultValue={profile.backlog ?? ""} placeholder="e.g. None, or 2 (subjects)" />
        </div>
      </div>

      <Button type="submit" disabled={pending} size="sm">
        <Save className="h-3.5 w-3.5" />
        {pending ? "Saving…" : "Save academic details"}
      </Button>
      <p className="text-xs text-slate-400">All fields on this form are optional.</p>
    </form>
  );
}
