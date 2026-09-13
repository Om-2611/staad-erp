"use client";

import { useState } from "react";
import { KeyRound, X, Copy, Check } from "lucide-react";
import { resetPassword } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ password?: string; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (!window.confirm(`Reset ${userName}'s password? They'll need the new password to log in next time.`)) {
      return;
    }
    setPending(true);
    setResult(null);
    const res = await resetPassword(userId);
    setPending(false);
    setResult(res);
  }

  return (
    <div className="relative">
      <Button type="button" size="sm" variant="secondary" onClick={handleClick} disabled={pending}>
        <KeyRound className="h-3.5 w-3.5" />
        {pending ? "Resetting…" : "Reset Password"}
      </Button>

      {result && (
        <div className="absolute right-0 z-20 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {result.error ? (
            <p className="pr-4 text-xs text-red-600">{result.error}</p>
          ) : (
            <>
              <p className="pr-4 text-xs text-slate-500">New password for {userName} — won&apos;t be shown again:</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <code className="flex-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-800">{result.password}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(result.password ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Copy password"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
