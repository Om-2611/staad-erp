import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { NavLinks } from "@/components/nav/NavLinks";
import { Avatar } from "@/components/ui/Badge";
import type { Profile } from "@/lib/database.types";

const ROLE_LABEL: Record<Profile["role"], string> = {
  admin: "Admin",
  intern: "Intern",
  viewer: "Leadership (View-only)",
};

const ROLE_BADGE_CLASS: Record<Profile["role"], string> = {
  admin: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
  intern: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  viewer: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
};

export function PortalShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm shadow-indigo-500/30">
              SE
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">STAAD ERP</span>
            <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline ${ROLE_BADGE_CLASS[profile.role]}`}>
              {ROLE_LABEL[profile.role]}
            </span>
          </div>

          <NavLinks role={profile.role} hasInternAccess={profile.has_intern_access} />

          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="hidden items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-slate-100 sm:flex"
              title="Profile settings"
            >
              <Avatar name={profile.name} size="sm" />
              <span className="text-sm text-slate-600">{profile.name}</span>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 sm:hidden"
              title="Profile settings"
              aria-label="Profile settings"
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={2.25} />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
