"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";
import { createTask } from "@/app/admin/actions";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { Team, Profile } from "@/lib/database.types";

export function CreateTaskForm({ teams, interns }: { teams: Team[]; interns: Profile[] }) {
  const [target, setTarget] = useState<"all" | "team" | "intern">("all");

  return (
    <form action={createTask} className="space-y-3">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="e.g. Submit daily standup notes" />
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={3} placeholder="Any details interns should know" />
      </div>
      <div>
        <Label htmlFor="frequency">Frequency</Label>
        <Select id="frequency" name="frequency" defaultValue="daily">
          <option value="daily">Day-to-day</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="target">Assign to</Label>
        <Select id="target" name="target" value={target} onChange={(e) => setTarget(e.target.value as typeof target)}>
          <option value="all">Everyone</option>
          <option value="team">A specific team</option>
          <option value="intern">A specific intern</option>
        </Select>
      </div>
      {target === "team" && (
        <div>
          <Label htmlFor="target_team_id">Team</Label>
          <Select id="target_team_id" name="target_team_id" required defaultValue="">
            <option value="" disabled>
              Select team
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {target === "intern" && (
        <div>
          <Label htmlFor="target_intern_id">Intern</Label>
          <Select id="target_intern_id" name="target_intern_id" required defaultValue="">
            <option value="" disabled>
              Select intern
            </option>
            {interns.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <Button type="submit" className="w-full">
        <ListPlus className="h-4 w-4" />
        Create task
      </Button>
    </form>
  );
}
