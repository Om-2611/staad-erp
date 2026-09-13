"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  ListChecks,
  SendHorizontal,
  ClipboardCheck,
  Users,
  Layers,
  Megaphone,
  Eye,
  User,
  Flag,
  ClipboardList,
  LogOut,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/Badge";
import type { Profile, Role } from "@/lib/database.types";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Icon components must live inside this client component — a Server
// Component (PortalShell) can't pass component/function references as
// props to a Client Component, only serializable data or rendered JSX.
const NAV: Record<Role, NavLink[]> = {
  intern: [
    { href: "/intern/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/intern/attendance", label: "My Attendance", icon: CalendarCheck },
    { href: "/intern/worklogs", label: "My Work Logs", icon: ListChecks },
    { href: "/intern/submit", label: "Submit Today", icon: SendHorizontal },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/approvals", label: "Approvals", icon: ClipboardCheck },
    { href: "/admin/tasks", label: "Tasks", icon: ClipboardList },
    { href: "/admin/interns", label: "Interns", icon: Users },
    { href: "/admin/teams", label: "Teams", icon: Layers },
    { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/viewers", label: "Viewers", icon: Eye },
  ],
  viewer: [
    { href: "/viewer/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/viewer/individual", label: "Individual", icon: User },
    { href: "/viewer/team", label: "By Team", icon: Users },
    { href: "/viewer/milestones", label: "Milestones", icon: Flag },
    { href: "/viewer/tasks", label: "Tasks", icon: ClipboardList },
  ],
};

const INTERN_SELF_SERVICE_NAV: NavLink[] = [
  { href: "/intern/dashboard", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/intern/attendance", label: "My Attendance", icon: CalendarCheck },
  { href: "/intern/worklogs", label: "My Work Logs", icon: ListChecks },
  { href: "/intern/submit", label: "Submit Today", icon: SendHorizontal },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  intern: "Intern",
  viewer: "Leadership",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
  intern: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  viewer: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
};

function NavSection({
  title,
  links,
  pathname,
  activeClass,
}: {
  title?: string;
  links: NavLink[];
  pathname: string | null;
  activeClass: string;
}) {
  return (
    <div>
      {title && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>}
      <div className="space-y-0.5">
        {links.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active ? activeClass : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SidebarContent({ profile, onNavigate }: { profile: Profile; onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = NAV[profile.role];
  const showPersonalTools = profile.role === "admin" && profile.has_intern_access;

  return (
    <div className="flex h-full flex-col" onClick={onNavigate}>
      <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
        <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-500/30">
          SE
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-slate-900">STAAD ERP</p>
          <p className="truncate text-[11px] text-slate-400">Intern management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        <NavSection
          links={links}
          pathname={pathname}
          activeClass="brand-gradient text-white shadow-md shadow-indigo-500/25"
        />
        {showPersonalTools && (
          <NavSection
            title="My work"
            links={INTERN_SELF_SERVICE_NAV}
            pathname={pathname}
            activeClass="bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
          />
        )}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-slate-100"
        >
          <Avatar name={profile.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{profile.name}</p>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium ${ROLE_BADGE_CLASS[profile.role]}`}>
              {ROLE_LABEL[profile.role]}
            </span>
          </div>
          <Settings className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Link>
        <form action={signOut} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2.25} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ profile }: { profile: Profile }) {
  // Closing on navigation is handled by the onNavigate click handler passed
  // to SidebarContent below (clicking any link inside it bubbles up), rather
  // than a pathname-watching effect.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <span className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white">SE</span>
          <span className="text-sm font-semibold text-slate-900">STAAD ERP</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent profile={profile} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 border-r border-slate-200/70 bg-white/95 backdrop-blur-md lg:block">
        <SidebarContent profile={profile} />
      </aside>
    </>
  );
}
