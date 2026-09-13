"use client";

import { useActionState, useState } from "react";
import { createViewer, type CreateAccountState } from "@/app/admin/actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/PageHeader";
import type { Team } from "@/lib/database.types";

const initialState: CreateAccountState = {};

export function CreateViewerForm({ teams }: { teams: Team[] }) {
  const [state, formAction, pending] = useActionState(createViewer, initialState);
  const [scope, setScope] = useState<"all" | "team">("all");

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert kind="error">{state.error}</Alert>}
      {state?.success && (
        <Alert kind="success">
          Account created for <span className="font-medium">{state.email}</span>. Share this
          temporary password — it won&apos;t be shown again:
          <div className="mt-1 rounded bg-white px-2 py-1 font-mono text-sm">{state.tempPassword}</div>
        </Alert>
      )}
      <div>
        <Label htmlFor="v-name">Full name</Label>
        <Input id="v-name" name="name" required placeholder="Leadership contact" />
      </div>
      <div>
        <Label htmlFor="v-email">Email</Label>
        <Input id="v-email" name="email" type="email" required placeholder="leader@college.edu" />
      </div>
      <div>
        <Label htmlFor="viewer_scope">Access scope</Label>
        <Select
          id="viewer_scope"
          name="viewer_scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as "all" | "team")}
        >
          <option value="all">All teams</option>
          <option value="team">Specific team(s)</option>
        </Select>
      </div>
      {scope === "team" && (
        <div>
          <Label>Teams this viewer can see</Label>
          <div className="space-y-1 rounded-md border border-slate-200 p-2">
            {teams.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="team_ids" value={t.id} className="rounded border-slate-300" />
                {t.name}
              </label>
            ))}
          </div>
        </div>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create viewer account"}
      </Button>
    </form>
  );
}
