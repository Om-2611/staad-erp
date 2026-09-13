"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateOwnName, type SettingsState } from "@/app/settings/actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/PageHeader";

const initialState: SettingsState = {};

export function ProfileForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(updateOwnName, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert kind="error">{state.error}</Alert>}
      {state?.success && <Alert kind="success">{state.success}</Alert>}
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={name} required maxLength={120} />
      </div>
      <Button type="submit" disabled={pending} size="sm">
        <Save className="h-3.5 w-3.5" />
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
