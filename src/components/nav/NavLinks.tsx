"use client";

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
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/database.types";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Icon components must live inside this client component — a Server
// Component (PortalShell) can't pass component/function references as props
// to a Client Component, only serializable data or already-rendered JSX.
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

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const links = NAV[role];

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname?.startsWith(link.href + "/");
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
