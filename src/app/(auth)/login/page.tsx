"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { signIn, type LoginState } from "@/app/(auth)/actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/PageHeader";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="brand-gradient mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
            SE
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">STAAD ERP</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your portal</p>
        </div>

        <form
          action={formAction}
          className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur"
        >
          {state?.error && <Alert kind="error">{state.error}</Alert>}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            <LogIn className="h-4 w-4" />
            {pending ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-xs text-slate-400">
            Don&apos;t have an account? Your admin creates intern and viewer accounts —
            ask them for your credentials.
          </p>
        </form>
      </div>
    </div>
  );
}
