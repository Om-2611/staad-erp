"use client";

import { useActionState, useState } from "react";
import { UserPlus, Sparkles } from "lucide-react";
import { createIntern, type CreateAccountState } from "@/app/admin/actions";
import { Input, Label, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/PageHeader";
import type { Team } from "@/lib/database.types";

const initialState: CreateAccountState = {};
const NEW_TEAM_VALUE = "__new__";

export function CreateInternForm({ teams }: { teams: Team[] }) {
  const [state, formAction, pending] = useActionState(createIntern, initialState);
  const [teamChoice, setTeamChoice] = useState("");

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
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required placeholder="Jane Doe" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="jane@example.com" />
      </div>
      <div>
        <Label htmlFor="team_id">Team</Label>
        <Select
          id="team_id"
          name="team_id"
          value={teamChoice}
          onChange={(e) => setTeamChoice(e.target.value)}
        >
          <option value="">Unassigned</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value={NEW_TEAM_VALUE}>+ Create new team…</option>
        </Select>
      </div>
      {teamChoice === NEW_TEAM_VALUE && (
        <div className="animate-fade-in-up rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <Label htmlFor="new_team_name">
            <span className="inline-flex items-center gap-1 text-indigo-700">
              <Sparkles className="h-3 w-3" /> New team name
            </span>
          </Label>
          <Input id="new_team_name" name="new_team_name" placeholder="e.g. Marketing" required />
        </div>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        <UserPlus className="h-4 w-4" />
        {pending ? "Creating…" : "Create intern account"}
      </Button>
    </form>
  );
}
